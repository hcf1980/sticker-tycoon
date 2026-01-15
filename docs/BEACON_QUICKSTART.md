# LINE Beacon 快速開始指南

## 🚀 5 分鐘快速設定

### 步驟 1：建立資料庫表格（1 分鐘）

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 點擊左側選單的「SQL Editor」
4. 點擊「New query」
5. 複製 `database/beacon_schema.sql` 的內容並貼上
6. 點擊「Run」執行

### 步驟 2：插入測試資料（1 分鐘）

1. 在 SQL Editor 中新增另一個查詢
2. 複製 `database/beacon_test_data.sql` 的內容並貼上
3. 點擊「Run」執行

### 步驟 3：部署到 Netlify（2 分鐘）

```bash
# 提交變更
git add .
git commit -m "Add LINE Beacon management system"
git push

# Netlify 會自動部署（約 1-2 分鐘）
```

### 步驟 4：訪問管理後台（1 分鐘）

1. 訪問：`https://your-domain.netlify.app/admin/login.html`
2. 輸入管理員密碼
3. 點擊「LINE Beacon 管理」
4. 查看已建立的測試設備

## 🎯 立即測試

### 使用 LINE Beacon Simulator

1. **下載 App**
   - iOS: App Store 搜尋「LINE Beacon Simulator」
   - Android: Google Play 搜尋「LINE Beacon Simulator」

2. **設定 Beacon**
   - 開啟 App
   - 輸入 HWID: `0000000019`
   - 選擇「Simple Beacon」

3. **測試觸發**
   - 點擊「Enter」→ 應該收到歡迎訊息
   - 點擊「Leave」→ 應該收到感謝訊息

## 📱 使用實體設備（Minew E2）

### 設定步驟

1. **下載 BeaconSET+ App**
   - iOS/Android 搜尋「Minew BeaconSET+」

2. **連接設備**
   - 開啟藍牙
   - 掃描並連接 Minew E2
   - 預設密碼：`minew123`

3. **設定 LINE Beacon**
   ```
   Frame Type: LINE Beacon
   HWID: 0000000019
   Vendor Key: 00000019
   Lot Key: 0011223344556603
   ```

4. **調整廣播參數**
   ```
   Advertising Interval: 100ms
   TX Power: 0dBm
   ```

5. **儲存並測試**
   - 點擊「Save」
   - 靠近設備測試

## 🎨 自訂歡迎訊息

### 方法 1：使用管理後台

1. 進入「LINE Beacon 管理」
2. 點擊設備的「⚙️ 動作設定」
3. 點擊「✏️ 編輯」現有動作
4. 修改訊息內容
5. 儲存

### 方法 2：使用 SQL

```sql
UPDATE beacon_actions
SET action_data = '{"type": "text", "text": "你的自訂訊息"}'
WHERE hwid = '0000000019' AND event_type = 'enter';
```

## 📊 查看統計

### 在管理後台

1. 點擊設備的「📊 查看統計」
2. 查看每日觸發次數

### 使用 SQL

```sql
-- 查看今日統計
SELECT * FROM beacon_statistics 
WHERE date = CURRENT_DATE;

-- 查看最近 7 天
SELECT * FROM beacon_statistics 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

## 🔧 常用操作

### 新增設備

```sql
INSERT INTO beacon_devices (hwid, device_name, location, is_active)
VALUES ('你的HWID', '設備名稱', '位置', true);
```

### 新增動作

```sql
INSERT INTO beacon_actions (hwid, event_type, action_type, action_data, priority)
VALUES (
  '你的HWID',
  'enter',
  'message',
  '{"type": "text", "text": "你的訊息"}',
  10
);
```

### 停用設備

```sql
UPDATE beacon_devices 
SET is_active = false 
WHERE hwid = '你的HWID';
```

## 📝 下一步

- [ ] 閱讀完整文件：`docs/BEACON_SETUP.md`
- [ ] 查看測試指南：`docs/BEACON_TESTING.md`
- [ ] 部署更多 Beacon 設備
- [ ] 設定進階觸發動作
- [ ] 分析用戶行為數據

## 🆘 需要幫助？

- 查看 Netlify Functions 日誌
- 檢查 Supabase 資料庫
- 查看瀏覽器 Console
- 參考 `docs/BEACON_TESTING.md` 的故障排除章節

