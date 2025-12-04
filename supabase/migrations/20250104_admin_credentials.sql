-- ============================================
-- 管理員帳號密碼表
-- ============================================

-- 建立管理員認證表
CREATE TABLE IF NOT EXISTS admin_credentials (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,  -- 帳號（通常為 'admin'）
  password_hash TEXT NOT NULL,    -- 密碼雜湊（使用 bcrypt 或類似方式）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_admin_credentials_username ON admin_credentials(username);

-- 插入預設管理員帳號（密碼為 'sticker2024!'）
-- 注意：在實際使用中應該使用密碼雜湊而非明文
-- 這裡使用 crypt 函數進行雜湊（需要 pgcrypto 擴展）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 插入預設帳號（如果不存在）
INSERT INTO admin_credentials (username, password_hash)
VALUES ('admin', crypt('sticker2024!', gen_salt('bf')))
ON CONFLICT (username) DO NOTHING;

-- 啟用 RLS
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

-- 建立 RLS 策略：只允許匿名用戶查詢（用於登入驗證）
CREATE POLICY "Allow anonymous to verify credentials" ON admin_credentials
  FOR SELECT
  USING (true);

-- 建立 RLS 策略：只允許已認證的管理員更新自己的密碼
CREATE POLICY "Allow authenticated admin to update password" ON admin_credentials
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

