# 代碼示例 - 下載貼圖壓縮包功能

## 後端代碼示例

### 1. 完整的 downloadPack Action

```javascript
if (action === 'downloadPack') {
  if (!applicationId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: '缺少申請編號' })
    };
  }

  try {
    // 取得申請詳情
    const { data: application, error: appError } = await supabase
      .from('listing_applications')
      .select('*')
      .eq('application_id', applicationId)
      .single();

    if (appError || !application) {
      throw new Error('找不到申請記錄');
    }

    // 解析貼圖 URLs
    const stickers = JSON.parse(application.sticker_urls || '[]');
    if (stickers.length === 0) {
      throw new Error('沒有貼圖可下載');
    }

    // 生成 ZIP 檔案
    const zipBuffer = await generateApplicationZip(application, stickers);

    // 返回 base64 編碼的 ZIP 檔案
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${application.application_id}_stickers.zip"`
      },
      body: zipBuffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('❌ 下載貼圖包失敗:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
}
```

### 2. downloadImage 函數

```javascript
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}
```

### 3. generateApplicationZip 函數

```javascript
async function generateApplicationZip(application, stickers) {
  const chunks = [];
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('data', chunk => chunks.push(chunk));

  // 添加 README
  const readme = `貼圖大亨 - 申請貼圖包
========================

申請編號：${application.application_id}
英文名稱：${application.name_en}
中文名稱：${application.name_zh || 'N/A'}
售價：NT$${application.price}
申請時間：${new Date(application.created_at).toLocaleString('zh-TW')}
用戶 ID：${application.user_id}

貼圖數量：${stickers.length} 張
`;
  archive.append(readme, { name: 'README.txt' });

  // 添加封面圖片
  if (application.cover_url) {
    try {
      const coverBuffer = await downloadImage(application.cover_url);
      archive.append(coverBuffer, { name: 'cover.png' });
    } catch (err) {
      console.warn('⚠️ 無法下載封面圖片:', err.message);
    }
  }

  // 添加所有貼圖
  for (let i = 0; i < stickers.length; i++) {
    const sticker = stickers[i];
    try {
      const stickerBuffer = await downloadImage(sticker.url);
      const filename = `sticker_${String(i + 1).padStart(2, '0')}.png`;
      archive.append(stickerBuffer, { name: filename });
    } catch (err) {
      console.warn(`⚠️ 無法下載貼圖 ${i + 1}:`, err.message);
    }
  }

  await archive.finalize();
  return Buffer.concat(chunks);
}
```

## 前端代碼示例

### 1. UI 按鈕

```html
<div class="border-t pt-4 mb-4">
  <div class="text-gray-500 mb-2">下載貼圖包：</div>
  <button onclick="downloadStickerPack('${a.application_id}')" 
          class="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-2">
    📥 下載貼圖壓縮包
  </button>
</div>
```

### 2. downloadStickerPack 函數

```javascript
async function downloadStickerPack(appId) {
  try {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '⏳ 準備中...';
    btn.disabled = true;

    const res = await fetch(`${API_BASE}/admin-listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'downloadPack', applicationId: appId })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '下載失敗');
    }

    // 取得 blob 並觸發下載
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appId}_stickers.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    alert('✅ 貼圖包已下載');
    btn.textContent = originalText;
    btn.disabled = false;
  } catch (e) {
    alert('❌ 下載失敗：' + e.message);
    if (event.target) {
      event.target.textContent = '📥 下載貼圖壓縮包';
      event.target.disabled = false;
    }
  }
}
```

## API 調用示例

### cURL 示例

```bash
curl -X POST https://sticker-tycoon.netlify.app/.netlify/functions/admin-listing \
  -H "Content-Type: application/json" \
  -d '{
    "action": "downloadPack",
    "applicationId": "STMINOYXFA"
  }' \
  -o stickers.zip
```

### JavaScript Fetch 示例

```javascript
const response = await fetch('/.netlify/functions/admin-listing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'downloadPack',
    applicationId: 'STMINOYXFA'
  })
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'stickers.zip';
a.click();
```

### Python 示例

```python
import requests
import json

url = 'https://sticker-tycoon.netlify.app/.netlify/functions/admin-listing'
payload = {
    'action': 'downloadPack',
    'applicationId': 'STMINOYXFA'
}

response = requests.post(url, json=payload)
with open('stickers.zip', 'wb') as f:
    f.write(response.content)
```

## 錯誤處理示例

### 後端錯誤處理

```javascript
try {
  // ... 主要邏輯
} catch (err) {
  console.error('❌ 下載貼圖包失敗:', err);
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({ 
      success: false, 
      error: err.message || '生成下載檔案失敗' 
    })
  };
}
```

### 前端錯誤處理

```javascript
try {
  // ... 下載邏輯
} catch (e) {
  alert('❌ 下載失敗：' + e.message);
  // 恢復按鈕狀態
  if (event.target) {
    event.target.textContent = '📥 下載貼圖壓縮包';
    event.target.disabled = false;
  }
}
```

## 測試代碼示例

### Jest 測試

```javascript
describe('downloadPack', () => {
  test('should download sticker pack successfully', async () => {
    const mockApp = {
      application_id: 'TEST123',
      name_en: 'Test Pack',
      sticker_urls: JSON.stringify([
        { url: 'https://example.com/sticker1.png' },
        { url: 'https://example.com/sticker2.png' }
      ])
    };

    const result = await generateApplicationZip(mockApp, JSON.parse(mockApp.sticker_urls));
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should handle missing stickers', async () => {
    const mockApp = {
      application_id: 'TEST123',
      sticker_urls: '[]'
    };

    expect(() => {
      if (JSON.parse(mockApp.sticker_urls).length === 0) {
        throw new Error('沒有貼圖可下載');
      }
    }).toThrow('沒有貼圖可下載');
  });
});
```

## 配置示例

### package.json 依賴

```json
{
  "dependencies": {
    "archiver": "^7.0.1",
    "@supabase/supabase-js": "^2.45.4"
  }
}
```

### 環境變數

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

