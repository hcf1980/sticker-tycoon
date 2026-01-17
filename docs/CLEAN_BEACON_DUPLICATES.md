# 🧹 清理重複的 Beacon 訊息模板

## 📊 問題分析

從你的截圖可以看到：

### ❌ 問題
- **訊息模板重複**（有多個「測試歡迎訊息」）
- **名稱不一致**（有些叫「測試入口歡迎」，有些叫「入口歡迎」）
- **觸發動作混亂**（不知道哪個是正確的）

### 🎯 原因
- 多次執行不同的 SQL 腳本
- 每次執行都新增了新的訊息模板和觸發動作
- 沒有清理舊的資料

---

## 🛠️ 解決方案

### 步驟 1：清理並重建（推薦）

在 Supabase SQL Editor 執行：

```sql
-- 執行 database/CLEAN_AND_REBUILD_BEACON.sql
```

這個腳本會：
1. ✅ **刪除所有舊的觸發動作**
2. ✅ **刪除所有舊的訊息模板**
3. ✅ **建立 4 個全新的訊息模板**
4. ✅ **建立 4 個對應的觸發動作**

---

### 步驟 2：驗證結果

執行後應該看到：

#### ✅ 訊息模板（只有 4 個）
```
template_name        | target_audience
---------------------|----------------
入口歡迎訊息         | all
好友專屬歡迎         | friends
邀請加入好友         | non_friends
離開感謝訊息         | all
```

#### ✅ 觸發動作（只有 4 個）
```
action_name      | trigger_type | message_template
-----------------|--------------|------------------
入口歡迎         | enter        | 入口歡迎訊息
好友專屬歡迎     | enter        | 好友專屬歡迎
邀請加入好友     | enter        | 邀請加入好友
離開感謝         | leave        | 離開感謝訊息
```

---

## 📋 完整的 Beacon 訊息邏輯

### 當用戶「進入」Beacon 範圍時：

```
用戶靠近 Beacon
    ↓
檢查用戶是否為好友
    ↓
┌─────────────┬─────────────┐
│  是好友     │  不是好友   │
└─────────────┴─────────────┘
      ↓              ↓
發送「好友專屬歡迎」  發送「邀請加入好友」
      ↓              ↓
✅ 每日 5 次      ✅ 每日 2 次
✅ 冷卻 30 分鐘   ✅ 冷卻 120 分鐘
```

### 當用戶「離開」Beacon 範圍時：

```
用戶離開 Beacon
    ↓
發送「離開感謝訊息」
    ↓
✅ 每日 1 次
✅ 冷卻 180 分鐘
```

---

## 🎯 觸發動作的優先級

在 `functions/beacon-handler.js:147-165` 中：

```javascript
// 1. 優先選擇針對好友狀態的動作
if (isFriend) {
  action = actions.find(a => 
    a.trigger_type === eventType && 
    a.message?.target_audience === 'friends'
  );
}

// 2. 如果沒有，選擇針對非好友的動作
if (!action && !isFriend) {
  action = actions.find(a => 
    a.trigger_type === eventType && 
    a.message?.target_audience === 'non_friends'
  );
}

// 3. 最後選擇通用動作
if (!action) {
  action = actions.find(a => 
    a.trigger_type === eventType && 
    a.message?.target_audience === 'all'
  );
}
```

---

## ✅ 執行清單

- [ ] 1. 在 Supabase 執行 `CLEAN_AND_REBUILD_BEACON.sql`
- [ ] 2. 確認訊息模板只有 4 個
- [ ] 3. 確認觸發動作只有 4 個
- [ ] 4. 完全關閉並重新開啟 LINE App
- [ ] 5. 靠近 Beacon 設備測試
- [ ] 6. 應該收到正確的訊息（非好友收到「邀請加入好友」）

---

## 📞 執行後告訴我

1. **訊息模板數量**（應該是 4）
2. **觸發動作數量**（應該是 4）
3. **是否收到訊息**
4. **收到的訊息內容**（截圖）

我會立即確認！🚀

