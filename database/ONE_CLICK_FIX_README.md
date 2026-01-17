# 🎯 Beacon 系統一鍵修復腳本 - 最終版

## ✅ 問題已解決

### 修正的問題：
1. ✅ **外鍵約束錯誤**：先刪除 `beacon_actions`，再刪除 `beacon_messages`
2. ✅ **HWID 錯誤**：從 `018d4b2f1dc` 修正為 `018d4b2fdc`
3. ✅ **重複資料**：清理所有舊資料，重新建立
4. ✅ **唯一約束**：添加 `template_name` 唯一約束

---

## 🚀 立即執行（只需一步！）

### 在 Supabase SQL Editor 執行：

**檔案：`database/ONE_CLICK_BEACON_FIX.sql`**

---

## 📋 腳本執行流程

```
步驟 1：清理錯誤的 HWID 資料
  ├─ 刪除 beacon_actions (018d4b2f1dc, 018d4b2fdc)
  ├─ 刪除 beacon_events
  ├─ 刪除 beacon_statistics
  └─ 刪除 beacon_devices

步驟 2：清理所有訊息模板
  ├─ 刪除所有 beacon_actions（避免外鍵約束錯誤）
  └─ 刪除所有 beacon_messages

步驟 3：添加 template_name 唯一約束
  └─ 確保不會有重複的模板名稱

步驟 4：註冊正確的 Beacon 設備
  └─ HWID: 018d4b2fdc ✅

步驟 5：建立 4 個訊息模板
  ├─ 入口歡迎訊息 (all)
  ├─ 好友專屬歡迎 (friends)
  ├─ 邀請加入好友 (non_friends)
  └─ 離開感謝訊息 (all)

步驟 6：建立 4 個觸發動作
  ├─ 入口歡迎 (enter, 每日3次, 冷卻60分鐘)
  ├─ 好友專屬歡迎 (enter, 每日5次, 冷卻30分鐘)
  ├─ 邀請加入好友 (enter, 每日2次, 冷卻120分鐘)
  └─ 離開感謝 (leave, 每日1次, 冷卻180分鐘)

步驟 7：驗證結果
  ├─ 檢查 Beacon 設備
  ├─ 檢查訊息模板
  ├─ 檢查觸發動作
  └─ 顯示統計資料
```

---

## 📊 執行後的預期結果

```
🔧 步驟 1：清理錯誤的 HWID 資料...
  ✅ 已清理錯誤的 HWID 資料

🔧 步驟 2：清理舊的訊息模板...
  ✅ 已清理所有訊息模板和觸發動作

🔧 步驟 3：添加 template_name 唯一約束...
  ✅ 已添加 template_name 唯一約束

🔧 步驟 4：註冊 Beacon 設備...
  ✅ 已註冊 Beacon 設備 (HWID: 018d4b2fdc)

🔧 步驟 5：建立訊息模板...
  ✅ 已建立 4 個訊息模板

🔧 步驟 6：建立觸發動作...
  ✅ 已建立 4 個觸發動作

📡 Beacon 設備
┌──────────────┬────────────────────────┬────────────┬───────────┐
│ hwid         │ device_name            │ location   │ is_active │
├──────────────┼────────────────────────┼────────────┼───────────┤
│ 018d4b2fdc   │ 貼圖大亨測試 Beacon    │ 測試地點   │ true      │
└──────────────┴────────────────────────┴────────────┴───────────┘

💬 訊息模板
┌──────────────────┬─────────────────┐
│ template_name    │ target_audience │
├──────────────────┼─────────────────┤
│ 入口歡迎訊息     │ all             │
│ 好友專屬歡迎     │ friends         │
│ 邀請加入好友     │ non_friends     │
│ 離開感謝訊息     │ all             │
└──────────────────┴─────────────────┘

⚡ 觸發動作
┌──────────────────┬──────────────┬──────────────────┐
│ action_name      │ trigger_type │ template_name    │
├──────────────────┼──────────────┼──────────────────┤
│ 入口歡迎         │ enter        │ 入口歡迎訊息     │
│ 好友專屬歡迎     │ enter        │ 好友專屬歡迎     │
│ 邀請加入好友     │ enter        │ 邀請加入好友     │
│ 離開感謝         │ leave        │ 離開感謝訊息     │
└──────────────────┴──────────────┴──────────────────┘

📊 統計
┌─────────┬──────────┬─────────┐
│ devices │ messages │ actions │
├─────────┼──────────┼─────────┤
│ 1       │ 4        │ 4       │
└─────────┴──────────┴─────────┘

🎉 一鍵修復完成！
✅ 使用正確的 HWID (018d4b2fdc)
📱 現在可以測試 Beacon 了！
```

---

## 📱 測試步驟

### 1. 確認 LINE Bot 設定

登入 [LINE Developers Console](https://developers.line.biz/console/)：

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

### 3. 測試 Beacon

1. **完全關閉 LINE App**（從背景清除）
2. **重新開啟 LINE App**
3. **靠近 Beacon 設備**（1-2 公尺內）
4. **等待 5-10 秒**
5. **應該收到訊息！** 🎉

---

## 🔍 驗證結果

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

## 🎉 完成！

執行 `ONE_CLICK_BEACON_FIX.sql` 後，你的 Beacon 系統應該可以正常運作了！

**下一步：**
1. ✅ 執行 `database/ONE_CLICK_BEACON_FIX.sql`
2. ✅ 用手機測試 Beacon
3. ✅ 檢查 `beacon_events` 表
4. ✅ 查看 Netlify Logs

---

## 📞 需要協助？

如果還有問題，請提供：
1. Supabase 執行結果截圖
2. Netlify Function Logs 截圖
3. `beacon_events` 表的記錄

我會立即幫你解決！🚀

