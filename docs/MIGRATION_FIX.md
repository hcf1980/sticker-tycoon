# ⚠️ 數據庫遷移修正說明

## 🐛 發現的問題

在原始的遷移腳本中，錯誤地使用了表名 `sticker_images`，但實際的表名是 `stickers`。

## ✅ 已修正的內容

### 1. 遷移腳本
**文件:** `supabase/migrations/20240115_demo_gallery.sql`

**修正前:**
```sql
-- 為 sticker_images 添加 expression 欄位（如果還沒有）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sticker_images' AND column_name='expression') THEN
    ALTER TABLE sticker_images ADD COLUMN expression VARCHAR(100);
  END IF;
END $$;
```

**修正後:**
```sql
-- stickers 表已經有 expression 欄位，無需添加
-- 表名是 stickers，不是 sticker_images
```

### 2. Admin Stickers API
**文件:** `functions/admin-stickers.js`

**修正內容:**
- 表名：`sticker_images` → `stickers`
- 排序欄位：`sticker_index` → `index_number`

**修正位置:**
- 第 34 行：查詢貼圖組詳情
- 第 82 行：獲取主圖

## 📊 正確的表結構

根據 `supabase-schema.sql`：

### stickers 表
```sql
CREATE TABLE IF NOT EXISTS stickers (
  id BIGSERIAL PRIMARY KEY,
  sticker_id TEXT UNIQUE NOT NULL,
  set_id TEXT NOT NULL,
  index_number INTEGER NOT NULL,        -- ✅ 正確欄位
  expression TEXT NOT NULL,             -- ✅ 已存在
  image_url TEXT,
  status TEXT DEFAULT 'pending',
  generation_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 現在可以執行遷移

### 步驟 1: 執行修正後的遷移腳本

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 進入 SQL Editor
3. 複製貼上以下內容：

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

-- 索引
CREATE INDEX IF NOT EXISTS idx_demo_gallery_display_order ON demo_gallery(display_order);
CREATE INDEX IF NOT EXISTS idx_demo_gallery_style ON demo_gallery(style);

-- 更新時間觸發器
CREATE OR REPLACE FUNCTION update_demo_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_demo_gallery_timestamp
  BEFORE UPDATE ON demo_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_gallery_updated_at();

-- 為 sticker_sets 添加缺失的欄位（如果還沒有）
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
```

4. 點擊 **Run** 執行

### 步驟 2: 驗證遷移成功

執行以下 SQL 驗證：

```sql
-- 檢查 demo_gallery 表是否創建
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'demo_gallery';

-- 檢查表結構
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'demo_gallery'
ORDER BY ordinal_position;

-- 檢查 sticker_sets 新欄位
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'sticker_sets' 
AND column_name IN ('scene', 'expression_template');
```

預期結果：
- ✅ `demo_gallery` 表已創建
- ✅ 12 個欄位都存在
- ✅ `sticker_sets` 有 `scene` 和 `expression_template` 欄位

### 步驟 3: 部署更新的代碼

```bash
git add .
git commit -m "fix: Correct table name from sticker_images to stickers"
git push origin main
```

## 🧪 測試

部署完成後，訪問測試頁面：
```
https://your-site.netlify.app/test-demo-gallery.html
```

點擊「GET - 獲取貼圖列表」按鈕，應該能正常返回數據。

## 📝 注意事項

1. ✅ `stickers` 表已有 `expression` 欄位，無需添加
2. ✅ 排序時使用 `index_number`，不是 `sticker_index`
3. ✅ API 中的表名已全部修正
4. ✅ 遷移腳本已移除錯誤的部分

## 🎉 修正完成

所有問題已修正，現在可以正常執行遷移和部署了！

