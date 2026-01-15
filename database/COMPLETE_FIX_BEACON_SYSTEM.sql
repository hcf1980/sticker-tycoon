-- 完整修復 Beacon 系統的所有問題
-- 按順序執行，一次性解決所有 bug

BEGIN;

-- ===== 步驟 1：為孤立記錄建立對應的 beacon_devices =====
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

-- ===== 步驟 2：處理舊欄位到新欄位的遷移 =====
DO $$
BEGIN
  -- 處理 event_type -> trigger_type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beacon_actions' AND column_name = 'event_type'
  ) THEN
    -- 如果 trigger_type 不存在，先建立
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'beacon_actions' AND column_name = 'trigger_type'
    ) THEN
      ALTER TABLE beacon_actions ADD COLUMN trigger_type VARCHAR(20);
    END IF;

    -- 遷移資料
    UPDATE beacon_actions
    SET trigger_type = event_type
    WHERE trigger_type IS NULL AND event_type IS NOT NULL;

    -- 刪除舊欄位
    ALTER TABLE beacon_actions DROP COLUMN event_type;
    RAISE NOTICE '✅ 已將 event_type 遷移到 trigger_type 並刪除舊欄位';
  END IF;

  -- 處理 action_type 欄位（舊版欄位，新版不需要）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beacon_actions' AND column_name = 'action_type'
  ) THEN
    ALTER TABLE beacon_actions DROP COLUMN action_type;
    RAISE NOTICE '✅ 已刪除 action_type 欄位（舊版）';
  END IF;

  -- 處理 action_data 欄位（舊版欄位，新版不需要）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beacon_actions' AND column_name = 'action_data'
  ) THEN
    ALTER TABLE beacon_actions DROP COLUMN action_data;
    RAISE NOTICE '✅ 已刪除 action_data 欄位（舊版）';
  END IF;

  -- 處理 priority 欄位（舊版欄位，新版不需要）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beacon_actions' AND column_name = 'priority'
  ) THEN
    ALTER TABLE beacon_actions DROP COLUMN priority;
    RAISE NOTICE '✅ 已刪除 priority 欄位（舊版）';
  END IF;

  -- 確保 trigger_type 欄位存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beacon_actions' AND column_name = 'trigger_type'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN trigger_type VARCHAR(20);
    RAISE NOTICE '✅ 已添加 trigger_type 欄位';
  END IF;

  -- 更新所有 NULL 值為預設值
  UPDATE beacon_actions
  SET trigger_type = 'enter'
  WHERE trigger_type IS NULL;

  -- 設定 NOT NULL 約束
  ALTER TABLE beacon_actions ALTER COLUMN trigger_type SET NOT NULL;
  RAISE NOTICE '✅ trigger_type 欄位已設定為 NOT NULL';
END $$;

-- ===== 步驟 3：添加其他必要欄位 =====
DO $$ 
BEGIN
  -- action_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'action_name'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN action_name VARCHAR(100);
    RAISE NOTICE '✅ 已添加 action_name 欄位';
  END IF;

  -- message_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'message_id'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN message_id UUID REFERENCES beacon_messages(id);
    RAISE NOTICE '✅ 已添加 message_id 欄位';
  END IF;

  -- description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'description'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN description TEXT;
    RAISE NOTICE '✅ 已添加 description 欄位';
  END IF;

  -- daily_limit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'daily_limit'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN daily_limit INTEGER DEFAULT 2;
    RAISE NOTICE '✅ 已添加 daily_limit 欄位';
  END IF;

  -- cooldown_minutes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'cooldown_minutes'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN cooldown_minutes INTEGER DEFAULT 60;
    RAISE NOTICE '✅ 已添加 cooldown_minutes 欄位';
  END IF;

  -- is_active
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ 已添加 is_active 欄位';
  END IF;
END $$;

-- ===== 步驟 4：更新現有記錄的預設值 =====
UPDATE beacon_actions
SET 
  daily_limit = COALESCE(daily_limit, 2),
  cooldown_minutes = COALESCE(cooldown_minutes, 60),
  is_active = COALESCE(is_active, true);

-- ===== 步驟 5：添加外鍵約束 =====
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

COMMIT;

-- ===== 步驟 6：建立索引 =====
CREATE INDEX IF NOT EXISTS idx_beacon_actions_hwid ON beacon_actions(hwid);
CREATE INDEX IF NOT EXISTS idx_beacon_actions_message_id ON beacon_actions(message_id);
CREATE INDEX IF NOT EXISTS idx_beacon_actions_trigger_type ON beacon_actions(trigger_type);
CREATE INDEX IF NOT EXISTS idx_beacon_events_user_hwid_date ON beacon_events(user_id, hwid, created_at);
CREATE INDEX IF NOT EXISTS idx_beacon_events_action_user_date ON beacon_events(action_id, user_id, created_at);

-- ===== 步驟 7：建立檢查函數 =====

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
) AS $$
DECLARE
  v_daily_limit INTEGER;
  v_today_count INTEGER;
BEGIN
  SELECT ba.daily_limit INTO v_daily_limit
  FROM beacon_actions ba
  WHERE ba.id = p_action_id;

  IF v_daily_limit IS NULL THEN
    v_daily_limit := 2;
  END IF;

  SELECT COUNT(*) INTO v_today_count
  FROM beacon_events
  WHERE user_id = p_user_id
    AND hwid = p_hwid
    AND action_id = p_action_id
    AND message_sent = true
    AND DATE(created_at) = CURRENT_DATE;

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
  SELECT ba.cooldown_minutes INTO v_cooldown_minutes
  FROM beacon_actions ba
  WHERE ba.id = p_action_id;

  IF v_cooldown_minutes IS NULL THEN
    v_cooldown_minutes := 60;
  END IF;

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

-- ===== 驗證結果 =====

-- 檢查表結構
SELECT 
  '✅ beacon_actions 表結構' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'beacon_actions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 檢查外鍵
SELECT 
  '✅ 外鍵約束' as check_type,
  constraint_name,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'beacon_actions'
  AND constraint_type = 'FOREIGN KEY';

-- 檢查函數
SELECT 
  '✅ 檢查函數' as check_type,
  routine_name
FROM information_schema.routines
WHERE routine_name IN ('check_beacon_daily_limit', 'check_beacon_cooldown');

-- ✅ 完成！
SELECT '🎉 所有問題已修復完成！' as status;

