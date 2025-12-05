-- 檢查並創建 YouTuber 推廣計畫表
-- 在 Supabase Dashboard > SQL Editor 中執行此腳本

-- 1. 檢查表是否存在
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'youtuber_promotions'
  ) THEN
    RAISE NOTICE '✅ 表 youtuber_promotions 已存在';
  ELSE
    RAISE NOTICE '⚠️  表 youtuber_promotions 不存在，將創建...';
  END IF;
END $$;

-- 2. 創建表（如果不存在）
CREATE TABLE IF NOT EXISTS youtuber_promotions (
  id BIGSERIAL PRIMARY KEY,
  application_id TEXT UNIQUE NOT NULL,
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  subscriber_count INTEGER NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  line_id TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  channel_description TEXT NOT NULL,
  filming_plan TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, approved, rejected, completed
  tokens_awarded INTEGER DEFAULT 0,  -- 已發放代幣
  video_url TEXT,  -- 上傳的影片連結
  admin_notes TEXT,  -- 管理員備註
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. 創建索引
CREATE INDEX IF NOT EXISTS idx_youtuber_promotions_status ON youtuber_promotions(status);
CREATE INDEX IF NOT EXISTS idx_youtuber_promotions_line_id ON youtuber_promotions(line_id);
CREATE INDEX IF NOT EXISTS idx_youtuber_promotions_created_at ON youtuber_promotions(created_at DESC);

-- 4. 驗證表結構
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'youtuber_promotions'
ORDER BY ordinal_position;

-- 5. 檢查現有記錄
SELECT COUNT(*) as total_applications FROM youtuber_promotions;

-- 完成
SELECT '✅ YouTuber 推廣計畫表已就緒' as status;

