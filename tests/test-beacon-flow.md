# 🔍 LINE Simple Beacon 完整流程檢查

## 📋 檢查清單

### ✅ 1. Webhook 接收 Beacon 事件
**檔案**: `functions/line-webhook.js` (line 1173-1178)

```javascript
// 處理 Beacon 事件
if (ev.type === 'beacon') {
  await handleBeaconWebhookEvent(replyToken, userId, ev.beacon);
  globalMonitor.end(`event_${ev.type}_${userId}`);
  return;
}
```

**狀態**: ✅ 正常 - Webhook 有接收 Beacon 事件

---

### ✅ 2. 呼叫 Beacon 處理器
**檔案**: `functions/line-webhook.js` (line 1075-1099)

```javascript
async function handleBeaconWebhookEvent(replyToken, userId, beaconData) {
  console.log(`📡 處理 Beacon 事件: userId=${userId}, hwid=${beaconData.hwid}, type=${beaconData.type}`);

  try {
    // 呼叫 Beacon 處理器
    const result = await handleBeaconEvent(userId, beaconData);

    if (!result.success) {
      console.log(`⚠️ Beacon 處理失敗: ${result.message}`);
      return;
    }

    // 根據動作類型發送訊息
    if (result.action === 'message' && result.data) {
      const messageData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
      await getLineClient().replyMessage(replyToken, messageData); // ✅ 使用 replyToken
    } else if (result.action === 'none') {
      // 無動作，不回應
      console.log('📡 Beacon 事件已記錄，無設定動作');
    }

  } catch (error) {
    console.error('❌ 處理 Beacon 事件失敗:', error);
  }
}
```

**狀態**: ✅ 正常 - 有使用 `replyToken` 推送訊息

---

### ⚠️ 3. Beacon 處理器邏輯
**檔案**: `functions/beacon-handler.js`

#### 3.1 檢查設備是否註冊 (line 44-71)
```javascript
const { data: device, error: deviceError } = await supabase
  .from('beacon_devices')
  .eq('hwid', hwid)
  .eq('is_active', true)
  .single();
```

**狀態**: ✅ 你的資料庫有設備 `018d4b2f1dc`

---

#### 3.2 檢查用戶好友狀態 (line 73-85)
```javascript
const { data: userData } = await supabase
  .from('users')
  .select('is_friend')
  .eq('user_id', userId)
  .single();

isFriend = userData?.is_friend || false;
```

**狀態**: ⚠️ 你的用戶是「未加入好友」

---

#### 3.3 取得觸發動作 (line 87-106)
```javascript
const { data: actions, error: actionsError } = await supabase
  .from('beacon_actions')
  .select(`
    *,
    beacon_messages (
      id,
      template_name,
      message_type,
      message_content,
      target_audience
    )
  `)
  .eq('hwid', hwid)
  .eq('trigger_type', type)
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

**狀態**: ❌ **這裡是問題！** - `beacon_actions` 表中沒有對應的動作

---

#### 3.4 篩選適合的動作 (line 113-169)
- 檢查目標對象（全部/好友/非好友）
- 檢查每日觸發次數限制
- 檢查冷卻時間

**狀態**: ⚠️ 因為沒有動作設定，這段邏輯沒有執行

---

#### 3.5 返回訊息 (line 202-241)
```javascript
if (selectedMessage) {
  // ... 準備訊息內容
  return {
    success: true,
    action: 'message',
    data: messageData,
    device: device,
    eventId: eventId
  };
}

// 無動作
return {
  success: true,
  action: 'none',
  message: noActionMessage,
  eventId: eventId
};
```

**狀態**: ⚠️ 因為沒有動作，返回 `action: 'none'`

---

## 🔴 問題診斷

### 主要問題：`beacon_actions` 表中沒有觸發動作

從你的截圖可以看到：
- ✅ Beacon 設備已註冊：`018d4b2f1dc`
- ✅ Beacon 事件已記錄：1 筆
- ❌ **推送訊息：未推送**
- ❌ **原因：沒有設定觸發動作**

---

## 🛠️ 解決方案

### 步驟 1：檢查資料庫配置

在 Supabase SQL Editor 執行：

```sql
-- 檢查 Beacon 設備
SELECT * FROM beacon_devices WHERE hwid = '018d4b2f1dc';

-- 檢查訊息模板
SELECT * FROM beacon_messages;

-- 檢查觸發動作
SELECT * FROM beacon_actions WHERE hwid = '018d4b2f1dc';
```

---

### 步驟 2：建立測試訊息模板

```sql
-- 插入測試訊息模板
INSERT INTO beacon_messages (
  template_name,
  message_type,
  message_content,
  target_audience,
  is_active
)
VALUES (
  '歡迎訊息',
  'text',
  '👋 歡迎光臨！您已進入貼圖大亨服務範圍！',
  'all',
  true
)
RETURNING id;
```

記下返回的 `id`（例如：`123e4567-e89b-12d3-a456-426614174000`）

---

### 步驟 3：建立觸發動作

```sql
-- 插入觸發動作（使用上一步得到的 message_id）
INSERT INTO beacon_actions (
  hwid,
  action_name,
  trigger_type,
  message_id,
  daily_limit,
  cooldown_minutes,
  is_active
)
VALUES (
  '018d4b2f1dc',
  '入口歡迎',
  'enter',
  '123e4567-e89b-12d3-a456-426614174000', -- 替換成你的 message_id
  2,
  60,
  true
);
```

---

### 步驟 4：測試 Beacon 觸發

1. 用手機靠近 Beacon 設備
2. 觀察 Netlify Function Logs
3. 應該看到：
   ```
   📡 處理 Beacon 事件: userId=..., hwid=018d4b2f1dc, type=enter
   ✅ 選擇動作: 入口歡迎 (每日限制: 2次, 冷卻: 60分鐘)
   📤 準備發送訊息: 歡迎訊息 (text)
   ```

4. LINE Bot 應該會推送訊息！

---

## 📊 流程圖

```
用戶靠近 Beacon
    ↓
LINE 發送 Beacon Event (含 replyToken)
    ↓
line-webhook.js 接收事件
    ↓
handleBeaconWebhookEvent()
    ↓
beacon-handler.js → handleBeaconEvent()
    ↓
檢查設備是否註冊 ✅
    ↓
檢查用戶好友狀態 ✅
    ↓
查詢 beacon_actions ❌ (沒有動作)
    ↓
返回 action: 'none'
    ↓
不發送訊息 ❌
```

**修復後的流程：**

```
用戶靠近 Beacon
    ↓
LINE 發送 Beacon Event (含 replyToken)
    ↓
line-webhook.js 接收事件
    ↓
handleBeaconWebhookEvent()
    ↓
beacon-handler.js → handleBeaconEvent()
    ↓
檢查設備是否註冊 ✅
    ↓
檢查用戶好友狀態 ✅
    ↓
查詢 beacon_actions ✅ (找到動作)
    ↓
檢查目標對象 ✅
    ↓
檢查每日限制 ✅
    ↓
檢查冷卻時間 ✅
    ↓
返回 action: 'message' + data
    ↓
使用 replyToken 發送訊息 ✅
```

---

## 🎯 結論

**系統邏輯完全正確** ✅
- Webhook 接收正常
- replyToken 使用正確
- Beacon 處理邏輯完整

**唯一問題：缺少觸發動作配置** ❌
- 需要在 `beacon_actions` 表中新增動作
- 需要先建立 `beacon_messages` 訊息模板

**修復後即可正常推送訊息！** 🚀

