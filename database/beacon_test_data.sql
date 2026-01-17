-- LINE Beacon 測試資料
-- 用於測試 Beacon 管理系統（更新為新的表結構）

-- 1. 插入測試設備
INSERT INTO beacon_devices (hwid, device_name, location, description, is_active)
VALUES
  ('018d4b2fdc', '貼圖大亨測試 Beacon', '測試地點', '用於測試 LINE Beacon 功能的設備', true)
ON CONFLICT (hwid) DO UPDATE SET
  device_name = EXCLUDED.device_name,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. 清理舊的測試訊息模板
DELETE FROM beacon_messages WHERE template_name LIKE '測試%';

-- 3. 插入測試訊息模板
INSERT INTO beacon_messages (template_name, message_type, message_content, target_audience, description, is_active)
VALUES
  ('測試入口歡迎', 'text', '👋 歡迎光臨！\n\n您已進入貼圖大亨服務範圍，現在可以使用所有功能創建專屬貼圖！\n\n輸入「創建貼圖」開始製作 🎨', 'all', '測試用歡迎訊息', true),
  ('測試離開感謝', 'text', '👋 感謝您的光臨！\n\n期待下次再見 💖\n\n隨時輸入「創建貼圖」繼續製作您的專屬貼圖！', 'all', '測試用感謝訊息', true);

-- 4. 清理舊的測試動作
DELETE FROM beacon_actions WHERE hwid = '018d4b2fdc' AND action_name LIKE '測試%';

-- 5. 插入測試動作：進入時發送歡迎訊息
INSERT INTO beacon_actions (hwid, action_name, trigger_type, message_id, description, daily_limit, cooldown_minutes, is_active)
SELECT
  '018d4b2fdc',
  '測試入口歡迎',
  'enter',
  bm.id,
  '測試用：進入時發送歡迎訊息',
  5,
  30,
  true
FROM beacon_messages bm
WHERE bm.template_name = '測試入口歡迎';

-- 6. 插入測試動作：離開時發送感謝訊息
INSERT INTO beacon_actions (hwid, action_name, trigger_type, message_id, description, daily_limit, cooldown_minutes, is_active)
SELECT
  '018d4b2fdc',
  '測試離開感謝',
  'leave',
  bm.id,
  '測試用：離開時發送感謝訊息',
  3,
  60,
  true
FROM beacon_messages bm
WHERE bm.template_name = '測試離開感謝';

-- 7. 驗證結果
SELECT
  '📡 Beacon 設備' as check_type,
  hwid,
  device_name,
  location,
  is_active,
  created_at
FROM beacon_devices
WHERE hwid = '018d4b2fdc';

SELECT
  '💬 訊息模板' as check_type,
  id,
  template_name,
  message_type,
  target_audience,
  is_active
FROM beacon_messages
WHERE template_name LIKE '測試%'
ORDER BY created_at;

SELECT
  '⚡ 觸發動作' as check_type,
  ba.action_name,
  ba.trigger_type,
  ba.daily_limit,
  ba.cooldown_minutes,
  bm.template_name as message_template,
  ba.is_active
FROM beacon_actions ba
LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
WHERE ba.hwid = '018d4b2fdc'
ORDER BY ba.trigger_type;

-- 8. 查詢最近的觸發事件（如果有的話）
SELECT
  '📊 最近事件' as check_type,
  be.user_id,
  be.event_type,
  be.is_friend,
  be.message_sent,
  be.error_message,
  be.created_at,
  bd.device_name
FROM beacon_events be
LEFT JOIN beacon_devices bd ON be.hwid = bd.hwid
WHERE be.hwid = '018d4b2fdc'
ORDER BY be.created_at DESC
LIMIT 10;

-- 9. 清除測試資料（如果需要重新測試）
-- DELETE FROM beacon_events WHERE hwid = '018d4b2fdc';
-- DELETE FROM beacon_statistics WHERE hwid = '018d4b2fdc';
-- DELETE FROM beacon_actions WHERE hwid = '018d4b2fdc';
-- DELETE FROM beacon_messages WHERE template_name LIKE '測試%';
-- DELETE FROM beacon_devices WHERE hwid = '018d4b2fdc';

-- ✅ 完成！
SELECT
  '🎉 測試資料已建立！' as status,
  '📱 現在可以用手機靠近 Beacon 測試了！' as next_step;

