-- 更新 beacon_events 表，添加 message_sent 欄位

DO $$ 
BEGIN
  -- 添加 message_sent 欄位（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_events' AND column_name = 'message_sent'
  ) THEN
    ALTER TABLE beacon_events ADD COLUMN message_sent BOOLEAN DEFAULT false;
  END IF;

  -- 添加 action_id 欄位（記錄觸發了哪個動作）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_events' AND column_name = 'action_id'
  ) THEN
    ALTER TABLE beacon_events ADD COLUMN action_id UUID REFERENCES beacon_actions(id);
  END IF;

  -- 添加 message_id 欄位（記錄推送了哪個訊息）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_events' AND column_name = 'message_id'
  ) THEN
    ALTER TABLE beacon_events ADD COLUMN message_id UUID REFERENCES beacon_messages(id);
  END IF;

  -- 添加 error_message 欄位（記錄錯誤訊息）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_events' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE beacon_events ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_beacon_events_message_sent ON beacon_events(message_sent);
CREATE INDEX IF NOT EXISTS idx_beacon_events_action_id ON beacon_events(action_id);
CREATE INDEX IF NOT EXISTS idx_beacon_events_message_id ON beacon_events(message_id);

-- 驗證更新
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'beacon_events'
  AND table_schema = 'public'
ORDER BY ordinal_position;

