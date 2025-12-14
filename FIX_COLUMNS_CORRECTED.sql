-- ========================================
-- 🚨 緊急修復：sticker_sets 缺少必要欄位（修正版）
-- ========================================
-- 修正：處理欄位類型不匹配問題
-- ========================================

-- Step 1: 添加缺失的欄位
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS expressions JSONB;

ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS scene TEXT DEFAULT 'none';

ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS scene_config JSONB;

ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS character_id TEXT;

-- Step 2: 驗證欄位是否添加成功
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sticker_sets'
  AND column_name IN ('expressions', 'scene', 'scene_config', 'character_id')
ORDER BY column_name;

-- 預期結果應該顯示 4 個欄位：
-- character_id | text  | NULL | YES
-- expressions  | jsonb | NULL | YES
-- scene        | text  | 'none'::text | YES
-- scene_config | jsonb | NULL | YES

-- Step 3: 為現有的貼圖組補充預設值（修正版，分開處理不同類型）
-- 處理 scene (TEXT 類型)
UPDATE sticker_sets
SET scene = 'none'
WHERE scene IS NULL;

-- 處理 expressions (JSONB 類型)
UPDATE sticker_sets
SET expressions = '[]'::jsonb
WHERE expressions IS NULL;

-- Step 4: 查看最近的貼圖組資料（檢查是否正常）
SELECT 
  set_id,
  name,
  style,
  scene,
  framing,
  sticker_count,
  expressions,
  character_id,
  status,
  created_at
FROM sticker_sets
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- ✅ 完成！現在可以測試生成了
-- ========================================

