# 🚨 500 錯誤緊急修復指南

## 問題原因
資料庫表 `listing_applications` 缺少兩個必要欄位：
- `zip_cache_url` - 儲存下載連結
- `zip_generating` - 標記生成狀態

## 🔧 立即修復（2 分鐘）

### 步驟 1：打開 Supabase SQL Editor

1. 登入 Supabase: https://supabase.com/dashboard
2. 選擇你的專案
3. 左側選單點擊 **SQL Editor**
4. 點擊 **New Query**

### 步驟 2：執行修復 SQL

複製貼上以下 SQL 並點擊 **Run**：

```sql
-- 添加缺失的欄位
ALTER TABLE listing_applications 
ADD COLUMN IF NOT EXISTS zip_cache_url TEXT;

ALTER TABLE listing_applications 
ADD COLUMN IF NOT EXISTS zip_generating BOOLEAN DEFAULT FALSE;

-- 驗證添加成功
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'listing_applications'
  AND column_name IN ('zip_cache_url', 'zip_generating');
```

### 步驟 3：確認結果

執行後應該看到：

```
column_name     | data_type | column_default
----------------+-----------+----------------
zip_cache_url   | text      | null
zip_generating  | boolean   | false
```

✅ 看到這兩行就表示成功了！

### 步驟 4：測試下載功能

1. 返回管理後台：https://sticker-tycoon.netlify.app/admin/listing-manager
2. **清除瀏覽器快取**（重要！）：
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
3. 點擊任一申請的「📥 下載貼圖壓縮包」按鈕
4. 觀察按鈕變化：

```
⏳ 準備中...
   ↓ (2 秒)
🔄 生成中 (2s)...
   ↓ (2 秒)
🔄 生成中 (4s)...
   ↓ (2 秒)
🔄 生成中 (6s)...
   ↓ (繼續...)
🔄 生成中 (30s)...
   ↓
✅ 貼圖包已開始下載
```

5. 瀏覽器應該自動下載一個 `.zip` 檔案

## 🎯 預期效果

### 第一次下載
- 需要等待 30-60 秒（生成 + 上傳）
- 按鈕會顯示實時進度

### 第二次下載（同一個申請）
- **立即下載**（使用快取）
- 不需要再等待

## 🐛 如果仍然失敗

### 查看詳細錯誤

1. 打開瀏覽器開發者工具（F12）
2. 切換到 **Console** 標籤
3. 點擊下載按鈕
4. 查看紅色錯誤訊息，應該會看到具體錯誤

### 常見錯誤及解決方案

#### 錯誤 1: "找不到申請記錄"
**原因**：資料庫沒有這筆申請資料
**解決**：檢查 `application_id` 是否正確

```sql
SELECT application_id, name_en, status 
FROM listing_applications 
WHERE application_id = 'STMJ3EWON0';
```

#### 錯誤 2: "column does not exist"
**原因**：SQL 還沒有執行成功
**解決**：重新執行步驟 2 的 SQL

#### 錯誤 3: 一直顯示 "生成中" 超過 5 分鐘
**原因**：後端生成失敗但沒有清除標記
**解決**：手動重置標記

```sql
-- 查看哪些申請卡在生成中
SELECT application_id, name_en, zip_generating, updated_at
FROM listing_applications
WHERE zip_generating = true;

-- 重置卡住的申請
UPDATE listing_applications
SET zip_generating = false
WHERE application_id = 'STMJ3EWON0';  -- 替換成實際的 ID
```

## 📊 檢查現有資料

想看看所有申請的狀態：

```sql
SELECT 
  application_id,
  name_en,
  status,
  CASE 
    WHEN zip_cache_url IS NOT NULL THEN '✅ 已快取'
    WHEN zip_generating = true THEN '🔄 生成中'
    ELSE '⚪ 未生成'
  END as download_status,
  created_at
FROM listing_applications
ORDER BY created_at DESC;
```

## 🔄 重新生成 ZIP

如果想清除快取，強制重新生成：

```sql
-- 清除特定申請的快取
UPDATE listing_applications
SET 
  zip_cache_url = NULL,
  zip_generating = false
WHERE application_id = 'STMJ3EWON0';  -- 替換成實際的 ID

-- 或清除所有快取
UPDATE listing_applications
SET 
  zip_cache_url = NULL,
  zip_generating = false;
```

## 📞 需要更多幫助

如果問題仍未解決，請提供：

1. **Supabase SQL 執行結果**（步驟 2 的輸出）
2. **瀏覽器 Console 錯誤訊息**（完整的錯誤 JSON）
3. **Netlify Functions 日誌**（如果能訪問）

---

## ✅ 成功標誌

修復成功後，你應該能：

- ✅ 點擊下載按鈕不再出現 500 錯誤
- ✅ 看到實時進度（生成中 2s, 4s, 6s...）
- ✅ 30-60 秒後自動下載 ZIP 檔案
- ✅ 第二次下載同一個申請時立即開始下載

祝順利！🎉

