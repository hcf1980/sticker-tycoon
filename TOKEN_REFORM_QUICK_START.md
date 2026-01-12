# ⚡ 代幣制度改革 - 快速開始指南

## 🎯 改革概述

**目標**：將「代幣」改為「張數」，使計價更直觀

**改革內容**：
- 舊：基礎包 70 代幣 / NT$ 300
- 新：基礎包 140 張 / NT$ 300
- 舊：生成 6 張 = 3 代幣
- 新：生成 6 張 = 6 張數

---

## 🚀 快速執行（5 步驟）

### Step 1: 資料庫遷移（5 分鐘）

```bash
# 1. 登入 Supabase Dashboard
# 2. 前往 SQL Editor
# 3. 執行 migrations/token_reform_2025.sql
# 4. 確認執行成功（無錯誤）
```

**驗證**：
```sql
SELECT column_name, col_description(to_regclass('users'), ordinal_position)
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'sticker_credits';
-- 應顯示：「可用張數（每張對應一張貼圖生成額度）」
```

---

### Step 2: 修改核心邏輯（2 小時）

#### 檔案 1: `functions/sticker-generator-worker-background.js`

找到第 25 行和第 185 行：
```javascript
// ❌ 舊代碼
const apiCalls = Math.ceil(stickerCount / 6);
const tokenCost = apiCalls * 3;

// ✅ 新代碼
const tokenCost = stickerCount;  // 直接等於張數
```

#### 檔案 2: `functions/pack-for-line.js`

找到第 14 行：
```javascript
// ❌ 舊代碼
const DOWNLOAD_COST = 40;

// ✅ 新代碼
const DOWNLOAD_COST = 60;
```

#### 檔案 3: `functions/grid-generator.js`

找到第 55 行：
```javascript
// ❌ 舊代碼
tokensPerBatch: 3,
packages: {
  basic: { stickers: 6, tokens: 3, apiCalls: 1 },
  standard: { stickers: 12, tokens: 6, apiCalls: 2 },
  premium: { stickers: 18, tokens: 9, apiCalls: 3 }
}

// ✅ 新代碼
tokensPerBatch: 6,
packages: {
  basic: { stickers: 6, tokens: 6, apiCalls: 1 },
  standard: { stickers: 12, tokens: 12, apiCalls: 2 },
  premium: { stickers: 18, tokens: 18, apiCalls: 3 }
}
```

---

### Step 3: 更新使用者介面（1 小時）

#### `public/token-guide.html` - 全局替換

**查找並替換**：
1. `70 代幣` → `140 張`
2. `130 代幣` → `260 張`
3. `3 代幣` → `6 張`
4. `40 代幣` → `60 張`（下載服務）
5. `💰` → `🎫`

#### 關鍵區塊修改

第 59-62 行：
```html
<!-- ❌ 舊 -->
<div class="text-5xl font-extrabold title-gradient mb-2">40 代幣</div>

<!-- ✅ 新 -->
<div class="text-5xl font-extrabold title-gradient mb-2">40 張</div>
```

第 126 行：
```html
<!-- ❌ 舊 -->
<div class="text-5xl font-extrabold title-gradient leading-none">70</div>

<!-- ✅ 新 -->
<div class="text-5xl font-extrabold title-gradient leading-none">140</div>
```

---

### Step 4: 更新 LINE Bot 訊息（30 分鐘）

#### `functions/services/command-service.js`

第 49 行：
```javascript
// ❌ 舊代碼
let text = `💰 您的代幣餘額：${balance} 代幣\n\n`;

// ✅ 新代碼
let text = `🎫 您的剩餘張數：${balance} 張\n\n`;
```

第 61-62 行：
```javascript
// ❌ 舊代碼
text += '\n\n💡 輸入「購買代幣」查看儲值方案';

// ✅ 新代碼
text += '\n\n💡 輸入「購買張數」查看儲值方案';
```

---

### Step 5: 測試與部署（1 小時）

#### 本地測試
```bash
# 1. 啟動本地開發環境
npm run dev

# 2. 測試關鍵功能
# - 生成 6 張貼圖（應扣除 6 張）
# - 下載服務（應扣除 60 張）
# - 查詢餘額（應顯示「張數」）
```

#### 部署到 Netlify
```bash
git add .
git commit -m "feat: 代幣制度改革 - 改為張數計價"
git push origin main
```

#### 驗證生產環境
1. 前往 Netlify Dashboard 確認部署成功
2. 測試 LINE Bot（建議用測試帳號）
3. 監控錯誤日誌

---

## ✅ 檢查清單

### 資料庫
- [ ] 執行 `token_reform_2025.sql`
- [ ] 驗證註解已更新

### 核心邏輯
- [ ] `sticker-generator-worker-background.js` 修改完成
- [ ] `pack-for-line.js` 修改完成
- [ ] `grid-generator.js` 修改完成

### 使用者介面
- [ ] `token-guide.html` 修改完成
- [ ] `token-guide-mobile.html` 修改完成
- [ ] `queue.html` 修改完成

### LINE Bot
- [ ] `command-service.js` 修改完成
- [ ] 訊息文案全部更新

### 測試
- [ ] 本地測試通過
- [ ] 生成功能正常（扣除正確張數）
- [ ] 下載功能正常（扣除 60 張）
- [ ] 餘額查詢顯示正確

### 部署
- [ ] 推送到 GitHub
- [ ] Netlify 自動部署
- [ ] 生產環境驗證

---

## 🆘 常見問題

### Q1: 現有用戶的代幣會消失嗎？
**A**: 不會！40 代幣直接變成 40 張，數值不變。

### Q2: 需要停機維護嗎？
**A**: 不需要！可以熱更新。

### Q3: 如果出錯怎麼辦？
**A**: 
1. 回滾 Git 提交
2. Netlify 重新部署舊版本
3. 用戶數據不受影響（因為僅改文案和邏輯）

---

## 📞 需要幫助？

參考完整文檔：
- 📖 `TOKEN_REFORM_EXECUTIVE_SUMMARY.md` - 執行摘要
- 📋 `TOKEN_REFORM_FILE_LIST.md` - 完整檔案清單
- ✅ `TOKEN_REFORM_TEST_CHECKLIST.md` - 測試清單

