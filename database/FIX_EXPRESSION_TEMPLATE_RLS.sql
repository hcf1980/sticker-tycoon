-- ========================================
-- 🔧 修復：expression_template_settings RLS 政策
-- ========================================
-- 問題：expression_template_settings 表可能缺少 RLS 政策，導致無法更新
-- 解決：添加公開讀取和寫入的 RLS 政策
-- ========================================

-- 1️⃣ 啟用 RLS
ALTER TABLE expression_template_settings ENABLE ROW LEVEL SECURITY;

-- 2️⃣ 刪除已存在的 policies（如果存在）
DROP POLICY IF EXISTS "Allow public read access" ON expression_template_settings;
DROP POLICY IF EXISTS "Allow public insert access" ON expression_template_settings;
DROP POLICY IF EXISTS "Allow public update access" ON expression_template_settings;

-- 3️⃣ 允許所有人讀取
CREATE POLICY "Allow public read access" 
  ON expression_template_settings 
  FOR SELECT 
  USING (true);

-- 4️⃣ 允許所有人新增
CREATE POLICY "Allow public insert access" 
  ON expression_template_settings 
  FOR INSERT 
  WITH CHECK (true);

-- 5️⃣ 允許所有人更新
CREATE POLICY "Allow public update access" 
  ON expression_template_settings 
  FOR UPDATE 
  USING (true);

-- 6️⃣ 確認政策已建立
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'expression_template_settings';

-- ========================================
-- 📋 執行說明：
-- 1. 登入 Supabase Dashboard
-- 2. 進入 SQL Editor
-- 3. 貼上此 SQL 並執行
-- ========================================

