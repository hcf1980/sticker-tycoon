-- 為 YouTuber 推廣計畫表添加影片審核相關欄位
-- 如果欄位不存在則添加

DO $$ 
BEGIN
  -- 添加 approval_reason 欄位
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'youtuber_promotions' 
    AND column_name = 'approval_reason'
  ) THEN
    ALTER TABLE youtuber_promotions ADD COLUMN approval_reason TEXT;
    RAISE NOTICE '✅ 已添加 approval_reason 欄位';
  END IF;

  -- 添加 video_title 欄位
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'youtuber_promotions' 
    AND column_name = 'video_title'
  ) THEN
    ALTER TABLE youtuber_promotions ADD COLUMN video_title TEXT;
    RAISE NOTICE '✅ 已添加 video_title 欄位';
  END IF;

  -- 添加 video_approval_status 欄位
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'youtuber_promotions' 
    AND column_name = 'video_approval_status'
  ) THEN
    ALTER TABLE youtuber_promotions ADD COLUMN video_approval_status TEXT DEFAULT 'pending';
    RAISE NOTICE '✅ 已添加 video_approval_status 欄位';
  END IF;

  -- 添加 video_approval_reason 欄位
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'youtuber_promotions' 
    AND column_name = 'video_approval_reason'
  ) THEN
    ALTER TABLE youtuber_promotions ADD COLUMN video_approval_reason TEXT;
    RAISE NOTICE '✅ 已添加 video_approval_reason 欄位';
  END IF;

  -- 添加 video_approved_at 欄位
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'youtuber_promotions' 
    AND column_name = 'video_approved_at'
  ) THEN
    ALTER TABLE youtuber_promotions ADD COLUMN video_approved_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ 已添加 video_approved_at 欄位';
  END IF;

END $$;

-- 驗證表結構
SELECT '✅ YouTuber 推廣計畫表欄位更新完成' as status;

-- 顯示所有欄位
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'youtuber_promotions'
ORDER BY ordinal_position;

