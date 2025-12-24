-- Migration: Add Web User Support
-- 為 users 表添加 Web 用戶支援欄位

-- 1. 添加新欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(10) DEFAULT 'line';

-- 2. 創建索引
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- 3. 為現有用戶設定 user_type
UPDATE users SET user_type = 'line' WHERE user_type IS NULL;

-- 4. 確保 line_user_id 和 auth_user_id 至少有一個有值
-- (這需要應用程式層面處理，不在 DB 層強制)

-- 5. 更新 sticker_sets 表以支援 Web 用戶
ALTER TABLE sticker_sets ADD COLUMN IF NOT EXISTS source VARCHAR(10) DEFAULT 'line';
CREATE INDEX IF NOT EXISTS idx_sticker_sets_source ON sticker_sets(source);

-- 6. 更新 generation_tasks 表
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS source VARCHAR(10) DEFAULT 'line';
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS photo_data TEXT;
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS scene_config TEXT;
CREATE INDEX IF NOT EXISTS idx_generation_tasks_source ON generation_tasks(source);

-- 完成訊息
-- 注意：執行此遷移後，需要在 Supabase Auth 中開啟 Email 註冊功能

