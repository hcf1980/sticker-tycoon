# 上架申請 - 下載貼圖壓縮包功能

## 功能概述

在管理頁面的「上架申請管理」中，管理者現在可以直接下載用戶申請的貼圖壓縮包，方便進行後續的審核和處理。

## 實現細節

### 1. 後端實現 (`functions/admin-listing.js`)

#### 新增 `downloadPack` Action

```javascript
if (action === 'downloadPack') {
  // 取得申請詳情
  // 解析貼圖 URLs
  // 生成 ZIP 檔案
  // 返回 base64 編碼的 ZIP 檔案
}
```

#### 核心功能

- **取得申請記錄**：根據 `applicationId` 從資料庫查詢申請詳情
- **解析貼圖數據**：從 `sticker_urls` JSON 字段解析所有貼圖 URL
- **生成 ZIP 檔案**：
  - 使用 `archiver` 庫創建壓縮檔案
  - 包含 README.txt（申請信息）
  - 包含 cover.png（封面圖片）
  - 包含 sticker_01.png ~ sticker_XX.png（所有貼圖）
- **返回下載**：以 base64 編碼返回 ZIP 檔案

#### 輔助函數

```javascript
// 下載圖片 Buffer
function downloadImage(url)

// 生成申請貼圖的 ZIP 檔案
async function generateApplicationZip(application, stickers)
```

### 2. 前端實現 (`public/admin/listing-manager.html`)

#### UI 元素

在申請詳情 Modal 中添加下載按鈕：

```html
<div class="border-t pt-4 mb-4">
  <div class="text-gray-500 mb-2">下載貼圖包：</div>
  <button onclick="downloadStickerPack('${a.application_id}')" 
          class="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600">
    📥 下載貼圖壓縮包
  </button>
</div>
```

#### JavaScript 函數

```javascript
async function downloadStickerPack(appId) {
  // 1. 顯示加載狀態
  // 2. 調用後端 API
  // 3. 將響應轉換為 Blob
  // 4. 觸發瀏覽器下載
  // 5. 清理資源
}
```

**功能流程**：
1. 按鈕變為「⏳ 準備中...」並禁用
2. 發送 POST 請求到 `admin-listing` API
3. 接收 ZIP 檔案（base64 編碼）
4. 創建臨時下載連結
5. 自動觸發瀏覽器下載
6. 清理臨時資源
7. 顯示成功提示

## ZIP 檔案結構

```
{applicationId}_stickers.zip
├── README.txt              # 申請信息和說明
├── cover.png              # 封面圖片
├── sticker_01.png         # 貼圖 1
├── sticker_02.png         # 貼圖 2
├── ...
└── sticker_XX.png         # 貼圖 N
```

## README.txt 內容

包含以下信息：
- 申請編號
- 英文名稱
- 中文名稱
- 售價
- 申請時間
- 用戶 ID
- 貼圖數量
- 檔案說明
- 注意事項

## 使用流程

### 管理者操作步驟

1. 進入「上架申請管理」頁面
2. 點擊要審核的申請卡片
3. 在詳情 Modal 中點擊「📥 下載貼圖壓縮包」按鈕
4. 等待下載完成
5. 檢查貼圖品質和內容
6. 更新申請狀態（處理中、已提交、已上架、拒絕）

## 錯誤處理

- **申請不存在**：顯示「找不到申請記錄」
- **沒有貼圖**：顯示「沒有貼圖可下載」
- **圖片下載失敗**：記錄警告但繼續打包其他圖片
- **網絡錯誤**：顯示具體錯誤信息

## 技術細節

### 依賴

- `archiver`：ZIP 檔案生成
- `https` / `http`：圖片下載
- `supabase-client`：資料庫查詢

### 性能考慮

- 使用 Stream 方式生成 ZIP（避免內存溢出）
- 圖片下載失敗不中斷整個流程
- 支援大量貼圖（40+ 張）

### 安全考慮

- 驗證管理員身份（通過 `checkAuth()`）
- 驗證申請 ID 存在
- 返回 base64 編碼的檔案（避免直接二進制傳輸問題）

## 測試清單

- [ ] 下載包含所有貼圖的申請
- [ ] 下載包含部分失敗圖片的申請
- [ ] 驗證 ZIP 檔案完整性
- [ ] 驗證 README.txt 內容正確
- [ ] 測試大量貼圖（40+ 張）
- [ ] 測試網絡中斷恢復
- [ ] 驗證檔案名稱正確

## 未來改進

- [ ] 支援批量下載多個申請
- [ ] 添加下載進度條
- [ ] 支援其他壓縮格式（RAR、7z）
- [ ] 添加下載歷史記錄
- [ ] 支援直接上傳到 LINE Creators Market

