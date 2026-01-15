-- 新增 Beacon 推送訊息模板表和更新觸發動作表

-- 1. 推送訊息模板表
CREATE TABLE IF NOT EXISTS beacon_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL, -- 模板名稱
  message_type VARCHAR(20) NOT NULL, -- 'text', 'flex', 'image'
  message_content TEXT NOT NULL, -- 訊息內容（純文字或 JSON）
  target_audience VARCHAR(20) DEFAULT 'all', -- 'all', 'friends', 'non_friends'
  description TEXT, -- 模板說明
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 更新 beacon_actions 表結構（如果需要）
-- 先檢查是否需要添加新欄位
DO $$ 
BEGIN
  -- 添加 action_name 欄位（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'action_name'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN action_name VARCHAR(100);
  END IF;

  -- 添加 trigger_type 欄位（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'trigger_type'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN trigger_type VARCHAR(20);
  END IF;

  -- 添加 message_id 欄位（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'message_id'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN message_id UUID REFERENCES beacon_messages(id);
  END IF;

  -- 添加 description 欄位（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'description'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN description TEXT;
  END IF;
END $$;

-- 3. 更新 beacon_events 表，添加 is_friend 欄位
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_events' AND column_name = 'is_friend'
  ) THEN
    ALTER TABLE beacon_events ADD COLUMN is_friend BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 4. 建立索引
CREATE INDEX IF NOT EXISTS idx_beacon_messages_active ON beacon_messages(is_active);
CREATE INDEX IF NOT EXISTS idx_beacon_messages_type ON beacon_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_beacon_actions_message_id ON beacon_actions(message_id);
CREATE INDEX IF NOT EXISTS idx_beacon_events_is_friend ON beacon_events(is_friend);

-- 5. 更新 RLS 策略（允許所有操作）
ALTER TABLE beacon_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on beacon_messages" ON beacon_messages;
CREATE POLICY "Allow all operations on beacon_messages"
  ON beacon_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_beacon_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_beacon_messages_updated_at ON beacon_messages;
CREATE TRIGGER trigger_update_beacon_messages_updated_at
  BEFORE UPDATE ON beacon_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_beacon_messages_updated_at();

-- 7. 插入範例推送訊息模板
INSERT INTO beacon_messages (template_name, message_type, message_content, target_audience, description, is_active)
VALUES 
  ('歡迎訊息', 'text', '歡迎光臨！感謝您使用我們的服務 🎉', 'all', '通用歡迎訊息', true),
  ('好友專屬優惠', 'text', '親愛的好友，這是您的專屬優惠！立即查看 👉', 'friends', '已加入好友的專屬訊息', true),
  ('邀請加入好友', 'text', '加入我們成為好友，獲得更多優惠和貼圖！🎁', 'non_friends', '邀請未加入好友的用戶', true)
ON CONFLICT DO NOTHING;

-- 8. 驗證表結構
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('beacon_messages', 'beacon_actions', 'beacon_events')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

