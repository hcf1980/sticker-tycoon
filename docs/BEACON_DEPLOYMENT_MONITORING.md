# 🚀 Beacon 部署後監控指南

## ✅ 部署後立即檢查

### 步驟 1：確認 GitHub 推送成功
```bash
# 提交所有變更
git add .
git commit -m "Add LINE Beacon management system"
git push origin main

# 確認推送成功
git log -1
```

### 步驟 2：確認 Netlify 自動部署
1. 登入 [Netlify Dashboard](https://app.netlify.com)
2. 選擇你的 Site
3. 查看 **Deploys** 頁面
4. 等待部署完成（約 1-2 分鐘）
5. 狀態應該顯示 **Published** ✅

### 步驟 3：執行資料庫設定
**⚠️ 重要：這一步必須手動執行！**

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 點擊左側 **SQL Editor**
4. 新增查詢，複製 `database/beacon_schema.sql` 內容
5. 點擊 **Run** 執行
6. 再新增查詢，複製 `database/beacon_test_data.sql` 內容
7. 點擊 **Run** 執行

### 步驟 4：驗證資料表已建立
在 SQL Editor 執行：
```sql
-- 檢查資料表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'beacon%';

-- 應該看到 4 個表：
-- beacon_devices
-- beacon_events
-- beacon_actions
-- beacon_statistics
```

### 步驟 5：驗證測試資料
```sql
-- 檢查測試設備
SELECT * FROM beacon_devices;

-- 檢查測試動作
SELECT * FROM beacon_actions;

-- 應該看到：
-- 1 個設備（HWID: 0000000019）
-- 2 個動作（進入和離開）
```

## 📊 監控 Beacon 觸發

### 方法 1：使用 Netlify Functions 日誌（即時監控）

1. **進入 Netlify Dashboard**
   - 選擇你的 Site
   - 點擊 **Functions**
   - 選擇 `line-webhook`

2. **查看即時日誌**
   - 點擊 **Function log**
   - 保持頁面開啟

3. **觸發 Beacon 測試**
   - 使用 LINE Beacon Simulator
   - 或靠近實體 Beacon 設備

4. **應該看到的日誌**
   ```
   📡 處理 Beacon 事件: userId=U1234..., hwid=0000000019, type=enter
   ✅ Beacon 事件已記錄，無設定動作
   或
   ✅ 已發送訊息給用戶
   ```

### 方法 2：使用管理後台（查看歷史記錄）

1. **登入管理後台**
   - 訪問：`https://your-domain.netlify.app/admin/login.html`
   - 輸入管理員密碼

2. **進入 Beacon 管理**
   - 點擊「LINE Beacon 管理」

3. **查看最近觸發記錄**
   - 在頁面下方的「最近觸發記錄」區塊
   - 會顯示：
     - 觸發時間
     - HWID
     - 用戶 ID（部分顯示）
     - 事件類型（進入/離開）

4. **查看統計資料**
   - 點擊設備的「📊 查看統計」
   - 查看今日觸發次數

### 方法 3：直接查詢資料庫

在 Supabase SQL Editor 執行：

```sql
-- 查看最近 10 筆觸發事件
SELECT 
  be.*,
  bd.device_name,
  bd.location
FROM beacon_events be
LEFT JOIN beacon_devices bd ON be.hwid = bd.hwid
ORDER BY be.created_at DESC
LIMIT 10;

-- 查看今日統計
SELECT 
  bs.*,
  bd.device_name
FROM beacon_statistics bs
LEFT JOIN beacon_devices bd ON bs.hwid = bd.hwid
WHERE bs.date = CURRENT_DATE;
```

## 🎯 測試 Beacon 觸發

### 使用 LINE Beacon Simulator（推薦測試方式）

#### iOS
1. App Store 搜尋「LINE Beacon Simulator」
2. 安裝並開啟
3. 輸入 HWID: `0000000019`
4. 選擇「Simple Beacon」
5. 點擊「Enter」→ 應該收到歡迎訊息
6. 點擊「Leave」→ 應該收到感謝訊息

#### Android
1. Google Play 搜尋「LINE Beacon Simulator」
2. 步驟同 iOS

### 使用實體 Beacon 設備（Minew E2）

#### 設定步驟
1. **下載 BeaconSET+ App**
   - iOS/Android 搜尋「Minew BeaconSET+」

2. **連接設備**
   - 開啟藍牙
   - 掃描並連接 Minew E2
   - 預設密碼：`minew123`

3. **設定 LINE Beacon**
   - Frame Type: **LINE Beacon**
   - HWID: `0000000019`
   - Vendor Key: `00000019`
   - Lot Key: `0011223344556603`

4. **調整廣播參數**
   - Advertising Interval: `100ms`
   - TX Power: `0dBm`

5. **儲存設定**
   - 點擊「Save」
   - 設備會重新啟動

#### 測試步驟
1. **準備**
   - 確保 LINE App 已登入
   - 確保藍牙已開啟
   - 確保位置權限已授予

2. **靠近測試**
   - 走到 Beacon 設備附近（1-3 公尺）
   - 等待 5-10 秒
   - 應該收到歡迎訊息

3. **遠離測試**
   - 走離 Beacon 設備（10 公尺以上）
   - 等待 5-10 秒
   - 應該收到感謝訊息

## 📱 關於「加入好友」功能

### ⚠️ 重要說明

**Beacon 觸發的前提條件：**
1. ✅ 用戶**必須已經加入你的 LINE Bot 為好友**
2. ✅ 用戶必須開啟 LINE App
3. ✅ 用戶必須開啟藍牙
4. ✅ 用戶必須授予位置權限

### 🔍 為什麼需要先加好友？

LINE Beacon 的運作機制：
```
1. 用戶靠近 Beacon 設備
2. LINE App 偵測到 Beacon 訊號
3. LINE Platform 發送 Webhook 到你的伺服器
4. Webhook 包含 userId（用戶的 LINE ID）
5. 你的伺服器可以透過 userId 發送訊息給用戶
```

**關鍵點：**
- LINE 只會對**已加入 Bot 為好友**的用戶發送 Beacon Webhook
- 如果用戶沒有加入好友，LINE 不會發送 Webhook
- 因此你的伺服器不會知道有用戶靠近

### 💡 解決方案：引導用戶加入好友

#### 方案 1：在 Beacon 附近放置 QR Code
```
1. 生成你的 LINE Bot QR Code
2. 列印並放在 Beacon 設備附近
3. 加上文字：「掃描加入好友，即可收到專屬訊息」
```

#### 方案 2：使用 LINE 官方帳號連結
```
https://line.me/R/ti/p/@your-bot-id
```
放在：
- 店面海報
- 網站
- 社群媒體

#### 方案 3：結合其他行銷活動
```
「加入 LINE 好友，靠近店面即可獲得專屬優惠！」
```

## 🎯 完整的用戶體驗流程

### 理想流程
```
1. 用戶看到宣傳（QR Code/海報/網站）
   ↓
2. 掃描 QR Code 加入 LINE Bot 好友
   ↓
3. 收到歡迎訊息（可以說明 Beacon 功能）
   ↓
4. 用戶靠近 Beacon 設備
   ↓
5. LINE App 自動偵測到 Beacon
   ↓
6. 用戶收到客製化訊息（歡迎、優惠、資訊等）
   ↓
7. 用戶離開時收到感謝訊息
```

### 歡迎訊息範例（引導 Beacon 功能）
```
👋 歡迎加入貼圖大亨！

🎨 你可以使用我來創建專屬貼圖
📡 當你靠近我們的服務據點時，會自動收到專屬訊息和優惠！

請確保：
✅ 開啟藍牙
✅ 授予位置權限

輸入「創建貼圖」開始製作 🚀
```

## 📊 監控指標

### 每日檢查
- [ ] 今日觸發次數
- [ ] 今日不重複用戶數
- [ ] 訊息發送成功率

### 每週檢查
- [ ] 週觸發趨勢
- [ ] 用戶回訪率
- [ ] 設備運作狀態

### 查詢 SQL
```sql
-- 今日統計
SELECT 
  SUM(enter_count) as total_enters,
  SUM(leave_count) as total_leaves,
  SUM(unique_users) as total_users
FROM beacon_statistics
WHERE date = CURRENT_DATE;

-- 本週統計
SELECT 
  date,
  SUM(enter_count) as enters,
  SUM(leave_count) as leaves,
  SUM(unique_users) as users
FROM beacon_statistics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;
```

## 🔧 常見問題

### Q1: 部署後沒有收到 Beacon 訊息？
**檢查清單：**
- [ ] 用戶是否已加入 LINE Bot 好友？
- [ ] Beacon 設備是否已啟用？（管理後台檢查）
- [ ] 動作是否已啟用？（管理後台檢查）
- [ ] HWID 是否正確？
- [ ] Netlify Functions 是否有錯誤？（查看日誌）

### Q2: 如何確認 Webhook 有收到事件？
**方法：**
1. Netlify Dashboard → Functions → line-webhook → Function log
2. 應該看到 `📡 處理 Beacon 事件` 的日誌
3. 如果沒有，表示 LINE 沒有發送 Webhook（可能用戶未加好友）

### Q3: 如何測試不同的訊息內容？
**步驟：**
1. 管理後台 → LINE Beacon 管理
2. 點擊設備的「⚙️ 動作設定」
3. 編輯現有動作或新增動作
4. 修改訊息內容
5. 儲存後立即生效

### Q4: 可以針對不同用戶發送不同訊息嗎？
**目前實作：**
- 所有用戶收到相同訊息

**未來擴展：**
- 可以在 `beacon-handler.js` 中加入用戶分群邏輯
- 根據用戶屬性（VIP、新用戶等）發送不同訊息

## 🎊 部署成功確認

完成以下檢查表示部署成功：

- [ ] ✅ GitHub 推送成功
- [ ] ✅ Netlify 部署完成
- [ ] ✅ 資料庫表格已建立
- [ ] ✅ 測試資料已插入
- [ ] ✅ 管理後台可以訪問
- [ ] ✅ 可以看到測試設備
- [ ] ✅ 使用 Simulator 測試成功
- [ ] ✅ 收到 Beacon 觸發訊息
- [ ] ✅ 管理後台看到觸發記錄
- [ ] ✅ 統計資料正確更新

## 📞 需要幫助？

- 📖 查看完整文件：`docs/BEACON_INDEX.md`
- 🧪 測試指南：`docs/BEACON_TESTING.md`
- 🔧 故障排除：`docs/BEACON_TESTING.md#故障排除`

---

**祝你部署順利！** 🚀

