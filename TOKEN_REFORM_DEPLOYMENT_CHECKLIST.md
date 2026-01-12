# 代幣制度改革 - 部署檢查清單

## ✅ 已完成的更新

### 1. 資料庫遷移
- [x] 建立 SQL 遷移檔案 `migrations/token_reform_2025.sql`
- [ ] 執行資料庫遷移（需在 Supabase Dashboard 執行）

**執行方式：**
1. 登入 Supabase Dashboard: https://supabase.com/dashboard/project/kqucbzvjukhxycvgosbo/sql
2. 複製 `migrations/token_reform_2025.sql` 的內容
3. 貼上並執行
4. 確認無錯誤訊息

### 2. 程式碼更新

#### 後端檔案
- [x] `functions/submit-for-listing.js` - 更新「代幣」→「張數」
- [x] `functions/grid-generator.js` - 更新註解
- [x] `functions/sticker-styles.js` - 更新註解
- [x] `docs/api/LINE_PAY_INTEGRATION_GUIDE.md` - 更新方案配置與文案

#### LINE Bot 訊息
- [x] `functions/line-webhook.js` - 更新購買方案顯示（140張/260張）

#### 核心邏輯檔案（已是最新）
- [x] `functions/supabase-client.js` - 已使用「張數」術語
- [x] `functions/get-tokens.js` - 已使用「張數」術語
- [x] `functions/pack-for-line.js` - 已使用「張數」術語

### 3. 方案價格更新

| 方案 | 舊價格 | 新價格 | 變更 |
|------|--------|--------|------|
| 基礎包 | 70張/$300 | **140張/$300** | ✅ 張數加倍 |
| 超值包 | 130張/$500 | **260張/$500** | ✅ 張數加倍 |
| 熱門包 | 300張/$1000 | 已移除 | ✅ 簡化方案 |

**計價邏輯：**
- 1 張貼圖 = 1 張
- 6 張貼圖 = 6 張
- 12 張貼圖 = 12 張
- 18 張貼圖 = 18 張
- 下載 ZIP = 60 張
- 代上架 = 20 張

---

## 📋 部署前檢查

### 資料庫
- [ ] 執行 SQL 遷移
- [ ] 驗證資料完整性（執行 SQL 中的驗證查詢）
- [ ] 檢查用戶餘額是否正確

### 程式碼
- [ ] 所有檔案已更新
- [ ] 本地測試通過
- [ ] Git commit 並 push

### 測試項目
- [ ] 新用戶註冊（應獲得 40 張）
- [ ] 購買張數（140張/260張方案）
- [ ] 生成貼圖（扣除對應張數）
- [ ] 下載 ZIP（扣除 60 張）
- [ ] 代上架（扣除 20 張）
- [ ] 推薦獎勵（獲得 10 張）
- [ ] 張數過期機制（30 天）

---

## 🚀 部署步驟

### Step 1: 執行資料庫遷移
```bash
# 方式 1: 使用 Supabase Dashboard（推薦）
1. 開啟 https://supabase.com/dashboard/project/kqucbzvjukhxycvgosbo/sql
2. 複製 migrations/token_reform_2025.sql 內容
3. 貼上並執行

# 方式 2: 使用 psql（如已安裝）
psql "postgresql://postgres.kqucbzvjukhxycvgosbo:Aa0934003778@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" -f migrations/token_reform_2025.sql
```

### Step 2: 驗證資料庫
```sql
-- 1. 檢查用戶總數和張數
SELECT 
  COUNT(*) as user_count,
  SUM(sticker_credits) as total_credits,
  AVG(sticker_credits) as avg_credits
FROM users;

-- 2. 檢查交易記錄統計
SELECT 
  transaction_type,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM token_transactions
GROUP BY transaction_type
ORDER BY count DESC;

-- 3. 檢查未過期張數
SELECT 
  COUNT(DISTINCT user_id) as users,
  SUM(remaining_tokens) as total_remaining
FROM token_ledger
WHERE is_expired = FALSE AND remaining_tokens > 0;
```

### Step 3: 部署程式碼
```bash
# 1. 提交變更
git add .
git commit -m "🎯 代幣制度改革：統一改為「張數」，方案加倍（140張/260張）"

# 2. 推送到遠端
git push origin main

# 3. Netlify 會自動部署
# 等待部署完成（約 2-3 分鐘）
```

### Step 4: 測試驗證
1. **LINE Bot 測試**
   - 發送「購買」→ 確認顯示 140張/260張
   - 發送「張數」→ 確認餘額正確
   - 發送「推薦好友」→ 確認文案使用「張」

2. **生成測試**
   - 生成 6 張貼圖 → 扣除 6 張
   - 生成 12 張貼圖 → 扣除 12 張

3. **購買測試**（Sandbox 環境）
   - 測試購買 140 張方案
   - 確認訂單記錄正確
   - 確認張數入帳

---

## 📊 監控指標

### 部署後監控（前 24 小時）
- [ ] 錯誤率 < 1%
- [ ] 用戶反饋無「代幣」混淆
- [ ] 購買轉換率正常
- [ ] 張數扣除邏輯正確

### 回滾方案
如果發現重大問題：
```bash
# 1. 回滾程式碼
git revert HEAD
git push origin main

# 2. 資料庫無需回滾（僅更新註解）
```

---

## 📝 相關文件

- 技術文件：`docs/api/LINE_PAY_INTEGRATION_GUIDE.md`
- 遷移 SQL：`migrations/token_reform_2025.sql`
- 部署腳本：`scripts/apply-token-reform.js`

---

## 👥 通知對象

部署完成後通知：
- [ ] 開發團隊
- [ ] 客服團隊（更新話術）
- [ ] 行銷團隊（更新文案）

---

最後更新：2025-01-XX
狀態：✅ 準備就緒

