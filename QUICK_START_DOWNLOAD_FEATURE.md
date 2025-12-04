# 快速開始 - 下載貼圖壓縮包功能

## 🎯 功能說明

管理者可以在「上架申請管理」頁面直接下載用戶提交的貼圖壓縮包，方便進行審核和處理。

## 📁 修改的文件

### 1. 後端 API
**文件**：`functions/admin-listing.js`

**新增**：
- `downloadPack` action 處理器
- `downloadImage()` 函數 - 下載圖片
- `generateApplicationZip()` 函數 - 生成 ZIP 檔案

**功能**：
- 從資料庫查詢申請詳情
- 下載所有貼圖和封面圖片
- 生成包含 README 的 ZIP 檔案
- 返回 base64 編碼的檔案

### 2. 前端 UI
**文件**：`public/admin/listing-manager.html`

**新增**：
- 下載按鈕 UI（藍色，帶圖標）
- `downloadStickerPack()` 函數 - 處理下載邏輯

**位置**：申請詳情 Modal 中，在「更新狀態」按鈕上方

## 🚀 使用方式

### 管理者操作

1. 打開「上架申請管理」頁面
2. 點擊要審核的申請卡片
3. 在彈出的詳情視窗中，點擊藍色的「📥 下載貼圖壓縮包」按鈕
4. 等待下載完成（按鈕會顯示「⏳ 準備中...」）
5. 檢查下載的 ZIP 檔案

## 📦 下載檔案內容

```
{申請編號}_stickers.zip
├── README.txt          # 申請信息
├── cover.png          # 封面圖片
├── sticker_01.png     # 貼圖 1
├── sticker_02.png     # 貼圖 2
├── ...
└── sticker_40.png     # 貼圖 40
```

## [object Object] 端點

**方法**：POST
**URL**：`/.netlify/functions/admin-listing`

**請求**：
```json
{
  "action": "downloadPack",
  "applicationId": "APP_ID_123"
}
```

**響應**：
- 成功：返回 ZIP 檔案（base64 編碼）
- 失敗：返回 JSON 錯誤信息

## ⚙️ 技術棧

- **後端**：Node.js + Supabase + Archiver
- **前端**：Vanilla JavaScript + Fetch API
- **壓縮**：ZIP 格式（最高壓縮級別）

## ✅ 功能特性

- ✅ 一鍵下載整個貼圖包
- ✅ 包含詳細的 README 說明
- ✅ 自動命名（申請編號 + _stickers.zip）
- ✅ 錯誤處理和用戶提示
- ✅ 支援 40+ 張貼圖
- ✅ 圖片下載失敗不中斷流程

## 🐛 常見問題

**Q：下載失敗怎麼辦？**
A：檢查網絡連接，稍後重試。如果持續失敗，檢查瀏覽器控制台的錯誤信息。

**Q：ZIP 檔案損壞？**
A：嘗試重新下載。如果問題持續，聯繫技術支援。

**Q：支援多少張貼圖？**
A：理論上無限制，已測試 40+ 張貼圖。

## 📝 部署步驟

1. 更新 `functions/admin-listing.js`
2. 更新 `public/admin/listing-manager.html`
3. 確保 `archiver` 已在 `package.json` 中
4. 部署到 Netlify
5. 測試下載功能

## 🔐 安全性

- 需要管理員身份驗證
- 驗證申請 ID 存在
- 驗證申請有貼圖
- 錯誤信息不洩露敏感信息

