# 🐛 代幣制度改革 - Bug 修復記錄

## 問題描述

執行 `migrations/token_reform_2025.sql` 時出現錯誤：

```
ERROR: 42703: column "reward_amount" of relation "referrals" does not exist
CONTEXT: SQL statement "COMMENT ON COLUMN referrals.reward_amount IS '推薦獎勵張數（預設 10 張）'"
PL/pgSQL function inline_code_block line 10 at SQL statement
```

## 根本原因

`referrals` 表的實際欄位結構與 SQL 遷移檔案中的假設不符。

### 實際欄位結構
```sql
CREATE TABLE referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL,         -- 推薦人 LINE user ID
  referee_id TEXT NOT NULL UNIQUE,   -- 被推薦人 LINE user ID
  referrer_tokens INTEGER DEFAULT 10, -- 推薦人獲得代幣
  referee_tokens INTEGER DEFAULT 10,  -- 被推薦人獲得代幣
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 錯誤的假設
SQL 遷移檔案中假設的欄位：
- ❌ `reward_amount` - **不存在**
- ❌ `is_rewarded` - **不存在**

### 正確的欄位
- ✅ `referrer_tokens` - 推薦人獲得的張數
- ✅ `referee_tokens` - 被推薦人獲得的張數

---

## 修復方案

### 修復檔案 1: `migrations/token_reform_2025.sql`

**修改前**（第 65-82 行）：
```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'referrals'
  ) THEN
    COMMENT ON TABLE referrals IS '推薦記錄表（追蹤推薦關係和獎勵發放）';
    COMMENT ON COLUMN referrals.referrer_id IS '推薦人 LINE 用戶 ID';
    COMMENT ON COLUMN referrals.referee_id IS '被推薦人 LINE 用戶 ID';
    COMMENT ON COLUMN referrals.reward_amount IS '推薦獎勵張數（預設 10 張）';  -- ❌ 錯誤
    COMMENT ON COLUMN referrals.is_rewarded IS '是否已發放獎勵';  -- ❌ 錯誤
  END IF;
END $$;
```

**修改後**：
```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'referrals'
  ) THEN
    COMMENT ON TABLE referrals IS '推薦記錄表（追蹤推薦關係和獎勵發放）';
    COMMENT ON COLUMN referrals.referrer_id IS '推薦人 LINE 用戶 ID';
    COMMENT ON COLUMN referrals.referee_id IS '被推薦人 LINE 用戶 ID';
    COMMENT ON COLUMN referrals.referrer_tokens IS '推薦人獲得張數（預設 10 張）';  -- ✅ 正確
    COMMENT ON COLUMN referrals.referee_tokens IS '被推薦人獲得張數（預設 10 張）';  -- ✅ 正確
  END IF;
END $$;
```

### 修復檔案 2: `scripts/migrate-token-to-stickers.sh`

**修改前**（第 60-69 行）：
```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'referrals'
  ) THEN
    COMMENT ON COLUMN referrals.reward_amount IS '推薦獎勵張數（預設 10 張）';  -- ❌ 錯誤
  END IF;
END $$;
```

**修改後**：
```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'referrals'
  ) THEN
    COMMENT ON TABLE referrals IS '推薦記錄表（追蹤推薦關係和獎勵發放）';
    COMMENT ON COLUMN referrals.referrer_id IS '推薦人 LINE 用戶 ID';
    COMMENT ON COLUMN referrals.referee_id IS '被推薦人 LINE 用戶 ID';
    COMMENT ON COLUMN referrals.referrer_tokens IS '推薦人獲得張數（預設 10 張）';  -- ✅ 正確
    COMMENT ON COLUMN referrals.referee_tokens IS '被推薦人獲得張數（預設 10 張）';  -- ✅ 正確
  END IF;
END $$;
```

---

## 驗證步驟

### 1. 檢查 referrals 表結構
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'referrals'
ORDER BY ordinal_position;
```

**預期輸出**：
```
column_name      | data_type | column_default
-----------------+-----------+----------------
id               | bigint    | nextval(...)
referrer_id      | text      | NULL
referee_id       | text      | NULL
referrer_tokens  | integer   | 10
referee_tokens   | integer   | 10
created_at       | timestamp | now()
```

### 2. 執行修正後的遷移 SQL
```bash
# 在 Supabase Dashboard SQL Editor 中執行
# 或使用 psql
psql $DATABASE_URL < migrations/token_reform_2025.sql
```

### 3. 驗證註解已更新
```sql
SELECT 
  col.column_name,
  pg_catalog.col_description(pgc.oid, col.ordinal_position) AS column_comment
FROM information_schema.columns col
JOIN pg_catalog.pg_class pgc ON pgc.relname = col.table_name
WHERE col.table_name = 'referrals'
ORDER BY col.ordinal_position;
```

**預期輸出**：
```
column_name      | column_comment
-----------------+------------------------------
referrer_id      | 推薦人 LINE 用戶 ID
referee_id       | 被推薦人 LINE 用戶 ID
referrer_tokens  | 推薦人獲得張數（預設 10 張）
referee_tokens   | 被推薦人獲得張數（預設 10 張）
```

---

## ✅ 修復狀態

- [x] 已修正 `migrations/token_reform_2025.sql`
- [x] 已修正 `scripts/migrate-token-to-stickers.sh`
- [x] 已驗證 SQL 語法正確
- [x] 已建立此修復文檔

---

## 📝 經驗教訓

1. **先查實際結構**：在撰寫 DDL/DML 前，務必先查詢實際的資料庫結構
2. **使用條件判斷**：使用 `IF EXISTS` 和 `DO $$ ... END $$` 來處理可能不存在的表或欄位
3. **分步驟測試**：先在測試環境執行，確認無誤後再到生產環境

---

## 🚀 現在可以安全執行

修復後的遷移檔案現在可以安全執行，不會再出現欄位不存在的錯誤。

```bash
# 執行遷移
psql $DATABASE_URL < migrations/token_reform_2025.sql
```

