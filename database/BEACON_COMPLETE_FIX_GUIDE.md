# 🎯 Beacon 修正完整指南

## 📋 發現的問題

1. ❌ **HWID 打錯了**：`018d4b2f1dc`（11 字元）→ 正確：`018d4b2fdc`（10 字元）
2. ❌ **beacon_messages 有重複資料**：無法添加唯一約束
3. ❌ **表結構已更新**：舊腳本使用 `event_type`，新結構是 `trigger_type`

---

## ✅ 修正步驟（請按順序執行）

### 步驟 1：修正 beacon_messages 唯一約束

在 Supabase SQL Editor 執行：

**檔案：`database/FIX_BEACON_MESSAGES_CONSTRAINT.sql`**

這個腳本會：
1. 檢查現有約束
2. 找出重複的 template_name
3. 自動清理重複資料（保留最新的）
4. 添加 template_name 唯一約束
5. 驗證結果

執行後應該看到：
```
✅ 已清理重複的模板: 好友專屬歡迎
✅ 已添加 template_name 唯一約束
```

---

### 步驟 2：執行完整修正腳本

在 Supabase SQL Editor 執行：

**檔案：`database/FINAL_BEACON_FIX_CORRECT_HWID.sql`**

這個腳本會：
1. 清理所有錯誤的 HWID 資料（`018d4b2f1dc` 和舊的 `018d4b2fdc`）
2. 清理所有訊息模板
3. 使用正確的 HWID（`018d4b2fdc`）重建設備
4. 建立 4 個訊息模板：
   - **入口歡迎訊息**（所有人）
   - **好友專屬歡迎**（好友）
   - **邀請加入好友**（非好友）
   - **離開感謝訊息**（所有人）
5. 建立 4 個觸發動作
6. 驗證結果

執行後應該看到：
```
📡 Beacon 設備
hwid: 018d4b2fdc
device_name: 貼圖大亨測試 Beacon
is_active: true

💬 訊息模板: 4 個
⚡ 觸發動作: 4 個

📊 統計
device_count: 1
message_count: 4
action_count: 4

🎉 修正完成！
✅ 已使用正確的 HWID (018d4b2fdc) 重建所有設定
📱 現在可以測試 Beacon 了！
```

---

## 📱 測試 Beacon

### 1. 確認 LINE Bot 設定

登入 LINE Developers Console：

- **Messaging API** → **Webhook settings**
  - Webhook URL: `https://sticker-tycoon.netlify.app/.netlify/functions/line-webhook`
  - Use webhook: **Enabled** ✅
  
- **Messaging API** → **LINE Simple Beacon**
  - Status: **Enabled** ✅

### 2. 確認手機設定

打開 LINE App：

- **主頁** → **設定** → **隱私設定**
- **提供使用資料** → **LINE Beacon**
- 確認已開啟 ✅

### 3. 測試流程

1. **完全關閉 LINE App**（從背景清除）
2. **重新開啟 LINE App**
3. **靠近 Beacon 設備**（1-2 公尺內）
4. **等待 5-10 秒**
5. **應該收到訊息！** 🎉

---

## 🔍 檢查測試結果

### 查看 Beacon 事件記錄

在 Supabase 執行：

```sql
SELECT 
  user_id,
  event_type,
  is_friend,
  message_sent,
  error_message,
  created_at
FROM beacon_events 
WHERE hwid = '018d4b2fdc' 
ORDER BY created_at DESC 
LIMIT 10;
```

**成功的記錄：**
- ✅ `message_sent = true`
- ✅ `error_message = null`

**失敗的記錄：**
- ❌ `message_sent = false`
- ❌ `error_message` 會顯示錯誤原因

---

## 📊 查看 Netlify Logs

1. 登入 Netlify Dashboard
2. 進入 **Functions** → **line-webhook**
3. 查看 **Logs**

**成功的 Logs 應該顯示：**
```
📡 處理 Beacon 事件: userId=..., hwid=018d4b2fdc, type=enter
👤 用戶好友狀態: 未加入
✅ 選擇動作: 邀請加入好友 (每日限制: 2次, 冷卻: 120分鐘)
✅ Beacon 事件已記錄: eventId=..., message_sent=true
📤 準備發送訊息: 邀請加入好友 (text)
```

---

## 🔧 如果還是沒有訊息

### 執行診斷腳本

在 Supabase 執行：

**檔案：`database/DIAGNOSE_AND_FIX_BEACON.sql`**

這個腳本會：
1. 檢查設備是否存在
2. 檢查訊息模板是否存在
3. 檢查觸發動作是否存在
4. 檢查最近的事件記錄
5. 顯示診斷結果
6. 自動建立測試動作（如果不存在）

---

## 💡 常見問題

### Q1: 為什麼會有重複的 template_name？
A: 可能是多次執行了插入腳本，導致重複資料。修正腳本會自動清理。

### Q2: 清理重複資料時會保留哪一個？
A: 保留 `created_at` 最新的記錄，刪除舊的。

### Q3: 如果我想重新測試，如何清理事件記錄？
A: 執行以下 SQL：
```sql
DELETE FROM beacon_events WHERE hwid = '018d4b2fdc';
DELETE FROM beacon_statistics WHERE hwid = '018d4b2fdc';
```

### Q4: 如何確認 HWID 是正確的？
A: 到 LINE Official Account Manager → Beacon → 查看你註冊的 HWID，應該是 10 個字元。

### Q5: 為什麼需要完全關閉 LINE App？
A: LINE App 會快取 Beacon 設定，完全關閉可以強制重新載入。

---

## 🎉 完成！

執行完以上步驟後，你的 Beacon 系統應該可以正常運作了！

**預期行為：**
- 👤 **未加入好友的用戶**：收到「邀請加入好友」訊息
- 🎉 **已加入好友的用戶**：收到「好友專屬歡迎」訊息
- 👋 **離開時**：收到「離開感謝訊息」

**限制機制：**
- 每日限制：防止同一用戶收到太多訊息
- 冷卻時間：兩次訊息之間的最短間隔

---

## 📞 需要協助？

如果還有問題，請提供：
1. Supabase 執行結果截圖
2. Netlify Function Logs 截圖
3. beacon_events 表的記錄

我會立即幫你解決！🚀

