# Rich Menu 更新故障排除指南

## 問題：更新 Rich Menu 時出現「更新失敗：undefined」錯誤

### 已實施的修復

#### 1. 前端改進 (public/admin/rich-menu.html)

**改進的錯誤處理：**
```javascript
// 檢查 HTTP 狀態碼
if (!res.ok) {
  const errorText = await res.text();
  console.error('❌ HTTP 錯誤:', res.status, errorText);
  throw new Error(`HTTP ${res.status}: ${errorText}`);
}

// 詳細的錯誤訊息
const errorMsg = result.error || result.message || JSON.stringify(result);
console.error('❌ 更新失敗:', errorMsg);
alert('❌ 更新失敗：' + errorMsg);
```

**添加的日誌：**
- API 響應完整內容
- HTTP 狀態碼檢查
- 多層級錯誤訊息提取

#### 2. 後端改進 (functions/admin-rich-menu.js)

**詳細的處理日誌：**
```javascript
console.log('🔧 開始處理 Rich Menu 更新請求...');
console.log('📋 Content-Type:', contentType);
console.log('📦 Boundary:', boundary);
console.log('📏 Body 大小:', body.length, 'bytes');
console.log('📦 Parts 數量:', parts.length);
console.log('✅ 找到圖片，大小:', imageBuffer.length, 'bytes');
```

**改進的錯誤處理：**
```javascript
// 提取詳細錯誤訊息
let errorMessage = error.message || '未知錯誤';

// 如果是 axios 錯誤，提取更多資訊
if (error.response) {
  const lineError = error.response.data;
  if (lineError && lineError.message) {
    errorMessage = `LINE API 錯誤: ${lineError.message}`;
  } else {
    errorMessage = `HTTP ${error.response.status}: ${JSON.stringify(lineError)}`;
  }
}
```

**步驟追蹤：**
- 步驟 1: 取得現有 Rich Menu
- 步驟 2: 創建新的 Rich Menu
- 步驟 3: 上傳圖片到 LINE
- 步驟 4: 設為預設 Rich Menu
- 步驟 5: 刪除舊 Rich Menu
- 步驟 6: 備份圖片到 Supabase

#### 3. Rich Menu Manager 改進 (functions/rich-menu-manager.js)

**自動檢測圖片格式：**
```javascript
// LINE Rich Menu 支援 PNG 和 JPEG 格式
// 根據圖片內容自動判斷格式
const contentType = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 
  ? 'image/jpeg' 
  : 'image/png';

console.log(`📋 圖片格式: ${contentType}`);
```

**增加上傳限制：**
```javascript
{
  headers: {
    'Authorization': `Bearer ${config.channelAccessToken}`,
    'Content-Type': contentType
  },
  maxBodyLength: Infinity,
  maxContentLength: Infinity
}
```

### 調試步驟

#### 1. 檢查瀏覽器控制台

打開瀏覽器開發者工具 (F12)：

**Console 標籤：**
- 查看 `📦 API 響應:` 日誌
- 查看任何錯誤訊息
- 檢查圖片壓縮過程

**Network 標籤：**
- 找到 `update-rich-menu` 請求
- 檢查 Request Headers
- 檢查 Request Payload (圖片大小)
- 檢查 Response (狀態碼和內容)

#### 2. 檢查服務器日誌

如果使用 `netlify dev`：

```bash
# 查看終端輸出，尋找：
🔧 開始處理 Rich Menu 更新請求...
📋 Content-Type: multipart/form-data; boundary=...
📦 Boundary: ...
📏 Body 大小: ... bytes
📦 Parts 數量: ...
✅ 找到圖片，大小: ... bytes
📋 步驟 1: 取得現有 Rich Menu...
📋 步驟 2: 創建新的 Rich Menu...
...
```

#### 3. 常見錯誤和解決方案

**錯誤 1: "無法解析 multipart boundary"**
- 原因：Content-Type header 格式不正確
- 解決：檢查前端 FormData 設置

**錯誤 2: "未找到圖片檔案"**
- 原因：multipart 解析失敗
- 解決：檢查圖片大小是否超過限制 (700KB)

**錯誤 3: "LINE API 錯誤: ..."**
- 原因：LINE API 拒絕請求
- 解決：檢查圖片尺寸 (必須是 2500x843)、格式、大小

**錯誤 4: "HTTP 401"**
- 原因：LINE Channel Access Token 無效
- 解決：檢查環境變數 `LINE_CHANNEL_ACCESS_TOKEN`

**錯誤 5: "HTTP 413"**
- 原因：請求體太大
- 解決：降低圖片壓縮質量或大小限制

### 測試 API

使用測試腳本：

```bash
./scripts/test-rich-menu-api.sh
```

或手動測試：

```bash
# 測試取得 Rich Menu 資訊
curl http://localhost:8888/api/admin/rich-menu-info
```

### 環境變數檢查

確保以下環境變數已設置：

```bash
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### 圖片要求

Rich Menu 圖片必須符合：

- **尺寸**: 2500 x 843 像素
- **格式**: PNG 或 JPEG
- **大小**: 建議 < 1MB (Netlify Functions 限制)
- **壓縮**: 前端自動壓縮到 700KB 以下

### 下一步

如果問題仍然存在：

1. 檢查 Netlify Functions 日誌
2. 檢查 LINE Developers Console 的錯誤日誌
3. 驗證 LINE Bot 權限設置
4. 測試 LINE API 連接性

### 相關文件

- [LINE Rich Menu API 文檔](https://developers.line.biz/en/reference/messaging-api/#rich-menu)
- [Netlify Functions 文檔](https://docs.netlify.com/functions/overview/)

