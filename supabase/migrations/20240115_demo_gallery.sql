-- 示範圖集表
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

-- 索引（使用 IF NOT EXISTS 避免重複創建）
CREATE INDEX IF NOT EXISTS idx_demo_gallery_display_order ON demo_gallery(display_order);
CREATE INDEX IF NOT EXISTS idx_demo_gallery_style ON demo_gallery(style);

-- 更新時間觸發器函數（使用 CREATE OR REPLACE 可以重複執行）
CREATE OR REPLACE FUNCTION update_demo_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 先刪除舊的觸發器（如果存在），然後創建新的
DROP TRIGGER IF EXISTS update_demo_gallery_timestamp ON demo_gallery;

CREATE TRIGGER update_demo_gallery_timestamp
  BEFORE UPDATE ON demo_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_gallery_updated_at();

-- 為 sticker_sets 添加缺失的欄位（檢查後才添加，避免重複）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='sticker_sets' AND column_name='scene') THEN
    ALTER TABLE sticker_sets ADD COLUMN scene TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='sticker_sets' AND column_name='expression_template') THEN
    ALTER TABLE sticker_sets ADD COLUMN expression_template TEXT;
  END IF;
END $$;

-- 註：stickers 表已經有 expression 欄位，無需添加

