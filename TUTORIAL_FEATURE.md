# 📖 功能說明系統

## 功能概述

為新用戶和久未上線的用戶提供完整的功能說明，幫助他們快速了解貼圖大亨的所有功能和操作流程。

## 主要特點

### 1. 雙卡片設計
- **第一部分**：基本操作流程
  - 創建貼圖的 4 步驟詳細說明
  - 代幣系統說明（新用戶 40 代幣、消耗規則）
  - 視覺化步驟指引

- **第二部分**：進階功能與注意事項
  - 貼圖管理功能（我的貼圖、查詢進度、代幣查詢）
  - 賺取代幣方法（推薦好友、YouTuber 計畫）
  - 重要注意事項（照片品質、生成時間、上傳 LINE）
  - 實用小提示

### 2. 智能顯示邏輯
- **每週最多顯示一次**：避免打擾用戶
- **自動觸發條件**：
  - 新用戶首次使用
  - 用戶超過 7 天未上線
- **手動觸發**：用戶可隨時輸入「功能說明」查看

### 3. 資料庫追蹤
- 使用 `users.last_tutorial_shown_at` 欄位記錄顯示時間
- 自動計算距離上次顯示的天數
- 錯誤時預設顯示（確保新用戶能看到）

## 使用方式

### 用戶端
```
輸入以下任一指令查看功能說明：
- 功能說明
- 使用說明
- 教學
- 說明
```

### 自動顯示
系統會在以下情況自動推送功能說明：
1. 用戶首次使用（從未顯示過）
2. 用戶超過 7 天未上線

## 技術實現

### 文件結構
```
functions/
├── sticker-flex-message.js
│   ├── generateTutorialPart1FlexMessage()  # 第一部分
│   ├── generateTutorialPart2FlexMessage()  # 第二部分
│   ├── shouldShowTutorial(userId)          # 檢查是否應顯示
│   └── markTutorialShown(userId)           # 記錄已顯示
└── line-webhook.js
    ├── handleTutorial()                    # 處理手動請求
    └── checkAndSendTutorial()              # 自動檢查並發送
```

### 資料庫 Schema
```sql
ALTER TABLE users 
ADD COLUMN last_tutorial_shown_at TIMESTAMP WITH TIME ZONE;
```

### 核心邏輯
```javascript
// 檢查是否應該顯示
async function shouldShowTutorial(userId) {
  // 1. 查詢最後顯示時間
  // 2. 如果從未顯示，返回 true
  // 3. 計算距離上次顯示的天數
  // 4. 超過 7 天返回 true
}

// 記錄已顯示
async function markTutorialShown(userId) {
  // 更新 last_tutorial_shown_at 為當前時間
}
```

## 部署步驟

### 1. 更新資料庫
在 Supabase SQL Editor 執行：
```bash
migrations/add_tutorial_tracking.sql
```

### 2. 部署程式碼
```bash
# 確保所有檔案已更新
git add .
git commit -m "feat: 添加功能說明系統"
git push

# Netlify 會自動部署
```

### 3. 測試
```
1. 新用戶測試：
   - 加入 LINE Bot
   - 發送任意訊息
   - 應該收到功能說明

2. 週期測試：
   - 在資料庫中將 last_tutorial_shown_at 設為 8 天前
   - 發送訊息
   - 應該收到功能說明

3. 手動測試：
   - 輸入「功能說明」
   - 應該立即收到第一部分
   - 點擊按鈕查看第二部分
```

## 內容維護

### 更新說明內容
編輯 `functions/sticker-flex-message.js` 中的：
- `generateTutorialPart1FlexMessage()`
- `generateTutorialPart2FlexMessage()`

### 調整顯示頻率
修改 `shouldShowTutorial()` 中的天數判斷：
```javascript
const daysDiff = (now - lastShown) / (1000 * 60 * 60 * 24);
return daysDiff >= 7;  // 改為其他天數
```

## 注意事項

1. **非阻塞設計**：自動檢查不會影響主流程響應速度
2. **錯誤處理**：查詢失敗時預設顯示，確保新用戶體驗
3. **推送訊息**：使用 `pushMessage` 而非 `replyMessage`，避免 token 限制
4. **內容長度**：Flex Message 有大小限制，注意不要超過
5. **視覺設計**：使用不同顏色區分兩部分（紅色/綠色）

## 未來優化

- [ ] 添加閱讀追蹤（用戶是否點擊查看第二部分）
- [ ] A/B 測試不同的說明內容
- [ ] 根據用戶行為個性化推薦內容
- [ ] 添加互動式教學（引導用戶完成第一次創建）
- [ ] 多語言支持

