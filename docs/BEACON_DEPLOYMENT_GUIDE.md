# Beacon Manager 部署與測試指南

## 🚀 快速開始

### 第一步：執行資料庫 Schema

1. 打開 Supabase SQL Editor
   - 網址：https://supabase.com/dashboard/project/dpuxmetnpghlfgrmthnv/sql/new

2. 複製並執行 `database/beacon_messages_actions_schema.sql` 的內容

3. 確認執行結果：
   - 應該看到表結構查詢結果
   - 確認有 3 筆範例推送訊息已插入

### 第二步：等待 Netlify 部署完成

1. 檢查 Netlify 部署狀態
   - 網址：https://app.netlify.com/sites/sticker-tycoon/deploys

2. 確認最新的 commit 已部署成功
   - Commit: "Add Beacon Manager full features: actions, messages, statistics dashboard"

### 第三步：訪問管理後台

1. 打開管理後台
   - 網址：https://sticker-tycoon.netlify.app/admin/beacon-manager.html

2. 使用 Netlify Identity 登入

3. 開始測試功能！

## 📊 功能測試流程

### 測試 1：查看統計儀表板

**預期結果：**
- 看到 4 個統計卡片
- 總設備數：0（如果是第一次使用）
- 今日觸發次數：0
- 已加入好友推送：0
- 未加入好友推送：0

### 測試 2：新增第一個設備

**步驟：**
1. 點擊「➕ 新增設備」
2. 填寫表單：
   ```
   設備名稱：辦公室入口
   HWID：0123456789
   Vendor Key：（選填）
   Lot Key：（選填）
   位置：台北辦公室一樓
   說明：主要入口 Beacon
   啟用：✓
   ```
3. 點擊「💾 儲存」

**預期結果：**
- 顯示「✅ 設備已新增！」
- Modal 關閉
- 設備列表顯示新設備
- 統計儀表板「總設備數」變為 1

### 測試 3：查看推送訊息模板

**步驟：**
1. 點擊「💬 推送訊息」Tab
2. 查看預設的 3 個範例訊息

**預期結果：**
- 看到「歡迎訊息」
- 看到「好友專屬優惠」
- 看到「邀請加入好友」
- 每個訊息都顯示目標對象

### 測試 4：新增自訂推送訊息

**步驟：**
1. 在「💬 推送訊息」Tab
2. 點擊「➕ 新增模板」
3. 填寫表單：
   ```
   模板名稱：進店歡迎
   訊息類型：純文字訊息
   訊息內容：歡迎光臨！今日全館 8 折優惠 🎉
   目標對象：所有用戶
   說明：進店時推送
   啟用：✓
   ```
4. 點擊「💾 儲存」

**預期結果：**
- 顯示「✅ 推送訊息模板已新增！」
- 訊息列表顯示新模板

### 測試 5：建立觸發動作

**步驟：**
1. 點擊「⚡ 觸發動作」Tab
2. 點擊「➕ 新增動作」
3. 填寫表單：
   ```
   動作名稱：進店歡迎動作
   選擇設備：辦公室入口
   觸發類型：進入範圍 (Enter)
   選擇推送訊息：進店歡迎
   說明：顧客進入時推送歡迎訊息
   啟用：✓
   ```
4. 點擊「💾 儲存」

**預期結果：**
- 顯示「✅ 觸發動作已新增！」
- 動作列表顯示新動作
- 顯示關聯的設備和訊息名稱

### 測試 6：建立離店動作

**步驟：**
1. 新增另一個推送訊息：
   ```
   模板名稱：離店感謝
   訊息內容：感謝光臨！期待下次再見 👋
   目標對象：所有用戶
   ```

2. 新增觸發動作：
   ```
   動作名稱：離店感謝動作
   選擇設備：辦公室入口
   觸發類型：離開範圍 (Leave)
   選擇推送訊息：離店感謝
   ```

**預期結果：**
- 同一個設備有 2 個觸發動作（進入、離開）

### 測試 7：建立好友專屬動作

**步驟：**
1. 新增推送訊息：
   ```
   模板名稱：VIP 專屬優惠
   訊息內容：親愛的 VIP 會員，這是您的專屬優惠碼：VIP2024
   目標對象：已加入好友
   ```

2. 新增觸發動作：
   ```
   動作名稱：VIP 專屬推送
   選擇設備：辦公室入口
   觸發類型：進入範圍 (Enter)
   選擇推送訊息：VIP 專屬優惠
   ```

**預期結果：**
- 只有已加入好友的用戶會收到此訊息

## 🎯 實際場景測試（需要實體 Beacon）

### 場景 1：實體店面

**設定：**
1. 設備：店面入口 Beacon
2. 進入動作：歡迎訊息
3. 離開動作：感謝訊息

**測試步驟：**
1. 用手機靠近 Beacon（進入範圍）
2. 檢查是否收到歡迎訊息
3. 離開 Beacon 範圍
4. 檢查是否收到感謝訊息
5. 回到管理後台查看統計

**預期結果：**
- 今日觸發次數 +2（進入 +1、離開 +1）
- 根據是否加入好友，對應統計 +1

### 場景 2：好友 vs 非好友

**測試步驟：**
1. 使用未加入好友的帳號測試
   - 應收到「邀請加入好友」訊息
   - 「未加入好友推送」統計 +1

2. 使用已加入好友的帳號測試
   - 應收到「好友專屬優惠」訊息
   - 「已加入好友推送」統計 +1

## 🔍 除錯指南

### 問題 1：統計數字不更新

**可能原因：**
- 資料庫連線問題
- RLS 策略問題

**解決方法：**
1. 打開瀏覽器開發者工具（F12）
2. 查看 Console 是否有錯誤
3. 檢查 Network 標籤，確認 API 請求成功
4. 確認 Supabase RLS 策略已正確設定

### 問題 2：下拉選單沒有選項

**可能原因：**
- 資料尚未載入
- 資料庫查詢失敗

**解決方法：**
1. 確認已先新增設備和訊息
2. 重新整理頁面
3. 檢查 Console 錯誤訊息

### 問題 3：無法新增資料

**可能原因：**
- 表單驗證失敗
- 資料庫權限問題

**解決方法：**
1. 檢查必填欄位是否都已填寫
2. 檢查 HWID 格式（10位16進制）
3. 確認 Supabase RLS 策略允許插入

### 問題 4：Beacon 觸發沒有推送

**可能原因：**
- Webhook 未設定
- 觸發動作未啟用
- LINE Bot 設定問題

**解決方法：**
1. 確認 LINE Bot Webhook URL 正確
2. 確認觸發動作狀態為「啟用中」
3. 檢查 `beacon_events` 表是否有記錄
4. 檢查 LINE Bot 推送額度

## 📱 LINE Bot Webhook 設定

### Webhook URL 格式
```
https://sticker-tycoon.netlify.app/.netlify/functions/line-webhook
```

### 設定步驟
1. 登入 LINE Developers Console
2. 選擇你的 Bot
3. 進入 Messaging API 設定
4. 設定 Webhook URL
5. 啟用 Webhook
6. 確認 SSL 憑證驗證通過

## 🎨 自訂 Flex Message

### 範例：產品卡片

```json
{
  "type": "bubble",
  "hero": {
    "type": "image",
    "url": "https://example.com/product.jpg",
    "size": "full",
    "aspectRatio": "20:13"
  },
  "body": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "text",
        "text": "限時優惠",
        "weight": "bold",
        "size": "xl"
      },
      {
        "type": "text",
        "text": "全館商品 8 折",
        "size": "md",
        "color": "#999999"
      }
    ]
  },
  "footer": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "button",
        "action": {
          "type": "uri",
          "label": "立即查看",
          "uri": "https://example.com"
        },
        "style": "primary"
      }
    ]
  }
}
```

### 測試工具
- Flex Message Simulator: https://developers.line.biz/flex-simulator/

## 📊 統計分析建議

### 每日檢查項目
1. 總觸發次數趨勢
2. 已加入 vs 未加入好友比例
3. 各設備觸發頻率
4. 尖峰時段分析

### 優化建議
1. 根據統計調整訊息內容
2. 針對未加入好友設計吸引文案
3. 分析轉換率（未加入 → 已加入）
4. A/B 測試不同訊息效果

## ✅ 檢查清單

部署前：
- [ ] 執行資料庫 Schema
- [ ] 確認範例資料已插入
- [ ] 程式碼已推送到 GitHub
- [ ] Netlify 部署成功

測試時：
- [ ] 可以新增設備
- [ ] 可以新增推送訊息
- [ ] 可以新增觸發動作
- [ ] 統計數字正確顯示
- [ ] Tab 切換正常
- [ ] Modal 開關正常

上線前：
- [ ] LINE Bot Webhook 已設定
- [ ] 實體 Beacon 已測試
- [ ] 推送訊息已測試
- [ ] 統計功能已驗證

## 🆘 需要協助？

如果遇到問題，請檢查：
1. `docs/BEACON_MANAGER_FEATURES.md` - 功能說明
2. `docs/BEACON_TESTING_CHECKLIST.md` - 測試清單
3. 瀏覽器 Console 錯誤訊息
4. Supabase 資料庫日誌

