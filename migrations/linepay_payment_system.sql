-- ============================================
-- LINE Pay 付款系統 - 資料庫遷移腳本
-- 版本：v1.0
-- 日期：2024-01-XX
-- 功能：訂單管理、張數有效期追蹤、FIFO 扣款
-- ============================================

-- 1. 訂單表（追蹤 LINE Pay 交易）
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,           -- 訂單編號（自動生成，如 TKNXXXXXX）
  user_id TEXT NOT NULL,                   -- LINE user ID
  
  -- 商品資訊
  package_id TEXT NOT NULL,                -- 方案 ID：starter, value, popular, deluxe
  package_name TEXT NOT NULL,              -- 方案名稱：入門包、超值包、熱門包、豪華包
  token_amount INTEGER NOT NULL,           -- 張數數量（不含贈送）
  bonus_tokens INTEGER DEFAULT 0,          -- 贈送張數
  total_tokens INTEGER NOT NULL,           -- 總張數數（token_amount + bonus_tokens）
  
  -- 付款資訊
  amount INTEGER NOT NULL,                 -- 金額（台幣，單位：元）
  currency TEXT DEFAULT 'TWD',             -- 幣別
  
  -- LINE Pay 資訊
  transaction_id TEXT,                     -- LINE Pay transaction ID
  payment_url TEXT,                        -- 付款 URL
  
  -- 狀態追蹤
  status TEXT DEFAULT 'pending',           -- pending, paid, cancelled, expired, refunded
  paid_at TIMESTAMP WITH TIME ZONE,        -- 付款完成時間
  tokens_issued BOOLEAN DEFAULT FALSE,     -- 張數是否已發放（防止重複發放）
  
  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,     -- 訂單過期時間（建立後 15 分鐘）
  
  CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(line_user_id) ON DELETE CASCADE
);

-- 訂單表索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at) WHERE status = 'pending';

-- 訂單表註解
COMMENT ON TABLE orders IS 'LINE Pay 訂單記錄表';
COMMENT ON COLUMN orders.order_id IS '訂單編號（格式：TKNXXXXXX）';
COMMENT ON COLUMN orders.status IS '訂單狀態：pending=待付款, paid=已付款, cancelled=已取消, expired=已過期, refunded=已退款';
COMMENT ON COLUMN orders.tokens_issued IS '張數發放標記（防止重複發放）';
COMMENT ON COLUMN orders.expires_at IS '訂單過期時間（建立後 15 分鐘）';

-- ============================================

-- 2. 張數帳本表（追蹤每筆張數的有效期，支援 FIFO 扣款）
CREATE TABLE IF NOT EXISTS token_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,                      -- LINE user ID
  
  -- 張數資訊
  tokens INTEGER NOT NULL,                    -- 張數數量（入帳時的數量）
  remaining_tokens INTEGER NOT NULL,          -- 剩餘可用張數（會隨消耗減少）
  
  -- 來源追蹤
  source_type TEXT NOT NULL,                  -- purchase(購買), bonus(贈送), referral(推薦), admin(管理員), initial(初始)
  source_order_id TEXT,                       -- 來源訂單 ID（若為購買）
  source_description TEXT,                    -- 來源描述
  
  -- 有效期管理（365 天）
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 取得時間
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,        -- 到期時間（取得時間 + 365 天）
  is_expired BOOLEAN DEFAULT FALSE,                     -- 是否已過期
  
  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES users(line_user_id) ON DELETE CASCADE,
  CONSTRAINT chk_remaining_tokens CHECK (remaining_tokens >= 0 AND remaining_tokens <= tokens)
);

-- 張數帳本索引
CREATE INDEX IF NOT EXISTS idx_token_ledger_user_id ON token_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_token_ledger_expires_at ON token_ledger(expires_at);
CREATE INDEX IF NOT EXISTS idx_token_ledger_source_order ON token_ledger(source_order_id);

-- 重要：用於 FIFO 扣款的複合索引
-- 查詢「特定用戶的未過期且有剩餘張數的記錄，按到期時間排序」
CREATE INDEX IF NOT EXISTS idx_token_ledger_fifo ON token_ledger(user_id, expires_at) 
  WHERE remaining_tokens > 0 AND is_expired = FALSE;

-- 張數帳本註解
COMMENT ON TABLE token_ledger IS '張數帳本表（追蹤每筆張數的有效期和剩餘數量）';
COMMENT ON COLUMN token_ledger.tokens IS '該筆張數的原始數量';
COMMENT ON COLUMN token_ledger.remaining_tokens IS '該筆張數的剩餘可用數量（扣款時遞減）';
COMMENT ON COLUMN token_ledger.source_type IS '張數來源類型';
COMMENT ON COLUMN token_ledger.expires_at IS '張數到期時間（購買/取得後 365 天）';
COMMENT ON COLUMN token_ledger.is_expired IS '是否已過期（由定時任務自動更新）';

-- ============================================

-- 3. 更新現有 token_transactions 表（添加有效期和訂單關聯）
ALTER TABLE token_transactions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE token_transactions 
ADD COLUMN IF NOT EXISTS order_id TEXT;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_token_transactions_order_id ON token_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_expires_at ON token_transactions(expires_at);

-- 添加註解
COMMENT ON COLUMN token_transactions.expires_at IS '張數到期時間（購買後 365 天）';
COMMENT ON COLUMN token_transactions.order_id IS '關聯的訂單 ID（若為購買產生）';

-- ============================================

-- 4. 自動標記過期張數的函數
CREATE OR REPLACE FUNCTION mark_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE token_ledger
  SET is_expired = TRUE, updated_at = NOW()
  WHERE expires_at < NOW() AND is_expired = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_expired_tokens() IS '標記所有已過期的張數（由 Cron Job 定期執行）';

-- ============================================

-- 5. 重新計算用戶餘額的函數（基於未過期的張數）
CREATE OR REPLACE FUNCTION recalculate_user_balance(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  total_balance INTEGER;
BEGIN
  -- 計算所有未過期張數的剩餘數量總和
  SELECT COALESCE(SUM(remaining_tokens), 0)
  INTO total_balance
  FROM token_ledger
  WHERE user_id = p_user_id 
    AND is_expired = FALSE 
    AND remaining_tokens > 0;
  
  -- 更新用戶表中的張數餘額
  UPDATE users
  SET sticker_credits = total_balance, updated_at = NOW()
  WHERE line_user_id = p_user_id;
  
  RETURN total_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_user_balance(TEXT) IS '重新計算用戶的張數餘額（基於未過期的張數）';

-- ============================================

-- 6. 自動清理過期訂單的函數
CREATE OR REPLACE FUNCTION cleanup_expired_orders()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- 將超過 expires_at 且仍為 pending 的訂單標記為 expired
  UPDATE orders
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_orders() IS '將已過期的待付款訂單標記為 expired';

-- ============================================

-- 7. 啟用 Row Level Security（可選）
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_ledger ENABLE ROW LEVEL SECURITY;

-- 允許後端服務帳號完全訪問（需要設定 service_role）
CREATE POLICY "Service role has full access to orders" ON orders
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to token_ledger" ON token_ledger
  FOR ALL USING (true);

-- ============================================

-- 8. 初始化測試數據（可選，僅用於開發環境）
-- 取消註解以下內容以建立測試訂單

/*
INSERT INTO orders (
  order_id, user_id, package_id, package_name, 
  token_amount, bonus_tokens, total_tokens, 
  amount, status, expires_at
) VALUES (
  'TKN_TEST_001', 'TEST_USER', 'starter', '入門包', 
  30, 0, 30, 
  99, 'pending', NOW() + INTERVAL '15 minutes'
);
*/

-- ============================================
-- 執行說明
-- ============================================
-- 
-- 1. 在 Supabase SQL Editor 中執行此腳本
-- 2. 或使用 Supabase CLI:
--    supabase migration new linepay_system
--    supabase db push
-- 
-- 3. 定期執行的維護任務（建議使用 Netlify Scheduled Functions 或 EasyCron）：
--    - 每天 00:00: SELECT mark_expired_tokens();
--    - 每天 00:10: SELECT cleanup_expired_orders();
--    - 每天 09:00: 執行 notify-expiring-tokens.js（提醒用戶）
-- 
-- 4. 監控指標：
--    - 訂單轉換率: SELECT COUNT(*) FILTER (WHERE status='paid') * 100.0 / COUNT(*) FROM orders;
--    - 平均訂單金額: SELECT AVG(amount) FROM orders WHERE status='paid';
--    - 張數使用率: 查詢 token_transactions 的消耗記錄
-- 
-- ============================================

