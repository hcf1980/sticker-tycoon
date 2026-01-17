-- 🔍 檢查並修正 HWID 長度問題

-- ===== 步驟 1：檢查當前 HWID 長度 =====
SELECT 
  '📊 當前 HWID 狀態' as check_type,
  hwid,
  LENGTH(hwid) as hwid_length,
  CASE 
    WHEN LENGTH(hwid) = 10 THEN '✅ 正確（符合官方規範）'
    WHEN LENGTH(hwid) = 11 THEN '⚠️ 多 1 個字元（需要修正）'
    WHEN LENGTH(hwid) = 12 THEN '⚠️ 多 2 個字元（需要修正）'
    ELSE '❌ 長度錯誤'
  END as status,
  device_name,
  is_active
FROM beacon_devices
ORDER BY created_at DESC;

-- ===== 步驟 2：檢查相關表的 HWID =====
SELECT 
  '📋 beacon_actions 表' as table_name,
  hwid,
  LENGTH(hwid) as hwid_length,
  COUNT(*) as record_count
FROM beacon_actions
GROUP BY hwid
ORDER BY hwid;

SELECT 
  '📋 beacon_events 表' as table_name,
  hwid,
  LENGTH(hwid) as hwid_length,
  COUNT(*) as record_count
FROM beacon_events
GROUP BY hwid
ORDER BY hwid;

SELECT 
  '📋 beacon_statistics 表' as table_name,
  hwid,
  LENGTH(hwid) as hwid_length,
  COUNT(*) as record_count
FROM beacon_statistics
GROUP BY hwid
ORDER BY hwid;

-- ===== 步驟 3：如果 HWID 是 11 個字元，修正為 10 個字元 =====
-- ⚠️ 只有在確認 HWID 確實是 11 個字元時才執行以下 SQL

-- 3.1 備份當前 HWID（可選）
-- CREATE TABLE beacon_devices_backup AS SELECT * FROM beacon_devices;

-- 3.2 修正 beacon_devices 表
-- UPDATE beacon_devices 
-- SET hwid = SUBSTRING(hwid FROM 2)  -- 移除開頭第一個字元
-- WHERE LENGTH(hwid) = 11;

-- 3.3 修正 beacon_actions 表
-- UPDATE beacon_actions 
-- SET hwid = SUBSTRING(hwid FROM 2)
-- WHERE LENGTH(hwid) = 11;

-- 3.4 修正 beacon_events 表
-- UPDATE beacon_events 
-- SET hwid = SUBSTRING(hwid FROM 2)
-- WHERE LENGTH(hwid) = 11;

-- 3.5 修正 beacon_statistics 表
-- UPDATE beacon_statistics 
-- SET hwid = SUBSTRING(hwid FROM 2)
-- WHERE LENGTH(hwid) = 11;

-- ===== 步驟 4：驗證修正結果 =====
-- SELECT 
--   '✅ 修正後的 HWID' as check_type,
--   hwid,
--   LENGTH(hwid) as hwid_length,
--   CASE 
--     WHEN LENGTH(hwid) = 10 THEN '✅ 正確'
--     ELSE '❌ 仍有問題'
--   END as status
-- FROM beacon_devices;

-- ===== 步驟 5：如果你的 HWID 本來就是正確的 =====
-- 如果 LINE Official Account Manager 給你的 HWID 就是 11 個字元
-- 那麼不需要修正，官方規範可能有更新

-- 檢查 LINE Manager 中的 HWID
SELECT 
  '💡 提示' as info,
  '請到 LINE Official Account Manager 確認你的 HWID 長度' as message,
  'https://manager.line.biz/beacon/register' as url;

-- ===== 完成 =====
SELECT 
  '🎉 檢查完成！' as status,
  CASE 
    WHEN (SELECT COUNT(*) FROM beacon_devices WHERE LENGTH(hwid) = 10) > 0 
      THEN '✅ HWID 長度正確，可以繼續測試'
    WHEN (SELECT COUNT(*) FROM beacon_devices WHERE LENGTH(hwid) = 11) > 0 
      THEN '⚠️ HWID 長度為 11，請確認是否需要修正'
    ELSE '❓ 請檢查 HWID'
  END as next_step;

