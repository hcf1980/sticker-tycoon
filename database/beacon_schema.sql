-- LINE Beacon 管理系統資料表
-- 用於記錄 Beacon 設備和觸發事件

-- 1. Beacon 設備註冊表
CREATE TABLE IF NOT EXISTS beacon_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hwid VARCHAR(10) NOT NULL UNIQUE, -- LINE Beacon Hardware ID (5 bytes = 10 hex chars)
  vendor_key VARCHAR(8), -- Vendor Key (optional)
  lot_key VARCHAR(16), -- Lot Key (optional)
  device_name VARCHAR(100), -- 設備名稱（方便管理）
  location VARCHAR(200), -- 設備位置描述
  description TEXT, -- 設備說明
  is_active BOOLEAN DEFAULT true, -- 是否啟用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Beacon 觸發事件記錄表
CREATE TABLE IF NOT EXISTS beacon_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL, -- LINE User ID
  hwid VARCHAR(10) NOT NULL, -- Beacon Hardware ID
  event_type VARCHAR(20) NOT NULL, -- 'enter' or 'leave'
  device_message TEXT, -- Device Message (optional, 1-13 bytes)
  timestamp BIGINT NOT NULL, -- LINE event timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Beacon 觸發動作設定表
CREATE TABLE IF NOT EXISTS beacon_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hwid VARCHAR(10) NOT NULL, -- Beacon Hardware ID
  event_type VARCHAR(20) NOT NULL, -- 'enter' or 'leave'
  action_type VARCHAR(50) NOT NULL, -- 'message', 'coupon', 'sticker_promo', 'custom'
  action_data JSONB NOT NULL, -- 動作資料（訊息內容、優惠券ID等）
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- 優先順序（數字越大越優先）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Beacon 統計表
CREATE TABLE IF NOT EXISTS beacon_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hwid VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  enter_count INTEGER DEFAULT 0,
  leave_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hwid, date)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_beacon_devices_hwid ON beacon_devices(hwid);
CREATE INDEX IF NOT EXISTS idx_beacon_devices_active ON beacon_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_beacon_events_user_id ON beacon_events(user_id);
CREATE INDEX IF NOT EXISTS idx_beacon_events_hwid ON beacon_events(hwid);
CREATE INDEX IF NOT EXISTS idx_beacon_events_created_at ON beacon_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beacon_actions_hwid ON beacon_actions(hwid);
CREATE INDEX IF NOT EXISTS idx_beacon_actions_active ON beacon_actions(is_active);
CREATE INDEX IF NOT EXISTS idx_beacon_statistics_hwid_date ON beacon_statistics(hwid, date);

-- 建立 RLS 政策
ALTER TABLE beacon_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon_statistics ENABLE ROW LEVEL SECURITY;

-- Service Role 可以完全存取
CREATE POLICY "Service role can do everything on beacon_devices"
  ON beacon_devices FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on beacon_events"
  ON beacon_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on beacon_actions"
  ON beacon_actions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on beacon_statistics"
  ON beacon_statistics FOR ALL
  USING (auth.role() = 'service_role');

-- 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_beacon_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_beacon_devices_updated_at ON beacon_devices;
CREATE TRIGGER update_beacon_devices_updated_at
  BEFORE UPDATE ON beacon_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_beacon_updated_at();

DROP TRIGGER IF EXISTS update_beacon_actions_updated_at ON beacon_actions;
CREATE TRIGGER update_beacon_actions_updated_at
  BEFORE UPDATE ON beacon_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_beacon_updated_at();

-- 插入範例資料（根據你的截圖）
INSERT INTO beacon_devices (hwid, vendor_key, lot_key, device_name, location, description)
VALUES 
  ('0000000019', '00000019', '0011223344556603', 'Minew E2 測試設備', '辦公室入口', '用於測試 LINE Beacon 功能的 Minew E2 設備')
ON CONFLICT (hwid) DO NOTHING;

-- 插入預設動作：進入時發送歡迎訊息
INSERT INTO beacon_actions (hwid, event_type, action_type, action_data, priority)
VALUES 
  ('0000000019', 'enter', 'message', 
   '{"type": "text", "text": "👋 歡迎光臨！\n\n您已進入貼圖大亨服務範圍，現在可以使用所有功能創建專屬貼圖！\n\n輸入「創建貼圖」開始製作 🎨"}',
   10)
ON CONFLICT DO NOTHING;

