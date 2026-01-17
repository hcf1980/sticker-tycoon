-- 🔍 診斷為什麼 Beacon 沒有推送訊息

-- ===== 1. 檢查你的設備 =====
SELECT
  '📡 你的設備' as check_type,
  hwid,
  device_name,
  location,
  is_active,
  created_at
FROM beacon_devices
WHERE hwid = '018d4b2fdc';

-- ===== 2. 檢查是否有訊息模板 =====
SELECT 
  '💬 訊息模板' as check_type,
  id,
  template_name,
  target_audience,
  is_active
FROM beacon_messages
WHERE is_active = true;

-- ===== 3. 檢查是否有觸發動作 =====
SELECT
  '⚡ 觸發動作（你的設備）' as check_type,
  ba.id,
  ba.action_name,
  ba.hwid,
  ba.trigger_type,
  ba.message_id,
  ba.is_active,
  bm.template_name as message_template,
  bm.target_audience,
  CASE
    WHEN ba.message_id IS NULL THEN '❌ 沒有關聯訊息'
    WHEN bm.id IS NULL THEN '❌ 訊息不存在'
    WHEN bm.is_active = false THEN '⚠️ 訊息未啟用'
    WHEN ba.is_active = false THEN '⚠️ 動作未啟用'
    ELSE '✅ 正常'
  END as status
FROM beacon_actions ba
LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
WHERE ba.hwid = '018d4b2fdc';

-- ===== 4. 檢查最近的事件記錄 =====
SELECT
  '📊 最近事件（你的設備）' as check_type,
  user_id,
  event_type,
  is_friend,
  message_sent,
  action_id,
  message_id,
  error_message,
  created_at
FROM beacon_events
WHERE hwid = '018d4b2fdc'
ORDER BY created_at DESC
LIMIT 5;

-- ===== 5. 診斷結果 =====
SELECT
  '🎯 診斷結果' as check_type,
  CASE
    WHEN (SELECT COUNT(*) FROM beacon_devices WHERE hwid = '018d4b2fdc' AND is_active = true) = 0
      THEN '❌ 設備不存在或未啟用'
    WHEN (SELECT COUNT(*) FROM beacon_messages WHERE is_active = true) = 0
      THEN '❌ 沒有訊息模板'
    WHEN (SELECT COUNT(*) FROM beacon_actions WHERE hwid = '018d4b2fdc' AND is_active = true) = 0
      THEN '❌ 沒有觸發動作（這是問題所在！）'
    WHEN (SELECT COUNT(*) FROM beacon_actions ba
          LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
          WHERE ba.hwid = '018d4b2fdc' AND ba.is_active = true AND (bm.id IS NULL OR bm.is_active = false)) > 0
      THEN '⚠️ 有觸發動作，但訊息模板有問題'
    ELSE '✅ 配置正常，可能是其他問題'
  END as diagnosis,
  (SELECT COUNT(*) FROM beacon_devices WHERE hwid = '018d4b2fdc' AND is_active = true) as device_count,
  (SELECT COUNT(*) FROM beacon_messages WHERE is_active = true) as message_count,
  (SELECT COUNT(*) FROM beacon_actions WHERE hwid = '018d4b2fdc' AND is_active = true) as action_count;

-- ===== 6. 如果沒有觸發動作，建立一個測試動作 =====
-- 先建立訊息模板（如果不存在）
INSERT INTO beacon_messages (
  template_name,
  message_type,
  message_content,
  target_audience,
  is_active
)
SELECT 
  '測試歡迎訊息',
  'text',
  '👋 歡迎光臨！您已進入貼圖大亨服務範圍！',
  'all',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM beacon_messages WHERE template_name = '測試歡迎訊息'
);

-- 建立觸發動作（使用上面的訊息模板）
INSERT INTO beacon_actions (
  hwid,
  action_name,
  trigger_type,
  message_id,
  description,
  daily_limit,
  cooldown_minutes,
  is_active
)
SELECT
  '018d4b2fdc',
  '測試入口歡迎',
  'enter',
  bm.id,
  '測試用歡迎訊息',
  5,
  30,
  true
FROM beacon_messages bm
WHERE bm.template_name = '測試歡迎訊息'
  AND NOT EXISTS (
    SELECT 1 FROM beacon_actions
    WHERE hwid = '018d4b2fdc'
      AND action_name = '測試入口歡迎'
  );

-- ===== 7. 再次檢查觸發動作 =====
SELECT
  '✅ 觸發動作（建立後）' as check_type,
  ba.action_name,
  ba.trigger_type,
  ba.is_active,
  bm.template_name
FROM beacon_actions ba
LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
WHERE ba.hwid = '018d4b2fdc';

-- ===== 完成 =====
SELECT
  '🎉 診斷完成！' as status,
  CASE
    WHEN (SELECT COUNT(*) FROM beacon_actions WHERE hwid = '018d4b2fdc' AND is_active = true) > 0
      THEN '✅ 已建立測試觸發動作，請再次測試 Beacon'
    ELSE '⚠️ 請檢查上方的診斷結果'
  END as next_step;

