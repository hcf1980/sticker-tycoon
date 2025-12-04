# 管理員認證系統快速設定

## 5 分鐘快速設定

### 1️⃣ 取得 Supabase 配置
1. 登入 [Supabase Dashboard](https://app.supabase.com)
2. 選擇您的專案
3. 進入 **Settings** → **API**
4. 複製以下資訊:
   - **Project URL** (例: `https://xxxxx.supabase.co`)
   - **anon public key** (以 `eyJ` 開頭)

### 2️⃣ 更新配置文件
編輯以下檔案，將 Supabase 配置替換為您的實際值:

**檔案列表**:
- `public/admin/login.html`
- `public/admin/change-password.html`
- `public/admin/index.html`

**查找並替換**:
```html
<script type="application/json" id="supabase-config">
{
  "url": "https://your-project.supabase.co",
  "anonKey": "your-anon-key"
}
</script>
```

替換為您的實際值:
```html
<script type="application/json" id="supabase-config">
{
  "url": "https://xxxxx.supabase.co",
  "anonKey": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
</script>
```

### 3️⃣ 執行資料庫遷移
在 Supabase Dashboard 中:

1. 進入 **SQL Editor**
2. 點擊 **New Query**
3. 複製並執行第一個遷移文件:
   ```
   supabase/migrations/20250104_admin_credentials.sql
   ```
4. 複製並執行第二個遷移文件:
   ```
   supabase/migrations/20250104_admin_functions.sql
   ```

### 4️⃣ 測試登入
1. 訪問 `https://your-domain/admin/login.html`
2. 輸入帳號: `admin`
3. 輸入密碼: `sticker2024!`
4. 點擊登入

✅ 如果成功，您應該被重定向到 `/admin/`

## 預設認證資訊

| 項目 | 值 |
|------|-----|
| 帳號 | `admin` |
| 密碼 | `sticker2024!` |
| 有效期 | 24 小時 |

## 變更密碼

1. 登入後進入 `/admin/change-password.html`
2. 輸入目前密碼: `sticker2024!`
3. 輸入新密碼（至少 6 字元）
4. 確認新密碼
5. 點擊「變更密碼」

新密碼將立即生效，所有後續登入都需要使用新密碼。

## 常見問題

### Q: 忘記密碼怎麼辦？
A: 在 Supabase Dashboard 中直接更新 `admin_credentials` 表的密碼雜湊。

### Q: 如何重置為預設密碼？
A: 在 Supabase SQL Editor 中執行:
```sql
UPDATE admin_credentials 
SET password_hash = crypt('sticker2024!', gen_salt('bf'))
WHERE username = 'admin';
```

### Q: 可以有多個管理員嗎？
A: 目前系統只支持單一管理員帳號 `admin`。如需多管理員，請參考遷移指南中的後續改進部分。

### Q: 登入狀態會保存多久？
A: 預設 24 小時。可在 `supabase-admin-client.js` 中的 `setAdminAuthStatus()` 函數修改。

## 檔案結構

```
public/admin/
├── login.html                    # 登入頁面
├── index.html                    # 後台首頁
├── change-password.html          # 密碼變更頁面
├── supabase-admin-client.js      # 認證客戶端
└── [其他管理頁面...]

supabase/migrations/
├── 20250104_admin_credentials.sql  # 資料表定義
└── 20250104_admin_functions.sql    # RPC 函數
```

## 部署檢查清單

- [ ] 更新所有 admin HTML 頁面的 Supabase 配置
- [ ] 執行資料庫遷移
- [ ] 測試登入功能
- [ ] 測試密碼變更功能
- [ ] 測試登出功能
- [ ] 清除瀏覽器 localStorage 並重新測試
- [ ] 在不同瀏覽器中測試
- [ ] 檢查瀏覽器控制台是否有錯誤

## 支援

如有問題，請檢查:
1. 瀏覽器開發者工具 (F12) 的 Console 標籤
2. Supabase Dashboard 的 Logs 部分
3. 確認 Supabase 配置是否正確

