-- 快速修復 beacon_actions 表的外鍵和觸發限制
-- 執行此 SQL 可一次性解決所有問題

BEGIN;

-- ===== 1. 修正外鍵關聯 =====

-- 步驟 1.1：為孤立記錄建立對應的 beacon_devices
-- 避免資料遺失
INSERT INTO beacon_devices (hwid, device_name, location, is_active)
SELECT DISTINCT
  ba.hwid,
  '自動建立 - ' || ba.hwid AS device_name,
  '未設定位置' AS location,
  true AS is_active
FROM beacon_actions ba
LEFT JOIN beacon_devices bd ON ba.hwid = bd.hwid
WHERE bd.hwid IS NULL
ON CONFLICT (hwid) DO NOTHING;

-- 步驟 1.2：刪除舊的外鍵約束並添加新的
DO $$
BEGIN
  -- 刪除舊的外鍵約束（如果存在）
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'beacon_actions_hwid_fkey'
      AND table_name = 'beacon_actions'
  ) THEN
    ALTER TABLE beacon_actions DROP CONSTRAINT beacon_actions_hwid_fkey;
    RAISE NOTICE '✅ 舊的外鍵約束已刪除';
  END IF;

  -- 添加新的外鍵約束
  ALTER TABLE beacon_actions
  ADD CONSTRAINT beacon_actions_hwid_fkey
  FOREIGN KEY (hwid) REFERENCES beacon_devices(hwid) ON DELETE CASCADE;

  RAISE NOTICE '✅ hwid 外鍵約束已添加';
END $$;

-- ===== 2. 添加觸發限制欄位 =====

DO $$ 
BEGIN
  -- 添加 daily_limit 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'daily_limit'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN daily_limit INTEGER DEFAULT 2;
    RAISE NOTICE '✅ daily_limit 欄位已添加';
  ELSE
    RAISE NOTICE 'ℹ️ daily_limit 欄位已存在';
  END IF;

  -- 添加 cooldown_minutes 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'cooldown_minutes'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN cooldown_minutes INTEGER DEFAULT 60;
    RAISE NOTICE '✅ cooldown_minutes 欄位已添加';
  ELSE
    RAISE NOTICE 'ℹ️ cooldown_minutes 欄位已存在';
  END IF;
END $$;

-- ===== 3. 更新現有記錄 =====

UPDATE beacon_actions
SET 
  daily_limit = COALESCE(daily_limit, 2),
  cooldown_minutes = COALESCE(cooldown_minutes, 60);

-- ===== 4. 建立索引 =====

CREATE INDEX IF NOT EXISTS idx_beacon_actions_hwid ON beacon_actions(hwid);
CREATE INDEX IF NOT EXISTS idx_beacon_events_user_hwid_date ON beacon_events(user_id, hwid, created_at);
CREATE INDEX IF NOT EXISTS idx_beacon_events_action_user_date ON beacon_events(action_id, user_id, created_at);

-- ===== 5. 建立檢查函數 =====

-- 檢查每日觸發限制
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
) AS $
DECLARE
  v_daily_limit INTEGER;
  v_today_count INTEGER;
BEGIN
  -- 取得該動作的每日限制
  SELECT ba.daily_limit INTO v_daily_limit
  FROM beacon_actions ba
  WHERE ba.id = p_action_id;

  IF v_daily_limit IS NULL THEN
    v_daily_limit := 2;
  END IF;

  -- 計算今日已觸發次數（B: 每個 user + hwid 共享，不分 action / 事件類型）
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
$ LANGUAGE plpgsql;

COMMIT;

-- ===== 6. 驗證結果 =====

-- 檢查外鍵
SELECT 
  '外鍵檢查' as check_type,
  constraint_name,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'beacon_actions'
  AND constraint_type = 'FOREIGN KEY';

-- 檢查欄位
SELECT 
  '欄位檢查' as check_type,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'beacon_actions'
  AND column_name IN ('hwid', 'daily_limit', 'cooldown_minutes')
ORDER BY ordinal_position;

-- 檢查函數
SELECT 
  '函數檢查' as check_type,
  routine_name
FROM information_schema.routines
WHERE routine_name IN ('check_beacon_daily_limit', 'check_beacon_cooldown');

-- ✅ 完成！
SELECT '🎉 修復完成！' as status;

-- 檢查冷卻時間
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
) AS $
DECLARE
  v_cooldown_minutes INTEGER;
  v_last_trigger_time TIMESTAMPTZ;
  v_remaining_minutes INTEGER;
BEGIN
  -- 取得該動作的冷卻時間
  SELECT ba.cooldown_minutes INTO v_cooldown_minutes
  FROM beacon_actions ba
  WHERE ba.id = p_action_id;

  IF v_cooldown_minutes IS NULL THEN
    v_cooldown_minutes := 60;
  END IF;

  -- 取得最後一次觸發時間（B: 每個 user + hwid 共享，不分 action / 事件類型）
  SELECT MAX(created_at) INTO v_last_trigger_time
  FROM beacon_events
  WHERE user_id = p_user_id
    AND hwid = p_hwid
    AND message_sent = true;

  IF v_last_trigger_time IS NULL THEN
    RETURN QUERY SELECT 
      true,
      NULL::TIMESTAMPTZ,
      v_cooldown_minutes,
      0,
      '首次觸發';
  ELSE
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
$ LANGUAGE plpgsql;
DECLARE
  v_daily_limit INTEGER;
  v_today_count INTEGER;
BEGIN
  -- 取得該動作的每日限制
  SELECT ba.daily_limit INTO v_daily_limit
  FROM beacon_actions ba
  WHERE ba.id = p_action_id;

  IF v_daily_limit IS NULL THEN
    v_daily_limit := 2;
  END IF;

  -- 計算今日已觸發次數
  SELECT COUNT(*) INTO v_today_count
  FROM beacon_events
  WHERE user_id = p_user_id
    AND hwid = p_hwid
    AND action_id = p_action_id
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

-- 檢查冷卻時間
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

  IF v_cooldown_minutes IS NULL THEN
    v_cooldown_minutes := 60;
  END IF;

  -- 取得最後一次觸發時間
  SELECT MAX(created_at) INTO v_last_trigger_time
  FROM beacon_events
  WHERE user_id = p_user_id
    AND hwid = p_hwid
    AND action_id = p_action_id
    AND message_sent = true;

  IF v_last_trigger_time IS NULL THEN
    RETURN QUERY SELECT 
      true,
      NULL::TIMESTAMPTZ,
      v_cooldown_minutes,
      0,
      '首次觸發';
  ELSE
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

COMMIT;

-- ===== 6. 驗證結果 =====

-- 檢查外鍵
SELECT 
  '外鍵檢查' as check_type,
  constraint_name,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'beacon_actions'
  AND constraint_type = 'FOREIGN KEY';

-- 檢查欄位
SELECT 
  '欄位檢查' as check_type,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'beacon_actions'
  AND column_name IN ('hwid', 'daily_limit', 'cooldown_minutes')
ORDER BY ordinal_position;

-- 檢查函數
SELECT 
  '函數檢查' as check_type,
  routine_name
FROM information_schema.routines
WHERE routine_name IN ('check_beacon_daily_limit', 'check_beacon_cooldown');

-- ✅ 完成！
SELECT '🎉 修復完成！' as status;

