# 示範圖集功能 - 部署和測試指南

## 📋 部署檢查清單

### 1. 數據庫設置 ✅

**步驟：**
1. 登入 Supabase Dashboard
2. 進入 SQL Editor
3. 執行 `supabase/migrations/20240115_demo_gallery.sql`
4. 驗證表已創建：
   ```sql
   SELECT * FROM demo_gallery LIMIT 1;
   ```

### 2. 部署到 Netlify ✅

**自動部署：**
```bash
# 提交所有變更
git add .
git commit -m "Add demo gallery management feature"
git push origin main
```

**手動檢查：**
- 訪問 Netlify Dashboard
- 確認部署成功
- 檢查函數是否已部署

### 3. 測試功能 ✅

訪問測試頁面：`https://your-site.netlify.app/test-demo-gallery.html`

## 🧪 測試步驟

### 測試 1: 數據庫

```sql
-- 在 Supabase SQL Editor 執行

-- 1. 檢查表是否存在
SELECT * FROM demo_gallery;

-- 2. 插入測試數據
INSERT INTO demo_gallery (url, style, style_name, character, scene, expression, display_order)
VALUES 
('https://via.placeholder.com/512', 'realistic', '📸 美顏真實', '測試角色', '測試場景', '開心,微笑', 0);

-- 3. 查詢測試數據
SELECT * FROM demo_gallery ORDER BY display_order;

-- 4. 清空測試數據（可選）
DELETE FROM demo_gallery WHERE character = '測試角色';
```

### 測試 2: API 端點

**使用瀏覽器或 Postman：**

1. **GET 示範圖集**
   ```
   GET https://your-site.netlify.app/.netlify/functions/demo-gallery
   ```
   預期回應：`{ "items": [...] }`

2. **GET 貼圖列表**
   ```
   GET https://your-site.netlify.app/.netlify/functions/admin-stickers?page=1&status=completed
   ```
   預期回應：`{ "sets": [...], "total": 0, "page": 1, "perPage": 12 }`

3. **POST 更新示範圖集**
   ```
   POST https://your-site.netlify.app/.netlify/functions/demo-gallery
   Content-Type: application/json
   
   {
     "items": [
       {
         "url": "https://...",
         "style": "realistic",
         "styleName": "📸 美顏真實",
         "character": "可愛貓咪",
         "scene": "溫馨房間",
         "expression": "開心",
         "setId": "test",
         "index": 0
       }
     ]
   }
   ```
   預期回應：`{ "success": true }`

### 測試 3: 管理後台

1. **訪問管理後台**
   - URL: `https://your-site.netlify.app/admin/`
   - 使用管理員密碼登入

2. **進入示範圖集管理**
   - 點擊「示範圖集」卡片
   - 應看到兩個分頁：「瀏覽已生成貼圖」和「當前示範圖集」

3. **測試瀏覽功能**
   - 嘗試篩選不同風格
   - 嘗試排序
   - 點擊「查看詳情」

4. **測試添加功能**
   - 在詳情彈窗中，懸停在圖片上
   - 點擊「➕ 加入示範圖集」
   - 切換到「當前示範圖集」分頁
   - 確認圖片已添加

5. **測試儲存功能**
   - 點擊「💾 儲存變更」
   - 刷新頁面
   - 確認變更已保存

### 測試 4: 前端展示頁面

1. **訪問展示頁面**
   - URL: `https://your-site.netlify.app/demo-gallery.html`

2. **檢查功能**
   - ✅ 圖片正確顯示
   - ✅ 參數信息顯示
   - ✅ 點擊查看詳情功能正常
   - ✅ 響應式設計正常

### 測試 5: LINE Bot

1. **發送測試指令**
   在 LINE Bot 中輸入：
   - `示範圖集`
   - `範例`
   - `作品集`

2. **檢查回應**
   - ✅ 顯示輪播卡片
   - ✅ 第一張是介紹卡片
   - ✅ 後面是示範圖片卡片
   - ✅ 每張圖顯示參數
   - ✅ 可以左右滑動

3. **檢查按鈕**
   - ✅ 「🚀 開始創建貼圖」按鈕可用
   - ✅ 「🌐 查看完整圖集」連結可用

## ⚠️ 常見問題

### Q1: 管理後台無法載入貼圖
**解決方案：**
- 檢查是否有已完成的貼圖組
- 檢查 Supabase 連線
- 查看瀏覽器控制台錯誤

### Q2: 加入示範圖集失敗
**解決方案：**
- 檢查數據庫表是否創建
- 檢查 API 回應錯誤
- 確認圖片 URL 可訪問

### Q3: LINE Bot 不顯示示範圖集
**解決方案：**
- 檢查數據庫是否有數據
- 查看 Netlify Functions 日誌
- 確認 LINE Bot webhook 正常

### Q4: 參數沒有顯示
**解決方案：**
- 確認貼圖組有填寫參數
- 檢查數據庫欄位
- 查看前端 console 錯誤

## 📊 驗證數據完整性

```sql
-- 檢查示範圖集數量
SELECT COUNT(*) as total FROM demo_gallery;

-- 檢查每種風格的數量
SELECT style_name, COUNT(*) as count 
FROM demo_gallery 
GROUP BY style_name;

-- 檢查缺失參數的項目
SELECT id, url, 
  CASE WHEN character IS NULL THEN 'Missing character' END as issue1,
  CASE WHEN scene IS NULL THEN 'Missing scene' END as issue2,
  CASE WHEN expression IS NULL THEN 'Missing expression' END as issue3
FROM demo_gallery
WHERE character IS NULL OR scene IS NULL OR expression IS NULL;

-- 檢查圖片 URL 是否有效（需要手動測試）
SELECT id, url FROM demo_gallery;
```

## 🎯 最佳實踐

1. **圖片選擇：**
   - 選擇高質量、清晰的圖片
   - 確保是正方形比例
   - 避免選擇過於相似的圖片

2. **參數填寫：**
   - 完整填寫所有參數
   - 使用清晰、具體的描述
   - 避免過長的文字

3. **數量控制：**
   - 建議 12-20 張示範圖
   - 平衡不同風格的數量
   - 定期更新內容

4. **性能優化：**
   - 使用 CDN 託管圖片
   - 壓縮圖片大小
   - 定期清理過時內容

## 📈 監控指標

- [ ] 示範圖集點擊率
- [ ] 用戶查看示範圖集後的創建率
- [ ] 各風格的受歡迎程度
- [ ] API 回應時間

## ✅ 上線前檢查

- [ ] 數據庫表已創建
- [ ] 至少有 5 張示範圖
- [ ] 所有參數完整填寫
- [ ] 圖片 URL 可訪問
- [ ] 管理後台功能正常
- [ ] 前端展示頁面正常
- [ ] LINE Bot 功能正常
- [ ] 所有測試通過

## 🚀 上線後

1. **通知用戶**
   - 在 LINE Bot 中發送更新訊息
   - 告知新功能

2. **收集反饋**
   - 觀察用戶使用情況
   - 收集用戶反饋

3. **持續優化**
   - 根據數據調整示範圖
   - 優化參數描述
   - 改進用戶體驗

