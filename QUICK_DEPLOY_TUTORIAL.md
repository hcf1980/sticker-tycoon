# 🚀 功能說明系統 - 快速部署指南

## 5 分鐘快速部署

### 步驟 1：更新資料庫（2 分鐘）

1. 登入 [Supabase Dashboard](https://app.supabase.com)
2. 選擇你的專案
3. 點擊左側 **SQL Editor**
4. 點擊 **New Query**
5. 複製貼上以下 SQL：

```sql
-- 添加功能說明追蹤欄位
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_tutorial_shown_at TIMESTAMP WITH TIME ZONE;

-- 添加註解
COMMENT ON COLUMN users.last_tutorial_shown_at IS '最後一次顯示功能說明的時間';

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_users_last_tutorial_shown 
ON users(last_tutorial_shown_at);
```

6. 點擊 **Run** 執行
7. 確認顯示 "Success. No rows returned"

### 步驟 2：部署程式碼（1 分鐘）

```bash
# 確認所有檔案已儲存
git status

# 提交變更
git add .
git commit -m "feat: 添加完整功能說明系統 - 每週最多顯示一次"

# 推送到遠端
git push
```

### 步驟 3：等待部署（1 分鐘）

1. 前往 [Netlify Dashboard](https://app.netlify.com)
2. 查看部署狀態
3. 等待顯示 "Published"

### 步驟 4：快速測試（1 分鐘）

#### 測試 1：手動查看
```
在 LINE 中輸入：功能說明
預期：立即收到功能說明第一部分
```

#### 測試 2：查看第二部分
```
點擊「👉 查看第 2 部分」按鈕
預期：收到功能說明第二部分
```

#### 測試 3：檢查歡迎訊息
```
輸入任意無法識別的文字（例如：test）
預期：歡迎訊息中有「📖 功能說明」按鈕
```

### 步驟 5：驗證資料庫（可選）

在 Supabase SQL Editor 執行：

```sql
-- 檢查欄位是否存在
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'last_tutorial_shown_at';

-- 應該返回一行結果
```

---

## ✅ 部署完成檢查清單

- [ ] 資料庫欄位已添加
- [ ] 程式碼已推送
- [ ] Netlify 顯示 "Published"
- [ ] 手動查看功能正常
- [ ] 第二部分可以查看
- [ ] 歡迎訊息有新按鈕

---

## 🎉 恭喜！部署完成

現在你的 LINE Bot 已經有完整的功能說明系統了！

### 新功能：
✅ 新用戶自動收到功能說明
✅ 7 天未上線自動複習
✅ 隨時可手動查看
✅ 雙卡片詳細說明

### 下一步：
1. 觀察用戶反饋
2. 查看 Netlify Functions 日誌
3. 監控自動推送情況

---

## 📊 監控建議

### 查看日誌
```bash
# Netlify CLI
netlify functions:log line-webhook

# 或在 Netlify Dashboard
Functions > line-webhook > Logs
```

### 搜尋關鍵字
- `自動發送功能說明` - 自動推送記錄
- `處理功能說明` - 手動查看記錄
- `檢查功能說明失敗` - 錯誤記錄

### 資料庫查詢
```sql
-- 查看最近顯示記錄
SELECT 
  line_user_id,
  display_name,
  last_tutorial_shown_at,
  created_at
FROM users
WHERE last_tutorial_shown_at IS NOT NULL
ORDER BY last_tutorial_shown_at DESC
LIMIT 10;

-- 統計顯示情況
SELECT 
  COUNT(*) as total_users,
  COUNT(last_tutorial_shown_at) as shown_count,
  ROUND(COUNT(last_tutorial_shown_at)::numeric / COUNT(*)::numeric * 100, 2) as show_rate
FROM users;
```

---

## 🐛 常見問題

### Q1: 功能說明沒有自動顯示？
**A:** 檢查：
1. 資料庫欄位是否正確添加
2. Netlify 是否部署成功
3. 查看 Functions 日誌是否有錯誤

### Q2: 手動輸入「功能說明」沒反應？
**A:** 檢查：
1. 指令是否正確（不要有多餘空格）
2. Netlify Functions 是否正常運行
3. 查看錯誤日誌

### Q3: 第二部分無法查看？
**A:** 檢查：
1. 按鈕是否正確顯示
2. 點擊後是否發送「功能說明2」訊息
3. 查看 Functions 日誌

### Q4: 想要調整顯示頻率？
**A:** 修改 `functions/sticker-flex-message.js`：
```javascript
// 在 shouldShowTutorial() 函數中
const daysDiff = (now - lastShown) / (1000 * 60 * 60 * 24);
return daysDiff >= 7;  // 改為其他天數，例如 14
```

---

## 🔧 進階配置

### 關閉自動推送（保留手動功能）
在 `functions/line-webhook.js` 的 `handleTextMessage` 函數中：
```javascript
// 註解掉這幾行
// checkAndSendTutorial(userId).catch(err => 
//   console.error('檢查功能說明失敗:', err)
// );
```

### 修改說明內容
編輯 `functions/sticker-flex-message.js`：
- `generateTutorialPart1FlexMessage()` - 第一部分
- `generateTutorialPart2FlexMessage()` - 第二部分

### 添加更多觸發詞
在 `functions/line-webhook.js` 中：
```javascript
if (text === '功能說明' || text === '使用說明' || text === '教學' || text === '說明' || text === '幫助') {
  // 添加更多觸發詞
}
```

---

## 📚 完整文件

詳細資訊請參考：
- `TUTORIAL_FEATURE.md` - 功能完整說明
- `test-tutorial.md` - 完整測試指南
- `TUTORIAL_PREVIEW.md` - 視覺預覽
- `CHANGELOG_TUTORIAL.md` - 更新日誌

---

**部署愉快！** 🎊

有問題隨時查看文件或檢查日誌。

