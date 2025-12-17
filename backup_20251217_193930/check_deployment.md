# 部署檢查清單

## 🔍 問題診斷

你遇到的錯誤：
- ❌ 400 Bad Request（前幾次）
- ❌ 500 Internal Server Error（後面幾次）

## 🎯 檢查步驟

### 1️⃣ 確認 Netlify 已完成部署

1. 登入 Netlify Dashboard: https://app.netlify.com
2. 找到你的 `sticker-tycoon` 專案
3. 查看 **Deploys** 頁面
4. 確認最新的 deploy（commit: `9b66ce5`）已經 **Published** ✅

**如果顯示 "Building" 或 "In Progress"**：
- 等待 2-3 分鐘讓部署完成
- 然後重試下載功能

### 2️⃣ 確認資料庫已執行 Migration

打開 Supabase SQL Editor：https://supabase.com/dashboard/project/YOUR_PROJECT/sql

執行以下檢查 SQL：

```sql
-- 檢查 listing_applications 表是否有 zip_cache_url 和 zip_generating 欄位
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'listing_applications'
  AND column_name IN ('zip_cache_url', 'zip_generating');
```

**預期結果**：應該看到兩個欄位

| column_name | data_type | column_default |
|-------------|-----------|----------------|
| zip_cache_url | text | NULL |
| zip_generating | boolean | false |

**如果沒有看到這兩個欄位**：執行以下 SQL 添加欄位：

```sql
-- 添加缺失的欄位
ALTER TABLE listing_applications 
ADD COLUMN IF NOT EXISTS zip_cache_url TEXT;

ALTER TABLE listing_applications 
ADD COLUMN IF NOT EXISTS zip_generating BOOLEAN DEFAULT FALSE;

-- 驗證添加成功
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'listing_applications'
  AND column_name IN ('zip_cache_url', 'zip_generating');
```

### 3️⃣ 測試下載功能

完成上述兩步後：

1. 打開管理後台：https://sticker-tycoon.netlify.app/admin/listing-manager
2. **清除瀏覽器快取**（重要！）：
   - Chrome/Edge: `Ctrl+Shift+R` (Mac: `Cmd+Shift+R`)
   - 或手動清除快取
3. 點擊任一申請的「📥 下載貼圖壓縮包」
4. **打開 F12 控制台** 查看詳細錯誤訊息

## 🐛 如果仍然出現 500 錯誤

### 查看 Netlify Function 日誌

1. Netlify Dashboard → 你的專案
2. 點擊 **Functions** 標籤
3. 點擊 `admin-listing` 函數
4. 查看最近的錯誤日誌

常見錯誤：
- `column "zip_cache_url" does not exist` → 資料庫未執行 migration
- `ReferenceError: supabase is not defined` → 環境變數未設定
- `Timeout` → 函數執行超時（應該不會再發生了）

### 查看瀏覽器控制台詳細錯誤

打開 F12 → Console 標籤，應該會看到類似：

```javascript
{
  "success": false,
  "error": "找不到申請記錄" // 或其他錯誤訊息
}
```

## 📝 完成後的預期行為

✅ 點擊下載按鈕
✅ 按鈕顯示：⏳ 準備中...
✅ 開始輪詢：🔄 生成中 (2s)...
✅ 繼續輪詢：🔄 生成中 (5s)...
✅ 大約 30-60 秒後：✅ 貼圖包已開始下載
✅ 瀏覽器自動下載 ZIP 檔案

## 🚨 緊急回滾方案

如果新版本有問題，可以在 Netlify 回滾到上一個版本：

1. Netlify Dashboard → Deploys
2. 找到上一個穩定版本
3. 點擊 "Publish deploy"

---

## 📊 檢查結果報告

請回報以下資訊：

- [ ] Netlify 最新 deploy 狀態：________
- [ ] 資料庫欄位檢查結果：________
- [ ] 瀏覽器控制台錯誤訊息：________
- [ ] Netlify Function 日誌錯誤：________

