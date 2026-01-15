# Beacon 系統問題修復指南

## 🚨 問題 1：觸發動作頁面顯示關聯錯誤

### 錯誤訊息
```
❌ 載入失敗: Could not find a relationship between 'beacon_actions' and 'beacon_devices' in the schema cache
```

### 原因
`beacon_actions` 表缺少與 `beacon_devices` 表的外鍵關聯。

### 解決方案

在 **Supabase SQL Editor** 執行以下 SQL：

```sql
-- 修正 beacon_actions 表的外鍵關聯
DO $$ 
BEGIN
  -- 檢查外鍵是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'beacon_actions_hwid_fkey'
      AND table_name = 'beacon_actions'
  ) THEN
    -- 添加外鍵約束
    ALTER TABLE beacon_actions 
    ADD CONSTRAINT beacon_actions_hwid_fkey 
    FOREIGN KEY (hwid) REFERENCES beacon_devices(hwid) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ 外鍵約束已添加';
  ELSE
    RAISE NOTICE 'ℹ️ 外鍵約束已存在';
  END IF;
END $$;

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_beacon_actions_hwid ON beacon_actions(hwid);

-- 驗證外鍵
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'beacon_actions'
  AND tc.constraint_type = 'FOREIGN KEY';
```

---

## 🚨 問題 2：實作每日觸發次數限制

### 需求
每個用戶每天最多觸發 2 次同一個動作。

### 解決方案

#### 步驟 1：執行 SQL 更新

在 **Supabase SQL Editor** 執行：

```sql
-- 檔案：database/FIX_BEACON_ACTIONS_DAILY_LIMIT.sql
-- （複製完整內容並執行）
```

這會：
1. 添加 `daily_limit` 欄位（預設 2 次）
2. 添加 `cooldown_minutes` 欄位（預設 60 分鐘）
3. 建立 `check_beacon_daily_limit()` 函數
4. 建立 `check_beacon_cooldown()` 函數
5. 建立必要的索引

#### 步驟 2：驗證函數

```sql
-- 測試每日限制函數
SELECT * FROM check_beacon_daily_limit(
  'test_user',
  '0000000019',
  (SELECT id FROM beacon_actions LIMIT 1)
);

-- 測試冷卻時間函數
SELECT * FROM check_beacon_cooldown(
  'test_user',
  '0000000019',
  (SELECT id FROM beacon_actions LIMIT 1)
);
```

#### 步驟 3：重新部署函數

```bash
# 推送更新（已完成）
git pull origin main

# Netlify 會自動重新部署
```

---

## 📊 驗證修復結果

### 1. 檢查資料表結構

```sql
-- 檢查 beacon_actions 表
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'beacon_actions'
ORDER BY ordinal_position;

-- 應該看到：
-- - hwid (varchar)
-- - daily_limit (integer, default 2)
-- - cooldown_minutes (integer, default 60)
```

### 2. 檢查外鍵關聯

```sql
-- 檢查外鍵約束
SELECT 
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'beacon_actions'
  AND constraint_type = 'FOREIGN KEY';

-- 應該看到：
-- - beacon_actions_hwid_fkey
-- - beacon_actions_message_id_fkey
```

### 3. 測試觸發限制

1. **靠近 Beacon 第 1 次**
   - ✅ 應該收到推送訊息
   - 檢查 `beacon_events` 表：`message_sent = true`

2. **立即靠近 Beacon 第 2 次**（冷卻時間內）
   - ❌ 不應該收到推送訊息
   - 檢查 `beacon_events` 表：`message_sent = false`, `error_message = '冷卻中...'`

3. **等待冷卻時間後靠近**
   - ✅ 應該收到推送訊息（第 2 次）

4. **當天第 3 次靠近**
   - ❌ 不應該收到推送訊息
   - `error_message = '今日已達觸發上限 (2/2)'`

5. **隔天第 1 次靠近**
   - ✅ 應該收到推送訊息（重新計算）

---

## 🔍 查看觸發限制狀態

### SQL 查詢

```sql
-- 查看用戶今日觸發記錄
SELECT 
  user_id,
  hwid,
  COUNT(*) as total_triggers,
  SUM(CASE WHEN message_sent THEN 1 ELSE 0 END) as successful_triggers,
  MAX(created_at) as last_trigger_time
FROM beacon_events
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY user_id, hwid
ORDER BY last_trigger_time DESC;

-- 查看觸發失敗原因
SELECT 
  created_at,
  user_id,
  hwid,
  event_type,
  message_sent,
  error_message
FROM beacon_events
WHERE DATE(created_at) = CURRENT_DATE
  AND message_sent = false
ORDER BY created_at DESC;
```

---

## ⚙️ 自訂觸發限制

### 在管理後台修改

1. **登入管理後台**
   ```
   https://你的網站.netlify.app/admin/beacon-manager.html
   ```

2. **編輯觸發動作**
   - 切換到「⚡ 觸發動作」標籤
   - 點擊「編輯」按鈕
   - 修改「每日限制」（預設 2 次）
   - 修改「冷卻時間」（預設 60 分鐘）
   - 儲存

### 直接在資料庫修改

```sql
-- 修改特定動作的限制
UPDATE beacon_actions
SET 
  daily_limit = 3,           -- 每天最多 3 次
  cooldown_minutes = 30      -- 冷卻 30 分鐘
WHERE action_name = '進入時歡迎';

-- 批次修改所有動作
UPDATE beacon_actions
SET 
  daily_limit = 5,
  cooldown_minutes = 120;
```

---

## 📝 完整修復檢查清單

執行以下步驟確保問題已修復：

- [ ] 執行外鍵修復 SQL
- [ ] 執行每日限制 SQL
- [ ] 驗證 `beacon_actions` 表結構
- [ ] 驗證外鍵約束存在
- [ ] 測試每日限制函數
- [ ] 測試冷卻時間函數
- [ ] 重新整理管理後台頁面
- [ ] 確認「觸發動作」頁面正常顯示
- [ ] 測試實際 Beacon 觸發（第 1 次）
- [ ] 測試實際 Beacon 觸發（第 2 次，冷卻中）
- [ ] 查看 `beacon_events` 的 `error_message`
- [ ] 確認觸發限制生效

---

## 🚀 快速執行

### 一鍵修復 SQL

```sql
-- 複製以下完整 SQL 到 Supabase SQL Editor 執行

-- 1. 修正外鍵關聯
ALTER TABLE beacon_actions 
ADD CONSTRAINT beacon_actions_hwid_fkey 
FOREIGN KEY (hwid) REFERENCES beacon_devices(hwid) ON DELETE CASCADE;

-- 2. 添加觸發限制欄位
ALTER TABLE beacon_actions ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 2;
ALTER TABLE beacon_actions ADD COLUMN IF NOT EXISTS cooldown_minutes INTEGER DEFAULT 60;

-- 3. 更新現有記錄
UPDATE beacon_actions
SET daily_limit = 2, cooldown_minutes = 60
WHERE daily_limit IS NULL OR cooldown_minutes IS NULL;

-- 4. 建立索引
CREATE INDEX IF NOT EXISTS idx_beacon_actions_hwid ON beacon_actions(hwid);
CREATE INDEX IF NOT EXISTS idx_beacon_events_user_date ON beacon_events(user_id, hwid, DATE(created_at));

-- ✅ 完成！
```

---

**最後更新：2025-01-19**

