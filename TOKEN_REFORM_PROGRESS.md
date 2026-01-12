# ✅ 代幣制度改革 - 進度追蹤

## 📊 整體進度：80% 完成

---

## ✅ 已完成的修改

### Phase 1: 資料庫遷移 ✅
- [x] `migrations/token_reform_2025.sql` - 已修正 referrals 表欄位
- [x] `scripts/migrate-token-to-stickers.sh` - 已修正

### Phase 2: 核心邏輯 ✅
- [x] `functions/sticker-generator-worker-background.js` - 張數計算改為 1:1
  - 第 21-27 行：tokenCost = stickerCount
  - 第 177-184 行：tokenCost = actualCount
  - 第 312-325 行：錯誤訊息更新
  
- [x] `functions/pack-for-line.js` - 下載費用改為 60 張
  - 第 14 行：DOWNLOAD_COST = 60
  - 第 105-128 行：錯誤訊息更新
  
- [x] `functions/grid-generator.js` - 配置更新
  - 第 54-62 行：tokensPerBatch = 6, packages 更新
  
- [x] `functions/supabase-client.js` - 註解更新
  - 第 137-138 行：初始張數註解
  - 第 145-170 行：新用戶張數帳本註解
  - 第 743-745 行：「記錄張數交易」函數註解
  - 第 768-772 行：錯誤訊息更新
  - 第 858 行：「批次更新張數帳本」註解
  - 第 890-898 行：扣除張數錯誤訊息
  - 第 960-968 行：增加張數錯誤訊息
  - 第 971-973 行：「取得用戶張數交易記錄」函數註解
  - 第 984-988 行：錯誤訊息更新
  - 第 1184-1188 行：模組註解更新

- [x] `functions/get-tokens.js` - API 端點更新
  - 第 1-3 行：檔案註解改為「查詢用戶張數餘額」
  - 第 42 行：錯誤訊息改為「查詢張數失敗」

- [x] `functions/admin-token.js` - 管理員 API 更新
  - 第 1-4 行：檔案註解改為「張數管理 API」
  - 第 82-83 行：變數名稱 `totalSheets`
  - 第 102-115 行：統計數據使用 `totalSheets`
  - 第 166-188 行：增加/扣除張數註解
  - 第 211-257 行：FIFO 扣除函數註解和錯誤訊息

- [x] `functions/line-webhook.js` - LINE Webhook 主處理器 ✨ 新增
  - 第 215-228 行：購買張數和張數說明關鍵字
  - 第 625-632 行：張數不足提示訊息
  - 第 842-844 行：快速回覆按鈕
  - 第 1440-1442 行：購買張數按鈕
  - 第 1541-1543 行：快速回覆按鈕
  - 第 1566-1568 行：快速回覆按鈕
  - 第 1591-1593 行：快速回覆按鈕
  - 第 1884-1886 行：快速回覆按鈕
  - 第 2947-2951 行：購買張數按鈕
  - 第 3175-3177 行：購買張數按鈕
  - 第 3376-3378 行：購買張數按鈕
  - 第 3508-3511 行：快速回覆按鈕

### Phase 3: 使用者介面（進行中）
- [x] `public/token-guide.html` - 部分完成
  - [x] 標題改為「張數購買說明」
  - [x] Hero 區塊更新
  - [x] 新用戶贈送：40 張
  - [x] 消耗說明：6張=6張, 12張=12張, 40張=40張
  - [x] 下載服務：60 張
  - [x] 代上架服務：20 張
  - [x] 基礎包：140 張 / NT$ 300
  - [x] 超值包：260 張 / NT$ 500
  - [x] 購買流程文案更新（部分）

---

## 🔄 待完成的修改

### Phase 3: 使用者介面（剩餘）
- [ ] `public/token-guide.html` - 剩餘部分
  - [ ] 第 210-301 行：其他文案更新
  
- [ ] `public/token-guide-mobile.html` - 手機版
  - [ ] 全部文案更新（與 token-guide.html 類似）
  
- [ ] `public/queue.html` - 佇列管理頁
  - [ ] 第 197 行：DOWNLOAD_COST = 60
  - [ ] 第 390 行：下載提示訊息
  
- [ ] `public/index.html` - 首頁
  - [ ] 代幣機制說明區塊

### Phase 4: LINE Bot 訊息
- [ ] `functions/services/command-service.js`
  - [ ] 第 49 行：「代幣餘額」→「剩餘張數」
  - [ ] 第 61-62 行：「購買代幣」→「購買張數」
  
- [ ] `functions/handlers/create-handler.js`
  - [ ] 生成確認訊息
  - [ ] 張數不足提示

### Phase 5: 文檔更新
- [ ] `README.md`
  - [ ] 第 224-238 行：代幣機制章節
  
- [ ] `docs/TOKEN_SYSTEM_STATUS.md`
  - [ ] 全文「代幣」→「張數」
  
- [ ] `docs/api/LINE_PAY_INTEGRATION_GUIDE.md`
  - [ ] 方案配置表格

---

## 📝 下一步行動

1. **立即執行**：完成 `public/token-guide.html` 剩餘部分
2. **接著執行**：修改 `public/queue.html`
3. **然後執行**：修改 LINE Bot 訊息檔案
4. **最後執行**：更新文檔檔案

---

## 🎯 預估剩餘時間

- 使用者介面：30 分鐘
- LINE Bot 訊息：20 分鐘
- 文檔更新：10 分鐘
- **總計：約 1 小時**

---

## 📞 需要協助？

如果遇到問題，請參考：
- `TOKEN_REFORM_QUICK_START.md` - 快速開始指南
- `TOKEN_REFORM_FILE_LIST.md` - 完整檔案清單

