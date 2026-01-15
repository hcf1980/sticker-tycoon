# LINE Beacon 部署檢查清單

## 📋 部署前檢查

### 1. 環境準備
- [ ] Supabase 專案已建立
- [ ] Netlify 專案已連接
- [ ] LINE Bot Channel 已建立
- [ ] 管理員密碼已設定

### 2. 環境變數確認
在 Netlify Dashboard → Site settings → Environment variables 確認：

- [ ] `SUPABASE_URL` = `https://your-project.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `eyJ...`（Service Role Key）
- [ ] `LINE_CHANNEL_ACCESS_TOKEN` = `eyJ...`
- [ ] `LINE_CHANNEL_SECRET` = `abc...`
- [ ] `ADMIN_PASSWORD_HASH` = `$2a$...`（選填）

### 3. 資料庫設定
- [ ] 登入 Supabase Dashboard
- [ ] 開啟 SQL Editor
- [ ] 執行 `database/beacon_schema.sql`
- [ ] 執行 `database/beacon_test_data.sql`
- [ ] 確認資料表已建立：
  - [ ] `beacon_devices`
  - [ ] `beacon_events`
  - [ ] `beacon_actions`
  - [ ] `beacon_statistics`

### 4. 程式碼部署
```bash
# 確認所有變更已提交
git status

# 提交變更
git add .
git commit -m "Add LINE Beacon management system"

# 推送到遠端
git push origin main

# 等待 Netlify 自動部署（約 1-2 分鐘）
```

### 5. 部署後驗證
- [ ] 訪問管理後台：`https://your-domain.netlify.app/admin/login.html`
- [ ] 成功登入
- [ ] 看到「LINE Beacon 管理」選項
- [ ] 點擊進入 Beacon 管理頁面
- [ ] 看到測試設備「Minew E2 測試設備」
- [ ] 統計資料正常顯示
- [ ] 點擊「動作設定」可以看到預設動作

## 🧪 功能測試

### 測試 1：管理後台功能
- [ ] **新增設備**
  - [ ] 點擊「➕ 新增 Beacon 設備」
  - [ ] 填寫表單並提交
  - [ ] 設備出現在列表中
  
- [ ] **編輯設備**
  - [ ] 點擊「✏️ 編輯」
  - [ ] 修改資料並儲存
  - [ ] 變更生效
  
- [ ] **停用/啟用設備**
  - [ ] 點擊「⏸️ 停用」或「▶️ 啟用」
  - [ ] 狀態正確切換
  
- [ ] **動作設定**
  - [ ] 點擊「⚙️ 動作設定」
  - [ ] 看到動作列表
  - [ ] 可以新增、編輯、刪除動作
  
- [ ] **查看統計**
  - [ ] 點擊「📊 查看統計」
  - [ ] 看到統計資料（測試後才會有資料）

### 測試 2：Beacon 觸發（使用 Simulator）
- [ ] **下載 LINE Beacon Simulator**
  - [ ] iOS: App Store
  - [ ] Android: Google Play
  
- [ ] **設定 Beacon**
  - [ ] 開啟 Simulator
  - [ ] 輸入 HWID: `0000000019`
  - [ ] 選擇 Simple Beacon 模式
  
- [ ] **測試進入事件**
  - [ ] 點擊「Enter」
  - [ ] 開啟 LINE App
  - [ ] 收到歡迎訊息：「👋 歡迎光臨！...」
  
- [ ] **測試離開事件**
  - [ ] 點擊「Leave」
  - [ ] 收到感謝訊息：「👋 感謝您的光臨！...」
  
- [ ] **驗證記錄**
  - [ ] 回到管理後台
  - [ ] 刷新頁面
  - [ ] 在「最近觸發記錄」看到事件
  - [ ] 點擊「📊 查看統計」看到更新的統計

### 測試 3：實體 Beacon 設備（如果有）
- [ ] **設定 Minew E2**
  - [ ] 使用 BeaconSET+ App 連接
  - [ ] 設定 LINE Beacon 模式
  - [ ] 輸入 HWID、Vendor Key、Lot Key
  - [ ] 儲存設定
  
- [ ] **實地測試**
  - [ ] 靠近設備（約 1-3 公尺）
  - [ ] 收到歡迎訊息
  - [ ] 遠離設備（約 10 公尺以上）
  - [ ] 收到感謝訊息
  
- [ ] **驗證記錄**
  - [ ] 管理後台看到觸發記錄
  - [ ] 統計資料正確更新

## 🔍 日誌檢查

### Netlify Functions 日誌
1. 進入 Netlify Dashboard
2. 選擇你的 Site
3. Functions → line-webhook
4. 查看 Recent logs

應該看到類似以下日誌：
```
📡 處理 Beacon 事件: userId=U123..., hwid=0000000019, type=enter
✅ 已建立生成任務: taskId=...
```

### Supabase 日誌
1. 進入 Supabase Dashboard
2. Logs → API
3. 查看最近的請求

應該看到 `beacon_events` 和 `beacon_statistics` 的寫入操作

## 📊 資料庫驗證

### 在 Supabase SQL Editor 執行：

```sql
-- 1. 查看所有設備
SELECT * FROM beacon_devices;

-- 2. 查看所有動作
SELECT * FROM beacon_actions;

-- 3. 查看最近的事件
SELECT * FROM beacon_events 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. 查看今日統計
SELECT * FROM beacon_statistics 
WHERE date = CURRENT_DATE;
```

預期結果：
- [ ] 至少看到一個設備（測試設備）
- [ ] 至少看到兩個動作（進入和離開）
- [ ] 測試後應該看到事件記錄
- [ ] 測試後應該看到統計資料

## ⚠️ 常見問題檢查

### 問題 1：管理後台無法訪問
- [ ] 檢查 Netlify 部署狀態
- [ ] 檢查管理員密碼設定
- [ ] 清除瀏覽器快取
- [ ] 檢查瀏覽器 Console 錯誤

### 問題 2：Beacon 沒有觸發
- [ ] 檢查 LINE Bot Webhook URL 設定
- [ ] 檢查設備是否啟用
- [ ] 檢查 HWID 是否正確
- [ ] 檢查 Netlify Functions 日誌

### 問題 3：訊息沒有發送
- [ ] 檢查動作是否啟用
- [ ] 檢查動作資料格式
- [ ] 檢查 LINE Channel Access Token
- [ ] 查看 Netlify Functions 錯誤日誌

### 問題 4：統計不更新
- [ ] 檢查 Supabase 連線
- [ ] 檢查資料庫權限
- [ ] 手動執行 SQL 驗證
- [ ] 查看 Functions 日誌

## 🎉 部署成功確認

完成以下所有項目表示部署成功：

- [ ] ✅ 資料庫表格已建立
- [ ] ✅ 測試資料已插入
- [ ] ✅ 程式碼已部署到 Netlify
- [ ] ✅ 管理後台可以正常訪問
- [ ] ✅ 可以管理設備和動作
- [ ] ✅ Beacon 事件可以正常觸發
- [ ] ✅ 訊息正確發送給用戶
- [ ] ✅ 事件正確記錄到資料庫
- [ ] ✅ 統計資料正確更新
- [ ] ✅ 所有功能正常運作

## 📞 需要幫助？

如果遇到問題，請檢查：

1. **文件**
   - `docs/BEACON_SETUP.md` - 完整設定說明
   - `docs/BEACON_TESTING.md` - 測試指南
   - `docs/BEACON_QUICKSTART.md` - 快速開始

2. **日誌**
   - Netlify Functions 日誌
   - Supabase API 日誌
   - 瀏覽器 Console

3. **資料庫**
   - 使用 SQL Editor 查詢資料
   - 檢查資料表結構
   - 驗證資料完整性

## 🚀 下一步

部署成功後，可以：

1. 部署更多 Beacon 設備
2. 設定不同的觸發動作
3. 使用 Flex Message 增強視覺效果
4. 分析用戶行為數據
5. 整合優惠券功能
6. 設定 A/B 測試

---

**祝你部署順利！** 🎊

