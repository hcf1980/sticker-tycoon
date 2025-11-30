# 🗄️ 示範圖集資料庫設定指南

## ⚠️ 重要提醒
在使用示範圖集功能前，**必須先執行以下 SQL 腳本**，否則會出現錯誤。

## 📋 需要執行的 SQL

### 方法一：在 Supabase Dashboard 執行

1. **登入 Supabase Dashboard**
   - 訪問：https://supabase.com/dashboard
   - 選擇你的專案

2. **開啟 SQL Editor**
   - 左側選單 → SQL Editor
   - 點擊「New query」

3. **複製貼上以下 SQL**

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
```

4. **執行 SQL**
   - 點擊右下角「Run」按鈕
   - 確認顯示「Success. No rows returned」

### 方法二：使用 SQL 檔案

如果你已經有 migration 檔案：

```bash
# 在 Supabase Dashboard 的 SQL Editor 中
# 直接貼上 supabase/migrations/20240115_demo_gallery.sql 的內容
```

## ✅ 驗證安裝

執行以下 SQL 檢查表是否已建立：

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'demo_gallery'
);
```

應該返回 `true`。

## 🎯 表結構說明

### demo_gallery 表欄位

| 欄位名 | 類型 | 說明 |
|--------|------|------|
| `id` | BIGSERIAL | 主鍵，自動遞增 |
| `url` | TEXT | 貼圖圖片 URL（必填） |
| `style` | VARCHAR(50) | 風格 ID (例如：cute, realistic) |
| `style_name` | VARCHAR(100) | 風格顯示名稱（例如：🥰 可愛風） |
| `character` | TEXT | 角色描述 |
| `scene` | TEXT | 場景描述 |
| `expression` | TEXT | 表情描述 |
| `set_id` | VARCHAR(100) | 所屬貼圖組 ID |
| `sticker_index` | INTEGER | 在貼圖組中的索引 |
| `display_order` | INTEGER | 顯示順序（預設 0） |
| `created_at` | TIMESTAMPTZ | 建立時間 |
| `updated_at` | TIMESTAMPTZ | 更新時間（自動更新） |

### 索引說明
- `idx_demo_gallery_display_order`: 加速按順序查詢
- `idx_demo_gallery_style`: 加速按風格篩選

## 🚀 後續步驟

1. ✅ 執行 SQL 建立表
2. 📝 推送程式碼修正（已完成）
3. 🎨 在後台添加示範圖片
4. 🧪 測試 LINE Bot 功能

## 📞 需要協助？

如果遇到問題：
- 檢查 Supabase 專案是否選擇正確
- 確認 SQL 執行無錯誤
- 查看 Netlify 部署日誌

