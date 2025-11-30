# 🔧 觸發器錯誤修復指南

## ❌ 錯誤訊息
```
ERROR: 42710: trigger "update_demo_gallery_timestamp" for relation "demo_gallery" already exists
```

## ✅ 已修復

遷移腳本已更新為可以安全重複執行的版本。

## 🚀 執行更新後的遷移

### 方法 1: 使用更新後的腳本（推薦）

在 Supabase SQL Editor 中執行以下腳本：

```sql
-- 示範圖集表
CREATE TABLE IF NOT EXISTS demo_gallery (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  style VARCHAR(50),
  style_name VARCHAR(100),
  character TEXT,
  scene TEXT,
  expression TEXT,
  set_id VARCHAR(100),
  sticker_index INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引（使用 IF NOT EXISTS 避免重複創建）
CREATE INDEX IF NOT EXISTS idx_demo_gallery_display_order ON demo_gallery(display_order);
CREATE INDEX IF NOT EXISTS idx_demo_gallery_style ON demo_gallery(style);

-- 更新時間觸發器函數（使用 CREATE OR REPLACE 可以重複執行）
CREATE OR REPLACE FUNCTION update_demo_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 先刪除舊的觸發器（如果存在），然後創建新的
DROP TRIGGER IF EXISTS update_demo_gallery_timestamp ON demo_gallery;

CREATE TRIGGER update_demo_gallery_timestamp
  BEFORE UPDATE ON demo_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_gallery_updated_at();

-- 為 sticker_sets 添加缺失的欄位（檢查後才添加，避免重複）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sticker_sets' AND column_name='scene') THEN
    ALTER TABLE sticker_sets ADD COLUMN scene TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sticker_sets' AND column_name='expression_template') THEN
    ALTER TABLE sticker_sets ADD COLUMN expression_template TEXT;
  END IF;
END $$;

-- 註：stickers 表已經有 expression 欄位，無需添加
```

### 方法 2: 使用加強版腳本（帶驗證）

執行 `supabase/migrations/20240115_demo_gallery_safe.sql`

這個版本包含：
- ✅ 自動檢查和提示
- ✅ 完整的錯誤處理
- ✅ 遷移結果驗證

## 🧪 驗證遷移成功

執行以下 SQL 檢查：

```sql
-- 1. 檢查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'demo_gallery';

-- 2. 檢查欄位
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'demo_gallery'
ORDER BY ordinal_position;

-- 3. 檢查觸發器
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'demo_gallery';

-- 4. 檢查 sticker_sets 新欄位
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'sticker_sets' 
AND column_name IN ('scene', 'expression_template');
```

## ✅ 預期結果

### 表結構
- ✅ `demo_gallery` 表已創建
- ✅ 12 個欄位全部存在
- ✅ 2 個索引已創建

### 觸發器
- ✅ `update_demo_gallery_timestamp` 存在
- ✅ 觸發事件: UPDATE
- ✅ 觸發時機: BEFORE

### sticker_sets 欄位
- ✅ `scene` 欄位存在
- ✅ `expression_template` 欄位存在

## 📝 關鍵修改

### 修改前
```sql
CREATE TRIGGER update_demo_gallery_timestamp
  BEFORE UPDATE ON demo_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_gallery_updated_at();
```

### 修改後
```sql
-- 先刪除舊的（如果存在）
DROP TRIGGER IF EXISTS update_demo_gallery_timestamp ON demo_gallery;

-- 再創建新的
CREATE TRIGGER update_demo_gallery_timestamp
  BEFORE UPDATE ON demo_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_gallery_updated_at();
```

## 🎯 為什麼會出現這個錯誤？

可能的原因：
1. 之前執行過部分遷移但失敗了
2. 觸發器已經創建但表還沒完全設置好
3. 重複執行了遷移腳本

## ✨ 現在的優勢

更新後的腳本：
- ✅ **可以安全重複執行** - 不會報錯
- ✅ **自動清理舊資源** - DROP IF EXISTS
- ✅ **檢查後再創建** - IF NOT EXISTS
- ✅ **冪等性** - 多次執行結果相同

## 🚀 下一步

1. ✅ 執行更新後的遷移腳本
2. ✅ 驗證遷移成功
3. ✅ 測試 API 功能
4. ✅ 測試管理後台

---

**更新時間:** 2024-01-15  
**版本:** v1.1 (可重複執行版本)  
**狀態:** ✅ 已修復

