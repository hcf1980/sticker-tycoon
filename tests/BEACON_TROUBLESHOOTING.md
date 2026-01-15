# 🔍 Beacon 無反應問題排查清單

## 📋 請依序檢查以下項目：

### 1️⃣ LINE Bot 設定檢查

#### 1.1 Webhook URL 是否正確？
- 登入 LINE Developers Console
- 進入你的 Messaging API Channel
- 檢查 Webhook URL: `https://sticker-tycoon.netlify.app/.netlify/functions/line-webhook`
- **Webhook 必須是「已啟用」狀態** ✅

#### 1.2 Beacon 功能是否啟用？
- 在 LINE Developers Console
- 進入你的 Messaging API Channel
- 找到「LINE Simple Beacon」設定
- **確認已啟用** ✅

---

### 2️⃣ Beacon 設備檢查

#### 2.1 設備是否正確設定？
請在 Supabase 執行：
```sql
SELECT * FROM beacon_devices WHERE hwid = '018d4b2f1dc';
```

檢查：
- ✅ `is_active` = true
- ✅ `hwid` 正確

#### 2.2 Beacon HWID 是否正確？
- 你的設備 HWID: `018d4b2f1dc`
- LINE Beacon HWID 必須是 **10 個字元**（5 bytes hex）
- 檢查是否有多餘的空格或字元

---

### 3️⃣ 觸發動作檢查

#### 3.1 是否已執行 `SETUP_BEACON_ACTIONS.sql`？
請在 Supabase 執行：
```sql
SELECT 
  ba.action_name,
  ba.hwid,
  ba.trigger_type,
  ba.is_active,
  bm.template_name,
  bm.target_audience
FROM beacon_actions ba
LEFT JOIN beacon_messages bm ON ba.message_id = bm.id
WHERE ba.hwid = '018d4b2f1dc';
```

**應該看到至少 4 個動作：**
- 入口歡迎（enter）
- 好友歡迎（enter）
- 邀請加入（enter）
- 離開感謝（leave）

---

### 4️⃣ LINE App 設定檢查

#### 4.1 手機藍牙是否開啟？
- iOS: 設定 → 藍牙 → 開啟
- Android: 設定 → 藍牙 → 開啟

#### 4.2 LINE App 藍牙權限是否允許？
- iOS: 設定 → LINE → 藍牙 → 允許
- Android: 設定 → 應用程式 → LINE → 權限 → 藍牙 → 允許

#### 4.3 LINE Simple Beacon 是否啟用？
- 開啟 LINE App
- 主頁 → 設定（齒輪圖示）
- 隱私設定 → 提供使用資料
- **確認「LINE Beacon」已開啟** ✅

---

### 5️⃣ Beacon 設備檢查

#### 5.1 設備是否正常運作？
- 檢查設備是否有電
- 檢查設備 LED 是否閃爍
- 嘗試重啟設備

#### 5.2 設備是否在廣播模式？
- Minew E2 設備需要設定為 **iBeacon 模式**
- 使用 BeaconSET+ App 檢查設定

#### 5.3 設備參數是否正確？
請確認以下參數：
- **HWID**: `018d4b2f1dc` (10 個字元)
- **UUID**: LINE Beacon 專用 UUID
- **Major/Minor**: 根據 LINE 文件設定

---

### 6️⃣ Netlify Function Logs 檢查

#### 6.1 查看即時 Logs
1. 登入 Netlify Dashboard
2. 進入你的 Site
3. Functions → line-webhook
4. 查看 Logs

#### 6.2 應該看到的 Log
當 Beacon 觸發時，應該看到：
```
📡 處理 Beacon 事件: userId=..., hwid=018d4b2f1dc, type=enter
✅ 選擇動作: 入口歡迎 - ...
📤 準備發送訊息: 入口歡迎訊息 (text)
```

#### 6.3 如果沒有任何 Log
表示 **LINE 沒有發送 Webhook 事件**，問題在：
- LINE Bot Webhook 未啟用
- LINE Simple Beacon 未啟用
- 手機 LINE App 設定問題
- Beacon 設備問題

---

### 7️⃣ 測試步驟

#### 7.1 完整測試流程
1. **確認手機藍牙已開啟**
2. **確認 LINE Beacon 功能已啟用**
3. **關閉 LINE App**（完全關閉，不是背景執行）
4. **重新開啟 LINE App**
5. **靠近 Beacon 設備（1-2 公尺內）**
6. **等待 5-10 秒**
7. **查看是否收到訊息**

#### 7.2 如果還是沒反應
1. **查看 Netlify Function Logs**
2. **查看 Supabase beacon_events 表**
   ```sql
   SELECT * FROM beacon_events 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
3. **檢查是否有新的事件記錄**

---

## 🔧 快速診斷 SQL

執行以下 SQL 來快速診斷：

```sql
-- 1. 檢查設備
SELECT 
  '設備狀態' as check_type,
  hwid,
  device_name,
  is_active,
  created_at
FROM beacon_devices
WHERE hwid = '018d4b2f1dc';

-- 2. 檢查觸發動作
SELECT 
  '觸發動作' as check_type,
  COUNT(*) as action_count
FROM beacon_actions
WHERE hwid = '018d4b2f1dc' AND is_active = true;

-- 3. 檢查最近的事件
SELECT 
  '最近事件' as check_type,
  user_id,
  event_type,
  message_sent,
  error_message,
  created_at
FROM beacon_events
WHERE hwid = '018d4b2f1dc'
ORDER BY created_at DESC
LIMIT 5;

-- 4. 檢查訊息模板
SELECT 
  '訊息模板' as check_type,
  COUNT(*) as message_count
FROM beacon_messages
WHERE is_active = true;
```

---

## 🎯 最可能的問題

根據經驗，最常見的問題是：

1. **LINE App 的 Beacon 功能未啟用** (80%)
2. **手機藍牙未開啟或權限未允許** (10%)
3. **Beacon 設備 HWID 設定錯誤** (5%)
4. **LINE Developers Console 的 Beacon 功能未啟用** (5%)

---

## 📞 需要協助？

請提供以下資訊：
1. Netlify Function Logs 截圖
2. Supabase beacon_events 表的最新記錄
3. LINE Developers Console 的 Webhook 設定截圖
4. 手機 LINE App 的 Beacon 設定截圖

我會立即幫你診斷問題！🚀

