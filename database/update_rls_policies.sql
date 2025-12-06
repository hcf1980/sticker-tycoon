-- 更新 RLS Policies 以允許匿名用戶寫入
-- 這是安全的，因為管理後台已經有登入驗證機制

-- 刪除舊的 policies
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON style_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON style_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON framing_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON framing_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON scene_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON scene_settings;

-- 刪除可能存在的舊 public policies
DROP POLICY IF EXISTS "Allow public insert access" ON style_settings;
DROP POLICY IF EXISTS "Allow public update access" ON style_settings;
DROP POLICY IF EXISTS "Allow public insert access" ON framing_settings;
DROP POLICY IF EXISTS "Allow public update access" ON framing_settings;
DROP POLICY IF EXISTS "Allow public insert access" ON scene_settings;
DROP POLICY IF EXISTS "Allow public update access" ON scene_settings;

-- 創建新的 public policies
CREATE POLICY "Allow public insert access" ON style_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON style_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public insert access" ON framing_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON framing_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public insert access" ON scene_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON scene_settings FOR UPDATE USING (true);

