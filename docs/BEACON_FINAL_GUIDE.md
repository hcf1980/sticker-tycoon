# 🎉 LINE Beacon 系統 - 最終部署指南

## 📋 重要提醒

### ⚠️ 關鍵前提條件

**Beacon 觸發的必要條件：**

1. ✅ **用戶必須先加入你的 LINE Bot 為好友**
   - 這是最重要的！
   - LINE 只會對已加好友的用戶發送 Beacon Webhook
   - 未加好友的用戶靠近 Beacon 不會有任何反應

2. ✅ **用戶必須開啟 LINE App**
   - App 必須在背景或前景運行
   - 完全關閉 App 不會觸發

3. ✅ **用戶必須開啟藍牙**
   - Beacon 使用藍牙低功耗（BLE）技術

4. ✅ **用戶必須授予位置權限**
   - LINE App 需要位置權限才能偵測 Beacon

## 🚀 完整部署步驟

### 第一階段：程式碼部署（5 分鐘）

```bash
# 1. 確認所有檔案都已建立
ls -la database/
ls -la functions/beacon-handler.js
ls -la public/admin/beacon-manager.*

# 2. 提交到 GitHub
git add .
git commit -m "Add LINE Beacon management system"
git push origin main

# 3. 等待 Netlify 自動部署
# 訪問 Netlify Dashboard 確認部署狀態
```

### 第二階段：資料庫設定（3 分鐘）

**⚠️ 這一步必須手動執行！**

1. **登入 Supabase**
   - 訪問：https://supabase.com/dashboard
   - 選擇你的專案

2. **執行 Schema SQL**
   - 點擊左側 **SQL Editor**
   - 新增查詢
   - 複製 `database/beacon_schema.sql` 的完整內容
   - 點擊 **Run** 執行
   - 確認顯示 "Success"

3. **執行測試資料 SQL**
   - 再新增一個查詢
   - 複製 `database/beacon_test_data.sql` 的完整內容
   - 點擊 **Run** 執行
   - 確認顯示 "Success"

4. **驗證資料表**
   ```sql
   -- 執行這個查詢確認
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

### 第三階段：驗證部署（2 分鐘）

1. **訪問管理後台**
   ```
   https://your-domain.netlify.app/admin/login.html
   ```

2. **登入並進入 Beacon 管理**
   - 輸入管理員密碼
   - 點擊「LINE Beacon 管理」卡片

3. **確認測試設備存在**
   - 應該看到「Minew E2 測試設備」
   - HWID: `0000000019`
   - 狀態：✅ 啟用中

4. **確認動作已設定**
   - 點擊「⚙️ 動作設定」
   - 應該看到兩個動作：
     - 🚪 進入 - 發送歡迎訊息
     - 🚶 離開 - 發送感謝訊息

## 🧪 測試流程

### 方法 1：使用 LINE Beacon Simulator（最簡單）

#### 步驟 1：下載 Simulator
- **iOS**: App Store 搜尋「LINE Beacon Simulator」
- **Android**: Google Play 搜尋「LINE Beacon Simulator」

#### 步驟 2：確保已加入 LINE Bot 好友
**⚠️ 這是最重要的步驟！**

1. 找到你的 LINE Bot QR Code
   - LINE Developers Console
   - Messaging API 設定頁面
   - 或使用連結：`https://line.me/R/ti/p/@your-bot-id`

2. 用測試用的 LINE 帳號掃描加入好友

3. 確認收到歡迎訊息

#### 步驟 3：設定 Simulator
1. 開啟 LINE Beacon Simulator
2. 輸入 HWID: `0000000019`
3. 選擇「Simple Beacon」模式

#### 步驟 4：測試進入事件
1. 點擊「Enter」按鈕
2. 切換到 LINE App
3. **應該在 1-5 秒內收到歡迎訊息**：
   ```
   👋 歡迎光臨！
   
   您已進入貼圖大亨服務範圍，現在可以使用所有功能創建專屬貼圖！
   
   輸入「創建貼圖」開始製作 🎨
   ```

#### 步驟 5：測試離開事件
1. 在 Simulator 點擊「Leave」按鈕
2. **應該收到感謝訊息**：
   ```
   👋 感謝您的光臨！
   
   期待下次再見 💖
   
   隨時輸入「創建貼圖」繼續製作您的專屬貼圖！
   ```

### 方法 2：使用實體 Beacon 設備

#### 前置準備
1. **準備設備**
   - Minew E2 或其他支援 LINE Beacon 的設備
   - 下載 Minew BeaconSET+ App

2. **設定設備**
   ```
   Frame Type: LINE Beacon
   HWID: 0000000019
   Vendor Key: 00000019
   Lot Key: 0011223344556603
   Advertising Interval: 100ms
   TX Power: 0dBm
   ```

3. **確保用戶已加好友**
   - 在 Beacon 附近放置 QR Code
   - 引導用戶先加入好友

#### 測試步驟
1. 用測試帳號的手機靠近 Beacon（1-3 公尺）
2. 等待 5-10 秒
3. 應該收到歡迎訊息
4. 走離 Beacon（10 公尺以上）
5. 等待 5-10 秒
6. 應該收到感謝訊息

## 📊 監控 Beacon 觸發

### 即時監控：Netlify Functions 日誌

1. **進入 Netlify Dashboard**
   - 選擇你的 Site
   - 點擊 **Functions**
   - 選擇 `line-webhook`
   - 點擊 **Function log**

2. **觸發 Beacon 並觀察日誌**
   - 應該看到：
   ```
   📡 處理 Beacon 事件: userId=U1234567890abcdef..., hwid=0000000019, type=enter
   ✅ Beacon 處理成功
   ```

3. **如果沒有日誌**
   - 表示 LINE 沒有發送 Webhook
   - 最可能的原因：**用戶未加入好友**

### 歷史記錄：管理後台

1. **查看觸發記錄**
   - 管理後台 → LINE Beacon 管理
   - 頁面下方「最近觸發記錄」
   - 會顯示所有觸發事件

2. **查看統計資料**
   - 點擊設備的「📊 查看統計」
   - 查看每日觸發次數
   - 查看不重複用戶數

### 資料庫查詢

```sql
-- 查看最近 10 筆觸發事件
SELECT 
  be.created_at,
  be.user_id,
  be.hwid,
  be.event_type,
  bd.device_name
FROM beacon_events be
LEFT JOIN beacon_devices bd ON be.hwid = bd.hwid
ORDER BY be.created_at DESC
LIMIT 10;

-- 查看今日統計
SELECT 
  bs.date,
  bs.enter_count,
  bs.leave_count,
  bs.unique_users,
  bd.device_name
FROM beacon_statistics bs
LEFT JOIN beacon_devices bd ON bs.hwid = bd.hwid
WHERE bs.date = CURRENT_DATE;
```

## 🎯 引導用戶加入好友的方法

### 方法 1：QR Code 海報

**設計範例：**
```
┌─────────────────────────────┐
│                             │
│   📡 靠近即可獲得專屬訊息    │
│                             │
│   [QR Code]                 │
│                             │
│   掃描加入 LINE 好友         │
│   開啟藍牙和位置權限         │
│                             │
│   🎁 立即體驗智能推播        │
│                             │
└─────────────────────────────┘
```

**放置位置：**
- Beacon 設備附近（1-2 公尺內）
- 店面入口
- 櫃檯
- 等候區

### 方法 2：LINE 官方帳號連結

```
https://line.me/R/ti/p/@your-bot-id
```

**使用場景：**
- 網站首頁
- 社群媒體貼文
- Email 簽名檔
- 名片

### 方法 3：行銷活動

**文案範例：**
```
🎉 加入 LINE 好友，享受智能服務！

✅ 靠近店面自動收到專屬優惠
✅ 即時獲得最新活動資訊
✅ 一鍵創建專屬貼圖

立即掃描加入 👇
[QR Code]
```

### 方法 4：在 Bot 歡迎訊息中說明

當用戶加入好友時，發送：
```
👋 歡迎加入貼圖大亨！

🎨 你可以使用我來創建專屬貼圖

📡 特別功能：智能 Beacon 推播
當你靠近我們的服務據點時，會自動收到：
• 專屬歡迎訊息
• 限時優惠資訊
• 活動通知

請確保：
✅ 開啟藍牙
✅ 授予位置權限
✅ LINE App 保持運行

輸入「創建貼圖」開始製作 🚀
```

## ❌ 常見問題排除

### 問題 1：測試時沒有收到訊息

**檢查清單：**

1. **用戶是否已加入好友？** ⭐ 最常見原因
   ```
   - 用測試帳號掃描 Bot QR Code
   - 確認收到歡迎訊息
   - 再次測試 Beacon
   ```

2. **設備是否已啟用？**
   ```
   - 管理後台 → LINE Beacon 管理
   - 確認設備狀態為「✅ 啟用中」
   - 如果是「⏸️ 已停用」，點擊「▶️ 啟用」
   ```

3. **動作是否已啟用？**
   ```
   - 點擊設備的「⚙️ 動作設定」
   - 確認動作狀態為「✅ 啟用」
   - 如果是「⏸️ 停用」，點擊「▶️ 啟用」
   ```

4. **HWID 是否正確？**
   ```
   - 確認 Simulator 或實體設備的 HWID
   - 與資料庫中的 HWID 比對
   - 必須完全一致（10 位 16 進制字元）
   ```

5. **Netlify Functions 是否有錯誤？**
   ```
   - Netlify Dashboard → Functions → line-webhook
   - 查看 Function log
   - 尋找錯誤訊息
   ```

### 問題 2：Netlify 日誌沒有 Beacon 事件

**可能原因：**
- LINE 沒有發送 Webhook
- 最可能是用戶未加入好友

**解決方法：**
1. 確認用戶已加入好友
2. 確認 LINE Bot Webhook URL 設定正確
3. 測試其他 LINE 功能（發送文字訊息）確認 Webhook 正常

### 問題 3：管理後台看不到測試設備

**解決方法：**
1. 確認已執行 `beacon_test_data.sql`
2. 在 Supabase SQL Editor 執行：
   ```sql
   SELECT * FROM beacon_devices;
   ```
3. 如果沒有資料，重新執行測試資料 SQL

### 問題 4：統計資料沒有更新

**解決方法：**
1. 確認事件有被記錄：
   ```sql
   SELECT * FROM beacon_events ORDER BY created_at DESC LIMIT 5;
   ```
2. 如果有事件但沒有統計，檢查統計更新函數
3. 手動觸發統計更新（在 `beacon-handler.js` 中）

## ✅ 部署成功確認清單

完成以下所有項目表示部署成功：

### 程式碼部署
- [ ] GitHub 推送成功
- [ ] Netlify 自動部署完成
- [ ] 部署狀態顯示 "Published"

### 資料庫設定
- [ ] `beacon_schema.sql` 執行成功
- [ ] `beacon_test_data.sql` 執行成功
- [ ] 4 個資料表都已建立
- [ ] 測試設備已存在
- [ ] 測試動作已存在

### 管理後台
- [ ] 可以正常登入
- [ ] 可以看到「LINE Beacon 管理」選項
- [ ] 可以看到測試設備
- [ ] 可以查看動作設定
- [ ] 可以查看統計資料

### 功能測試
- [ ] 用戶已加入 LINE Bot 好友
- [ ] 使用 Simulator 測試進入事件成功
- [ ] 收到歡迎訊息
- [ ] 使用 Simulator 測試離開事件成功
- [ ] 收到感謝訊息
- [ ] Netlify 日誌有 Beacon 事件記錄
- [ ] 管理後台看到觸發記錄
- [ ] 統計資料正確更新

## 🎊 下一步

部署成功後，你可以：

1. **部署更多 Beacon 設備**
   - 在不同位置放置 Beacon
   - 設定不同的觸發訊息

2. **優化訊息內容**
   - 使用 Flex Message 增強視覺效果
   - 加入互動按鈕
   - 個性化訊息內容

3. **整合其他功能**
   - 觸發時發送優惠券
   - 觸發時推薦貼圖
   - 觸發時記錄用戶行為

4. **分析數據**
   - 定期查看統計報表
   - 分析用戶行為模式
   - 優化 Beacon 位置和訊息

5. **行銷推廣**
   - 製作 QR Code 海報
   - 社群媒體宣傳
   - 舉辦 Beacon 相關活動

## 📚 相關文件

- 📖 [完整功能介紹](./BEACON_README.md)
- 🚀 [5 分鐘快速開始](./BEACON_QUICKSTART.md)
- 📚 [詳細設定說明](./BEACON_SETUP.md)
- 🧪 [測試指南](./BEACON_TESTING.md)
- ✅ [部署檢查清單](./BEACON_DEPLOYMENT_CHECKLIST.md)
- 📊 [功能總結](./BEACON_SUMMARY.md)
- 📑 [文件索引](./BEACON_INDEX.md)

---

**祝你部署順利！有任何問題請參考相關文件。** 🎉

