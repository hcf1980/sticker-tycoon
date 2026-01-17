-- 🎯 一鍵修復 Beacon 系統（使用正確的 HWID: 018d4b2fdc）
-- 這個腳本會自動完成所有修復步驟

BEGIN;

-- ===== 步驟 1：清理所有錯誤的 HWID 資料 =====
DO $$
BEGIN
  RAISE NOTICE '🔧 步驟 1：清理錯誤的 HWID 資料...';

  -- 先刪除 beacon_actions（有外鍵約束）
  DELETE FROM beacon_actions WHERE hwid IN ('018d4b2f1dc', '018d4b2fdc');
  DELETE FROM beacon_events WHERE hwid IN ('018d4b2f1dc', '018d4b2fdc');
  DELETE FROM beacon_statistics WHERE hwid IN ('018d4b2f1dc', '018d4b2fdc');
  DELETE FROM beacon_devices WHERE hwid IN ('018d4b2f1dc', '018d4b2fdc');

  RAISE NOTICE '  ✅ 已清理錯誤的 HWID 資料';
END $$;

-- ===== 步驟 2：清理所有訊息模板 =====
DO $$
BEGIN
  RAISE NOTICE '🔧 步驟 2：清理舊的訊息模板...';

  -- 先刪除所有 beacon_actions（因為有外鍵約束）
  DELETE FROM beacon_actions;
  -- 再刪除所有 beacon_messages
  DELETE FROM beacon_messages;

  RAISE NOTICE '  ✅ 已清理所有訊息模板和觸發動作';
END $$;

-- ===== 步驟 3：添加 template_name 唯一約束 =====
DO $$
BEGIN
  RAISE NOTICE '🔧 步驟 3：添加 template_name 唯一約束...';

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'beacon_messages'::regclass
      AND conname = 'beacon_messages_template_name_key'
  ) THEN
    ALTER TABLE beacon_messages
    ADD CONSTRAINT beacon_messages_template_name_key
    UNIQUE (template_name);

    RAISE NOTICE '  ✅ 已添加 template_name 唯一約束';
  ELSE
    RAISE NOTICE '  ℹ️ template_name 唯一約束已存在';
  END IF;
END $$;

-- ===== 步驟 4：註冊正確的 Beacon 設備 =====
DO $$
BEGIN
  RAISE NOTICE '🔧 步驟 4：註冊 Beacon 設備...';

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

  RAISE NOTICE '  ✅ 已註冊 Beacon 設備 (HWID: 018d4b2fdc)';
END $$;

-- ===== 步驟 5：建立訊息模板（4 個） =====
DO $$
BEGIN
  RAISE NOTICE '🔧 步驟 5：建立訊息模板...';

  -- 5.1 入口歡迎訊息（所有人）
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

  -- 5.2 好友專屬歡迎
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

  -- 5.3 邀請加入好友
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

  -- 5.4 離開感謝訊息
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

  RAISE NOTICE '  ✅ 已建立 4 個訊息模板';
END $$;

-- ===== 步驟 6：建立觸發動作（4 個） =====
DO $$
BEGIN
  RAISE NOTICE '🔧 步驟 6：建立觸發動作...';

  -- 6.1 入口歡迎動作
  INSERT INTO beacon_actions (hwid, action_name, trigger_type, message_id, description, daily_limit, cooldown_minutes, is_active)
  SELECT '018d4b2fdc', '入口歡迎', 'enter', bm.id, '用戶進入時發送歡迎訊息', 3, 60, true
  FROM beacon_messages bm WHERE bm.template_name = '入口歡迎訊息';

  -- 6.2 好友專屬歡迎動作
  INSERT INTO beacon_actions (hwid, action_name, trigger_type, message_id, description, daily_limit, cooldown_minutes, is_active)
  SELECT '018d4b2fdc', '好友專屬歡迎', 'enter', bm.id, '好友進入時發送專屬訊息', 5, 30, true
  FROM beacon_messages bm WHERE bm.template_name = '好友專屬歡迎';

  -- 6.3 非好友邀請動作
  INSERT INTO beacon_actions (hwid, action_name, trigger_type, message_id, description, daily_limit, cooldown_minutes, is_active)
  SELECT '018d4b2fdc', '邀請加入好友', 'enter', bm.id, '非好友進入時邀請加入', 2, 120, true
  FROM beacon_messages bm WHERE bm.template_name = '邀請加入好友';

  -- 6.4 離開感謝動作
  INSERT INTO beacon_actions (hwid, action_name, trigger_type, message_id, description, daily_limit, cooldown_minutes, is_active)
  SELECT '018d4b2fdc', '離開感謝', 'leave', bm.id, '用戶離開時發送感謝訊息', 1, 180, true
  FROM beacon_messages bm WHERE bm.template_name = '離開感謝訊息';

  RAISE NOTICE '  ✅ 已建立 4 個觸發動作';
END $$;

COMMIT;

-- ===== 步驟 7：驗證結果 =====
SELECT '📡 Beacon 設備' as check_type, hwid, device_name, location, is_active FROM beacon_devices WHERE hwid = '018d4b2fdc';
SELECT '💬 訊息模板' as check_type, template_name, target_audience FROM beacon_messages WHERE is_active = true;
SELECT '⚡ 觸發動作' as check_type, ba.action_name, ba.trigger_type, bm.template_name FROM beacon_actions ba LEFT JOIN beacon_messages bm ON ba.message_id = bm.id WHERE ba.hwid = '018d4b2fdc';
SELECT '📊 統計' as check_type, (SELECT COUNT(*) FROM beacon_devices WHERE hwid = '018d4b2fdc') as devices, (SELECT COUNT(*) FROM beacon_messages) as messages, (SELECT COUNT(*) FROM beacon_actions WHERE hwid = '018d4b2fdc') as actions;
SELECT '🎉 一鍵修復完成！' as status, '✅ 使用正確的 HWID (018d4b2fdc)' as message, '📱 現在可以測試 Beacon 了！' as next_step;

