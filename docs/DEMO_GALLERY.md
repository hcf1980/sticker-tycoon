# 示範圖集功能說明

## 功能概述

管理員可以在管理後台的「示範圖集」中，從已生成的貼圖中挑選優質圖片，並記錄生成參數，讓用戶了解如何創作類似效果的貼圖。

## 主要功能

### 1. 管理後台 (Admin)

位置：`/admin/demo-gallery.html`

**功能：**
- ✅ 瀏覽所有已生成的貼圖組
- ✅ 篩選條件：風格、狀態、排序
- ✅ 查看貼圖組詳情（所有圖片）
- ✅ 選擇圖片加入示範圖集
- ✅ 自動記錄生成參數（風格、角色、場景、表情）
- ✅ 管理示範圖集（移除、排序）
- ✅ 儲存變更

### 2. 前端展示頁面

位置：`/demo-gallery.html`

**功能：**
- ✅ 展示所有示範圖片
- ✅ 顯示每張圖的生成參數
- ✅ 點擊查看完整參數詳情
- ✅ 響應式設計，適配手機和桌面

### 3. LINE Bot 整合

**用戶指令：**
- `示範圖集`
- `範例`
- `作品集`

**顯示內容：**
- 輪播卡片展示示範圖片
- 每張圖顯示生成參數：
  - 🎨 風格
  - 👤 角色描述
  - 🌄 場景設定
  - 😊 表情模板

## 數據庫結構

### demo_gallery 表

```sql
- id: 主鍵
- url: 圖片 URL
- style: 風格代碼 (realistic, cute, cool, etc.)
- style_name: 風格名稱 (📸 美顏真實, 🥰 可愛風, etc.)
- character: 角色描述
- scene: 場景設定
- expression: 表情模板
- set_id: 原始貼圖組 ID
- sticker_index: 圖片在組內的索引
- display_order: 顯示順序
- created_at: 創建時間
- updated_at: 更新時間
```

## API 端點

### 1. GET /.netlify/functions/demo-gallery
獲取當前示範圖集

**回應：**
```json
{
  "items": [
    {
      "url": "https://...",
      "style": "realistic",
      "style_name": "📸 美顏真實",
      "character": "可愛的貓咪",
      "scene": "溫馨的房間",
      "expression": "開心, 微笑, 讚讚"
    }
  ]
}
```

### 2. POST /.netlify/functions/demo-gallery
更新示範圖集（管理員）

**請求：**
```json
{
  "items": [
    {
      "url": "https://...",
      "style": "realistic",
      "styleName": "📸 美顏真實",
      "character": "可愛的貓咪",
      "scene": "溫馨的房間",
      "expression": "開心, 微笑, 讚讚",
      "setId": "xxx",
      "index": 0
    }
  ]
}
```

### 3. GET /.netlify/functions/admin-stickers
查詢已生成的貼圖組

**參數：**
- `page`: 頁碼
- `style`: 風格篩選
- `status`: 狀態篩選
- `sort`: 排序方式
- `setId`: 查詢特定貼圖組詳情

## 使用流程

### 管理員操作流程

1. **登入管理後台** → `/admin/`
2. **進入示範圖集管理** → 點擊「示範圖集」卡片
3. **瀏覽已生成貼圖：**
   - 可以篩選風格、狀態
   - 可以排序（最新/最舊）
4. **點擊「查看詳情」：**
   - 顯示該組所有圖片
   - 顯示生成參數（風格、角色、場景、表情）
5. **選擇圖片：**
   - 滑鼠懸停在圖片上
   - 點擊「➕ 加入示範圖集」
   - 參數會自動記錄
6. **管理示範圖集：**
   - 切換到「當前示範圖集」分頁
   - 可以移除不要的圖片
   - 點擊「💾 儲存變更」

### 用戶使用流程

1. **在 LINE Bot 中輸入：**
   - `示範圖集` 或 `範例` 或 `作品集`

2. **查看範例：**
   - 左右滑動查看不同範例
   - 每張圖顯示生成參數

3. **創作類似貼圖：**
   - 點擊「🚀 開始創建貼圖」
   - 參考範例的參數設定
   - 創作自己的貼圖

## 部署步驟

1. **執行數據庫遷移：**
   ```bash
   # 在 Supabase Dashboard 執行
   supabase/migrations/20240115_demo_gallery.sql
   ```

2. **部署前端文件：**
   ```bash
   git add public/admin/demo-gallery.html
   git add public/demo-gallery.html
   git commit -m "Add demo gallery feature"
   git push
   ```

3. **部署後端函數：**
   ```bash
   git add functions/demo-gallery.js
   git add functions/admin-stickers.js
   git add functions/line-webhook.js
   git commit -m "Add demo gallery API"
   git push
   ```

4. **Netlify 會自動部署**

## 測試

### 測試管理後台
1. 訪問 `https://your-site.netlify.app/admin/demo-gallery.html`
2. 瀏覽貼圖組
3. 選擇圖片加入示範圖集
4. 儲存變更

### 測試前端展示
1. 訪問 `https://your-site.netlify.app/demo-gallery.html`
2. 查看示範圖片
3. 點擊查看參數詳情

### 測試 LINE Bot
1. 在 LINE 中輸入 `示範圖集`
2. 查看輪播卡片
3. 確認參數正確顯示

## 注意事項

1. **圖片要求：**
   - 只能選擇已完成的貼圖
   - 圖片應為正方形（1:1）
   - 確保圖片 URL 可訪問

2. **參數記錄：**
   - 參數自動從貼圖組讀取
   - 確保創建貼圖時有填寫完整參數

3. **性能優化：**
   - 示範圖集建議不超過 20 張
   - LINE Bot 輪播最多顯示 10 張

4. **數據備份：**
   - 定期備份示範圖集設定
   - 重要圖片建議本地保存

## 未來改進

- [ ] 支援拖拽排序
- [ ] 批次操作（批次添加/刪除）
- [ ] 圖片分類標籤
- [ ] 用戶點擊統計
- [ ] 自動推薦優質貼圖

