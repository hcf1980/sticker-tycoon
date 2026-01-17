-- 🎯 最終修正：使用正確的 HWID (018d4b2fdc)
-- 這個腳本會：
-- 1. 清理所有舊的錯誤 HWID 資料
-- 2. 使用正確的 HWID 重建所有設定

BEGIN;

-- ===== 步驟 1：清理所有錯誤的 HWID =====
DELETE FROM beacon_actions WHERE hwid IN ('018d4b2f1dc', '018d4b2fdc');
DELETE FROM beacon_events WHERE hwid IN ('018d4b2f1dc', '018d4b2fdc');
DELETE FROM beacon_statistics WHERE hwid IN ('018d4b2f1dc', '018d4b2fdc');
DELETE FROM beacon_devices WHERE hwid IN ('018d4b2f1dc', '018d4b2fdc');

-- ===== 步驟 2：清理所有訊息模板 =====
DELETE FROM beacon_messages;

-- ===== 步驟 3：註冊正確的 Beacon 設備 =====
INSERT INTO beacon_devices (
  hwid,
  device_name,
  location,
  is_active
) VALUES (
  '018d4b2fdc',
  '貼圖大亨測試 Beacon',
  '測試地點',
  true
);

-- ===== 步驟 4：建立訊息模板（4 個） =====

-- 4.1 入口歡迎訊息（所有人）
INSERT INTO beacon_messages (
  template_name,
  message_type,
  message_content,
  target_audience,
  is_active
) VALUES (
  '入口歡迎訊息',
  'text',
  '👋 歡迎光臨！您已進入貼圖大亨服務範圍！',
  'all',
  true
);

-- 4.2 好友專屬歡迎
INSERT INTO beacon_messages (
  template_name,
  message_type,
  message_content,
  target_audience,
  is_active
) VALUES (
  '好友專屬歡迎',
  'text',
  '🎉 歡迎回來！親愛的好友，今天想製作什麼貼圖呢？',
  'friends',
  true
);

-- 4.3 邀請加入好友
INSERT INTO beacon_messages (
  template_name,
  message_type,
  message_content,
  target_audience,
  is_active
) VALUES (
  '邀請加入好友',
  'text',
  '💝 加入我們成為好友，享受更多專屬功能！',
  'non_friends',
  true
);

-- 4.4 離開感謝訊息
INSERT INTO beacon_messages (
  template_name,
  message_type,
  message_content,
  target_audience,
  is_active
) VALUES (
  '離開感謝訊息',
  'text',
  '👋 感謝您的光臨！期待下次再見！',
  'all',
  true
);

-- ===== 步驟 5：建立觸發動作（4 個） =====

-- 5.1 入口歡迎動作
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
  '入口歡迎',
  'enter',
  bm.id,
  '用戶進入時發送歡迎訊息',
  3,
  60,
  true
FROM beacon_messages bm
WHERE bm.template_name = '入口歡迎訊息';

-- 5.2 好友專屬歡迎動作
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
  '好友專屬歡迎',
  'enter',
  bm.id,
  '好友進入時發送專屬訊息',
  5,
  30,
  true
FROM beacon_messages bm
WHERE bm.template_name = '好友專屬歡迎';

-- 5.3 非好友邀請動作
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
  '邀請加入好友',
  'enter',
  bm.id,
  '非好友進入時邀請加入',
  2,
  120,
  true
FROM beacon_messages bm
WHERE bm.template_name = '邀請加入好友';

-- 5.4 離開感謝動作
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
  '離開感謝',
  'leave',
  bm.id,
  '用戶離開時發送感謝訊息',
  1,
  180,
  true
FROM beacon_messages bm
WHERE bm.template_name = '離開感謝訊息';

COMMIT;

-- ===== 步驟 6：驗證結果 =====

-- 檢查設備
SELECT
  '📡 Beacon 設備' as check_type,
  hwid,
  device_name,
  location,
  is_active,
  created_at
FROM beacon_devices
WHERE hwid = '018d4b2fdc';

-- 檢查訊息模板（應該有 4 個）
SELECT
  '💬 訊息模板' as check_type,
  id,
  template_name,
  message_type,
  target_audience,
  is_active,
  created_at
FROM beacon_messages
WHERE is_active = true
ORDER BY created_at;

-- 檢查觸發動作（應該有 4 個）
SELECT
  '⚡ 觸發動作' as check_type,
  ba.action_name,
  ba.trigger_type,
  ba.daily_limit,
  ba.cooldown_minutes,
  bm.template_name as message_template,
  bm.target_audience,
  ba.is_active
FROM beacon_actions ba
LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
WHERE ba.hwid = '018d4b2fdc'
ORDER BY ba.trigger_type, ba.action_name;

-- 統計
SELECT
  '📊 統計' as check_type,
  (SELECT COUNT(*) FROM beacon_devices WHERE hwid = '018d4b2fdc' AND is_active = true) as device_count,
  (SELECT COUNT(*) FROM beacon_messages WHERE is_active = true) as message_count,
  (SELECT COUNT(*) FROM beacon_actions WHERE hwid = '018d4b2fdc' AND is_active = true) as action_count;

-- ✅ 完成！
SELECT
  '🎉 修正完成！' as status,
  '✅ 已使用正確的 HWID (018d4b2fdc) 重建所有設定' as message,
  '📱 現在可以測試 Beacon 了！' as next_step;

