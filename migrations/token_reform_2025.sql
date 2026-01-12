-- =========================================
-- 🔄 代幣制度改革 - 資料庫註解與邏輯更新
-- =========================================
-- 執行日期：2025-01-XX
-- 目的：將「代幣」概念改為「張數」，使計價更直觀
-- 影響範圍：註解更新 + 無數據遺失
-- 安全等級：✅ 高（僅更新註解，不修改數值）
-- =========================================

BEGIN;

-- =========================================
-- 1️⃣ 更新 users 表
-- =========================================

COMMENT ON COLUMN users.sticker_credits IS '可用張數（每張對應一張貼圖生成額度）';
COMMENT ON COLUMN users.referral_code IS '用戶推薦碼（6位）';
COMMENT ON COLUMN users.referred_by IS '被誰推薦（推薦人的 LINE user ID）';
COMMENT ON COLUMN users.referral_count IS '成功推薦次數（每次推薦獎勵 10 張，上限 30 次）';

-- =========================================
-- 2️⃣ 更新 token_ledger 表（張數帳本）
-- =========================================

COMMENT ON TABLE token_ledger IS '張數帳本表（追蹤每筆張數的有效期和剩餘數量，支援 FIFO 扣除）';
COMMENT ON COLUMN token_ledger.tokens IS '該筆張數的原始數量';
COMMENT ON COLUMN token_ledger.remaining_tokens IS '該筆張數的剩餘可用數量（扣款時遞減）';
COMMENT ON COLUMN token_ledger.source_type IS '張數來源類型：purchase(購買), bonus(贈送), referral(推薦), admin(管理員), initial(初始)';
COMMENT ON COLUMN token_ledger.source_order_id IS '來源訂單 ID（若為購買）';
COMMENT ON COLUMN token_ledger.source_description IS '來源描述（如：購買基礎包 140 張）';
COMMENT ON COLUMN token_ledger.acquired_at IS '取得時間';
COMMENT ON COLUMN token_ledger.expires_at IS '張數到期時間（購買/取得後 30 天）';
COMMENT ON COLUMN token_ledger.is_expired IS '是否已過期（由定時任務自動更新）';

-- =========================================
-- 3️⃣ 更新 token_transactions 表（張數交易記錄）
-- =========================================

COMMENT ON TABLE token_transactions IS '張數交易記錄表（記錄所有張數的增減）';
COMMENT ON COLUMN token_transactions.user_id IS 'LINE 用戶 ID';
COMMENT ON COLUMN token_transactions.amount IS '張數變動量（正數=增加，負數=消耗）';
COMMENT ON COLUMN token_transactions.balance_after IS '交易後剩餘張數';
COMMENT ON COLUMN token_transactions.transaction_type IS '交易類型：initial(初始40張), purchase(購買), generate(生成消耗), download(下載60張), listing(代上架20張), admin_adjust(管理員調整), refund(退款), referral(推薦獎勵10張)';
COMMENT ON COLUMN token_transactions.description IS '交易描述（如：生成貼圖組「可愛貓咪」消耗 6 張）';
COMMENT ON COLUMN token_transactions.reference_id IS '關聯 ID（如貼圖組 ID、訂單 ID）';
COMMENT ON COLUMN token_transactions.admin_note IS '管理員備註（僅 admin_adjust 類型使用）';
COMMENT ON COLUMN token_transactions.expires_at IS '該筆張數的到期時間（若適用）';
COMMENT ON COLUMN token_transactions.order_id IS '關聯的訂單 ID（若為購買）';

-- =========================================
-- 4️⃣ 更新 orders 表（LINE Pay 訂單）
-- =========================================

COMMENT ON TABLE orders IS 'LINE Pay 訂單表（追蹤張數購買交易）';
COMMENT ON COLUMN orders.order_id IS '訂單編號（格式：TKNXXXXXX）';
COMMENT ON COLUMN orders.user_id IS 'LINE 用戶 ID';
COMMENT ON COLUMN orders.package_id IS '方案 ID：basic(基礎包), value(超值包)';
COMMENT ON COLUMN orders.package_name IS '方案名稱：基礎包(140張)、超值包(260張)';
COMMENT ON COLUMN orders.token_amount IS '購買張數（不含贈送）';
COMMENT ON COLUMN orders.bonus_tokens IS '贈送張數（促銷活動用）';
COMMENT ON COLUMN orders.total_tokens IS '總張數（token_amount + bonus_tokens）';
COMMENT ON COLUMN orders.amount IS '付款金額（台幣，單位：元）';
COMMENT ON COLUMN orders.currency IS '幣別（預設 TWD）';
COMMENT ON COLUMN orders.status IS '訂單狀態：pending(待付款), processing(處理中), completed(已完成), cancelled(已取消), failed(失敗)';

-- =========================================
-- 5️⃣ 更新 referrals 表（推薦記錄）
-- =========================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'referrals'
  ) THEN
    COMMENT ON TABLE referrals IS '推薦記錄表（追蹤推薦關係和獎勵發放）';
    COMMENT ON COLUMN referrals.referrer_id IS '推薦人 LINE 用戶 ID';
    COMMENT ON COLUMN referrals.referee_id IS '被推薦人 LINE 用戶 ID';
    COMMENT ON COLUMN referrals.referrer_tokens IS '推薦人獲得張數（預設 10 張）';
    COMMENT ON COLUMN referrals.referee_tokens IS '被推薦人獲得張數（預設 10 張）';
  END IF;
END $$;

-- =========================================
-- 6️⃣ 更新函數註解
-- =========================================

COMMENT ON FUNCTION mark_expired_tokens() IS '標記所有已過期的張數（由 Cron Job 定期執行）';
COMMENT ON FUNCTION recalculate_user_balance(TEXT) IS '重新計算用戶的張數餘額（基於未過期的張數）';

-- =========================================
-- 7️⃣ 資料驗證查詢（執行後可檢查）
-- =========================================

-- 查詢所有用戶的張數餘額
-- SELECT 
--   line_user_id,
--   display_name,
--   sticker_credits AS "剩餘張數",
--   referral_count AS "推薦次數",
--   created_at AS "註冊時間"
-- FROM users
-- ORDER BY sticker_credits DESC
-- LIMIT 20;

-- 查詢張數交易統計
-- SELECT 
--   transaction_type AS "交易類型",
--   COUNT(*) AS "交易次數",
--   SUM(amount) AS "總張數變動",
--   AVG(amount) AS "平均張數"
-- FROM token_transactions
-- GROUP BY transaction_type
-- ORDER BY COUNT(*) DESC;

-- 查詢未過期的張數總量
-- SELECT 
--   COUNT(DISTINCT user_id) AS "用戶數",
--   SUM(remaining_tokens) AS "總剩餘張數",
--   AVG(remaining_tokens) AS "平均剩餘張數"
-- FROM token_ledger
-- WHERE is_expired = FALSE AND remaining_tokens > 0;

COMMIT;

-- =========================================
-- ✅ 遷移完成
-- =========================================
-- 
-- 執行結果：
-- ✓ 資料庫註解已更新為「張數」語義
-- ✓ 用戶數據保持不變（40 代幣 = 40 張）
-- ✓ 無資料遺失風險
-- 
-- 下一步：
-- 1. 檢查上述驗證查詢結果
-- 2. 修改程式碼（參考 TOKEN_REFORM_FILE_LIST.md）
-- 3. 更新前端頁面文案
-- 4. 測試完整流程
-- 
-- =========================================

