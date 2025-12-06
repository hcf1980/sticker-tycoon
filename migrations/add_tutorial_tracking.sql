-- 添加功能說明追蹤欄位
-- 用於記錄用戶最後一次看到功能說明的時間，實現每週最多顯示一次

-- 1. 添加 last_tutorial_shown_at 欄位到 users 表
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_tutorial_shown_at TIMESTAMP WITH TIME ZONE;

-- 2. 添加註解說明
COMMENT ON COLUMN users.last_tutorial_shown_at IS '最後一次顯示功能說明的時間（用於控制每週最多顯示一次）';

-- 3. 為新欄位創建索引（可選，如果需要經常查詢此欄位）
CREATE INDEX IF NOT EXISTS idx_users_last_tutorial_shown 
ON users(last_tutorial_shown_at);

-- 執行說明：
-- 在 Supabase SQL Editor 中執行此 SQL
-- 或使用 Supabase CLI: supabase db push

