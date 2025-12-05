# 🔧 修正風格設定頁面登入問題

## 問題描述

點擊「風格設定」後會閃退跳回管理後台首頁。

## 原因分析

風格設定頁面使用了錯誤的登入驗證方式：
- ❌ 使用 `admin_logged_in` (錯誤)
- ✅ 應使用 `adminAuth` (正確)

其他管理頁面都使用 `adminAuth` 物件來儲存登入狀態，包含：
- `loggedIn`: 是否已登入
- `expiry`: 過期時間

## 修正內容

### 1. HTML 頁面 (`public/admin/style-settings.html`)

加入即時登入驗證：

```html
<script>
  // 驗證登入狀態
  (function() {
    const auth = JSON.parse(localStorage.getItem('adminAuth') || '{}');
    if (!auth.loggedIn || auth.expiry < Date.now()) {
      localStorage.removeItem('adminAuth');
      window.location.href = '/admin/login.html';
    }
  })();
</script>
```

### 2. JavaScript 檔案 (`public/admin/style-settings.js`)

修正 checkAuth 和 logout 函數：

```javascript
// 檢查登入狀態
function checkAuth() {
  const auth = JSON.parse(localStorage.getItem('adminAuth') || '{}');
  if (!auth.loggedIn || auth.expiry < Date.now()) {
    localStorage.removeItem('adminAuth');
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}

// 登出
function logout() {
  localStorage.removeItem('adminAuth');
  window.location.href = '/admin/login.html';
}
```

## 修正後效果

✅ 已登入用戶可以正常訪問風格設定頁面  
✅ 未登入用戶會被導向登入頁面  
✅ 登入過期會自動跳轉到登入頁面  
✅ 與其他管理頁面的登入機制一致  

## 測試步驟

1. 訪問管理後台首頁
2. 確認已登入狀態
3. 點擊「風格設定」
4. 應該能正常進入風格設定頁面

## 部署狀態

✅ 修正已包含在之前的 commit 中  
✅ 已推送到遠端倉庫  
✅ Netlify 會自動部署  

等待 Netlify 部署完成後即可測試。

