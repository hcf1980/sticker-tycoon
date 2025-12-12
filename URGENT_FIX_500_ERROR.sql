-- ========================================
-- 🚨 緊急修復：500 錯誤
-- ========================================
-- 原因：listing_applications 表缺少必要欄位
-- 解決：添加 zip_cache_url 和 zip_generating 欄位
-- ========================================

-- 1️⃣ 檢查欄位是否存在
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'listing_applications'
ORDER BY ordinal_position;

-- 如果上面沒有看到 zip_cache_url 和 zip_generating，執行下面的 SQL：

-- 2️⃣ 添加缺失的欄位
ALTER TABLE listing_applications 
ADD COLUMN IF NOT EXISTS zip_cache_url TEXT;

ALTER TABLE listing_applications 
ADD COLUMN IF NOT EXISTS zip_generating BOOLEAN DEFAULT FALSE;

-- 3️⃣ 驗證添加成功
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'listing_applications'
  AND column_name IN ('zip_cache_url', 'zip_generating');

-- 預期結果：
-- ┌────────────────┬──────────┬────────────────┐
-- │ column_name    │ data_type│ column_default │
-- ├────────────────┼──────────┼────────────────┤
-- │ zip_cache_url  │ text     │ NULL           │
-- │ zip_generating │ boolean  │ false          │
-- └────────────────┴──────────┴────────────────┘

-- 4️⃣ 檢查現有資料
SELECT 
  application_id,
  name_en,
  status,
  zip_cache_url,
  zip_generating,
  created_at
FROM listing_applications
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- ✅ 完成後的測試步驟
-- ========================================
-- 1. 返回管理後台：https://sticker-tycoon.netlify.app/admin/listing-manager
-- 2. 清除瀏覽器快取：Ctrl+Shift+R (Mac: Cmd+Shift+R)
-- 3. 點擊「📥 下載貼圖壓縮包」
-- 4. 觀察按鈕應該變成：⏳ 準備中... → 🔄 生成中 (2s)... → ✅ 下載完成
-- ========================================

