-- 修正 beacon_actions 表，添加每日觸發次數限制欄位

DO $$ 
BEGIN
  -- 添加 daily_limit 欄位（每個用戶每天最多觸發次數）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'daily_limit'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN daily_limit INTEGER DEFAULT 2;
  END IF;

  -- 添加 cooldown_minutes 欄位（冷卻時間，分鐘）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'cooldown_minutes'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN cooldown_minutes INTEGER DEFAULT 60;
  END IF;
END $$;

-- 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_beacon_events_user_hwid_date ON beacon_events(user_id, hwid, created_at);
CREATE INDEX IF NOT EXISTS idx_beacon_events_action_user_date ON beacon_events(action_id, user_id, created_at);

-- 建立函數：檢查用戶今日是否已達觸發上限
CREATE OR REPLACE FUNCTION check_beacon_daily_limit(
  p_user_id VARCHAR(100),
  p_hwid VARCHAR(10),
  p_action_id UUID
)
RETURNS TABLE(
  can_trigger BOOLEAN,
  today_count INTEGER,
  daily_limit INTEGER,
  message TEXT
) AS $$
DECLARE
  v_daily_limit INTEGER;
  v_today_count INTEGER;
BEGIN
  -- 取得該動作的每日限制
  SELECT ba.daily_limit INTO v_daily_limit
  FROM beacon_actions ba
  WHERE ba.id = p_action_id;

  -- 如果找不到動作或沒有設定限制，預設為 2
  IF v_daily_limit IS NULL THEN
    v_daily_limit := 2;
  END IF;

  -- 計算今日已觸發次數（只計算成功推送的）
  SELECT COUNT(*) INTO v_today_count
  FROM beacon_events
  WHERE user_id = p_user_id
    AND hwid = p_hwid
    AND message_sent = true
    AND DATE(created_at) = CURRENT_DATE;

  -- 判斷是否可以觸發
  IF v_today_count >= v_daily_limit THEN
    RETURN QUERY SELECT 
      false,
      v_today_count,
      v_daily_limit,
      format('今日已達觸發上限 (%s/%s)', v_today_count, v_daily_limit);
  ELSE
    RETURN QUERY SELECT 
      true,
      v_today_count,
      v_daily_limit,
      format('可以觸發 (%s/%s)', v_today_count, v_daily_limit);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 建立函數：檢查冷卻時間
CREATE OR REPLACE FUNCTION check_beacon_cooldown(
  p_user_id VARCHAR(100),
  p_hwid VARCHAR(10),
  p_action_id UUID
)
RETURNS TABLE(
  can_trigger BOOLEAN,
  last_trigger_time TIMESTAMPTZ,
  cooldown_minutes INTEGER,
  remaining_minutes INTEGER,
  message TEXT
) AS $$
DECLARE
  v_cooldown_minutes INTEGER;
  v_last_trigger_time TIMESTAMPTZ;
  v_remaining_minutes INTEGER;
BEGIN
  -- 取得該動作的冷卻時間
  SELECT ba.cooldown_minutes INTO v_cooldown_minutes
  FROM beacon_actions ba
  WHERE ba.id = p_action_id;

  -- 如果找不到動作或沒有設定冷卻時間，預設為 60 分鐘
  IF v_cooldown_minutes IS NULL THEN
    v_cooldown_minutes := 60;
  END IF;

  -- 取得最後一次觸發時間（只看成功推送的）
  SELECT MAX(created_at) INTO v_last_trigger_time
  FROM beacon_events
  WHERE user_id = p_user_id
    AND hwid = p_hwid
    AND message_sent = true;

  -- 如果從未觸發過，可以觸發
  IF v_last_trigger_time IS NULL THEN
    RETURN QUERY SELECT 
      true,
      NULL::TIMESTAMPTZ,
      v_cooldown_minutes,
      0,
      '首次觸發';
  ELSE
    -- 計算剩餘冷卻時間
    v_remaining_minutes := v_cooldown_minutes - EXTRACT(EPOCH FROM (NOW() - v_last_trigger_time)) / 60;
    
    IF v_remaining_minutes > 0 THEN
      RETURN QUERY SELECT 
        false,
        v_last_trigger_time,
        v_cooldown_minutes,
        v_remaining_minutes::INTEGER,
        format('冷卻中，還需等待 %s 分鐘', v_remaining_minutes::INTEGER);
    ELSE
      RETURN QUERY SELECT 
        true,
        v_last_trigger_time,
        v_cooldown_minutes,
        0,
        '冷卻完成，可以觸發';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 更新現有的 beacon_actions 記錄，設定預設值
UPDATE beacon_actions
SET 
  daily_limit = 2,
  cooldown_minutes = 60
WHERE daily_limit IS NULL OR cooldown_minutes IS NULL;

-- 驗證更新
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'beacon_actions'
  AND column_name IN ('daily_limit', 'cooldown_minutes')
ORDER BY ordinal_position;

-- 測試函數
SELECT * FROM check_beacon_daily_limit('test_user', '0000000019', (SELECT id FROM beacon_actions LIMIT 1));
SELECT * FROM check_beacon_cooldown('test_user', '0000000019', (SELECT id FROM beacon_actions LIMIT 1));

