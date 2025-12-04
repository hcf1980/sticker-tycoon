# 管理員認證系統實施檢查清單

## 📋 預實施檢查

### 準備工作
- [ ] 已登入 Supabase Dashboard
- [ ] 已記下 Project URL
- [ ] 已記下 anon public key
- [ ] 已備份現有資料庫（如有）

## 🔧 實施步驟

### 步驟 1: 配置 Supabase
- [ ] 複製 Project URL
- [ ] 複製 anon public key
- [ ] 編輯 `public/admin/login.html` - 更新配置
- [ ] 編輯 `public/admin/change-password.html` - 更新配置
- [ ] 編輯 `public/admin/index.html` - 更新配置

### 步驟 2: 執行資料庫遷移
- [ ] 在 Supabase SQL Editor 中打開新查詢
- [ ] 複製 `supabase/migrations/20250104_admin_credentials.sql` 內容
- [ ] 執行第一個遷移
- [ ] 驗證 `admin_credentials` 表已建立
- [ ] 複製 `supabase/migrations/20250104_admin_functions.sql` 內容
- [ ] 執行第二個遷移
- [ ] 驗證三個函數已建立

### 步驟 3: 驗證資料庫設置
在 Supabase SQL Editor 中執行以下查詢驗證:

```sql
-- 檢查表是否存在
SELECT * FROM admin_credentials;

-- 應該看到一行記錄，帳號為 'admin'
-- 密碼雜湊應該以 $2  開頭（bcrypt 格式）
```

- [ ] 表存在且包含預設帳號
- [ ] 密碼雜湊格式正確

### 步驟 4: 測試登入功能
- [ ] 清除瀏覽器 localStorage (`localStorage.clear()`)
- [ ] 訪問 `http://localhost:3000/admin/login.html`
- [ ] 輸入帳號: `admin`
- [ ] 輸入密碼: `sticker2024!`
- [ ] 點擊登入
- [ ] 應該被重定向到 `/admin/`
- [ ] 檢查瀏覽器控制台是否有錯誤

### 步驟 5: 測試密碼變更
- [ ] 在後台首頁點擊「變更密碼」
- [ ] 輸入目前密碼: `sticker2024!`
- [ ] 輸入新密碼: `NewPassword123`
- [ ] 確認新密碼: `NewPassword123`
- [ ] 點擊「變更密碼」
- [ ] 應該看到成功訊息
- [ ] 應該被重定向到 `/admin/`

### 步驟 6: 測試新密碼登入
- [ ] 登出（點擊「登出」按鈕）
- [ ] 清除 localStorage
- [ ] 訪問 `/admin/login.html`
- [ ] 嘗試用舊密碼 `sticker2024!` 登入
- [ ] 應該失敗並顯示錯誤訊息
- [ ] 用新密碼 `NewPassword123` 登入
- [ ] 應該成功登入

### 步驟 7: 測試認證檢查
- [ ] 登出
- [ ] 直接訪問 `/admin/sticker-manager.html`
- [ ] 應該被重定向到 `/admin/login.html`
- [ ] 登入後應該能訪問該頁面

### 步驟 8: 測試會話過期
- [ ] 登入
- [ ] 打開瀏覽器開發者工具 (F12)
- [ ] 在 Console 中執行:
  ```javascript
  // 模擬會話過期
  localStorage.setItem('adminAuth', JSON.stringify({ loggedIn: true, expiry: Date.now() - 1000 }));
  ```
- [ ] 重新整理頁面
- [ ] 應該被重定向到登入頁面

## 🔍 故障排除

### 問題: 無法連接到 Supabase
**檢查項目**:
- [ ] Supabase URL 是否正確
- [ ] anon key 是否正確
- [ ] 網路連接是否正常
- [ ] 瀏覽器控制台是否有 CORS 錯誤

**解決方案**:
```javascript
// 在瀏覽器控制台中測試
const config = JSON.parse(document.getElementById('supabase-config').textContent);
console.log('Config:', config);
console.log('Supabase loaded:', typeof window.supabase !== 'undefined');
```

### 問題: 登入失敗
**檢查項目**:
- [ ] 帳號是否為 `admin`
- [ ] 密碼是否正確
- [ ] 資料庫遷移是否成功
- [ ] 表中是否有資料

**解決方案**:
```sql
-- 在 Supabase SQL Editor 中檢查
SELECT username, password_hash FROM admin_credentials;

-- 重置密碼
UPDATE admin_credentials 
SET password_hash = crypt('sticker2024!', gen_salt('bf'))
WHERE username = 'admin';
```

### 問題: 密碼變更失敗
**檢查項目**:
- [ ] 目前密碼是否正確
- [ ] 新密碼是否至少 6 個字元
- [ ] 兩次新密碼是否相符
- [ ] RPC 函數是否存在

**解決方案**:
```sql
-- 驗證函數是否存在
SELECT routine_name FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' AND routine_name LIKE 'update_admin_password%';
```

## 📦 部署前檢查

### 代碼檢查
- [ ] 所有 Supabase 配置已更新
- [ ] 沒有硬編碼的密碼
- [ ] 沒有 console.log 調試代碼
- [ ] 所有文件已保存

### 安全檢查
- [ ] RLS 已啟用
- [ ] 密碼使用 bcrypt 雜湊
- [ ] 沒有敏感資訊在前端代碼中
- [ ] 已測試未授權訪問

### 功能檢查
- [ ] 登入功能正常
- [ ] 密碼變更功能正常
- [ ] 登出功能正常
- [ ] 會話過期重定向正常
- [ ] 錯誤訊息清晰

### 瀏覽器相容性
- [ ] Chrome 測試通過
- [ ] Firefox 測試通過
- [ ] Safari 測試通過
- [ ] Edge 測試通過

## 🚀 部署

### 部署前
- [ ] 所有測試已通過
- [ ] 已備份生產資料庫
- [ ] 已通知相關人員
- [ ] 已準備回滾計劃

### 部署步驟
1. [ ] 上傳更新的 HTML 檔案
2. [ ] 上傳 supabase-admin-client.js
3. [ ] 在生產 Supabase 中執行遷移
4. [ ] 驗證生產環境功能
5. [ ] 監控錯誤日誌

### 部署後
- [ ] 測試登入功能
- [ ] 測試密碼變更
- [ ] 檢查錯誤日誌
- [ ] 確認所有管理員可以登入

## 📝 文檔

### 已提供的文檔
- [ ] ADMIN_AUTH_MIGRATION.md - 詳細遷移指南
- [ ] ADMIN_AUTH_SETUP.md - 快速設定指南
- [ ] ADMIN_PAGES_UPDATE.md - 其他頁面更新指南
- [ ] ADMIN_AUTH_IMPLEMENTATION_SUMMARY.md - 實施總結
- [ ] ADMIN_AUTH_CHECKLIST.md - 本檢查清單

### 需要建立的文檔
- [ ] 內部操作手冊
- [ ] 密碼重置程序
- [ ] 故障排除指南
- [ ] 用戶培訓材料

## ✅ 完成標記

- [ ] 所有步驟已完成
- [ ] 所有測試已通過
- [ ] 所有檢查已確認
- [ ] 系統已準備好部署

---

**檢查日期**: ___________
**檢查人員**: ___________
**簽名**: ___________

