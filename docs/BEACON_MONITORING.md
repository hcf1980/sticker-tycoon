# LINE Beacon 測試與監控指南

## 📋 目錄
1. [如何確認 Beacon 是否被偵測到](#如何確認-beacon-是否被偵測到)
2. [查看 Beacon 事件記錄](#查看-beacon-事件記錄)
3. [Netlify 日誌查看](#netlify-日誌查看)
4. [Supabase 資料庫查詢](#supabase-資料庫查詢)
5. [常見問題排查](#常見問題排查)

---

## 🔍 如何確認 Beacon 是否被偵測到

### 方法 1：查看事件記錄頁面（推薦）

1. **登入管理後台**
   ```
   https://你的網站.netlify.app/admin/login.html
   ```

2. **進入 Beacon 事件記錄**
   ```
   https://你的網站.netlify.app/admin/beacon-events.html
   ```

3. **查看統計卡片**
   - 總觸發次數：所有 Beacon 事件總數
   - 今日觸發：今天的觸發次數
   - 好友觸發：已加入好友的用戶觸發次數
   - 非好友觸發：未加入好友的用戶觸發次數

4. **查看事件列表**
   - 時間：事件發生時間
   - 設備：觸發的 Beacon 設備
   - 事件類型：進入/離開/停留
   - 用戶 ID：觸發的 LINE 用戶
   - 好友狀態：是否已加入好友
   - 推送訊息：是否成功推送訊息

5. **使用篩選器**
   - 設備篩選：只看特定設備的事件
   - 事件類型：只看進入/離開事件
   - 好友狀態：只看好友/非好友的事件

6. **自動刷新**
   - 頁面每 30 秒自動刷新一次
   - 或點擊「🔄 重新整理」按鈕手動刷新

---

### 方法 2：Netlify Functions 日誌

1. **登入 Netlify Dashboard**
   ```
   https://app.netlify.com
   ```

2. **選擇你的網站**

3. **進入 Functions 頁面**
   - 點擊左側選單的 "Functions"

4. **查看 line-webhook 函數**
   - 點擊 `line-webhook` 函數
   - 查看 "Function log" 標籤

5. **搜尋 Beacon 相關日誌**
   ```
   搜尋關鍵字：
   - "📡 處理 Beacon 事件"
   - "Beacon 事件"
   - "hwid="
   ```

6. **日誌範例**
   ```
   ✅ 成功偵測：
   📡 處理 Beacon 事件: userId=U1234..., hwid=0000000019, type=enter
   👤 用戶好友狀態: 已加入
   📤 準備發送訊息: 歡迎訊息 (text)
   ✅ Beacon 事件已記錄: eventId=abc123...

   ❌ 設備未啟用：
   ⚠️ Beacon 設備未註冊或未啟用: 0000000019
   ```

---

### 方法 3：Supabase 資料庫直接查詢

1. **登入 Supabase Dashboard**
   ```
   https://supabase.com/dashboard
   ```

2. **選擇你的專案**

3. **進入 Table Editor**
   - 點擊左側選單的 "Table Editor"

4. **查看 beacon_events 表**
   ```sql
   SELECT 
     created_at,
     user_id,
     hwid,
     event_type,
     is_friend,
     message_sent
   FROM beacon_events
   ORDER BY created_at DESC
   LIMIT 50;
   ```

5. **查看 beacon_statistics 表**
   ```sql
   SELECT 
     date,
     hwid,
     enter_count,
     leave_count,
     unique_users
   FROM beacon_statistics
   ORDER BY date DESC;
   ```

6. **查看最近 1 小時的事件**
   ```sql
   SELECT *
   FROM beacon_events
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

---

## 📊 查看 Beacon 事件記錄

### 事件記錄頁面功能

**URL**: `https://你的網站.netlify.app/admin/beacon-events.html`

#### 統計卡片
- **總觸發次數**：所有時間的總觸發次數
- **今日觸發**：今天的觸發次數（00:00 開始計算）
- **好友觸發**：已加入好友的用戶觸發次數
- **非好友觸發**：未加入好友的用戶觸發次數

#### 篩選功能
1. **設備篩選**：選擇特定 Beacon 設備
2. **事件類型**：進入/離開/停留
3. **好友狀態**：全部/已加入/未加入

#### 事件列表欄位
- **時間**：事件發生的日期和時間
- **設備**：設備名稱和 HWID
- **事件類型**：🚪 進入 / 👋 離開 / ⏱️ 停留
- **用戶 ID**：LINE User ID（前 12 碼）
- **好友狀態**：👫 已加入 / 👤 未加入
- **推送訊息**：✅ 已推送 / ⏸️ 未推送

#### 分頁功能
- 每頁顯示 50 筆記錄
- 上一頁/下一頁按鈕
- 顯示總記錄數

---

## 🔧 Netlify 日誌查看

### 即時日誌（Real-time logs）

1. **使用 Netlify CLI**
   ```bash
   # 安裝 Netlify CLI
   npm install -g netlify-cli

   # 登入
   netlify login

   # 查看即時日誌
   netlify functions:log line-webhook
   ```

2. **查看特定時間範圍**
   ```bash
   # 查看最近 1 小時
   netlify functions:log line-webhook --since 1h

   # 查看最近 30 分鐘
   netlify functions:log line-webhook --since 30m
   ```

### Dashboard 日誌

1. **Functions 日誌**
   - Netlify Dashboard → Functions → line-webhook
   - 可查看最近 24 小時的日誌

2. **搜尋技巧**
   ```
   關鍵字：
   - "📡" : 所有 Beacon 相關日誌
   - "hwid=0000000019" : 特定設備的日誌
   - "userId=U..." : 特定用戶的日誌
   - "✅" : 成功的操作
   - "❌" : 失敗的操作
   ```

---

## 💾 Supabase 資料庫查詢

### 常用查詢語句

#### 1. 查看最近的 Beacon 事件
```sql
SELECT 
  e.created_at,
  e.user_id,
  e.event_type,
  e.is_friend,
  e.message_sent,
  d.device_name,
  d.hwid
FROM beacon_events e
LEFT JOIN beacon_devices d ON e.hwid = d.hwid
ORDER BY e.created_at DESC
LIMIT 100;
```

#### 2. 查看今日統計
```sql
SELECT 
  d.device_name,
  s.enter_count,
  s.leave_count,
  s.unique_users
FROM beacon_statistics s
JOIN beacon_devices d ON s.hwid = d.hwid
WHERE s.date = CURRENT_DATE
ORDER BY s.enter_count DESC;
```

#### 3. 查看特定設備的事件
```sql
SELECT *
FROM beacon_events
WHERE hwid = '0000000019'
ORDER BY created_at DESC
LIMIT 50;
```

#### 4. 查看推送成功率
```sql
SELECT 
  hwid,
  COUNT(*) as total_events,
  SUM(CASE WHEN message_sent THEN 1 ELSE 0 END) as sent_count,
  ROUND(100.0 * SUM(CASE WHEN message_sent THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM beacon_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY hwid;
```

#### 5. 查看好友轉換率
```sql
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN is_friend THEN 1 ELSE 0 END) as friend_count,
  ROUND(100.0 * SUM(CASE WHEN is_friend THEN 1 ELSE 0 END) / COUNT(*), 2) as friend_rate
FROM (
  SELECT DISTINCT user_id, is_friend
  FROM beacon_events
  WHERE created_at > NOW() - INTERVAL '30 days'
) subquery;
```

---

## 🐛 常見問題排查

### 問題 1：Beacon 沒有被偵測到

**檢查清單：**

1. ✅ **Beacon 設備是否已註冊？**
   - 進入管理後台 → LINE Beacon 管理
   - 確認設備已新增且 HWID 正確

2. ✅ **設備是否已啟用？**
   - 檢查設備狀態是否為「✅ 啟用中」
   - 如果是「⏸️ 已停用」，點擊編輯並啟用

3. ✅ **Beacon 硬體是否正常？**
   - 檢查電池是否有電
   - 檢查 Beacon 是否在廣播（LED 燈號）
   - 使用 LINE Beacon Simulator App 測試

4. ✅ **LINE Bot 是否已設定 Webhook？**
   - LINE Developers Console → Messaging API
   - Webhook URL: `https://你的網站.netlify.app/.netlify/functions/line-webhook`
   - Webhook 狀態：已啟用

5. ✅ **用戶是否在 Beacon 範圍內？**
   - Beacon 有效範圍通常是 1-3 公尺
   - 確保用戶手機藍牙已開啟
   - 確保用戶已打開 LINE App

---

### 問題 2：事件有記錄但沒有推送訊息

**檢查清單：**

1. ✅ **是否有設定觸發動作？**
   - 管理後台 → ⚡ 觸發動作
   - 確認有對應的動作設定

2. ✅ **觸發動作是否已啟用？**
   - 檢查動作狀態是否為「✅ 啟用中」

3. ✅ **觸發類型是否匹配？**
   - 進入事件 → trigger_type = 'enter'
   - 離開事件 → trigger_type = 'leave'

4. ✅ **目標對象是否匹配？**
   - 檢查 beacon_events 表的 `is_friend` 欄位
   - 檢查 beacon_messages 表的 `target_audience` 欄位
   - 確保兩者匹配（all/friends/non_friends）

5. ✅ **推送訊息模板是否已啟用？**
   - 管理後台 → 💬 推送訊息
   - 確認訊息模板狀態為「✅ 啟用中」

---

### 問題 3：Netlify Functions 逾時

**解決方案：**

1. **檢查函數執行時間**
   - Netlify Functions 預設逾時：10 秒
   - 如果超過，需要優化程式碼

2. **優化建議**
   - 減少資料庫查詢次數
   - 使用非同步處理
   - 避免等待外部 API 回應

3. **查看日誌**
   ```bash
   netlify functions:log line-webhook
   ```

---

### 問題 4：資料庫連線失敗

**檢查清單：**

1. ✅ **環境變數是否正確？**
   - Netlify Dashboard → Site settings → Environment variables
   - 確認 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`

2. ✅ **Supabase 專案是否正常？**
   - 登入 Supabase Dashboard
   - 檢查專案狀態

3. ✅ **RLS 政策是否正確？**
   - 執行 `database/FIX_BEACON_RLS_POLICIES.sql`
   - 確保 Service Role 有完整權限

---

## 📱 實際測試步驟

### 完整測試流程

1. **準備工作**
   ```
   ✅ Beacon 設備已註冊並啟用
   ✅ 觸發動作已設定並啟用
   ✅ 推送訊息模板已建立並啟用
   ✅ LINE Bot Webhook 已設定
   ```

2. **開始測試**
   ```
   1. 打開 LINE App
   2. 確保藍牙已開啟
   3. 靠近 Beacon 設備（1-3 公尺內）
   4. 等待 5-10 秒
   5. 檢查是否收到推送訊息
   ```

3. **查看結果**
   ```
   方法 1：查看 LINE 訊息
   - 應該收到設定的推送訊息

   方法 2：查看事件記錄頁面
   - https://你的網站.netlify.app/admin/beacon-events.html
   - 應該看到新的事件記錄

   方法 3：查看 Netlify 日誌
   - 搜尋 "📡 處理 Beacon 事件"
   - 確認有相關日誌

   方法 4：查看 Supabase
   - beacon_events 表應該有新記錄
   - message_sent 欄位應該為 true
   ```

4. **測試離開事件**
   ```
   1. 遠離 Beacon 設備（超過 10 公尺）
   2. 等待 30-60 秒
   3. 檢查是否收到離開訊息
   ```

---

## 🎯 監控建議

### 日常監控

1. **每日檢查**
   - 查看事件記錄頁面的「今日觸發」數量
   - 確認推送成功率（message_sent = true 的比例）

2. **每週檢查**
   - 查看 beacon_statistics 表的統計資料
   - 分析用戶行為模式

3. **每月檢查**
   - 查看好友轉換率
   - 優化推送訊息內容

### 告警設定

建議設定以下告警：

1. **Beacon 設備離線**
   - 如果 1 小時內沒有任何事件，發送通知

2. **推送失敗率過高**
   - 如果推送失敗率超過 10%，發送通知

3. **資料庫連線失敗**
   - 如果出現資料庫錯誤，立即通知

---

## 📞 技術支援

如果以上方法都無法解決問題，請提供以下資訊：

1. Beacon HWID
2. 事件發生時間
3. Netlify Functions 日誌截圖
4. Supabase beacon_events 表截圖
5. 錯誤訊息（如果有）

---

**最後更新：2025-11-19**

