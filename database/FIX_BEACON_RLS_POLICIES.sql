-- 修復 Beacon 表的 RLS 策略
-- 允許 anon 角色進行所有操作（用於管理介面）

-- 刪除舊的限制性策略（如果存在）
DROP POLICY IF EXISTS "Service role can do everything on beacon_devices" ON beacon_devices;
DROP POLICY IF EXISTS "Service role can do everything on beacon_events" ON beacon_events;
DROP POLICY IF EXISTS "Service role can do everything on beacon_actions" ON beacon_actions;
DROP POLICY IF EXISTS "Service role can do everything on beacon_statistics" ON beacon_statistics;

-- beacon_devices 表 - 允許所有操作
CREATE POLICY "Allow all operations on beacon_devices"
  ON beacon_devices FOR ALL
  USING (true)
  WITH CHECK (true);

-- beacon_events 表 - 允許所有操作
CREATE POLICY "Allow all operations on beacon_events"
  ON beacon_events FOR ALL
  USING (true)
  WITH CHECK (true);

-- beacon_actions 表 - 允許所有操作
CREATE POLICY "Allow all operations on beacon_actions"
  ON beacon_actions FOR ALL
  USING (true)
  WITH CHECK (true);

-- beacon_statistics 表 - 允許所有操作
CREATE POLICY "Allow all operations on beacon_statistics"
  ON beacon_statistics FOR ALL
  USING (true)
  WITH CHECK (true);

-- 驗證策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('beacon_devices', 'beacon_events', 'beacon_actions', 'beacon_statistics')
ORDER BY tablename, policyname;

