-- ============================================
-- 示範圖集功能 - 完整遷移腳本（可重複執行）
-- ============================================

-- 1. 創建示範圖集表（如果不存在）
CREATE TABLE IF NOT EXISTS demo_gallery (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  style VARCHAR(50),
  style_name VARCHAR(100),
  character TEXT,
  scene TEXT,
  expression TEXT,
  set_id VARCHAR(100),
  sticker_index INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 創建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_demo_gallery_display_order ON demo_gallery(display_order);
CREATE INDEX IF NOT EXISTS idx_demo_gallery_style ON demo_gallery(style);

-- 3. 創建或替換更新時間函數
CREATE OR REPLACE FUNCTION update_demo_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 刪除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS update_demo_gallery_timestamp ON demo_gallery;

-- 5. 創建新觸發器
CREATE TRIGGER update_demo_gallery_timestamp
  BEFORE UPDATE ON demo_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_gallery_updated_at();

-- 6. 為 sticker_sets 添加缺失的欄位（如果還沒有）
DO $$ 
BEGIN
  -- 添加 scene 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sticker_sets' AND column_name='scene'
  ) THEN
    ALTER TABLE sticker_sets ADD COLUMN scene TEXT;
    RAISE NOTICE 'Added column scene to sticker_sets';
  ELSE
    RAISE NOTICE 'Column scene already exists in sticker_sets';
  END IF;
  
  -- 添加 expression_template 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sticker_sets' AND column_name='expression_template'
  ) THEN
    ALTER TABLE sticker_sets ADD COLUMN expression_template TEXT;
    RAISE NOTICE 'Added column expression_template to sticker_sets';
  ELSE
    RAISE NOTICE 'Column expression_template already exists in sticker_sets';
  END IF;
END $$;

-- 7. 驗證遷移結果
DO $$
DECLARE
  table_exists boolean;
  column_count integer;
BEGIN
  -- 檢查 demo_gallery 表是否存在
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'demo_gallery'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✅ Table demo_gallery created successfully';
    
    -- 計算欄位數量
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'demo_gallery';
    
    RAISE NOTICE '✅ demo_gallery has % columns', column_count;
  ELSE
    RAISE WARNING '❌ Table demo_gallery was not created';
  END IF;
END $$;

-- 完成
SELECT '✅ Migration completed successfully!' as status;

