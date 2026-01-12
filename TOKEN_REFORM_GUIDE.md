# 🎯 代幣制度改革 - 執行指引

## 📊 改革內容概覽

### 變更重點
1. **術語統一**：「代幣」→「張數」（更直觀）
2. **方案優化**：張數加倍，價格不變
3. **計價簡化**：1 張貼圖 = 1 張

### 方案對照表

| 項目 | 舊方案 | 新方案 | 變化 |
|------|--------|--------|------|
| **基礎包** | 70張 / $300 | **140張 / $300** | 💰 張數 ×2 |
| **超值包** | 130張 / $500 | **260張 / $500** | 💰 張數 ×2 |
| **新用戶贈送** | 40 張 | 40 張 | ✅ 不變 |
| **推薦獎勵** | 10 張 | 10 張 | ✅ 不變 |

---

## 🚀 快速開始

### 方式 A：一鍵部署（推薦）

```bash
# 執行自動部署腳本
./deploy-token-reform.sh
```

腳本會自動：
- ✅ 檢查必要檔案
- ✅ 提示執行 SQL 遷移
- ✅ 提交並推送程式碼
- ✅ 提供測試清單

---

### 方式 B：手動執行

#### Step 1: 執行資料庫遷移

**🌐 使用 Supabase Dashboard（最簡單）**

1. 開啟 SQL Editor:
   ```
   https://supabase.com/dashboard/project/kqucbzvjukhxycvgosbo/sql
   ```

2. 點選「New Query」

3. 複製 `migrations/token_reform_2025.sql` 的完整內容

4. 貼上到編輯器

5. 點選「Run」執行

6. 確認看到「Success. No rows returned」訊息

**💻 或使用命令列（需安裝 psql）**

```bash
# macOS 安裝 PostgreSQL
brew install postgresql

# 執行遷移
psql "postgresql://postgres.kqucbzvjukhxycvgosbo:Aa0934003778@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" \
  -f migrations/token_reform_2025.sql
```

---

#### Step 2: 驗證資料庫

在 Supabase SQL Editor 執行以下驗證查詢：

```sql
-- 1️⃣ 檢查用戶統計
SELECT 
  COUNT(*) as "總用戶數",
  SUM(sticker_credits) as "總張數",
  AVG(sticker_credits)::numeric(10,2) as "平均張數"
FROM users;

-- 2️⃣ 檢查交易類型統計
SELECT 
  transaction_type AS "交易類型",
  COUNT(*) AS "交易次數",
  SUM(amount) AS "總張數變動",
  AVG(amount)::numeric(10,2) AS "平均張數"
FROM token_transactions
GROUP BY transaction_type
ORDER BY COUNT(*) DESC;

-- 3️⃣ 檢查未過期張數
SELECT 
  COUNT(DISTINCT user_id) AS "持有用戶數",
  SUM(remaining_tokens) AS "總剩餘張數",
  AVG(remaining_tokens)::numeric(10,2) AS "平均剩餘張數"
FROM token_ledger
WHERE is_expired = FALSE AND remaining_tokens > 0;
```

**預期結果：**
- 所有查詢都能正常執行
- 數據完整，無異常值
- 總張數與交易記錄對應

---

#### Step 3: 部署程式碼

```bash
# 1. 查看變更
git status

# 2. 提交變更
git add .
git commit -m "🎯 代幣制度改革：統一改為「張數」，方案加倍（140張/260張）"

# 3. 推送到遠端
git push origin main

# 4. 等待 Netlify 自動部署（2-3 分鐘）
# 查看部署狀態：https://app.netlify.com/sites/sticker-tycoon/deploys
```

---

## ✅ 部署後測試

### 1. LINE Bot 測試

| 測試項目 | 操作 | 預期結果 |
|---------|------|---------|
| 查看餘額 | 發送「張數」或「餘額」 | 顯示正確張數（不是「代幣」） |
| 購買方案 | 發送「購買」 | 顯示 140張/$300 和 260張/$500 |
| 生成 6 張 | 完成生成流程 | 扣除 6 張 |
| 生成 12 張 | 完成生成流程 | 扣除 12 張 |
| 推薦獎勵 | 新用戶使用推薦碼 | 雙方各獲得 10 張 |

### 2. 前端測試（如有）

- [ ] 購買頁面顯示正確方案
- [ ] 餘額顯示使用「張」
- [ ] 交易記錄文案正確

### 3. 資料完整性

```sql
-- 檢查是否有負數餘額（異常）
SELECT line_user_id, sticker_credits
FROM users
WHERE sticker_credits < 0;

-- 應返回 0 筆記錄
```

---

## 🔄 回滾方案

如果發現問題需要回滾：

### 程式碼回滾
```bash
git revert HEAD
git push origin main
```

### 資料庫回滾
**注意：本次遷移只更新註解，無需回滾資料**

如需修改註解，執行：
```sql
-- 將「張數」改回「代幣」
COMMENT ON COLUMN users.sticker_credits IS '可用代幣（每枚對應一次生成額度）';
-- ... 其他欄位類似
```

---

## 📞 支援資訊

遇到問題？檢查以下項目：

1. **資料庫遷移失敗**
   - 檢查 SQL 語法錯誤
   - 確認有足夠權限
   - 查看 Supabase Logs

2. **部署後出現錯誤**
   - 查看 Netlify 部署日誌
   - 檢查環境變數設定
   - 測試 API 端點

3. **用戶反饋異常**
   - 查看 token_transactions 記錄
   - 執行資料驗證查詢
   - 檢查快取是否更新

---

## 📚 相關文件

- 📄 SQL 遷移檔案：`migrations/token_reform_2025.sql`
- 📋 部署清單：`TOKEN_REFORM_DEPLOYMENT_CHECKLIST.md`
- 🔧 部署腳本：`deploy-token-reform.sh`
- 📖 API 文件：`docs/api/LINE_PAY_INTEGRATION_GUIDE.md`

---

**最後更新：** 2025-01-XX  
**狀態：** ✅ 準備就緒  
**預估時間：** 15-20 分鐘

