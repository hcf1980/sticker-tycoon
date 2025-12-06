# 功能說明系統測試指南

## 測試前準備

### 1. 部署資料庫更新
在 Supabase SQL Editor 執行：
```sql
-- 添加欄位
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_tutorial_shown_at TIMESTAMP WITH TIME ZONE;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_users_last_tutorial_shown 
ON users(last_tutorial_shown_at);
```

### 2. 確認程式碼已部署
- 檢查 Netlify 部署狀態
- 確認最新 commit 已上線

## 測試案例

### 測試 1：新用戶自動顯示
**目的**：驗證新用戶首次使用時會自動收到功能說明

**步驟**：
1. 使用新的 LINE 帳號加入 Bot
2. 發送任意訊息（例如：「你好」）
3. 等待 2-3 秒

**預期結果**：
- 收到歡迎訊息
- 自動收到「👋 歡迎回來！為您準備了完整功能說明...」
- 收到功能說明第一部分的 Flex Message

**驗證點**：
- [ ] 訊息順序正確
- [ ] Flex Message 顯示完整
- [ ] 按鈕可以點擊
- [ ] 資料庫中 `last_tutorial_shown_at` 已更新

---

### 測試 2：手動查看功能說明
**目的**：驗證用戶可以隨時手動查看功能說明

**步驟**：
1. 使用任意帳號
2. 輸入「功能說明」

**預期結果**：
- 立即收到功能說明第一部分
- 可以點擊「👉 查看第 2 部分」按鈕
- 點擊後收到第二部分

**驗證點**：
- [ ] 第一部分顯示正確
- [ ] 按鈕功能正常
- [ ] 第二部分顯示正確
- [ ] 所有按鈕都可點擊

**其他觸發詞測試**：
- [ ] 「使用說明」
- [ ] 「教學」
- [ ] 「說明」

---

### 測試 3：週期性顯示（7天）
**目的**：驗證超過 7 天未上線的用戶會再次收到功能說明

**步驟**：
1. 在 Supabase 中找到測試用戶
2. 執行 SQL 將時間設為 8 天前：
```sql
UPDATE users 
SET last_tutorial_shown_at = NOW() - INTERVAL '8 days'
WHERE line_user_id = 'YOUR_TEST_USER_ID';
```
3. 使用該帳號發送任意訊息

**預期結果**：
- 收到正常回覆
- 自動收到功能說明
- `last_tutorial_shown_at` 更新為當前時間

**驗證點**：
- [ ] 自動推送功能正常
- [ ] 時間更新正確
- [ ] 不影響正常對話流程

---

### 測試 4：不重複顯示（7天內）
**目的**：驗證 7 天內不會重複自動顯示

**步驟**：
1. 使用剛看過功能說明的帳號
2. 發送多條訊息
3. 等待並觀察

**預期結果**：
- 只收到正常回覆
- 不會自動推送功能說明
- 可以手動輸入「功能說明」查看

**驗證點**：
- [ ] 不會重複推送
- [ ] 手動查看仍然可用
- [ ] 正常功能不受影響

---

### 測試 5：內容完整性檢查
**目的**：驗證功能說明內容正確且完整

**檢查項目 - 第一部分**：
- [ ] 標題：「📖 完整功能說明 - 第 1 部分：基本操作」
- [ ] 創建貼圖流程 4 步驟
- [ ] 代幣說明區塊
- [ ] 「👉 查看第 2 部分」按鈕
- [ ] 「🚀 立即開始創建」按鈕

**檢查項目 - 第二部分**：
- [ ] 標題：「📖 完整功能說明 - 第 2 部分：進階功能」
- [ ] 管理貼圖功能說明
- [ ] 賺取代幣方法
- [ ] 重要注意事項（照片品質、生成時間、上傳 LINE）
- [ ] 小提示區塊
- [ ] 「🚀 開始創建貼圖」按鈕
- [ ] 「📁 我的貼圖」和「🎁 分享賺幣」按鈕

---

### 測試 6：錯誤處理
**目的**：驗證異常情況下的處理

**測試場景**：
1. 資料庫連線失敗時
2. 用戶資料不存在時
3. 更新時間失敗時

**預期結果**：
- 不會導致主流程失敗
- 錯誤時預設顯示功能說明（對新用戶友好）
- 有適當的錯誤日誌

**驗證點**：
- [ ] 主流程不受影響
- [ ] 錯誤有記錄
- [ ] 用戶體驗不受影響

---

### 測試 7：歡迎訊息更新
**目的**：驗證歡迎訊息中的新按鈕

**步驟**：
1. 輸入無法識別的指令（觸發預設歡迎訊息）
2. 檢查按鈕佈局

**預期結果**：
- 有「📖 功能說明」按鈕
- 有「📁 我的貼圖」按鈕
- 有「🎁 分享給好友賺代幣」按鈕
- 所有按鈕都可點擊

**驗證點**：
- [ ] 按鈕顯示正確
- [ ] 點擊功能說明按鈕有效
- [ ] 其他按鈕功能正常

---

## 性能測試

### 測試 8：非阻塞性能
**目的**：驗證自動檢查不會影響響應速度

**步驟**：
1. 發送訊息並計時
2. 記錄收到回覆的時間
3. 比較有無自動檢查的差異

**預期結果**：
- 回覆時間 < 2 秒
- 自動檢查在背景執行
- 不阻塞主流程

**驗證點**：
- [ ] 響應速度正常
- [ ] 日誌顯示非同步執行
- [ ] 無超時錯誤

---

## 資料庫驗證

### 檢查資料完整性
```sql
-- 查看所有用戶的教學顯示時間
SELECT 
  line_user_id,
  display_name,
  last_tutorial_shown_at,
  created_at,
  CASE 
    WHEN last_tutorial_shown_at IS NULL THEN '從未顯示'
    WHEN NOW() - last_tutorial_shown_at > INTERVAL '7 days' THEN '可再次顯示'
    ELSE '7天內已顯示'
  END as status
FROM users
ORDER BY created_at DESC
LIMIT 20;
```

### 統計數據
```sql
-- 統計教學顯示情況
SELECT 
  COUNT(*) as total_users,
  COUNT(last_tutorial_shown_at) as shown_count,
  COUNT(*) - COUNT(last_tutorial_shown_at) as never_shown,
  COUNT(CASE WHEN NOW() - last_tutorial_shown_at > INTERVAL '7 days' THEN 1 END) as can_show_again
FROM users;
```

---

## 問題排查

### 如果功能說明沒有自動顯示

1. **檢查資料庫欄位**：
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'last_tutorial_shown_at';
```

2. **檢查日誌**：
- Netlify Functions 日誌
- 搜尋「自動發送功能說明」
- 搜尋錯誤訊息

3. **檢查程式碼**：
- `shouldShowTutorial()` 函數邏輯
- `checkAndSendTutorial()` 是否被調用
- 錯誤處理是否正確

### 如果手動查看失敗

1. **檢查指令處理**：
```javascript
// 在 line-webhook.js 中確認
if (text === '功能說明' || text === '使用說明' || text === '教學' || text === '說明')
```

2. **檢查 Flex Message**：
- 使用 LINE Flex Message Simulator 驗證
- 檢查 JSON 格式是否正確

---

## 測試完成檢查清單

- [ ] 所有 8 個測試案例通過
- [ ] 資料庫欄位正確創建
- [ ] 日誌無錯誤訊息
- [ ] 用戶體驗流暢
- [ ] 性能無明顯影響
- [ ] 文檔已更新

---

## 回滾計畫

如果發現嚴重問題需要回滾：

1. **移除自動檢查**：
```javascript
// 在 handleTextMessage 中註解掉
// checkAndSendTutorial(userId).catch(err => 
//   console.error('檢查功能說明失敗:', err)
// );
```

2. **保留手動功能**：
- 手動查看功能說明仍然可用
- 不影響現有用戶

3. **資料庫欄位**：
- 可以保留 `last_tutorial_shown_at` 欄位
- 不會影響其他功能

