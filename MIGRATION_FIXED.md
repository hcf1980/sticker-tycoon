# ✅ 數據庫遷移修正 - 已完成

## 🐛 問題描述

原始遷移腳本錯誤地引用了不存在的表名 `sticker_images`，導致執行失敗。

**錯誤訊息:**
```
ERROR: 42P01: relation "sticker_images" does not exist
```

## ✅ 已修正的文件

### 1. `supabase/migrations/20240115_demo_gallery.sql`
**修正:** 移除了對不存在表的引用

**原因:** 
- 實際表名是 `stickers`，不是 `sticker_images`
- `stickers` 表已有 `expression` 欄位，無需添加

### 2. `functions/admin-stickers.js`
**修正:** 更新表名和欄位名

**變更:**
- 表名: `sticker_images` → `stickers`
- 排序欄位: `sticker_index` → `index_number`

**位置:**
- Line 34: 查詢貼圖詳情
- Line 82: 獲取主圖

## 📋 正確的數據庫結構

根據 `supabase-schema.sql`：

### stickers 表
```sql
CREATE TABLE stickers (
  id BIGSERIAL PRIMARY KEY,
  sticker_id TEXT UNIQUE NOT NULL,
  set_id TEXT NOT NULL,
  index_number INTEGER NOT NULL,      -- ✅ 正確的排序欄位
  expression TEXT NOT NULL,           -- ✅ 已存在，無需添加
  image_url TEXT,
  status TEXT DEFAULT 'pending',
  generation_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sticker_sets 表（將添加欄位）
```sql
ALTER TABLE sticker_sets ADD COLUMN scene TEXT;
ALTER TABLE sticker_sets ADD COLUMN expression_template TEXT;
```

## 🚀 執行遷移

現在可以安全執行遷移了！

### 在 Supabase Dashboard 執行：

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

### 驗證遷移成功：

```sql
-- 1. 檢查 demo_gallery 表
SELECT COUNT(*) FROM demo_gallery;

-- 2. 檢查表結構
\d demo_gallery

-- 3. 檢查新增的欄位
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sticker_sets' 
AND column_name IN ('scene', 'expression_template');
```

預期結果：
- ✅ demo_gallery 表存在
- ✅ sticker_sets 有 scene 和 expression_template 欄位

## 📦 部署代碼

```bash
git add .
git commit -m "fix: Correct database table names and fields"
git push origin main
```

等待 Netlify 部署完成（約 2-3 分鐘）。

## 🧪 測試

訪問測試頁面：
```
https://your-site.netlify.app/test-demo-gallery.html
```

測試項目：
- ✅ GET /demo-gallery - 應返回空陣列
- ✅ GET /admin-stickers - 應返回貼圖列表
- ✅ 管理後台能正常載入

## 📝 檢查清單

### 遷移前
- [x] 修正 SQL 遷移腳本
- [x] 修正 API 代碼
- [x] 確認所有表名正確
- [x] 確認所有欄位名正確

### 遷移後
- [ ] 執行 SQL 遷移
- [ ] 驗證表已創建
- [ ] 部署代碼到 Netlify
- [ ] 測試 API 端點
- [ ] 測試管理後台

## 🎉 修正完成！

所有問題已解決，可以正常執行遷移和部署了。

---

**修正日期:** 2024-01-15  
**修正內容:** 表名和欄位名稱修正  
**影響範圍:** 數據庫遷移腳本和 API 代碼

