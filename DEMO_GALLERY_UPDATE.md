# 示範圖集功能更新 - 移除預設內容

## 📅 更新日期
2024-12-XX

## 🎯 更新目的
將 LINE Bot 示範圖集功能改為**完全依賴資料庫**，移除硬編碼的預設內容，確保管理員可以通過後台完全控制示範圖集的內容。

## 🔧 修改內容

### 1. functions/line-webhook.js
**修改內容：**
- ✅ 更新 `handleDemoGallery()` 函數邏輯
  - 優先從資料庫讀取示範圖集
  - 資料庫為空時返回提示訊息（不再使用預設內容）
  - 資料庫讀取失敗時返回錯誤訊息
- ✅ **刪除** `generateDemoGalleryFlexMessage()` 函數（舊版預設內容）
- ✅ 保留 `generateDemoGalleryFromDB()` 函數（從資料庫生成）

**行為變更：**
```javascript
// 舊版行為：資料庫無資料 → 使用預設內容
// 新版行為：資料庫無資料 → 提示管理員設定

if (!demoItems || demoItems.length === 0) {
  // 舊版：return generateDemoGalleryFlexMessage();
  // 新版：返回提示訊息
  return getLineClient().replyMessage(replyToken, {
    type: 'text',
    text: '📭 目前尚無示範圖集\n\n請聯繫管理員在後台設定示範圖集，或直接輸入「創建貼圖」開始製作你的專屬貼圖！'
  });
}
```

### 2. functions/services/command-service.js
**修改內容：**
- ✅ 移除錯誤的 `generateDemoGalleryFlexMessage` 引入
- ✅ 刪除未使用的 `handleDemoGallery()` 函數
- ✅ 更新 module.exports（移除 handleDemoGallery）

**原因：**
- `line-webhook.js` 直接使用自己的 `handleDemoGallery` 函數
- `command-service.js` 的版本從未被調用
- 避免重複代碼和混淆

## 📊 功能流程

### 新的示範圖集流程
```
用戶在 LINE 輸入「示範圖集」
    ↓
調用 handleDemoGallery(replyToken, userId)
    ↓
從 demo_gallery 表讀取資料（按 display_order 排序，最多 12 個）
    ↓
【情況 1】資料庫讀取失敗
    → 返回錯誤訊息
    
【情況 2】資料庫無資料
    → 返回提示訊息（請管理員設定）
    
【情況 3】資料庫有資料
    → 使用 generateDemoGalleryFromDB() 生成 Flex Message
    → 顯示輪播卡片（介紹卡片 + 示範圖片）
```

## 🎨 管理員工作流程

1. **登入管理後台**
   - 訪問 `/admin/demo-gallery.html`

2. **瀏覽已生成的貼圖組**
   - 使用篩選器（風格、狀態）
   - 點擊「查看詳情」查看貼圖組的所有圖片

3. **選擇優質圖片**
   - 點擊圖片上的「➕ 加入示範圖集」按鈕
   - 系統會將圖片及其參數加入示範圖集

4. **管理示範圖集**
   - 切換到「當前示範圖集」分頁
   - 查看已添加的圖片
   - 移除不需要的圖片
   - 調整順序（手動拖拽，待實現）

5. **儲存變更**
   - 點擊「💾 儲存變更」
   - 資料同步到 demo_gallery 表
   - LINE Bot 立即可用新的示範圖集

## ✅ 優勢

### 1. 完全可控
- ❌ 不再受限於硬編碼的預設內容
- ✅ 管理員可以隨時更新示範圖集
- ✅ 可以展示真實的用戶生成內容

### 2. 更好的用戶體驗
- ✅ 展示實際的貼圖效果
- ✅ 用戶可以看到真實的參數組合
- ✅ 更容易理解如何創建類似效果

### 3. 維護更簡單
- ✅ 不需要修改代碼來更新示範內容
- ✅ 通過後台界面即可管理
- ✅ 減少代碼複雜度

## 🚨 注意事項

### 初次部署
如果這是第一次部署此功能：
1. 確保已執行資料庫遷移（`supabase/migrations/20240115_demo_gallery.sql`）
2. 在後台添加至少 1-2 個示範圖片
3. 測試 LINE Bot 中的「示範圖集」命令

### 資料庫為空的情況
- 用戶會看到提示訊息，引導他們創建貼圖或聯繫管理員
- 管理員應該盡快添加示範圖片

## 🔍 測試建議

### 測試場景
1. ✅ 資料庫有資料 → 應顯示示範圖集輪播
2. ✅ 資料庫無資料 → 應顯示提示訊息
3. ✅ 資料庫錯誤 → 應顯示錯誤訊息
4. ✅ 後台管理 → 應能正常添加/刪除/儲存

### 測試步驟
```bash
# 1. 測試 API
curl https://your-site.netlify.app/.netlify/functions/demo-gallery

# 2. 測試 LINE Bot
在 LINE 中輸入：示範圖集

# 3. 測試後台
訪問：https://your-site.netlify.app/admin/demo-gallery.html
```

## 📝 檔案清單

### 修改的檔案
- ✅ `functions/line-webhook.js` (修改 + 刪除)
- ✅ `functions/services/command-service.js` (移除引入 + 刪除函數)

### 相關檔案（未修改）
- `functions/demo-gallery.js` - 示範圖集 API
- `public/admin/demo-gallery.html` - 管理後台
- `public/demo-gallery.html` - 公開展示頁面
- `supabase/migrations/20240115_demo_gallery.sql` - 資料庫表結構

---

**版本:** 2.0.0  
**更新日期:** 2024-12-XX  
**影響範圍:** LINE Bot 示範圖集功能  
**向後兼容:** ❌ 需要確保資料庫有資料

