-- ========================================
-- 🚨 緊急修復：sticker_sets 缺少必要欄位
-- ========================================
-- 執行方式：
-- 1. 登入 Supabase Dashboard
-- 2. 進入「SQL Editor」
-- 3. 複製以下 SQL 並執行
-- 4. 確認「Success」訊息
-- ========================================

-- 添加缺失的欄位
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS expressions JSONB;

ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS scene TEXT DEFAULT 'none';

ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS scene_config JSONB;

ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS character_id TEXT;

-- 驗證欄位是否添加成功
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

-- 為現有的生成中貼圖組補充預設值
UPDATE sticker_sets
SET
  scene = COALESCE(scene, 'none'),
  expressions = COALESCE(expressions, '[]'::jsonb)
WHERE scene IS NULL OR expressions IS NULL;

-- 查看最近的貼圖組資料（檢查是否正常）
SELECT 
  set_id,
  name,
  style,
  scene,
  framing,
  sticker_count,
  status,
  created_at
FROM sticker_sets
ORDER BY created_at DESC
LIMIT 5;

