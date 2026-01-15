-- 🚀 快速設定 Beacon 觸發動作
-- 一次性建立訊息模板和觸發動作

BEGIN;

-- ===== 步驟 1：建立訊息模板 =====

-- 1.1 歡迎訊息（給所有人）
INSERT INTO beacon_messages (
  template_name,
  message_type,
  message_content,
  target_audience,
  description,
  is_active
)
VALUES (
  '入口歡迎訊息',
  'text',
  '👋 歡迎光臨！

您已進入貼圖大亨服務範圍！

🎨 現在可以使用所有功能創建專屬貼圖
📸 輸入「創建貼圖」開始製作
💡 輸入「功能說明」查看教學',
  'all',
  '用戶進入 Beacon 範圍時的歡迎訊息',
  true
)
ON CONFLICT DO NOTHING;

-- 1.2 好友專屬訊息
INSERT INTO beacon_messages (
  template_name,
  message_type,
  message_content,
  target_audience,
  description,
  is_active
)
VALUES (
  '好友專屬歡迎',
  'text',
  '🎉 歡迎回來！

感謝您加入好友！

🎁 好友專屬優惠：
• 每日免費張數 +2
• 優先體驗新功能
• 專屬客服支援

輸入「創建貼圖」立即開始！',
  'friends',
  '給已加入好友的用戶',
  true
)
ON CONFLICT DO NOTHING;

-- 1.3 非好友邀請訊息
INSERT INTO beacon_messages (
  template_name,
  message_type,
  message_content,
  target_audience,
  description,
  is_active
)
VALUES (
  '邀請加入好友',
  'text',
  '👋 您好！

歡迎使用貼圖大亨！

🎁 加入好友即可獲得：
• 每日免費 5 張貼圖額度
• 優先體驗新功能
• 專屬客服支援

請點擊下方「加入好友」按鈕！',
  'non_friends',
  '邀請未加入好友的用戶',
  true
)
ON CONFLICT DO NOTHING;

-- 1.4 離開訊息
INSERT INTO beacon_messages (
  template_name,
  message_type,
  message_content,
  target_audience,
  description,
  is_active
)
VALUES (
  '離開感謝訊息',
  'text',
  '👋 感謝您的光臨！

期待下次再見！

💡 隨時可以使用貼圖大亨創建專屬貼圖
📱 輸入「我的貼圖」查看作品',
  'all',
  '用戶離開 Beacon 範圍時的感謝訊息',
  true
)
ON CONFLICT DO NOTHING;

-- ===== 步驟 2：為每個設備建立觸發動作 =====

-- 2.1 入口歡迎動作（給所有人）
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
  bd.hwid,
  '入口歡迎 - ' || bd.device_name,
  'enter',
  bm.id,
  '用戶進入時發送歡迎訊息',
  2,
  60,
  true
FROM beacon_devices bd
CROSS JOIN beacon_messages bm
WHERE bm.template_name = '入口歡迎訊息'
  AND bd.is_active = true
ON CONFLICT DO NOTHING;

-- 2.2 好友專屬歡迎動作
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
  bd.hwid,
  '好友歡迎 - ' || bd.device_name,
  'enter',
  bm.id,
  '好友進入時發送專屬訊息',
  3,
  30,
  true
FROM beacon_devices bd
CROSS JOIN beacon_messages bm
WHERE bm.template_name = '好友專屬歡迎'
  AND bd.is_active = true
ON CONFLICT DO NOTHING;

-- 2.3 非好友邀請動作
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
  bd.hwid,
  '邀請加入 - ' || bd.device_name,
  'enter',
  bm.id,
  '非好友進入時邀請加入',
  2,
  120,
  true
FROM beacon_devices bd
CROSS JOIN beacon_messages bm
WHERE bm.template_name = '邀請加入好友'
  AND bd.is_active = true
ON CONFLICT DO NOTHING;

-- 2.4 離開感謝動作
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
  bd.hwid,
  '離開感謝 - ' || bd.device_name,
  'leave',
  bm.id,
  '用戶離開時發送感謝訊息',
  1,
  180,
  true
FROM beacon_devices bd
CROSS JOIN beacon_messages bm
WHERE bm.template_name = '離開感謝訊息'
  AND bd.is_active = true
ON CONFLICT DO NOTHING;

COMMIT;

-- ===== 驗證結果 =====

-- 檢查訊息模板
SELECT 
  '✅ 訊息模板' as check_type,
  template_name,
  target_audience,
  is_active
FROM beacon_messages
ORDER BY created_at DESC;

-- 檢查觸發動作
SELECT 
  '✅ 觸發動作' as check_type,
  ba.action_name,
  ba.hwid,
  ba.trigger_type,
  ba.daily_limit,
  ba.cooldown_minutes,
  bm.template_name as message_template,
  bm.target_audience
FROM beacon_actions ba
LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
ORDER BY ba.hwid, ba.trigger_type;

-- 檢查每個設備的動作數量
SELECT 
  '✅ 設備動作統計' as check_type,
  bd.hwid,
  bd.device_name,
  COUNT(ba.id) as action_count
FROM beacon_devices bd
LEFT JOIN beacon_actions ba ON bd.hwid = ba.hwid
WHERE bd.is_active = true
GROUP BY bd.hwid, bd.device_name;

-- ✅ 完成！
SELECT '🎉 Beacon 觸發動作設定完成！' as status;

