-- ============================================
-- 貼圖大亨 LINE Bot - Supabase 資料表結構
-- ============================================

-- 1. LINE 事件去重表（防止 webhook 重複觸發）
CREATE TABLE IF NOT EXISTS line_events (
  id BIGSERIAL PRIMARY KEY,
  reply_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_events_reply_token ON line_events(reply_token);
CREATE INDEX IF NOT EXISTS idx_line_events_created_at ON line_events(created_at);

-- 2. 用戶資料表
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  sticker_credits INTEGER DEFAULT 40,  -- 免費生成額度（每張貼圖消耗1代幣）
  is_premium BOOLEAN DEFAULT FALSE,
  admin_nickname TEXT,  -- 管理員備註名稱
  transfer_code TEXT,  -- 轉帳後五碼
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);

-- 2.1 代幣交易記錄表
CREATE TABLE IF NOT EXISTS token_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,  -- LINE user ID
  amount INTEGER NOT NULL,  -- 正數=儲值，負數=消耗
  balance_after INTEGER NOT NULL,  -- 交易後餘額
  transaction_type TEXT NOT NULL,  -- initial(初始), purchase(購買), generate(生成消耗), admin_adjust(管理員調整), refund(退款)
  description TEXT,  -- 描述（如：生成貼圖組「XXX」）
  reference_id TEXT,  -- 關聯ID（如貼圖組ID）
  admin_note TEXT,  -- 管理員備註（僅 admin_adjust 用）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(created_at);

-- 3. 貼圖組資料表
CREATE TABLE IF NOT EXISTS sticker_sets (
  id BIGSERIAL PRIMARY KEY,
  set_id TEXT UNIQUE NOT NULL,  -- UUID
  user_id TEXT NOT NULL,  -- LINE user ID
  name TEXT NOT NULL,
  description TEXT,
  style TEXT NOT NULL,  -- 風格：cute, cool, funny, simple, anime
  character_prompt TEXT,  -- 角色描述（傳統流程）
  photo_url TEXT,  -- 用戶上傳的照片 URL（照片流程）
  photo_base64 TEXT,  -- 照片 Base64 編碼（用於 AI 生成）
  sticker_count INTEGER DEFAULT 8,  -- 8, 16, 24, 32, 40
  status TEXT DEFAULT 'draft',  -- draft, generating, completed, failed
  main_image_url TEXT,  -- 主要圖片 URL
  tab_image_url TEXT,  -- 聊天室標籤圖片 URL
  zip_url TEXT,  -- 完整貼圖包下載 URL
  tokens_used INTEGER DEFAULT 0,  -- 此貼圖組消耗的代幣數
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sticker_sets_user_id ON sticker_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_sticker_sets_set_id ON sticker_sets(set_id);
CREATE INDEX IF NOT EXISTS idx_sticker_sets_status ON sticker_sets(status);

-- 4. 單張貼圖資料表
CREATE TABLE IF NOT EXISTS stickers (
  id BIGSERIAL PRIMARY KEY,
  sticker_id TEXT UNIQUE NOT NULL,  -- UUID
  set_id TEXT NOT NULL REFERENCES sticker_sets(set_id) ON DELETE CASCADE,
  index_number INTEGER NOT NULL,  -- 貼圖在組內的順序 (1-40)
  expression TEXT NOT NULL,  -- 表情/動作描述
  image_url TEXT,  -- 生成後的圖片 URL
  status TEXT DEFAULT 'pending',  -- pending, generating, completed, failed
  generation_prompt TEXT,  -- 實際使用的 AI prompt
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stickers_set_id ON stickers(set_id);
CREATE INDEX IF NOT EXISTS idx_stickers_status ON stickers(status);

-- 5. 生成任務表（異步處理）
CREATE TABLE IF NOT EXISTS generation_tasks (
  id BIGSERIAL PRIMARY KEY,
  task_id TEXT UNIQUE NOT NULL,  -- UUID
  user_id TEXT NOT NULL,
  set_id TEXT REFERENCES sticker_sets(set_id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,  -- create_set, generate_sticker, process_image
  status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  progress INTEGER DEFAULT 0,  -- 0-100 進度百分比
  result_json JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_tasks_user_id ON generation_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_task_id ON generation_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_status ON generation_tasks(status);

-- 6. 對話狀態表（追蹤用戶創建流程）
CREATE TABLE IF NOT EXISTS conversation_states (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  current_stage TEXT DEFAULT 'idle',  -- idle, naming, styling, character, expressions, confirming
  current_set_id TEXT,
  temp_data JSONB,  -- 暫存資料
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_states_user_id ON conversation_states(user_id);

-- 7. 預設表情模板
CREATE TABLE IF NOT EXISTS expression_templates (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  expressions JSONB NOT NULL,  -- 8個表情的陣列
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入預設表情模板
INSERT INTO expression_templates (name, expressions) VALUES
('基本日常', '["開心打招呼", "大笑", "哭泣", "生氣", "驚訝", "愛心眼", "睡覺", "加油"]'),
('可愛表情', '["賣萌", "害羞", "撒嬌", "委屈", "興奮", "期待", "無奈", "謝謝"]'),
('辦公室', '["OK", "讚", "加班中", "累了", "開會", "截止日", "薪水", "下班"]'),
('社交常用', '["謝謝", "抱歉", "沒問題", "好的", "等等", "再見", "晚安", "早安"]')
ON CONFLICT DO NOTHING;

-- 8. 啟用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticker_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;

-- 9. 建立 Storage Buckets
-- 注意：這需要在 Supabase Dashboard 的 Storage 介面手動建立

-- Bucket 1: sticker-images（生成的貼圖）
-- 設定為 Public（公開存取）

-- Bucket 2: user-photos（用戶上傳的照片）
-- 設定為 Public（公開存取）
-- 用於儲存用戶上傳的照片，作為 AI 生成貼圖的來源

-- 10. 上傳佇列表（用戶選擇的待上傳貼圖）
CREATE TABLE IF NOT EXISTS upload_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,  -- LINE user ID
  sticker_id TEXT NOT NULL REFERENCES stickers(sticker_id) ON DELETE CASCADE,
  source_set_id TEXT NOT NULL,  -- 來源貼圖組 ID
  image_url TEXT NOT NULL,  -- 圖片 URL
  expression TEXT,  -- 表情描述
  queue_order INTEGER,  -- 在佇列中的順序
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, sticker_id)  -- 每個用戶每張貼圖只能加入一次
);

CREATE INDEX IF NOT EXISTS idx_upload_queue_user_id ON upload_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_queue_sticker_id ON upload_queue(sticker_id);

-- 11. 清理舊資料的函數
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- 清理 7 天前的 line_events
  DELETE FROM line_events WHERE created_at < NOW() - INTERVAL '7 days';
  -- 清理 30 天前的失敗任務
  DELETE FROM generation_tasks WHERE status = 'failed' AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

