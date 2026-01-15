-- 🔍 快速診斷 Beacon 問題

-- ===== 1. 檢查設備狀態 =====
SELECT 
  '📡 設備狀態' as check_type,
  hwid,
  device_name,
  location,
  is_active,
  created_at
FROM beacon_devices
ORDER BY created_at DESC;

-- ===== 2. 檢查訊息模板 =====
SELECT 
  '💬 訊息模板' as check_type,
  id,
  template_name,
  message_type,
  target_audience,
  is_active,
  LEFT(message_content, 50) as content_preview
FROM beacon_messages
ORDER BY created_at DESC;

-- ===== 3. 檢查觸發動作 =====
SELECT 
  '⚡ 觸發動作' as check_type,
  ba.hwid,
  ba.action_name,
  ba.trigger_type,
  ba.is_active,
  ba.daily_limit,
  ba.cooldown_minutes,
  bm.template_name as message_template,
  bm.target_audience,
  CASE 
    WHEN ba.message_id IS NULL THEN '❌ 缺少訊息'
    WHEN bm.id IS NULL THEN '❌ 訊息不存在'
    ELSE '✅ 正常'
  END as status
FROM beacon_actions ba
LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
ORDER BY ba.hwid, ba.trigger_type;

-- ===== 4. 檢查最近的事件記錄 =====
SELECT 
  '📊 最近事件' as check_type,
  user_id,
  hwid,
  event_type,
  is_friend,
  message_sent,
  error_message,
  created_at,
  CASE 
    WHEN message_sent THEN '✅ 已推送'
    WHEN error_message IS NOT NULL THEN '❌ ' || error_message
    ELSE '⚠️ 未推送'
  END as status
FROM beacon_events
ORDER BY created_at DESC
LIMIT 10;

-- ===== 5. 檢查每個設備的配置完整性 =====
SELECT 
  '🔧 配置完整性' as check_type,
  bd.hwid,
  bd.device_name,
  bd.is_active as device_active,
  COUNT(DISTINCT ba.id) as action_count,
  COUNT(DISTINCT CASE WHEN ba.trigger_type = 'enter' THEN ba.id END) as enter_actions,
  COUNT(DISTINCT CASE WHEN ba.trigger_type = 'leave' THEN ba.id END) as leave_actions,
  COUNT(DISTINCT be.id) as total_events,
  COUNT(DISTINCT CASE WHEN be.message_sent THEN be.id END) as sent_messages,
  CASE 
    WHEN COUNT(DISTINCT ba.id) = 0 THEN '❌ 缺少觸發動作'
    WHEN COUNT(DISTINCT ba.id) < 2 THEN '⚠️ 動作不足'
    ELSE '✅ 配置完整'
  END as status
FROM beacon_devices bd
LEFT JOIN beacon_actions ba ON bd.hwid = ba.hwid AND ba.is_active = true
LEFT JOIN beacon_events be ON bd.hwid = be.hwid
WHERE bd.is_active = true
GROUP BY bd.hwid, bd.device_name, bd.is_active;

-- ===== 6. 檢查孤立的觸發動作（沒有對應設備） =====
SELECT 
  '⚠️ 孤立動作' as check_type,
  ba.hwid,
  ba.action_name,
  '設備不存在或未啟用' as issue
FROM beacon_actions ba
LEFT JOIN beacon_devices bd ON ba.hwid = bd.hwid
WHERE bd.hwid IS NULL OR bd.is_active = false;

-- ===== 7. 檢查孤立的觸發動作（沒有對應訊息） =====
SELECT 
  '⚠️ 缺少訊息' as check_type,
  ba.hwid,
  ba.action_name,
  ba.message_id,
  '訊息模板不存在' as issue
FROM beacon_actions ba
LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
WHERE ba.message_id IS NULL OR bm.id IS NULL;

-- ===== 8. 檢查資料庫函數是否存在 =====
SELECT 
  '🔧 資料庫函數' as check_type,
  routine_name,
  '✅ 存在' as status
FROM information_schema.routines
WHERE routine_name IN ('check_beacon_daily_limit', 'check_beacon_cooldown')
  AND routine_schema = 'public';

-- ===== 9. 統計摘要 =====
SELECT 
  '📈 系統摘要' as check_type,
  (SELECT COUNT(*) FROM beacon_devices WHERE is_active = true) as active_devices,
  (SELECT COUNT(*) FROM beacon_messages WHERE is_active = true) as active_messages,
  (SELECT COUNT(*) FROM beacon_actions WHERE is_active = true) as active_actions,
  (SELECT COUNT(*) FROM beacon_events WHERE created_at > NOW() - INTERVAL '24 hours') as events_24h,
  (SELECT COUNT(*) FROM beacon_events WHERE message_sent = true AND created_at > NOW() - INTERVAL '24 hours') as sent_24h;

-- ===== 10. 檢查 RLS 政策 =====
SELECT 
  '🔒 RLS 政策' as check_type,
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN policyname LIKE '%service_role%' THEN '✅ Service Role'
    ELSE '⚠️ 其他政策'
  END as policy_type
FROM pg_policies
WHERE tablename IN ('beacon_devices', 'beacon_messages', 'beacon_actions', 'beacon_events')
ORDER BY tablename, policyname;

