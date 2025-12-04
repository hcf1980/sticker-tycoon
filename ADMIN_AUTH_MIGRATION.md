# 管理員認證系統遷移指南

## 概述
本指南說明如何將管理員帳號密碼從本地 localStorage 遷移到 Supabase 資料庫。

## 已完成的變更

### 1. 資料庫表結構
- **檔案**: `supabase/migrations/20250104_admin_credentials.sql`
- **內容**:
  - 建立 `admin_credentials` 表
  - 使用 bcrypt 進行密碼雜湊
  - 預設帳號: `admin`
  - 預設密碼: `sticker2024!`
  - 啟用 RLS (Row Level Security)

### 2. 資料庫函數
- **檔案**: `supabase/migrations/20250104_admin_functions.sql`
- **函數**:
  - `verify_admin_password()`: 驗證帳號密碼
  - `update_admin_password()`: 更新密碼
  - `get_admin_usernames()`: 取得管理員列表

### 3. 前端客戶端
- **檔案**: `public/admin/supabase-admin-client.js`
- **功能**:
  - `verifyAdminCredentials()`: 驗證登入
  - `changeAdminPassword()`: 變更密碼
  - `setAdminAuthStatus()`: 設定登入狀態
  - `getAdminAuthStatus()`: 取得登入狀態
  - `checkAdminAuth()`: 檢查並重定向

### 4. 更新的頁面
- `public/admin/login.html`: 使用 Supabase 驗證
- `public/admin/change-password.html`: 更新 Supabase 密碼
- `public/admin/index.html`: 使用新的認證系統

## 實施步驟

### 步驟 1: 設定 Supabase 配置
在所有 admin HTML 頁面中，更新 Supabase 配置:

```html
<script type="application/json" id="supabase-config">
{
  "url": "https://your-project.supabase.co",
  "anonKey": "your-anon-key"
}
</script>
```

**取得方式**:
1. 登入 Supabase Dashboard
2. 進入 Project Settings > API
3. 複製 Project URL 和 anon key

### 步驟 2: 執行資料庫遷移
在 Supabase Dashboard 中執行 SQL 遷移:

1. 進入 SQL Editor
2. 複製並執行 `supabase/migrations/20250104_admin_credentials.sql`
3. 複製並執行 `supabase/migrations/20250104_admin_functions.sql`

或使用 Supabase CLI:
```bash
supabase db push
```

### 步驟 3: 驗證設置
1. 訪問 `/admin/login.html`
2. 使用預設帳號: `admin`
3. 使用預設密碼: `sticker2024!`
4. 應該能成功登入

### 步驟 4: 變更密碼（可選）
1. 登入後進入 `/admin/change-password.html`
2. 輸入目前密碼: `sticker2024!`
3. 輸入新密碼並確認
4. 密碼將儲存到 Supabase

## 安全特性

### 密碼雜湊
- 使用 bcrypt 演算法進行密碼雜湊
- 密碼從不以明文形式儲存
- 驗證時使用 `crypt()` 函數

### 行級安全 (RLS)
- 匿名用戶可以查詢認證資訊（用於登入）
- 只有已認證的管理員可以更新密碼

### 登入狀態
- 使用 localStorage 儲存登入狀態
- 預設有效期: 24 小時
- 過期後自動重定向到登入頁面

## 故障排除

### 問題 1: "無法連接到 Supabase"
**原因**: Supabase 配置不正確或網路連接問題
**解決方案**:
1. 檢查 Supabase URL 和 Key 是否正確
2. 檢查瀏覽器控制台的錯誤訊息
3. 確認 Supabase 專案是否在線

### 問題 2: "帳號或密碼錯誤"
**原因**: 帳號或密碼不匹配
**解決方案**:
1. 確認帳號為 `admin`
2. 檢查密碼是否正確
3. 確認資料庫遷移已成功執行

### 問題 3: 登入後無法訪問其他頁面
**原因**: 認證檢查失敗
**解決方案**:
1. 清除瀏覽器 localStorage
2. 重新登入
3. 檢查瀏覽器控制台的錯誤訊息

## 環境變數配置

為了安全起見，建議使用環境變數而不是硬編碼配置:

### 方式 1: 使用 .env 文件
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 方式 2: 使用伺服器端配置
在 Netlify Functions 或其他伺服器端代碼中設定配置，然後通過 API 端點提供給前端。

## 後續改進

1. **多管理員支持**: 允許多個管理員帳號
2. **審計日誌**: 記錄所有管理員操作
3. **2FA (雙因素認證)**: 增強安全性
4. **會話管理**: 更細粒度的會話控制
5. **密碼策略**: 強制密碼複雜度要求

## 相關檔案

- 遷移文件: `supabase/migrations/20250104_admin_credentials.sql`
- 函數文件: `supabase/migrations/20250104_admin_functions.sql`
- 客戶端: `public/admin/supabase-admin-client.js`
- 登入頁: `public/admin/login.html`
- 密碼變更: `public/admin/change-password.html`
- 後台首頁: `public/admin/index.html`

