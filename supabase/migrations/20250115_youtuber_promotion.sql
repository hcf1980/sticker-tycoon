-- YouTuber 推廣計畫表
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
  approval_reason TEXT,  -- 審核原因/備註
  tokens_awarded INTEGER DEFAULT 0,  -- 已發放張數
  video_url TEXT,  -- 上傳的影片連結
  video_title TEXT,  -- 影片標題
  video_approval_status TEXT DEFAULT 'pending',  -- pending, approved, rejected
  video_approval_reason TEXT,  -- 影片審核原因
  admin_notes TEXT,  -- 管理員備註
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  video_approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_youtuber_promotions_status ON youtuber_promotions(status);
CREATE INDEX IF NOT EXISTS idx_youtuber_promotions_line_id ON youtuber_promotions(line_id);
CREATE INDEX IF NOT EXISTS idx_youtuber_promotions_created_at ON youtuber_promotions(created_at DESC);

