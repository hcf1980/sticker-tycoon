-- LINE Beacon 測試資料
-- 用於測試 Beacon 管理系統

-- 1. 插入測試設備（根據你的截圖）
INSERT INTO beacon_devices (hwid, vendor_key, lot_key, device_name, location, description, is_active)
VALUES 
  ('0000000019', '00000019', '0011223344556603', 'Minew E2 測試設備', '辦公室入口', '用於測試 LINE Beacon 功能的 Minew E2 設備', true)
ON CONFLICT (hwid) DO UPDATE SET
  vendor_key = EXCLUDED.vendor_key,
  lot_key = EXCLUDED.lot_key,
  device_name = EXCLUDED.device_name,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. 插入測試動作：進入時發送歡迎訊息
INSERT INTO beacon_actions (hwid, event_type, action_type, action_data, priority, is_active)
VALUES 
  ('0000000019', 'enter', 'message', 
   '{"type": "text", "text": "👋 歡迎光臨！\n\n您已進入貼圖大亨服務範圍，現在可以使用所有功能創建專屬貼圖！\n\n輸入「創建貼圖」開始製作 🎨"}',
   10, true)
ON CONFLICT DO NOTHING;

-- 3. 插入測試動作：離開時發送感謝訊息
INSERT INTO beacon_actions (hwid, event_type, action_type, action_data, priority, is_active)
VALUES 
  ('0000000019', 'leave', 'message', 
   '{"type": "text", "text": "👋 感謝您的光臨！\n\n期待下次再見 💖\n\n隨時輸入「創建貼圖」繼續製作您的專屬貼圖！"}',
   10, true)
ON CONFLICT DO NOTHING;

-- 4. 查詢所有設備
SELECT * FROM beacon_devices ORDER BY created_at DESC;

-- 5. 查詢所有動作
SELECT 
  ba.*,
  bd.device_name,
  bd.location
FROM beacon_actions ba
LEFT JOIN beacon_devices bd ON ba.hwid = bd.hwid
ORDER BY ba.hwid, ba.event_type, ba.priority DESC;

-- 6. 查詢最近的觸發事件（如果有的話）
SELECT 
  be.*,
  bd.device_name,
  bd.location
FROM beacon_events be
LEFT JOIN beacon_devices bd ON be.hwid = bd.hwid
ORDER BY be.created_at DESC
LIMIT 50;

-- 7. 查詢統計資料
SELECT 
  bs.*,
  bd.device_name,
  bd.location
FROM beacon_statistics bs
LEFT JOIN beacon_devices bd ON bs.hwid = bd.hwid
ORDER BY bs.date DESC, bs.hwid
LIMIT 30;

-- 8. 清除測試資料（如果需要重新測試）
-- DELETE FROM beacon_events WHERE hwid = '0000000019';
-- DELETE FROM beacon_statistics WHERE hwid = '0000000019';
-- DELETE FROM beacon_actions WHERE hwid = '0000000019';
-- DELETE FROM beacon_devices WHERE hwid = '0000000019';

