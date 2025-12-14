-- ========================================
-- 🎄 新增：聖誕裝飾風格
-- ========================================
-- 目的：為聖誕節慶貼圖添加專屬裝飾風格
-- 包含：聖誕樹、聖誕帽、禮物、雪花、金紅配色等
-- ========================================

-- 🔍 說明：這個 SQL 檔案是「示範用」
-- 實際應該在 Admin 管理頁面 > 裝飾風格設定 中新增或編輯
-- ========================================

-- 範例：新增聖誕裝飾風格（如果你的資料庫沒有的話）
INSERT INTO scene_settings (
  scene_id,
  name,
  emoji,
  description,
  decoration_style,
  decoration_elements,
  pop_text_style,
  is_active,
  created_at,
  updated_at
) VALUES (
  'christmas',
  '聖誕節慶',
  '🎄',
  '聖誕樹、金紅裝飾、雪花禮物',
  'festive Christmas theme, warm holiday atmosphere with gold and red decorations, cozy winter celebration',
  ARRAY[
    'christmas tree',
    'santa hat',
    'gift boxes with ribbons',
    'snowflakes',
    'holly leaves with berries',
    'golden bells',
    'red and gold ornaments',
    'twinkling lights',
    'candy canes',
    'stars on top'
  ],
  'festive bold text with Christmas colors (red, gold, green), holiday celebration typography, warm and joyful font',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (scene_id)
DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  decoration_style = EXCLUDED.decoration_style,
  decoration_elements = EXCLUDED.decoration_elements,
  pop_text_style = EXCLUDED.pop_text_style,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 確認新增成功
SELECT scene_id, name, emoji, description
FROM scene_settings
WHERE scene_id = 'christmas';

-- ========================================
-- 📋 執行說明：
-- 1. 登入 Supabase Dashboard
-- 2. 進入 SQL Editor
-- 3. 貼上此 SQL 並執行
-- 4. 應該會看到聖誕裝飾風格的確認資訊
-- ========================================

-- ========================================
-- 🎅 聖誕表情增強提示詞（已在 ExpressionEnhancer 中）
-- ========================================
-- "聖誕快樂": {
--   action: "wearing santa hat, holding christmas gift, cheerful holiday pose",
--   popText: "Merry X'mas!",
--   decorations: "christmas tree, gifts, snowflakes, holly leaves, golden bells"
-- }

