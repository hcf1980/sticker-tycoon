-- 🚀 效能優化：資料庫索引
-- 執行此腳本可大幅提升查詢速度

-- ============================================
-- 1. style_settings 表優化
-- ============================================

-- 優化：查詢啟用的風格
CREATE INDEX IF NOT EXISTS idx_style_settings_is_active 
ON style_settings(is_active) 
WHERE is_active = true;

-- 優化：根據 style_id 查詢
CREATE INDEX IF NOT EXISTS idx_style_settings_style_id_active 
ON style_settings(style_id, is_active);

-- ============================================
-- 2. framing_settings 表優化
-- ============================================

-- 優化：查詢啟用的構圖
CREATE INDEX IF NOT EXISTS idx_framing_settings_is_active 
ON framing_settings(is_active) 
WHERE is_active = true;

-- 優化：根據 framing_id 查詢
CREATE INDEX IF NOT EXISTS idx_framing_settings_framing_id_active 
ON framing_settings(framing_id, is_active);

-- ============================================
-- 3. scene_settings 表優化
-- ============================================

-- 優化：查詢啟用的場景
CREATE INDEX IF NOT EXISTS idx_scene_settings_is_active 
ON scene_settings(is_active) 
WHERE is_active = true;

-- 優化：根據 scene_id 查詢
CREATE INDEX IF NOT EXISTS idx_scene_settings_scene_id_active 
ON scene_settings(scene_id, is_active);

-- ============================================
-- 4. users 表優化
-- ============================================

-- 優化：根據 LINE user ID 查詢（已存在，確認）
CREATE INDEX IF NOT EXISTS idx_users_line_user_id 
ON users(line_user_id);

-- 優化：推薦碼查詢
CREATE INDEX IF NOT EXISTS idx_users_referral_code 
ON users(referral_code) 
WHERE referral_code IS NOT NULL;

-- ============================================
-- 5. sticker_sets 表優化（重要！）
-- ============================================

-- 優化：查詢用戶的貼圖組
CREATE INDEX IF NOT EXISTS idx_sticker_sets_user_id 
ON sticker_sets(user_id);

-- 優化：根據用戶 + 狀態查詢
CREATE INDEX IF NOT EXISTS idx_sticker_sets_user_status 
ON sticker_sets(user_id, status);

-- 優化：根據 set_id 查詢
CREATE INDEX IF NOT EXISTS idx_sticker_sets_set_id 
ON sticker_sets(set_id);

-- 優化：最新建立的貼圖組
CREATE INDEX IF NOT EXISTS idx_sticker_sets_created_at 
ON sticker_sets(created_at DESC);

-- 複合索引：用戶 + 狀態 + 時間
CREATE INDEX IF NOT EXISTS idx_sticker_sets_user_status_created 
ON sticker_sets(user_id, status, created_at DESC);

-- ============================================
-- 6. stickers 表優化
-- ============================================

-- 優化：根據 set_id 查詢
CREATE INDEX IF NOT EXISTS idx_stickers_set_id 
ON stickers(set_id);

-- 優化：根據 set_id + index 排序
CREATE INDEX IF NOT EXISTS idx_stickers_set_id_index 
ON stickers(set_id, index_number);

-- 優化：根據 sticker_id 查詢
CREATE INDEX IF NOT EXISTS idx_stickers_sticker_id 
ON stickers(sticker_id);

-- ============================================
-- 7. generation_tasks 表優化
-- ============================================

-- 優化：查詢用戶的任務
CREATE INDEX IF NOT EXISTS idx_generation_tasks_user_id 
ON generation_tasks(user_id);

-- 優化：根據 task_id 查詢
CREATE INDEX IF NOT EXISTS idx_generation_tasks_task_id 
ON generation_tasks(task_id);

-- 優化：查詢用戶最新任務
CREATE INDEX IF NOT EXISTS idx_generation_tasks_user_created 
ON generation_tasks(user_id, created_at DESC);

-- 優化：根據狀態查詢（清理用）
CREATE INDEX IF NOT EXISTS idx_generation_tasks_status 
ON generation_tasks(status);

-- ============================================
-- 8. upload_queue 表優化
-- ============================================

-- 優化：查詢用戶的佇列
CREATE INDEX IF NOT EXISTS idx_upload_queue_user_id 
ON upload_queue(user_id);

-- 優化：根據 user_id + queue_order 排序
CREATE INDEX IF NOT EXISTS idx_upload_queue_user_order 
ON upload_queue(user_id, queue_order);

-- ============================================
-- 9. referrals 表優化
-- ============================================

-- 優化：查詢推薦人的記錄
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id 
ON referrals(referrer_id);

-- 優化：查詢被推薦人
CREATE INDEX IF NOT EXISTS idx_referrals_referee_id 
ON referrals(referee_id);

-- ============================================
-- 10. expression_template_settings 表優化
-- ============================================

-- 優化：查詢啟用的模板
CREATE INDEX IF NOT EXISTS idx_expression_template_settings_is_active 
ON expression_template_settings(is_active) 
WHERE is_active = true;

-- ============================================
-- 驗證索引已創建
-- ============================================

SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- 預期效果
-- ============================================

-- 查詢速度提升：50-80%
-- API 響應時間：減少 200-500ms
-- 資料庫負載：降低 30-50%

-- 📊 效能測試建議：
-- 1. 執行前：測試常用查詢的執行時間
-- 2. 執行索引腳本
-- 3. 執行後：再次測試，對比改善
-- 4. 使用 EXPLAIN ANALYZE 分析查詢計劃

-- 範例測試查詢：
-- EXPLAIN ANALYZE
-- SELECT * FROM sticker_sets 
-- WHERE user_id = 'U1234567890' 
-- AND status = 'completed' 
-- ORDER BY created_at DESC;

