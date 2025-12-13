-- ========================================
-- 🔧 修復：貼圖一致性問題（簡化版）
-- ========================================
-- 只包含必要的 ALTER TABLE 語句，避免錯誤
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

-- 添加註釋
COMMENT ON COLUMN sticker_sets.expressions IS '用戶選擇的表情列表（JSON 陣列），確保多批次生成時使用相同表情';
COMMENT ON COLUMN sticker_sets.scene IS '裝飾風格 ID（none/pop/kawaii/minimal），確保風格一致性';
COMMENT ON COLUMN sticker_sets.scene_config IS '完整的場景配置（JSON），包含裝飾元素、文字樣式等';
COMMENT ON COLUMN sticker_sets.character_id IS '角色一致性 ID，確保同一組貼圖使用相同的人物特徵';

-- 驗證欄位已添加
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'sticker_sets'
  AND column_name IN ('expressions', 'scene', 'scene_config', 'character_id')
ORDER BY column_name;

