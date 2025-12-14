-- ========================================
-- 🔧 修復：sticker_sets 表新增裝飾風格相關欄位
-- ========================================
-- 問題：sticker_sets 表缺少 scene、scene_config、expressions、character_id 欄位
-- 導致裝飾風格選擇無法正確儲存和套用
-- ========================================

-- 1️⃣ 新增 scene 欄位（裝飾風格 ID）
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS scene TEXT DEFAULT 'none';

-- 2️⃣ 新增 scene_config 欄位（裝飾風格完整配置 JSON）
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS scene_config JSONB;

-- 3️⃣ 新增 expressions 欄位（用戶選擇的表情列表 JSON）
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS expressions JSONB;

-- 4️⃣ 新增 character_id 欄位（角色一致性 ID）
ALTER TABLE sticker_sets 
ADD COLUMN IF NOT EXISTS character_id TEXT;

-- 5️⃣ 確認欄位已新增
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'sticker_sets' 
  AND column_name IN ('scene', 'scene_config', 'expressions', 'character_id')
ORDER BY column_name;

-- ========================================
-- 📋 執行說明：
-- 1. 登入 Supabase Dashboard
-- 2. 進入 SQL Editor
-- 3. 貼上此 SQL 並執行
-- 4. 應該會看到 4 個欄位的確認資訊
-- ========================================

-- ========================================
-- 🔍 驗證現有資料（可選）
-- ========================================
-- 查看最近的貼圖組是否有這些欄位的資料
-- SELECT set_id, name, scene, scene_config, expressions, character_id
-- FROM sticker_sets
-- ORDER BY created_at DESC
-- LIMIT 5;


