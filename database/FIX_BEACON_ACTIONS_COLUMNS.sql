-- 修復 beacon_actions 表的欄位問題
-- 將 event_type 改為 trigger_type，並處理資料遷移

BEGIN;

-- ===== 1. 檢查現有欄位 =====
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'beacon_actions'
  AND column_name IN ('event_type', 'trigger_type')
ORDER BY ordinal_position;

-- ===== 2. 資料遷移 =====

-- 如果 trigger_type 已存在且 event_type 也存在，先遷移資料
DO $$ 
BEGIN
  -- 檢查兩個欄位是否都存在
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'event_type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'trigger_type'
  ) THEN
    -- 將 event_type 的值複製到 trigger_type
    UPDATE beacon_actions
    SET trigger_type = event_type
    WHERE trigger_type IS NULL AND event_type IS NOT NULL;
    
    RAISE NOTICE '✅ 已將 event_type 資料遷移到 trigger_type';
  END IF;
END $$;

-- ===== 3. 刪除 event_type 欄位 =====

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE beacon_actions DROP COLUMN event_type;
    RAISE NOTICE '✅ 已刪除 event_type 欄位';
  ELSE
    RAISE NOTICE 'ℹ️ event_type 欄位不存在';
  END IF;
END $$;

-- ===== 4. 確保 trigger_type 欄位存在且設定正確 =====

DO $$ 
BEGIN
  -- 添加 trigger_type 欄位（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'trigger_type'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN trigger_type VARCHAR(20) NOT NULL DEFAULT 'enter';
    RAISE NOTICE '✅ 已添加 trigger_type 欄位';
  ELSE
    RAISE NOTICE 'ℹ️ trigger_type 欄位已存在';
  END IF;
END $$;

-- ===== 5. 移除 NOT NULL 約束（允許先儲存再填入） =====

DO $$ 
BEGIN
  -- 先移除 NOT NULL 約束
  ALTER TABLE beacon_actions ALTER COLUMN trigger_type DROP NOT NULL;
  RAISE NOTICE '✅ 已移除 trigger_type 的 NOT NULL 約束';
  
  -- 更新所有 NULL 值為預設值 'enter'
  UPDATE beacon_actions
  SET trigger_type = 'enter'
  WHERE trigger_type IS NULL;
  
  -- 再加回 NOT NULL 約束
  ALTER TABLE beacon_actions ALTER COLUMN trigger_type SET NOT NULL;
  RAISE NOTICE '✅ 已重新添加 trigger_type 的 NOT NULL 約束';
END $$;

-- ===== 6. 確保其他必要欄位存在 =====

DO $$ 
BEGIN
  -- action_name 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'action_name'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN action_name VARCHAR(100);
    RAISE NOTICE '✅ 已添加 action_name 欄位';
  END IF;

  -- message_id 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'message_id'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN message_id UUID REFERENCES beacon_messages(id);
    RAISE NOTICE '✅ 已添加 message_id 欄位';
  END IF;

  -- description 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'description'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN description TEXT;
    RAISE NOTICE '✅ 已添加 description 欄位';
  END IF;

  -- daily_limit 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'daily_limit'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN daily_limit INTEGER DEFAULT 2;
    RAISE NOTICE '✅ 已添加 daily_limit 欄位';
  END IF;

  -- cooldown_minutes 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'cooldown_minutes'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN cooldown_minutes INTEGER DEFAULT 60;
    RAISE NOTICE '✅ 已添加 cooldown_minutes 欄位';
  END IF;

  -- is_active 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beacon_actions' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE beacon_actions ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ 已添加 is_active 欄位';
  END IF;
END $$;

COMMIT;

-- ===== 7. 驗證最終結構 =====

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'beacon_actions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ✅ 完成！
SELECT '🎉 beacon_actions 表結構已修復！' as status;

