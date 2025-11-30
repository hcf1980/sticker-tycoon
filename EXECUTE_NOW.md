# ✅ 遷移腳本已修復 - 立即執行指南

## 🎉 問題已解決！

觸發器衝突錯誤已修復。遷移腳本現在可以安全地重複執行。

---

## 🚀 立即執行（3 分鐘）

### 步驟 1: 複製 SQL（30 秒）

複製以下完整的 SQL 腳本：

```sql
-- ============================================
-- 示範圖集功能遷移（可安全重複執行）
-- ============================================

-- 1. 創建示範圖集表
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

-- 2. 創建索引
CREATE INDEX IF NOT EXISTS idx_demo_gallery_display_order ON demo_gallery(display_order);
CREATE INDEX IF NOT EXISTS idx_demo_gallery_style ON demo_gallery(style);

-- 3. 創建更新時間函數
CREATE OR REPLACE FUNCTION update_demo_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 刪除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS update_demo_gallery_timestamp ON demo_gallery;

-- 5. 創建新觸發器
CREATE TRIGGER update_demo_gallery_timestamp
  BEFORE UPDATE ON demo_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_gallery_updated_at();

-- 6. 為 sticker_sets 添加新欄位
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sticker_sets' AND column_name='scene'
  ) THEN
    ALTER TABLE sticker_sets ADD COLUMN scene TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sticker_sets' AND column_name='expression_template'
  ) THEN
    ALTER TABLE sticker_sets ADD COLUMN expression_template TEXT;
  END IF;
END $$;

-- 完成
SELECT '✅ Migration completed successfully!' as result;
```

### 步驟 2: 執行 SQL（1 分鐘）

1. 打開 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 點擊左側 **SQL Editor**
4. 點擊 **New query**
5. 貼上上面的 SQL
6. 點擊 **Run** 或按 `Cmd/Ctrl + Enter`

✅ **應該顯示：Migration completed successfully!**

### 步驟 3: 驗證結果（1 分鐘）

執行以下 SQL 驗證：

```sql
-- 快速驗證
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_name = 'demo_gallery') as table_exists,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'demo_gallery') as column_count,
  (SELECT COUNT(*) FROM information_schema.triggers 
   WHERE event_object_table = 'demo_gallery') as trigger_count;
```

**預期結果：**
```
table_exists | column_count | trigger_count
-------------+--------------+--------------
     1       |      12      |      1
```

✅ 如果看到這個結果，表示遷移成功！

---

## 🧪 測試功能

### 1. 測試 API

等待 Netlify 部署完成（約 2 分鐘），然後訪問：

```
https://sticker-tycoon.netlify.app/test-demo-gallery.html
```

點擊測試按鈕：
- ✅ GET - 獲取示範圖集
- ✅ GET - 獲取貼圖列表

### 2. 測試管理後台

```
https://sticker-tycoon.netlify.app/admin/demo-gallery.html
```

應該能：
- ✅ 看到貼圖組列表
- ✅ 點擊查看詳情
- ✅ 添加到示範圖集

### 3. 測試 LINE Bot

在 LINE 中輸入：
```
示範圖集
```

應該顯示輪播卡片（目前可能是空的，因為還沒添加示範圖）

---

## 📊 完整檢查清單

### 遷移階段
- [x] 修正遷移腳本
- [x] 推送到 GitHub
- [ ] 執行 SQL 遷移
- [ ] 驗證表已創建
- [ ] 驗證欄位正確

### 測試階段
- [ ] 等待 Netlify 部署
- [ ] 測試 API 端點
- [ ] 測試管理後台
- [ ] 測試公開頁面
- [ ] 測試 LINE Bot

### 使用階段
- [ ] 在管理後台添加示範圖
- [ ] 在 LINE Bot 查看效果
- [ ] 通知用戶新功能

---

## ⚡ 快速命令

### 檢查表
```sql
SELECT * FROM demo_gallery;
```

### 檢查欄位
```sql
\d demo_gallery
```

### 插入測試數據
```sql
INSERT INTO demo_gallery (url, style, style_name, character, display_order)
VALUES ('https://via.placeholder.com/512', 'cute', '🥰 可愛風', '測試角色', 0);
```

### 查看測試數據
```sql
SELECT id, style_name, character, created_at FROM demo_gallery;
```

### 刪除測試數據
```sql
DELETE FROM demo_gallery WHERE character = '測試角色';
```

---

## 🎯 常見問題

### Q: 執行後沒有錯誤但也沒有成功訊息？
A: 檢查 SQL Editor 右下角的 "Results" 標籤，應該會顯示結果。

### Q: 還是看到觸發器錯誤？
A: 確保你複製的是上面**最新的 SQL**，不是舊版本。

### Q: 表已經存在了嗎？
A: 沒關係！腳本使用 `IF NOT EXISTS`，可以安全重複執行。

### Q: Netlify 部署失敗？
A: 檢查 Netlify Dashboard 的部署日誌，通常會自動成功。

---

## ✅ 成功標誌

當你看到以下內容時，表示完全成功：

1. ✅ SQL 執行顯示 "Migration completed successfully!"
2. ✅ 驗證查詢返回正確的數字
3. ✅ 測試頁面能載入
4. ✅ 管理後台能顯示貼圖
5. ✅ LINE Bot 回應正常

---

## 🎉 完成後

恭喜！示範圖集功能已完全部署。

**下一步：**
1. 在管理後台選擇幾張優質貼圖
2. 加入示範圖集
3. 在 LINE Bot 查看效果
4. 告知用戶這個新功能

---

**當前狀態：** 🟢 準備執行遷移  
**預計時間：** 3 分鐘  
**難度：** ⭐ 簡單

**立即執行上面的 SQL，3 分鐘後就能使用新功能！** 🚀

