-- 修復 beacon_actions 外鍵問題
-- 先清理無效資料，再添加外鍵約束

BEGIN;

-- ===== 步驟 1：檢查資料完整性 =====

-- 檢查 beacon_actions 中有哪些 hwid
SELECT 
  '檢查 beacon_actions 的 hwid' as step,
  hwid,
  COUNT(*) as count
FROM beacon_actions
GROUP BY hwid;

-- 檢查 beacon_devices 中有哪些 hwid
SELECT 
  '檢查 beacon_devices 的 hwid' as step,
  hwid,
  device_name
FROM beacon_devices;

-- 找出 beacon_actions 中存在但 beacon_devices 中不存在的 hwid
SELECT 
  '孤立的 beacon_actions 記錄' as step,
  ba.hwid,
  ba.action_name,
  ba.trigger_type
FROM beacon_actions ba
LEFT JOIN beacon_devices bd ON ba.hwid = bd.hwid
WHERE bd.hwid IS NULL;

-- ===== 步驟 2：處理孤立記錄 =====

-- 選項 A：刪除孤立的 beacon_actions 記錄
-- DELETE FROM beacon_actions
-- WHERE hwid NOT IN (SELECT hwid FROM beacon_devices);

-- 選項 B：為孤立記錄建立對應的 beacon_devices
-- 推薦使用此選項，避免資料遺失
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

-- ===== 步驟 3：驗證資料完整性 =====

-- 再次檢查是否還有孤立記錄
SELECT 
  '驗證：孤立記錄數量' as step,
  COUNT(*) as orphan_count
FROM beacon_actions ba
LEFT JOIN beacon_devices bd ON ba.hwid = bd.hwid
WHERE bd.hwid IS NULL;

-- 如果上面顯示 0，表示可以安全添加外鍵

-- ===== 步驟 4：刪除舊的外鍵約束（如果存在） =====

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'beacon_actions_hwid_fkey'
      AND table_name = 'beacon_actions'
  ) THEN
    ALTER TABLE beacon_actions DROP CONSTRAINT beacon_actions_hwid_fkey;
    RAISE NOTICE '✅ 舊的外鍵約束已刪除';
  END IF;
END $$;

-- ===== 步驟 5：添加外鍵約束 =====

ALTER TABLE beacon_actions 
ADD CONSTRAINT beacon_actions_hwid_fkey 
FOREIGN KEY (hwid) REFERENCES beacon_devices(hwid) ON DELETE CASCADE;

-- ===== 步驟 6：建立索引 =====

CREATE INDEX IF NOT EXISTS idx_beacon_actions_hwid ON beacon_actions(hwid);

-- ===== 步驟 7：驗證外鍵約束 =====

SELECT 
  '✅ 外鍵約束驗證' as step,
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
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name = 'beacon_actions_hwid_fkey';

COMMIT;

-- ===== 完成 =====
SELECT '🎉 外鍵約束修復完成！' as status;

