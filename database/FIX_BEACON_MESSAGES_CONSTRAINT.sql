-- 🔧 修正 beacon_messages 表的唯一約束問題

-- ===== 步驟 1：檢查現有約束 =====
SELECT
  '📋 現有約束' as check_type,
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'beacon_messages'::regclass;

-- ===== 步驟 2：檢查重複的 template_name =====
SELECT
  '⚠️ 重複的模板名稱' as check_type,
  template_name,
  COUNT(*) as count,
  array_agg(id) as ids
FROM beacon_messages
GROUP BY template_name
HAVING COUNT(*) > 1;

-- ===== 步驟 3：清理重複的 template_name =====
-- 保留每個 template_name 最新的記錄，刪除舊的
DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  FOR duplicate_record IN
    SELECT template_name, array_agg(id ORDER BY created_at DESC) as ids
    FROM beacon_messages
    GROUP BY template_name
    HAVING COUNT(*) > 1
  LOOP
    -- 刪除除了第一個（最新）之外的所有記錄
    DELETE FROM beacon_messages
    WHERE id = ANY(duplicate_record.ids[2:]);

    RAISE NOTICE '✅ 已清理重複的模板: %', duplicate_record.template_name;
  END LOOP;
END $$;

-- ===== 步驟 4：添加 template_name 唯一約束 =====
DO $$
BEGIN
  -- 檢查是否已有唯一約束
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'beacon_messages'::regclass
      AND conname = 'beacon_messages_template_name_key'
  ) THEN
    -- 添加唯一約束
    ALTER TABLE beacon_messages
    ADD CONSTRAINT beacon_messages_template_name_key
    UNIQUE (template_name);

    RAISE NOTICE '✅ 已添加 template_name 唯一約束';
  ELSE
    RAISE NOTICE 'ℹ️ template_name 唯一約束已存在';
  END IF;
END $$;

-- ===== 步驟 5：驗證約束已添加 =====
SELECT
  '✅ 驗證結果' as check_type,
  conname as constraint_name,
  contype as constraint_type,
  CASE contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
    ELSE contype::text
  END as constraint_description
FROM pg_constraint
WHERE conrelid = 'beacon_messages'::regclass
ORDER BY contype;

-- ===== 步驟 6：檢查清理後的資料 =====
SELECT
  '📊 清理後的模板' as check_type,
  template_name,
  COUNT(*) as count
FROM beacon_messages
GROUP BY template_name
ORDER BY template_name;

-- ✅ 完成！
SELECT
  '🎉 修正完成！' as status,
  '現在可以使用 ON CONFLICT (template_name) 了' as message;

