-- ========================================
-- 🔧 修復：貼圖一致性問題
-- ========================================
-- 問題：同一組貼圖分批生成時，使用不同的設定
-- 原因：sticker_sets 表缺少以下欄位：
--   - expressions（表情列表）
--   - scene（裝飾風格 ID）
--   - scene_config（裝飾配置 JSON）
--   - character_id（角色一致性 ID）
-- 解決：添加這些欄位以確保設定被保存和復用
-- ========================================

-- 1️⃣ 檢查當前欄位
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sticker_sets'
ORDER BY ordinal_position;

-- 2️⃣ 添加缺失的欄位
-- 表情列表（JSON 陣列）
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS expressions JSONB;

-- 場景/裝飾風格 ID
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS scene TEXT DEFAULT 'none';

-- 場景配置（JSON）
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS scene_config JSONB;

-- 角色一致性 ID（用於多批次生成時保持同一角色）
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS character_id TEXT;

-- 3️⃣ 驗證添加成功
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'sticker_sets'
  AND column_name IN ('expressions', 'scene', 'scene_config', 'character_id');

-- 預期結果：
-- ┌──────────────┬───────────┬────────────────┐
-- │ column_name  │ data_type │ column_default │
-- ├──────────────┼───────────┼────────────────┤
-- │ expressions  │ jsonb     │ NULL           │
-- │ scene        │ text      │ 'none'::text   │
-- │ scene_config │ jsonb     │ NULL           │
-- │ character_id │ text      │ NULL           │
-- └──────────────┴───────────┴────────────────┘

-- 4️⃣ 更新註釋（說明這些欄位的用途）
COMMENT ON COLUMN sticker_sets.expressions IS '用戶選擇的表情列表（JSON 陣列），確保多批次生成時使用相同表情';
COMMENT ON COLUMN sticker_sets.scene IS '裝飾風格 ID（none/pop/kawaii/minimal），確保風格一致性';
COMMENT ON COLUMN sticker_sets.scene_config IS '完整的場景配置（JSON），包含裝飾元素、文字樣式等';
COMMENT ON COLUMN sticker_sets.character_id IS '角色一致性 ID，確保同一組貼圖使用相同的人物特徵';

-- 5️⃣ 檢查現有資料（看是否有貼圖組）
SELECT 
  set_id,
  name,
  style,
  sticker_count,
  framing,
  scene,
  expressions,
  character_id,
  status,
  created_at
FROM sticker_sets
ORDER BY created_at DESC
LIMIT 5;

-- 6️⃣ 為現有的貼圖組補充預設值（如果需要）
-- 注意：只更新還在生成中的貼圖組，已完成的不動
UPDATE sticker_sets
SET
  scene = CASE WHEN scene IS NULL THEN 'none' ELSE scene END,
  expressions = CASE WHEN expressions IS NULL THEN '[]'::jsonb ELSE expressions END
WHERE status IN ('generating', 'draft')
  AND (scene IS NULL OR expressions IS NULL);

-- 7️⃣ 檢查更新結果
SELECT COUNT(*) as updated_count
FROM sticker_sets
WHERE scene IS NOT NULL 
  AND expressions IS NOT NULL;

-- ========================================
-- ✅ 完成後的測試步驟
-- ========================================
-- 1. 返回 LINE Bot，重新創建一組新貼圖
-- 2. 選擇 12 張或 18 張套餐（測試多批次生成）
-- 3. 檢查生成的貼圖是否：
--    ✓ 使用相同的照片/人物
--    ✓ 使用相同的風格設定
--    ✓ 使用相同的表情模板
--    ✓ 使用相同的裝飾元素
--    ✓ 使用相同的構圖方式
-- 4. 可以用以下 SQL 檢查設定是否被正確保存：
--
--    SELECT 
--      set_id, name, style, scene, framing,
--      expressions, character_id
--    FROM sticker_sets 
--    WHERE set_id = 'YOUR_SET_ID';
--
-- ========================================

