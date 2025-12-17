-- 風格設定資料表
CREATE TABLE IF NOT EXISTS style_settings (
  id SERIAL PRIMARY KEY,
  style_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10),
  description TEXT,
  core_style TEXT,
  lighting TEXT,
  composition TEXT,
  brushwork TEXT,
  mood TEXT,
  color_palette TEXT,
  forbidden TEXT,
  reference TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 構圖設定資料表
CREATE TABLE IF NOT EXISTS framing_settings (
  id SERIAL PRIMARY KEY,
  framing_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10),
  description TEXT,
  head_size_percentage INTEGER,
  prompt_addition TEXT,
  character_focus TEXT,
  compact_prompt TEXT,  -- 🆕 精簡版 Prompt（用於降低 token 使用）
  use_compact BOOLEAN DEFAULT true,  -- 🆕 是否使用精簡版
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 裝飾風格設定資料表
CREATE TABLE IF NOT EXISTS scene_settings (
  id SERIAL PRIMARY KEY,
  scene_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10),
  description TEXT,
  decoration_style TEXT,
  decoration_elements JSONB,
  pop_text_style TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_style_settings_style_id ON style_settings(style_id);
CREATE INDEX IF NOT EXISTS idx_style_settings_is_active ON style_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_framing_settings_framing_id ON framing_settings(framing_id);
CREATE INDEX IF NOT EXISTS idx_framing_settings_is_active ON framing_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_scene_settings_scene_id ON scene_settings(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_settings_is_active ON scene_settings(is_active);

-- 啟用 RLS (Row Level Security)
ALTER TABLE style_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE framing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scene_settings ENABLE ROW LEVEL SECURITY;

-- 刪除已存在的 policies（如果存在）
DROP POLICY IF EXISTS "Allow public read access" ON style_settings;
DROP POLICY IF EXISTS "Allow public read access" ON framing_settings;
DROP POLICY IF EXISTS "Allow public read access" ON scene_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON style_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON style_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON framing_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON framing_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON scene_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON scene_settings;

-- 允許所有人讀取（用於前端查詢）
CREATE POLICY "Allow public read access" ON style_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON framing_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON scene_settings FOR SELECT USING (true);

-- 允許所有人寫入（管理後台已有登入驗證）
CREATE POLICY "Allow public insert access" ON style_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON style_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public insert access" ON framing_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON framing_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public insert access" ON scene_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON scene_settings FOR UPDATE USING (true);

-- 註解
COMMENT ON TABLE style_settings IS '貼圖風格設定表';
COMMENT ON TABLE framing_settings IS '貼圖構圖設定表';
COMMENT ON TABLE scene_settings IS '貼圖裝飾風格設定表';

