# Phase 1 Task 2 - 異步流程管理 實施指南

## 📋 概述

本文檔提供 `async-utils.js` 中 16 個異步工具函數的詳細說明與應用指南。這些工具提供統一的異步代碼管理方案，確保可靠性、性能和可維護性。

---

## 🎯 核心模塊詳解

### 🔴 高優先級 (立即應用)

#### 1. `withTimeout(promise, timeoutMs, operationName)`
**優先級**: 🔴 高  
**目的**: 為 Promise 添加超時保護

```javascript
// 應用場景：API 調用超時保護
const apiCall = async () => {
  const result = await withTimeout(
    geminiAPI.generateSticker(request),
    30000,
    'Gemini API'
  );
  return result;
};
```

**應用位置**:
- `functions/ai-generator.js` - Gemini API 調用
- `functions/sticker-generator-enhanced.js` - 圖像生成
- `functions/line-webhook.js` - 所有外部 API 調用

---

#### 2. `withRetry(fn, options)`
**優先級**: 🔴 高  
**目的**: 帶指數退避的重試邏輯

```javascript
// 應用場景：不穩定的外部服務
const result = await withRetry(
  () => supabaseClient.from('stickers').select('*'),
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    shouldRetry: (error) => error.code !== 'PERMISSION_DENIED'
  }
);
```

**應用位置**:
- `functions/supabase-client.js` - 數據庫查詢
- `functions/ai-generator.js` - Gemini API 呼叫
- 所有外部 API 集成

---

#### 3. `withTimeoutRetry(fn, options)`
**優先級**: 🔴 高  
**目的**: 結合超時和重試的完整保護方案

```javascript
// 應用場景：完整的 API 調用保護
const result = await withTimeoutRetry(
  () => lineAPI.pushMessage(userId, message),
  {
    timeoutMs: 15000,
    maxAttempts: 3,
    initialDelayMs: 500
  }
);
```

**應用位置**:
- `functions/line-webhook.js` - LINE API 調用
- `functions/admin-token.js` - TOKEN 刷新
- 所有關鍵路徑

---

#### 4. `parallelLimit(tasks, limit, options)`
**優先級**: 🔴 高  
**目的**: 有並發限制的並行執行

```javascript
// 應用場景：批量圖像處理
const imageProcessingTasks = stickerIds.map(id => 
  () => processImage(id)
);

const results = await parallelLimit(
  imageProcessingTasks,
  3, // 最多 3 個並行
  {
    onProgress: (completed, total) => {
      console.log(`Processing: ${completed}/${total}`);
    }
  }
);
```

**應用位置**:
- `functions/image-processor.js` - 圖像處理
- `functions/batch-add-to-queue.js` - 批量操作
- 資源密集型操作

---

### 🟡 中優先級 (後期應用)

#### 5. `asyncMap(items, fn, limit)`
**優先級**: 🟡 中  
**目的**: 異步版本的 Array.map()，支持並發限制

```javascript
// 應用場景：批量數據轉換
const stickerData = await asyncMap(
  stickerIds,
  async (id) => {
    const sticker = await getSticker(id);
    return transformForAPI(sticker);
  },
  5 // 最多 5 個並行
);
```

**應用位置**:
- `functions/pack-for-line.js` - 打包處理
- `functions/demo-gallery.js` - 數據轉換

---

#### 6. `asyncFilter(items, predicate, limit)`
**優先級**: 🟡 中  
**目的**: 異步版本的 Array.filter()

```javascript
// 應用場景：異步過濾
const validStickers = await asyncFilter(
  stickers,
  async (sticker) => {
    const isValid = await validateSticker(sticker);
    return isValid;
  },
  3
);
```

---

#### 7. `asyncReduce(items, reducer, initialValue)`
**優先級**: 🟡 中  
**目的**: 異步版本的 Array.reduce()

```javascript
// 應用場景：異步累積操作
const totalTokens = await asyncReduce(
  requests,
  async (sum, request) => {
    const cost = await estimateCost(request);
    return sum + cost;
  },
  0
);
```

---

#### 8. `batchAsync(items, fn, options)`
**優先級**: 🟡 中  
**目的**: 分批異步處理

```javascript
// 應用場景：批量生成，避免過度並發
const results = await batchAsync(
  userIds,
  async (userId) => generateSticker(userId),
  {
    batchSize: 5,
    delayMs: 1000 // 批次間延遲
  }
);
```

**應用位置**:
- `functions/grid-generator.js` - 批量網格生成
- `functions/process-task.js` - 任務處理

---

#### 9. `raceSuccess(promises, operationName)`
**優先級**: 🟡 中  
**目的**: 競速直到第一個成功

```javascript
// 應用場景：多個 API 備選方案
const result = await raceSuccess([
  geminiAPI.call(),
  fallbackAPI.call(),
  cachedResult()
], 'Image Generation');
```

---

### 🟢 低優先級 (優化型應用)

#### 10. `cacheAsync(fn, options)`
**優先級**: 🟢 低  
**目的**: 異步函數結果緩存

```javascript
// 應用場景：避免重複的昂貴操作
const getCachedStyle = cacheAsync(
  async (styleId) => {
    return await getStyleFromAPI(styleId);
  },
  {
    ttlMs: 300000, // 5 分鐘
    keyFn: (styleId) => `style_${styleId}`
  }
);

const style = await getCachedStyle('modern');
```

**應用位置**: `functions/get-style-settings.js` 的优化版本

---

#### 11. `debounceAsync(fn, delayMs)`
**優先級**: 🟢 低  
**目的**: 異步防抖

```javascript
// 應用場景：避免頻繁的 API 調用
const debouncedSearch = debounceAsync(
  async (query) => {
    return await searchStickers(query);
  },
  500
);
```

---

#### 12. `throttleAsync(fn, delayMs)`
**優先級**: 🟢 低  
**目的**: 異步節流

```javascript
// 應用場景：限制某個操作的頻率
const throttledUpload = throttleAsync(
  async (file) => {
    return await uploadToStorage(file);
  },
  1000
);
```

---

#### 13. `asyncFinally(fn, finallyFn)`
**優先級**: 🟢 低  
**目的**: 異步 finally 保障

```javascript
// 應用場景：確保清理操作執行
const result = await asyncFinally(
  async () => {
    return await processDatabaseTransaction();
  },
  async () => {
    await closeConnection();
  }
);
```

---

#### 14. `queueTasks(tasks, options)`
**優先級**: 🟢 低  
**目的**: 順序執行異步任務

```javascript
// 應用場景：依序處理需要順序執行的任務
const results = await queueTasks(
  [
    () => validateInput(),
    () => processData(),
    () => saveResults(),
    () => notifyUser()
  ],
  {
    onProgress: (current, total) => {
      console.log(`Step ${current}/${total}`);
    }
  }
);
```

---

#### 15. `sleep(ms)`
**優先級**: 🟢 低  
**目的**: 非阻塞延遲

```javascript
// 應用場景：重試之間的延遲
await sleep(1000); // 等待 1 秒
```

---

---

## 📊 應用優先級矩陣

| 函數 | 優先級 | 影響 | 推薦應用時機 |
|------|--------|------|------------|
| `withTimeout` | 🔴 高 | 防止無限掛起 | 第 1 周 |
| `withRetry` | 🔴 高 | 提升可靠性 | 第 1 周 |
| `withTimeoutRetry` | 🔴 高 | 完整保護 | 第 1 周 |
| `parallelLimit` | 🔴 高 | 控制資源 | 第 1 周 |
| `asyncMap` | 🟡 中 | 代碼簡化 | 第 2 周 |
| `asyncFilter` | 🟡 中 | 代碼簡化 | 第 2 周 |
| `asyncReduce` | 🟡 中 | 代碼簡化 | 第 2 周 |
| `batchAsync` | 🟡 中 | 性能優化 | 第 2 周 |
| `raceSuccess` | 🟡 中 | 容錯策略 | 第 3 周 |
| `cacheAsync` | 🟢 低 | 性能優化 | 第 3 周 |
| `debounceAsync` | 🟢 低 | 用戶體驗 | 第 3 周 |
| `throttleAsync` | 🟢 低 | 用戶體驗 | 第 3 周 |
| `asyncFinally` | 🟢 低 | 資源管理 | 第 4 周 |
| `queueTasks` | 🟢 低 | 流程控制 | 第 4 周 |
| `sleep` | 🟢 低 | 時序控制 | 按需 |

---

## 🚀 快速開始清單

### 第 1 步：導入模塊
```javascript
const asyncUtils = require('../utils/async-utils');
const { 
  withTimeout, 
  withRetry, 
  withTimeoutRetry,
  parallelLimit 
} = asyncUtils;
```

### 第 2 步：在關鍵路徑應用
```javascript
// API 調用保護
try {
  const result = await withTimeoutRetry(
    () => callExternalAPI(),
    { timeoutMs: 30000, maxAttempts: 3 }
  );
} catch (error) {
  console.error('API failed after retries:', error);
}
```

### 第 3 步：監控和日誌
```javascript
const result = await withRetry(
  () => operation(),
  {
    onRetry: (attempt, error, delay) => {
      console.log(
        `Retry ${attempt}: ${error.message}, waiting ${delay}ms`
      );
    }
  }
);
```

---

## ✅ 驗證清單

在應用這些工具時，確保：

- [ ] 所有 API 調用都使用 `withTimeout` 或 `withTimeoutRetry`
- [ ] 不穩定的操作使用 `withRetry`
- [ ] 批量操作使用 `parallelLimit` 控制並發
- [ ] 數據轉換使用相應的 `asyncMap`/`asyncFilter`
- [ ] 添加適當的日誌記錄（`onRetry`、`onProgress`）
- [ ] 測試失敗場景和超時邊界條件
- [ ] 驗證錯誤消息清晰有用

---

## 📝 下一步

1. ✅ 實施 Task 2 代碼 (async-utils.js)
2. ⏳ 應用高優先級函數到 API 層
3. ⏳ 進行 Task 3 - 代碼重用性改進
4. ⏳ Phase 2 - 增強測試與類型檢查

---

**最後更新**: 2024 年 1 月  
**狀態**: Phase 1 Task 2 - 異步流程管理 ✅ 已實施
