# 其他管理頁面更新指南

## 概述
所有其他管理頁面（除了 login.html 和 change-password.html）都需要添加認證檢查和 Supabase 配置。

## 需要更新的頁面

### 1. sticker-manager.html
**路徑**: `public/admin/sticker-manager.html`

**添加以下內容到 `<head>` 部分**:
```html
<!-- Supabase 配置 -->
<script type="application/json" id="supabase-config">
{
  "url": "https://your-project.supabase.co",
  "anonKey": "your-anon-key"
}
</script>
```

**添加以下內容到 `<body>` 結尾的 `<script>` 之前**:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/dist/umd/supabase.js"></script>
<script src="/admin/supabase-admin-client.js"></script>
<script>
  // 檢查認證
  if (!checkAdminAuth()) {
    document.body.innerHTML = '<div class="text-center p-10">正在跳轉到登入頁面...</div>';
  }
</script>
```

### 2. rich-menu.html
**路徑**: `public/admin/rich-menu.html`

**相同的更新步驟如上**

### 3. demo-gallery.html
**路徑**: `public/admin/demo-gallery.html`

**相同的更新步驟如上**

### 4. token-manager.html
**路徑**: `public/admin/token-manager.html`

**相同的更新步驟如上**

### 5. listing-manager.html
**路徑**: `public/admin/listing-manager.html`

**相同的更新步驟如上**

### 6. youtuber-applications.html
**路徑**: `public/admin/youtuber-applications.html`

**相同的更新步驟如上**

## 更新模板

### 完整的 HTML 頁面模板

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>頁面標題 - 貼圖大亨</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  
  <!-- Supabase 配置 -->
  <script type="application/json" id="supabase-config">
  {
    "url": "https://your-project.supabase.co",
    "anonKey": "your-anon-key"
  }
  </script>
</head>
<body class="bg-gray-100 min-h-screen">
  <!-- 頁面內容 -->
  
  <!-- 在所有其他 script 之前添加 -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/dist/umd/supabase.js"></script>
  <script src="/admin/supabase-admin-client.js"></script>
  <script>
    // 檢查認證
    if (!checkAdminAuth()) {
      document.body.innerHTML = '<div class="text-center p-10">正在跳轉到登入頁面...</div>';
    }
  </script>
  
  <!-- 您的其他 script -->
</body>
</html>
```

## 自動化更新腳本

如果您有許多頁面需要更新，可以使用以下 Node.js 腳本:

```javascript
const fs = require('fs');
const path = require('path');

const adminDir = './public/admin';
const pages = [
  'sticker-manager.html',
  'rich-menu.html',
  'demo-gallery.html',
  'token-manager.html',
  'listing-manager.html',
  'youtuber-applications.html'
];

const supabaseConfig = `  <!-- Supabase 配置 -->
  <script type="application/json" id="supabase-config">
  {
    "url": "https://your-project.supabase.co",
    "anonKey": "your-anon-key"
  }
  </script>`;

const authCheck = `  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/dist/umd/supabase.js"></script>
  <script src="/admin/supabase-admin-client.js"></script>
  <script>
    // 檢查認證
    if (!checkAdminAuth()) {
      document.body.innerHTML = '<div class="text-center p-10">正在跳轉到登入頁面...</div>';
    }
  </script>`;

pages.forEach(page => {
  const filePath = path.join(adminDir, page);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // 添加 Supabase 配置到 head
    if (!content.includes('supabase-config')) {
      content = content.replace('</head>', `${supabaseConfig}\n</head>`);
    }
    
    // 添加認證檢查到 body 結尾
    if (!content.includes('checkAdminAuth')) {
      content = content.replace('</body>', `${authCheck}\n</body>`);
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Updated: ${page}`);
  } else {
    console.log(`⚠️ Not found: ${page}`);
  }
});
```

## 驗證更新

更新後，驗證每個頁面:

1. 清除瀏覽器 localStorage
2. 訪問頁面（例如 `/admin/sticker-manager.html`）
3. 應該被重定向到 `/admin/login.html`
4. 登入後應該能訪問該頁面
5. 登出後再訪問應該再次被重定向

## 檢查清單

- [ ] 所有 admin 頁面都包含 Supabase 配置
- [ ] 所有 admin 頁面都包含認證檢查
- [ ] 所有 admin 頁面都載入 `supabase-admin-client.js`
- [ ] 測試未登入時無法訪問
- [ ] 測試登入後可以訪問
- [ ] 測試登出後無法訪問

## 常見問題

### Q: 為什麼要在每個頁面都添加認證檢查？
A: 這確保了即使用戶直接訪問 URL，也會被重定向到登入頁面。

### Q: 可以集中管理認證嗎？
A: 可以，但需要使用伺服器端路由或 Service Worker。目前的方式是最簡單的前端實現。

### Q: 如何處理 AJAX 請求的認證？
A: 在 `supabase-admin-client.js` 中添加一個函數來檢查認證狀態，然後在發送 AJAX 請求前調用它。

