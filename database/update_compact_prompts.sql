-- 🎯 更新構圖設定：添加精簡版 Prompt
-- 執行此腳本來更新現有的 framing_settings 表

-- 1. 添加新欄位（如果還沒添加）
ALTER TABLE framing_settings ADD COLUMN IF NOT EXISTS compact_prompt TEXT;
ALTER TABLE framing_settings ADD COLUMN IF NOT EXISTS use_compact BOOLEAN DEFAULT true;

-- 2. 更新現有構圖的精簡版 Prompt
UPDATE framing_settings 
SET 
  compact_prompt = 'Full body head-to-toe, 15% head, 90% vertical fill, feet visible',
  use_compact = true
WHERE framing_id = 'fullbody';

UPDATE framing_settings 
SET 
  compact_prompt = 'Waist up, 25% head, hands visible, 85% vertical fill',
  use_compact = true
WHERE framing_id = 'halfbody';

UPDATE framing_settings 
SET 
  compact_prompt = 'Head & shoulders, 60% head, face focus, 85% vertical fill',
  use_compact = true
WHERE framing_id = 'portrait';

UPDATE framing_settings 
SET 
  compact_prompt = 'Face only, 85% face fill, eyes center, nearly touching edges',
  use_compact = true
WHERE framing_id = 'closeup';

-- 3. 驗證更新
SELECT 
  framing_id, 
  name,
  LENGTH(prompt_addition) as full_prompt_length,
  LENGTH(compact_prompt) as compact_prompt_length,
  use_compact
FROM framing_settings
ORDER BY framing_id;

-- 預期結果：
-- fullbody:  完整版 ~400 字 → 精簡版 ~60 字 (減少 85%)
-- halfbody:  完整版 ~350 字 → 精簡版 ~55 字 (減少 84%)
-- portrait:  完整版 ~350 字 → 精簡版 ~60 字 (減少 83%)
-- closeup:   完整版 ~320 字 → 精簡版 ~58 字 (減少 82%)

-- 💡 使用說明：
-- 1. 在 Supabase SQL Editor 執行此腳本
-- 2. 在 Admin 頁面可切換 use_compact 來控制使用完整版或精簡版
-- 3. 精簡版可減少 Prompt 長度約 80-85%
-- 4. 從 ~1300 字 → ~700 字，大幅降低 token 使用

