#!/bin/bash

# =========================================
# 🔄 代幣制度改革 - 資料庫遷移腳本
# =========================================
# 
# 功能：更新資料庫註解，將「代幣」語義改為「張數」
# 影響：僅更新註解，不修改任何數值
# 安全：無資料遺失風險
#
# =========================================

echo "🚀 開始執行代幣制度改革..."
echo ""

# 檢查環境變數
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ 錯誤：請先設定 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 環境變數"
  exit 1
fi

echo "✅ 環境變數檢查通過"
echo ""

# 建立 SQL 遷移檔案
cat > /tmp/token_reform_migration.sql << 'EOF'
-- =========================================
-- 🔄 代幣制度改革 - 資料庫註解更新
-- =========================================
-- 執行時間：2025-01-XX
-- 目的：將「代幣」概念改為「張數」
-- 影響：僅更新註解，不影響數據
-- =========================================

-- 1. 更新 users 表註解
COMMENT ON COLUMN users.sticker_credits IS '可用張數（每張對應一張貼圖生成額度）';

-- 2. 更新 token_ledger 表註解
COMMENT ON TABLE token_ledger IS '張數帳本表（追蹤每筆張數的有效期和剩餘數量，支援 FIFO 扣除）';
COMMENT ON COLUMN token_ledger.tokens IS '該筆張數的原始數量';
COMMENT ON COLUMN token_ledger.remaining_tokens IS '該筆張數的剩餘可用數量（扣款時遞減）';
COMMENT ON COLUMN token_ledger.source_type IS '張數來源類型：purchase(購買), bonus(贈送), referral(推薦), admin(管理員), initial(初始)';
COMMENT ON COLUMN token_ledger.expires_at IS '張數到期時間（購買/取得後 30 天）';
COMMENT ON COLUMN token_ledger.is_expired IS '是否已過期（由定時任務自動更新）';

-- 3. 更新 token_transactions 表註解
COMMENT ON TABLE token_transactions IS '張數交易記錄表（記錄所有張數的增減）';
COMMENT ON COLUMN token_transactions.amount IS '張數變動量（正數=增加，負數=消耗）';
COMMENT ON COLUMN token_transactions.balance_after IS '交易後剩餘張數';
COMMENT ON COLUMN token_transactions.transaction_type IS '交易類型：initial(初始), purchase(購買), generate(生成消耗), download(下載), listing(代上架), admin_adjust(管理員調整), refund(退款), referral(推薦獎勵)';
COMMENT ON COLUMN token_transactions.description IS '交易描述（如：生成貼圖組「XXX」消耗 6 張）';

-- 4. 更新 orders 表註解
COMMENT ON TABLE orders IS 'LINE Pay 訂單表（追蹤張數購買交易）';
COMMENT ON COLUMN orders.package_name IS '方案名稱：基礎包(140張)、超值包(260張)';
COMMENT ON COLUMN orders.token_amount IS '購買張數（不含贈送）';
COMMENT ON COLUMN orders.bonus_tokens IS '贈送張數';
COMMENT ON COLUMN orders.total_tokens IS '總張數（token_amount + bonus_tokens）';

-- 5. 更新 referrals 表註解（如果存在）
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
-- ✅ 遷移完成
-- =========================================

-- 驗證：查詢所有用戶的張數餘額
-- SELECT 
--   line_user_id,
--   display_name,
--   sticker_credits AS "剩餘張數",
--   created_at AS "註冊時間"
-- FROM users
-- ORDER BY created_at DESC
-- LIMIT 10;

EOF

echo "📝 已建立 SQL 遷移檔案：/tmp/token_reform_migration.sql"
echo ""

# 詢問是否執行
read -p "⚠️  是否要執行資料庫遷移？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ 已取消執行"
  exit 0
fi

echo ""
echo "🔄 執行中..."
echo ""

# 執行 SQL（需要先安裝 Supabase CLI 或使用 psql）
# 方法 1: 使用 Supabase CLI
if command -v supabase &> /dev/null; then
  supabase db execute --file /tmp/token_reform_migration.sql
  echo "✅ 遷移完成（使用 Supabase CLI）"
else
  # 方法 2: 提示手動執行
  echo "📋 請手動執行以下步驟："
  echo ""
  echo "1. 登入 Supabase Dashboard："
  echo "   $SUPABASE_URL"
  echo ""
  echo "2. 前往 SQL Editor"
  echo ""
  echo "3. 複製以下檔案內容並執行："
  echo "   /tmp/token_reform_migration.sql"
  echo ""
  echo "或使用 psql 執行："
  echo "   psql \$DATABASE_URL < /tmp/token_reform_migration.sql"
fi

echo ""
echo "✅ 資料庫遷移腳本已準備完成"
echo ""
echo "📊 下一步："
echo "   1. 檢查資料庫註解是否更新成功"
echo "   2. 開始修改程式碼（參考 TOKEN_REFORM_FILE_LIST.md）"
echo "   3. 執行測試"
echo ""

