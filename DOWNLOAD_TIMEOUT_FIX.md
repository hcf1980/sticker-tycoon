# 下載超時問題修復說明

## 問題描述
管理員下載貼圖包時遇到 **504 Gateway Timeout** 錯誤：
```
Inactivity Timeout
Description: Too much time has passed without sending any data for document.
```

## 根本原因
- Netlify Functions 有 **10秒（免費版）或 26秒（付費版）** 的超時限制
- 下載 40 張貼圖並打包成 ZIP 需要 30-60 秒
- 超過超時限制後，Netlify 會中斷連接並返回 504 錯誤

## 解決方案：異步生成 + 輪詢機制

### 🔧 後端改動（functions/admin-listing.js）

#### 1. **新增 `checkZip` API**
```javascript
// GET /.netlify/functions/admin-listing?action=checkZip&applicationId=xxx
// 檢查 ZIP 是否已生成完成
```
返回：
- `ready: true` + `downloadUrl` → ZIP 已經準備好
- `ready: false` + `generating: true` → 正在生成中
- `ready: false` + `generating: false` → 尚未開始

#### 2. **修改 `downloadPack` API**
```javascript
// POST /.netlify/functions/admin-listing
// { action: 'downloadPack', applicationId: 'xxx' }
```
流程改為：
1. 如果已有快取的 ZIP，直接返回下載連結
2. 否則，標記 `zip_generating = true`
3. **立即返回** `ready: false, generating: true`
4. 在背景啟動 `generateAndUploadZipAsync()` 異步任務

#### 3. **新增異步生成函數**
```javascript
async function generateAndUploadZipAsync(applicationId, application, stickers) {
  try {
    // 生成 ZIP
    const zipBuffer = await generateApplicationZip(application, stickers);
    // 上傳到 Supabase Storage
    const zipUrl = await uploadZipToStorage(applicationId, zipBuffer);
    // 更新資料庫
    await supabase
      .from('listing_applications')
      .update({ 
        zip_cache_url: zipUrl,
        zip_generating: false
      })
      .eq('application_id', applicationId);
  } catch (error) {
    // 錯誤時清除生成標記
    await supabase
      .from('listing_applications')
      .update({ zip_generating: false })
      .eq('application_id', applicationId);
  }
}
```

### 🎨 前端改動（public/admin/listing-manager.html）

#### 修改 `downloadStickerPack()` 函數
```javascript
async function downloadStickerPack(appId, event) {
  // 1. 啟動生成任務
  const res = await fetch(...downloadPack...);
  const data = await res.json();
  
  // 2. 如果已經準備好，直接下載
  if (data.ready && data.downloadUrl) {
    window.open(data.downloadUrl, '_blank');
    return;
  }
  
  // 3. 正在生成中，開始輪詢
  btn.textContent = '🔄 生成中...';
  
  const startTime = Date.now();
  const maxWaitTime = 5 * 60 * 1000; // 最多等 5 分鐘
  
  while (Date.now() - startTime < maxWaitTime) {
    // 每 2 秒檢查一次
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const checkRes = await fetch(...checkZip...);
    const checkData = await checkRes.json();
    
    if (checkData.ready && checkData.downloadUrl) {
      // 完成！開啟下載
      window.open(checkData.downloadUrl, '_blank');
      return;
    }
    
    // 顯示等待時間
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    btn.textContent = `🔄 生成中 (${elapsed}s)...`;
  }
  
  throw new Error('生成超時，請稍後重試');
}
```

### 💾 資料庫改動（supabase-schema.sql）

新增兩個欄位到 `listing_applications` 表：

```sql
ALTER TABLE listing_applications 
ADD COLUMN IF NOT EXISTS zip_cache_url TEXT;

ALTER TABLE listing_applications 
ADD COLUMN IF NOT EXISTS zip_generating BOOLEAN DEFAULT FALSE;
```

- **`zip_cache_url`**: 儲存生成好的 ZIP 下載連結（快取）
- **`zip_generating`**: 標記是否正在生成 ZIP（防止重複觸發）

## 工作流程圖

```
用戶點擊下載
    ↓
前端: POST downloadPack
    ↓
後端: 立即返回 {ready: false, generating: true}
    ↓                    ↓
前端開始輪詢     後端背景生成 ZIP
    ↓                    ↓
每2秒 GET checkZip   下載+打包+上傳
    ↓                    ↓
ready: false...      (30-60秒)
    ↓                    ↓
ready: false...      完成！更新資料庫
    ↓                    ↓
ready: true! ← ← ← 寫入 zip_cache_url
    ↓
前端開啟下載連結
```

## 優點

✅ **突破 26 秒超時限制**：不再受 Netlify Functions 限制  
✅ **用戶體驗良好**：顯示實時進度（生成中 10s, 20s...）  
✅ **快取機制**：第二次下載直接返回，不需重新生成  
✅ **防止重複生成**：`zip_generating` 標記避免併發問題  
✅ **錯誤恢復**：生成失敗時會清除標記，可重試  

## 部署步驟

1. **更新資料庫**（Supabase SQL Editor）：
   ```sql
   -- 運行 migrations/add_zip_fields.sql
   ALTER TABLE listing_applications 
   ADD COLUMN IF NOT EXISTS zip_cache_url TEXT;
   
   ALTER TABLE listing_applications 
   ADD COLUMN IF NOT EXISTS zip_generating BOOLEAN DEFAULT FALSE;
   ```

2. **部署代碼**（已完成）：
   - 代碼已推送到 GitHub
   - Netlify 會自動部署

3. **測試**：
   - 進入管理後台：https://sticker-tycoon.netlify.app/admin/listing-manager
   - 點擊任一申請的「📥 下載貼圖壓縮包」
   - 觀察按鈕文字：⏳ 準備中... → 🔄 生成中 (5s)... → ✅ 下載完成

## 測試清單

- [ ] 第一次下載（需要生成）：應顯示進度並成功下載
- [ ] 第二次下載（已有快取）：應立即返回下載連結
- [ ] 多個申請同時下載：不應互相干擾
- [ ] 網絡錯誤處理：超時或失敗時應顯示錯誤訊息
- [ ] 生成超過 5 分鐘：應提示超時，讓用戶重試

## 後續優化建議

1. **WebSocket 實時通知**：替代輪詢，減少 API 請求
2. **進度百分比**：在資料庫記錄生成進度（如 20%, 40%...）
3. **ZIP 過期機制**：定期清理舊的快取檔案
4. **分片下載**：對於超大貼圖包，支援斷點續傳
5. **背景任務隊列**：使用 Redis/BullMQ 管理生成任務

## 相關檔案

- `functions/admin-listing.js` - 後端 API
- `public/admin/listing-manager.html` - 前端頁面
- `supabase-schema.sql` - 資料庫結構
- `migrations/add_zip_fields.sql` - 資料庫遷移腳本

