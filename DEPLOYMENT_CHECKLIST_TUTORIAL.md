# ✅ 功能說明系統 - 部署檢查清單

## 📋 部署前檢查

### 程式碼檢查
- [ ] `functions/sticker-flex-message.js` 已更新
  - [ ] 新增 `generateTutorialPart1FlexMessage()`
  - [ ] 新增 `generateTutorialPart2FlexMessage()`
  - [ ] 新增 `shouldShowTutorial()`
  - [ ] 新增 `markTutorialShown()`
  - [ ] 更新 `generateWelcomeFlexMessage()`
  - [ ] 更新 `module.exports`

- [ ] `functions/line-webhook.js` 已更新
  - [ ] 導入新函數
  - [ ] 新增 `handleTutorial()`
  - [ ] 新增 `checkAndSendTutorial()`
  - [ ] 在 `handleTextMessage()` 中添加自動檢查
  - [ ] 添加「功能說明」指令處理
  - [ ] 添加「功能說明2」指令處理

- [ ] `supabase-schema.sql` 已更新
  - [ ] 添加 `last_tutorial_shown_at` 欄位

- [ ] 無語法錯誤
  - [ ] 檢查 IDE 錯誤提示

### 文件檢查
- [ ] 所有文件已創建
  - [ ] `migrations/add_tutorial_tracking.sql`
  - [ ] `TUTORIAL_FEATURE.md`
  - [ ] `test-tutorial.md`
  - [ ] `TUTORIAL_PREVIEW.md`
  - [ ] `CHANGELOG_TUTORIAL.md`
  - [ ] `QUICK_DEPLOY_TUTORIAL.md`
  - [ ] `SUMMARY_功能說明系統.md`
  - [ ] `README_TUTORIAL_SYSTEM.md`

---

## 🚀 部署步驟

### 步驟 1：資料庫更新
- [ ] 登入 Supabase Dashboard
- [ ] 開啟 SQL Editor
- [ ] 執行 `migrations/add_tutorial_tracking.sql`
- [ ] 確認執行成功
- [ ] 驗證欄位已創建

### 步驟 2：提交程式碼
- [ ] `git add .`
- [ ] `git commit -m "feat: 添加完整功能說明系統"`
- [ ] `git push`

### 步驟 3：等待部署
- [ ] 前往 Netlify Dashboard
- [ ] 等待顯示 "Published"
- [ ] 檢查 Functions 是否更新

### 步驟 4：基本測試
- [ ] 輸入「功能說明」測試
- [ ] 檢查歡迎訊息按鈕
- [ ] 驗證資料庫記錄

---

## 🧪 完整測試（參考 test-tutorial.md）

- [ ] 測試 1：新用戶自動顯示
- [ ] 測試 2：手動查看
- [ ] 測試 3：查看第二部分
- [ ] 測試 4：週期性顯示
- [ ] 測試 5：不重複顯示
- [ ] 測試 6：內容完整性
- [ ] 測試 7：性能測試
- [ ] 測試 8：錯誤處理

---

## 📊 監控檢查

### Netlify Functions 日誌
- [ ] 搜尋「自動發送功能說明」
- [ ] 搜尋「處理功能說明」
- [ ] 檢查無錯誤記錄

### 資料庫統計
- [ ] 執行統計查詢
- [ ] 檢查顯示率
- [ ] 驗證數據合理

---

## ✅ 最終確認

- [ ] 所有測試通過
- [ ] 無嚴重錯誤
- [ ] 文件已更新
- [ ] 監控已設置

**部署完成！** 🎉

