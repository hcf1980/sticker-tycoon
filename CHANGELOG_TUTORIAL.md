# 📖 功能說明系統 - 更新日誌

## 版本資訊
- **功能名稱**：完整功能說明系統
- **更新日期**：2024
- **版本**：v1.0.0

## 🎯 更新目標

為新用戶和久未上線的用戶提供完整的功能說明，幫助他們：
1. 快速了解貼圖大亨的所有功能
2. 掌握創建貼圖的完整流程
3. 了解代幣系統和賺取方法
4. 注意重要事項避免常見問題

## ✨ 新增功能

### 1. 雙卡片功能說明
- **第一部分**：基本操作（創建流程 + 代幣說明）
- **第二部分**：進階功能（管理 + 賺幣 + 注意事項）
- 視覺化設計，易於理解
- 互動式按鈕，引導用戶探索

### 2. 智能顯示邏輯
- **自動顯示**：新用戶或 7 天未上線自動推送
- **手動查看**：隨時輸入「功能說明」查看
- **頻率控制**：每週最多自動顯示一次
- **非阻塞設計**：不影響正常對話流程

### 3. 資料庫追蹤
- 新增 `last_tutorial_shown_at` 欄位
- 記錄每次顯示時間
- 支援智能判斷顯示時機

## 📝 檔案變更

### 新增檔案

1. **migrations/add_tutorial_tracking.sql**
   - 資料庫 migration 腳本
   - 添加教學追蹤欄位

2. **TUTORIAL_FEATURE.md**
   - 功能完整說明文件
   - 技術實現細節
   - 部署和維護指南

3. **test-tutorial.md**
   - 完整測試指南
   - 8 個測試案例
   - 問題排查方法

4. **TUTORIAL_PREVIEW.md**
   - 視覺化預覽
   - 設計說明
   - 用戶旅程

5. **CHANGELOG_TUTORIAL.md**
   - 本檔案
   - 更新日誌和部署指南

### 修改檔案

1. **functions/sticker-flex-message.js**
   - 新增 `generateTutorialPart1FlexMessage()`
   - 新增 `generateTutorialPart2FlexMessage()`
   - 新增 `shouldShowTutorial(userId)`
   - 新增 `markTutorialShown(userId)`
   - 更新 `generateWelcomeFlexMessage()` 添加功能說明按鈕
   - 導出新函數

2. **functions/line-webhook.js**
   - 導入教學相關函數
   - 新增 `handleTutorial()` 處理手動請求
   - 新增 `checkAndSendTutorial()` 自動檢查
   - 在 `handleTextMessage()` 中添加自動檢查邏輯
   - 添加「功能說明」、「功能說明2」指令處理

3. **supabase-schema.sql**
   - users 表添加 `last_tutorial_shown_at` 欄位
   - 添加欄位註解

## 🔧 技術細節

### 資料庫變更
```sql
ALTER TABLE users 
ADD COLUMN last_tutorial_shown_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_users_last_tutorial_shown 
ON users(last_tutorial_shown_at);
```

### 核心函數

#### shouldShowTutorial(userId)
```javascript
// 檢查是否應該顯示功能說明
// 返回 true：從未顯示 或 超過 7 天
// 返回 false：7 天內已顯示
```

#### markTutorialShown(userId)
```javascript
// 記錄教學已顯示
// 更新 last_tutorial_shown_at 為當前時間
```

#### checkAndSendTutorial(userId)
```javascript
// 自動檢查並發送（非阻塞）
// 使用 pushMessage 推送
```

### 觸發指令
- `功能說明`
- `使用說明`
- `教學`
- `說明`
- `功能說明2`（查看第二部分）

## 📦 部署步驟

### 1. 資料庫更新
```bash
# 在 Supabase SQL Editor 執行
migrations/add_tutorial_tracking.sql
```

### 2. 程式碼部署
```bash
git add .
git commit -m "feat: 添加完整功能說明系統"
git push
```

### 3. 驗證部署
- 檢查 Netlify 部署狀態
- 確認 Functions 已更新
- 查看部署日誌

### 4. 測試
參考 `test-tutorial.md` 執行完整測試

## 🎨 設計亮點

### 視覺設計
- **顏色主題**：
  - 第一部分：紅色 (#FF6B6B) - 代表開始
  - 第二部分：綠色 (#06C755) - 代表進階
- **資訊區塊**：
  - 橙色：代幣資訊
  - 淺綠：賺幣方法
  - 淺紅：注意事項

### 內容組織
- **第一部分**：4 步驟流程 + 代幣說明
- **第二部分**：管理功能 + 賺幣 + 注意事項
- **循序漸進**：從基礎到進階

### 互動體驗
- **引導式**：第一部分引導到第二部分
- **可跳過**：隨時可以開始創建
- **可重看**：手動輸入指令查看

## 📊 預期效果

### 用戶體驗
- ✅ 新用戶快速上手
- ✅ 老用戶複習功能
- ✅ 減少常見問題
- ✅ 提高使用率

### 系統指標
- 📈 新用戶留存率提升
- 📈 功能使用率提升
- 📉 客服諮詢減少
- 📉 操作錯誤減少

## ⚠️ 注意事項

### 開發注意
1. **非阻塞設計**：自動檢查不能影響主流程
2. **錯誤處理**：失敗時預設顯示（對新用戶友好）
3. **推送限制**：使用 pushMessage，注意 LINE 限制

### 維護注意
1. **內容更新**：功能變更時同步更新說明
2. **頻率調整**：根據反饋調整 7 天週期
3. **追蹤數據**：定期檢查顯示率和閱讀率

### 性能注意
1. **快取策略**：考慮快取 Flex Message JSON
2. **資料庫查詢**：已添加索引優化
3. **並發處理**：非同步執行不阻塞

## 🔄 回滾計畫

如需回滾：

### 1. 快速回滾（保留手動功能）
```javascript
// 在 handleTextMessage 中註解掉自動檢查
// checkAndSendTutorial(userId).catch(...);
```

### 2. 完全回滾
```bash
git revert <commit-hash>
git push
```

### 3. 資料庫回滾（可選）
```sql
-- 移除欄位（不建議，不影響其他功能）
ALTER TABLE users DROP COLUMN last_tutorial_shown_at;
```

## 📈 未來優化

### 短期（1-2週）
- [ ] 收集用戶反饋
- [ ] 追蹤閱讀率
- [ ] 優化內容表述

### 中期（1個月）
- [ ] A/B 測試不同版本
- [ ] 添加閱讀追蹤
- [ ] 個性化推薦

### 長期（3個月+）
- [ ] 互動式教學
- [ ] 多語言支援
- [ ] 視頻教學整合

## 🐛 已知問題

目前無已知問題。

## 📞 聯絡資訊

如有問題或建議，請：
1. 查看 `TUTORIAL_FEATURE.md` 了解詳細資訊
2. 參考 `test-tutorial.md` 進行測試
3. 檢查 Netlify Functions 日誌

## 📚 相關文件

- `TUTORIAL_FEATURE.md` - 功能完整說明
- `test-tutorial.md` - 測試指南
- `TUTORIAL_PREVIEW.md` - 視覺預覽
- `migrations/add_tutorial_tracking.sql` - 資料庫 migration

---

**更新完成！** 🎉

記得執行完整測試並監控上線後的表現。

