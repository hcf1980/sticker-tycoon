# 🔍 Beacon 沒有推送訊息的原因分析

## 📊 從你的截圖可以看到：

### ✅ 有偵測到事件
- **未加入好友推送：1**
- 表示 Beacon 事件有被記錄到資料庫

### ❌ 但沒有推送訊息
- 原因：**beacon_actions 表中沒有對應的觸發動作**

---

## 🎯 問題診斷流程

```
用戶靠近 Beacon
    ↓
LINE 發送 Beacon Event
    ↓
line-webhook.js 接收 ✅
    ↓
beacon-handler.js 處理
    ↓
檢查設備是否註冊 ✅ (018d4b2f1dc)
    ↓
檢查用戶好友狀態 ✅ (未加入好友)
    ↓
查詢 beacon_actions ❌ (沒有找到動作)
    ↓
返回 action: 'none'
    ↓
不發送訊息 ❌
```

---

## 🛠️ 解決方案

### 步驟 1：在 Supabase 執行診斷 SQL

複製以下 SQL 到 Supabase SQL Editor 執行：

```sql
-- 檢查是否有觸發動作
SELECT COUNT(*) as action_count 
FROM beacon_actions 
WHERE hwid = '018d4b2f1dc' AND is_active = true;
```

**如果結果是 0，表示沒有觸發動作！**

---

### 步驟 2：執行快速修復 SQL

在 Supabase 執行 `database/DIAGNOSE_AND_FIX_BEACON.sql`

這個腳本會：
1. 診斷問題
2. 自動建立測試訊息模板
3. 自動建立測試觸發動作

---

### 步驟 3：驗證觸發動作已建立

執行以下 SQL：

```sql
SELECT 
  ba.action_name,
  ba.trigger_type,
  ba.is_active,
  bm.template_name,
  bm.message_content
FROM beacon_actions ba
LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
WHERE ba.hwid = '018d4b2f1dc';
```

**應該看到至少 1 個動作！**

---

### 步驟 4：再次測試 Beacon

1. **完全關閉 LINE App**（從背景清除）
2. **重新開啟 LINE App**
3. **靠近 Beacon 設備（1-2 公尺內）**
4. **等待 5-10 秒**
5. **應該收到歡迎訊息！** 🎉

---

## 📝 完整設定腳本（可選）

如果你想要完整的 Beacon 設定（包含好友/非好友/離開訊息），執行：

```sql
-- 在 Supabase 執行 database/SETUP_BEACON_ACTIONS.sql
```

這會建立：
- ✅ 4 個訊息模板（歡迎/好友/非好友/離開）
- ✅ 4 個觸發動作（對應每個訊息）

---

## 🔍 查看 Netlify Logs

### 修復前的 Logs（沒有推送）
```
📡 處理 Beacon 事件: userId=..., hwid=018d4b2f1dc, type=enter
⚠️ 沒有找到對應的動作設定
📡 Beacon 事件已記錄，無設定動作
```

### 修復後的 Logs（有推送）
```
📡 處理 Beacon 事件: userId=..., hwid=018d4b2f1dc, type=enter
✅ 選擇動作: 測試入口歡迎 (每日限制: 5次, 冷卻: 30分鐘)
📤 準備發送訊息: 測試歡迎訊息 (text)
✅ 訊息已發送
```

---

## 🎯 核心問題

**你的系統邏輯完全正確** ✅
- Webhook 接收正常
- Beacon 事件記錄正常
- replyToken 使用正確

**唯一問題：缺少觸發動作配置** ❌
- `beacon_actions` 表是空的
- 需要先建立訊息模板和觸發動作

---

## 📊 資料庫表關係

```
beacon_devices (設備)
    ↓
beacon_actions (觸發動作)
    ↓ (message_id)
beacon_messages (訊息模板)
```

**缺少任何一個環節都無法推送訊息！**

---

## ✅ 執行清單

- [ ] 1. 執行 `DIAGNOSE_AND_FIX_BEACON.sql`
- [ ] 2. 確認觸發動作已建立（至少 1 個）
- [ ] 3. 完全關閉並重新開啟 LINE App
- [ ] 4. 靠近 Beacon 設備測試
- [ ] 5. 查看 Netlify Logs 確認推送
- [ ] 6. 查看 Supabase beacon_events 表確認 message_sent = true

---

## 📞 執行後告訴我

1. **觸發動作數量**（應該 > 0）
2. **是否收到訊息**
3. **Netlify Logs 截圖**

我會立即幫你確認！🚀

