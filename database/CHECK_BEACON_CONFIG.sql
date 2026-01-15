-- 檢查 Beacon 系統配置

-- 1. 檢查 Beacon 設備
SELECT 
  '📡 Beacon 設備' as category,
  hwid,
  device_name,
  location,
  is_active,
  created_at
FROM beacon_devices
ORDER BY created_at DESC;

-- 2. 檢查 Beacon 訊息模板
SELECT 
  '💬 訊息模板' as category,
  template_name,
  message_type,
  target_audience,
  is_active,
  created_at
FROM beacon_messages
ORDER BY created_at DESC;

-- 3. 檢查 Beacon 觸發動作
SELECT 
  '⚡ 觸發動作' as category,
  ba.action_name,
  ba.hwid,
  ba.trigger_type,
  ba.daily_limit,
  ba.cooldown_minutes,
  ba.is_active,
  bm.template_name as message_template,
  bm.target_audience,
  ba.created_at
FROM beacon_actions ba
LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
ORDER BY ba.created_at DESC;

-- 4. 檢查 Beacon 事件記錄（最近 10 筆）
SELECT 
  '📊 事件記錄' as category,
  user_id,
  hwid,
  event_type,
  is_friend,
  message_sent,
  error_message,
  created_at
FROM beacon_events
ORDER BY created_at DESC
LIMIT 10;

-- 5. 檢查缺少的配置
SELECT 
  '⚠️ 缺少觸發動作的設備' as category,
  bd.hwid,
  bd.device_name,
  bd.location
FROM beacon_devices bd
LEFT JOIN beacon_actions ba ON bd.hwid = ba.hwid
WHERE ba.id IS NULL AND bd.is_active = true;

-- 6. 檢查 beacon_actions 表結構
SELECT 
  '🔧 beacon_actions 表結構' as category,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'beacon_actions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

