# 🚀 一鍵修復 Beacon 系統

## ⚡ 快速修復

### 步驟 1：執行完整修復 SQL

在 **Supabase SQL Editor** 中執行：

```
database/COMPLETE_FIX_BEACON_SYSTEM.sql
```

複製整個檔案內容，貼到 SQL Editor，然後點擊「Run」。

---

### 步驟 2：確認修復成功

看到以下訊息表示成功：

```
✅ 已將 event_type 資料遷移到 trigger_type
✅ 已刪除 event_type 欄位
✅ 已添加 trigger_type 欄位
✅ trigger_type 欄位已設定為 NOT NULL
✅ 已添加 action_name 欄位
✅ 已添加 message_id 欄位
✅ 已添加 description 欄位
✅ 已添加 daily_limit 欄位
✅ 已添加 cooldown_minutes 欄位
✅ 已添加 is_active 欄位
✅ 舊的外鍵約束已刪除
✅ hwid 外鍵約束已添加
🎉 所有問題已修復完成！
```

---

### 步驟 3：重新整理管理後台

1. 打開管理後台：`https://你的網站.netlify.app/admin/beacon-manager.html`
2. 按 `Ctrl+Shift+R` (Windows) 或 `Cmd+Shift+R` (Mac) 強制重新整理
3. 切換到「⚡ 觸發動作」標籤
4. 點擊「新增動作」測試

---

## 🐛 如果還有錯誤

### 錯誤 1：null value in column "event_type"

**執行**：
```sql
-- 刪除 event_type 欄位
ALTER TABLE beacon_actions DROP COLUMN IF EXISTS event_type;
```

---

### 錯誤 2：關聯錯誤 (relationship not found)

**執行**：
```sql
-- 添加外鍵
ALTER TABLE beacon_actions 
DROP CONSTRAINT IF EXISTS beacon_actions_hwid_fkey;

ALTER TABLE beacon_actions 
ADD CONSTRAINT beacon_actions_hwid_fkey 
FOREIGN KEY (hwid) REFERENCES beacon_devices(hwid) ON DELETE CASCADE;
```

---

### 錯誤 3：hwid 不存在

**執行**：
```sql
-- 自動建立缺少的設備
INSERT INTO beacon_devices (hwid, device_name, location, is_active)
SELECT DISTINCT 
  ba.hwid,
  '自動建立 - ' || ba.hwid AS device_name,
  '未設定位置' AS location,
  true AS is_active
FROM beacon_actions ba
LEFT JOIN beacon_devices bd ON ba.hwid = bd.hwid
WHERE bd.hwid IS NULL
ON CONFLICT (hwid) DO NOTHING;
```

---

## ✅ 驗證修復

執行以下 SQL 確認一切正常：

```sql
-- 1. 檢查表結構
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'beacon_actions'
ORDER BY ordinal_position;

-- 應該看到：
-- - trigger_type (有，NOT NULL)
-- - event_type (無，已刪除)
-- - daily_limit (有)
-- - cooldown_minutes (有)
-- - action_name (有)
-- - message_id (有)

-- 2. 檢查外鍵
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'beacon_actions'
  AND constraint_type = 'FOREIGN KEY';

-- 應該看到：
-- - beacon_actions_hwid_fkey
-- - beacon_actions_message_id_fkey

-- 3. 測試新增動作
INSERT INTO beacon_actions (
  hwid,
  action_name,
  trigger_type,
  message_id,
  daily_limit,
  cooldown_minutes
)
VALUES (
  (SELECT hwid FROM beacon_devices LIMIT 1),
  '測試動作',
  'enter',
  (SELECT id FROM beacon_messages LIMIT 1),
  2,
  60
)
RETURNING *;

-- 如果成功插入，表示修復完成！
```

---

## 📋 完成檢查清單

- [ ] 執行 `COMPLETE_FIX_BEACON_SYSTEM.sql`
- [ ] 看到「🎉 所有問題已修復完成！」訊息
- [ ] 重新整理管理後台
- [ ] 可以正常開啟「觸發動作」頁面
- [ ] 可以新增觸發動作
- [ ] 可以編輯觸發動作
- [ ] 可以看到每日限制和冷卻時間欄位

---

## 🎉 完成！

修復完成後，你可以：
1. 新增觸發動作
2. 設定每日限制（預設 2 次）
3. 設定冷卻時間（預設 60 分鐘）
4. 測試 Beacon 觸發功能

---

**最後更新：2025-01-19**

