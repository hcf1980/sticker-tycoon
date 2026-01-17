-- 🧹 清理並重建 Beacon 觸發動作
-- 解決重複訊息模板的問題

BEGIN;

-- ===== 步驟 1：清理所有舊的觸發動作 =====
DELETE FROM beacon_actions WHERE hwid = '018d4b2fdc';

-- ===== 步驟 2：清理所有舊的訊息模板 =====
DELETE FROM beacon_messages;

-- ===== 步驟 3：建立全新的訊息模板（只建立 4 個） =====

-- 3.1 入口歡迎訊息（給所有人）
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
);

-- 3.2 好友專屬歡迎
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
);

-- 3.3 邀請加入好友
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
);

-- 3.4 離開感謝訊息
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
);

-- ===== 步驟 4：為你的設備建立觸發動作 =====

-- 4.1 入口歡迎動作（給所有人）
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

-- 4.2 好友專屬歡迎動作
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

-- 4.3 非好友邀請動作
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

-- 4.4 離開感謝動作
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

-- ===== 驗證結果 =====

-- 檢查訊息模板（應該只有 4 個）
SELECT 
  '✅ 訊息模板' as check_type,
  template_name,
  target_audience,
  is_active
FROM beacon_messages
ORDER BY created_at;

-- 檢查觸發動作（應該有 4 個）
SELECT
  '✅ 觸發動作' as check_type,
  ba.action_name,
  ba.trigger_type,
  ba.daily_limit,
  ba.cooldown_minutes,
  bm.template_name as message_template,
  bm.target_audience
FROM beacon_actions ba
LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
WHERE ba.hwid = '018d4b2fdc'
ORDER BY ba.trigger_type, ba.action_name;

-- 統計
SELECT
  '📊 統計' as check_type,
  (SELECT COUNT(*) FROM beacon_messages WHERE is_active = true) as message_count,
  (SELECT COUNT(*) FROM beacon_actions WHERE hwid = '018d4b2fdc' AND is_active = true) as action_count;

-- ✅ 完成！
SELECT '🎉 清理並重建完成！現在應該只有 4 個訊息模板和 4 個觸發動作。' as status;

