# 貼圖大亨 Logo 設置指南

## 需要準備的圖標文件

根據您提供的 STICKER TYCOON 圖標，需要創建以下尺寸的圖標文件：

### 1. favicon.ico
- **位置**: `public/favicon.ico`
- **尺寸**: 16x16, 32x32, 48x48 (多尺寸 ICO 文件)
- **用途**: 瀏覽器標籤頁圖標

### 2. logo-192.png
- **位置**: `public/logo-192.png`
- **尺寸**: 192x192 像素
- **格式**: PNG (透明背景或白色背景)
- **用途**: 
  - 網頁 header 顯示
  - PWA 應用圖標
  - 社交媒體分享

### 3. logo-512.png
- **位置**: `public/logo-512.png`
- **尺寸**: 512x512 像素
- **格式**: PNG (透明背景或白色背景)
- **用途**: 
  - PWA 應用圖標
  - 高解析度顯示
  - Open Graph 分享圖片

### 4. apple-touch-icon.png
- **位置**: `public/apple-touch-icon.png`
- **尺寸**: 180x180 像素
- **格式**: PNG (不透明背景)
- **用途**: iOS 設備添加到主屏幕時的圖標

## 如何創建這些圖標

### 方法 1: 使用線上工具
1. 訪問 [Favicon Generator](https://realfavicongenerator.net/)
2. 上傳您的 STICKER TYCOON 原始圖片
3. 自動生成所有需要的尺寸
4. 下載並放置到 `public/` 目錄

### 方法 2: 使用 Photoshop/GIMP
1. 打開原始圖片
2. 調整畫布大小為正方形
3. 導出以下尺寸：
   - 192x192 → `logo-192.png`
   - 512x512 → `logo-512.png`
   - 180x180 → `apple-touch-icon.png`
4. 使用 ICO 轉換工具創建 `favicon.ico`

### 方法 3: 使用 ImageMagick (命令行)
```bash
# 假設原始圖片為 sticker-tycoon-logo.png

# 創建 192x192
convert sticker-tycoon-logo.png -resize 192x192 logo-192.png

# 創建 512x512
convert sticker-tycoon-logo.png -resize 512x512 logo-512.png

# 創建 180x180 (Apple Touch Icon)
convert sticker-tycoon-logo.png -resize 180x180 apple-touch-icon.png

# 創建 favicon.ico (包含多個尺寸)
convert sticker-tycoon-logo.png -resize 16x16 favicon-16.png
convert sticker-tycoon-logo.png -resize 32x32 favicon-32.png
convert sticker-tycoon-logo.png -resize 48x48 favicon-48.png
convert favicon-16.png favicon-32.png favicon-48.png favicon.ico
```

## 圖標設計建議

根據您提供的 STICKER TYCOON 圖標：
- ✅ 保持藍色背景和笑臉貼圖的設計
- ✅ 確保皇冠元素清晰可見
- ✅ "STICKER TYCOON" 文字在小尺寸時可以省略
- ✅ 使用圓角矩形設計更現代
- ✅ 確保在淺色和深色背景下都清晰可見

## 已更新的文件

以下 HTML 文件已經添加了圖標引用：

### 主要頁面
- ✅ `index.html` - 首頁 (已添加 logo 顯示在 header 和 footer)
- ✅ `demo-gallery.html` - 示範圖集
- ✅ `token-guide.html` - 代幣購買說明
- ✅ `token-guide-mobile.html` - 代幣購買說明 (手機版)
- ✅ `youtuber-promotion.html` - YouTuber 推廣計畫
- ✅ `queue.html` - 待上傳佇列
- ✅ `select-stickers.html` - 選擇貼圖

### 配置文件
- ✅ `manifest.json` - PWA 配置文件 (已創建)

## 更新內容摘要

### 1. SEO 優化
- 添加了完整的 meta 標籤
- 添加了 Open Graph 標籤 (Facebook 分享)
- 添加了 Twitter Card 標籤
- 優化了頁面標題和描述

### 2. 品牌展示
- 首頁 header 添加了 logo 圖片顯示
- 首頁 footer 添加了 logo 和品牌名稱
- 示範圖集頁面添加了 logo 導航

### 3. PWA 支持
- 創建了 manifest.json
- 添加了主題顏色設置
- 支持添加到主屏幕功能

## 驗證清單

完成圖標設置後，請檢查：

- [ ] 所有圖標文件已放置在 `public/` 目錄
- [ ] 瀏覽器標籤頁顯示正確的 favicon
- [ ] 首頁 header 顯示 logo 圖片
- [ ] 首頁 footer 顯示 logo 圖片
- [ ] 在手機上測試 PWA 功能
- [ ] 分享到社交媒體時顯示正確的預覽圖

## 需要幫助？

如果您需要協助創建這些圖標文件，可以：
1. 提供原始的高解析度 STICKER TYCOON 圖片
2. 使用線上工具自動生成
3. 聯繫設計師協助處理

---

**注意**: 目前所有 HTML 文件已經配置好圖標引用，只需要將實際的圖標文件放置到正確位置即可。

