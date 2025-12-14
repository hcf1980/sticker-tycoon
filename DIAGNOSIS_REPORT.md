# 🔍 Admin 風格設定同步問題診斷報告

## 📋 問題概述
Admin 管理頁面中修改風格/構圖/裝飾/表情模板後，對應的 LINE Bot 並未即時更新至新設定。

---

## ✅ 已確認的工作流程

### 1️⃣ **風格設定（Style）**
- ✅ Admin 後台保存到 `style_settings` 表
- ❌ **LINE 端讀取邏輯存在 3 個問題**

### 2️⃣ **構圖設定（Framing）**
- ✅ Admin 後台保存到 `framing_settings` 表
- ❌ **LINE 端硬編碼使用，不從 DB 讀取**

### 3️⃣ **裝飾風格（Scene）**
- ✅ Admin 後台保存到 `scene_settings` 表
- ❌ **LINE 端硬編碼使用，不從 DB 讀取**

### 4️⃣ **表情模板（Expression）**
- ✅ Admin 後台保存到 `expression_template_settings` 表
- ✅ LINE 端有動態讀取邏輯（但有快取問題）

---

## 🔴 核心問題

### 問題 1: 風格選擇初始化未從 DB 讀取
**文件**: `functions/handlers/create-handler.js` 第 59-65 行

用戶上傳照片後進入風格選擇，調用 `handlePhotoUpload()`:
```javascript
async function handlePhotoUpload(userId, photoResult) {
  const styles = await getActiveStyles();  // ✅ 讀取 DB
  return generateStyleSelectionFlexMessage(styles);  // ✅ 傳入 styles
}
```

✅ 這部分正確


### 問題 2: 構圖選擇完全硬編碼
**文件**: `functions/handlers/create-handler.js` 第 152-224 行

```javascript
function generateFramingSelectionMessage(style) {
  const framingOptions = Object.values(FramingTemplates);  // ❌ 硬編碼！
  // 直接使用 FramingTemplates 常數，不從 DB 讀取
}
```

❌ **沒有從 `framing_settings` 讀取**

### 問題 3: 裝飾風格選擇完全硬編碼
**文件**: `functions/handlers/create-handler.js` 第 371-462 行

```javascript
function generateSceneSelectionFlexMessage() {
  const scenes = Object.values(SceneTemplates);  // ❌ 硬編碼！
  // 直接使用 SceneTemplates 常數，不從 DB 讀取
}
```

❌ **沒有從 `scene_settings` 讀取**

### 問題 4: 表情模板有快取但未自動失效
**文件**: `functions/sticker-flex-message.js` 第 252-284 行

```javascript
async function generateExpressionSelectionFlexMessage(templates = null) {
  let templateList = templates;
  if (!templateList) {
    // 從資料庫載入，但快取 30 分鐘
    // 問題: Admin 修改後，快取不會立即更新
  }
}
```

⚠️ **快取 30 分鐘，Admin 修改後需要等待**

---

## 🛠️ 解決方案

需要修改 4 個文件，讓 LINE 端即時讀取 Admin 更新的設定。

