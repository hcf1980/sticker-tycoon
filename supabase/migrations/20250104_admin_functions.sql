-- ============================================
-- 管理員認證 RPC 函數
-- ============================================

-- 驗證管理員密碼函數
CREATE OR REPLACE FUNCTION verify_admin_password(
  p_username TEXT,
  p_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_password_hash TEXT;
BEGIN
  -- 取得儲存的密碼雜湊
  SELECT password_hash INTO v_password_hash
  FROM admin_credentials
  WHERE username = p_username;

  -- 如果帳號不存在，返回 false
  IF v_password_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 使用 crypt 函數驗證密碼
  RETURN v_password_hash = crypt(p_password, v_password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新管理員密碼函數
CREATE OR REPLACE FUNCTION update_admin_password(
  p_username TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_new_hash TEXT;
BEGIN
  -- 生成新的密碼雜湊
  v_new_hash := crypt(p_new_password, gen_salt('bf'));

  -- 更新密碼
  UPDATE admin_credentials
  SET password_hash = v_new_hash,
      updated_at = NOW()
  WHERE username = p_username;

  -- 檢查是否成功更新
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 取得管理員帳號列表（僅用於管理）
CREATE OR REPLACE FUNCTION get_admin_usernames()
RETURNS TABLE(username TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT admin_credentials.username
  FROM admin_credentials
  ORDER BY admin_credentials.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
