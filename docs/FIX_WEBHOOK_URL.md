# 🔧 修改 LINE Webhook URL 指南

## ✅ 正確的 Webhook URL

請將 LINE Developers Console 的 Webhook URL 改為：

```
https://sticker-tycoon.netlify.app/.netlify/functions/line-webhook
```

---

## 📝 修改步驟

### 1. 登入 LINE Developers Console
https://developers.line.biz/console/

### 2. 選擇你的 Provider 和 Channel
- 找到「貼圖大亨」的 Messaging API Channel

### 3. 進入 Messaging API 設定
- 點擊「Messaging API」分頁

### 4. 修改 Webhook URL
- 找到「Webhook settings」區塊
- 點擊「Edit」按鈕
- 將 URL 改為：
  ```
  https://sticker-tycoon.netlify.app/.netlify/functions/line-webhook
  ```
- 點擊「Update」儲存

### 5. 啟用 Webhook
- 確認「Use webhook」開關是 **Enabled（已啟用）**

### 6. 驗證 Webhook
- 點擊「Verify」按鈕測試連線
- 應該顯示「Success」✅

---

## 🔍 為什麼要用這個路徑？

### Netlify Functions 的標準路徑
- Netlify Functions 的標準路徑是：`/.netlify/functions/[function-name]`
- 你的 function 檔案：`functions/line-webhook.js`
- 對應的 URL：`/.netlify/functions/line-webhook`

### `/api/line-webhook` 的問題
- 這個路徑需要透過 `netlify.toml` 的 redirect 規則轉發
- 雖然理論上可以工作，但不如直接使用標準路徑穩定

---

## ✅ 修改完成後的檢查清單

### 1. 測試 Webhook
在 LINE Developers Console 點擊「Verify」按鈕，應該看到：
```
✅ Success
```

### 2. 測試文字訊息
發送任何文字訊息給你的 LINE Bot，應該有回應

### 3. 測試 Beacon
- 確認已執行 `SETUP_BEACON_ACTIONS.sql`
- 靠近 Beacon 設備
- 應該收到歡迎訊息

### 4. 查看 Netlify Logs
- 登入 Netlify Dashboard
- Functions → line-webhook → Logs
- 應該看到請求記錄

---

## 🚨 如果還是不行

### 檢查 1：Webhook 是否啟用
- LINE Developers Console
- Messaging API → Webhook settings
- 確認「Use webhook」是 **Enabled**

### 檢查 2：LINE Simple Beacon 是否啟用
- LINE Developers Console
- Messaging API → LINE Simple Beacon
- 確認已啟用

### 檢查 3：手機 LINE App 設定
- LINE App → 主頁 → 設定 → 隱私設定
- 提供使用資料 → LINE Beacon
- 確認已開啟

### 檢查 4：執行診斷 SQL
在 Supabase 執行：
```sql
-- 檢查觸發動作是否已設定
SELECT COUNT(*) as action_count 
FROM beacon_actions 
WHERE hwid = '018d4b2f1dc' AND is_active = true;
```

應該看到至少 4 個動作。

---

## 📞 需要協助？

修改完成後，請：
1. 發送一則文字訊息給 Bot（測試基本功能）
2. 靠近 Beacon 設備（測試 Beacon 功能）
3. 告訴我結果！

如果還是沒反應，請提供：
- Webhook 驗證結果截圖
- Netlify Function Logs 截圖
- Supabase beacon_events 表的記錄

我會立即幫你解決！🚀

