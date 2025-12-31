# 🚀 優化實施指南 - 第 1 階段

**開始日期**: 立即  
**目標期限**: 1-2 周  
**預計時間**: 40-60 小時

---

## 📌 第 1 階段概要

### 核心任務 (3 個)
1. ✅ 輸入驗證標準化
2. ✅ 改進異步流程管理
3. ✅ 代碼複用性提升

### 預期成果
- 安全性提升
- Bug 減少 ~20%
- 代碼維護性增加 30%

---

## Task 1: 輸入驗證標準化 (6-8 小時)

### 目標
為所有 API 端點和 LINE Webhook 創建統一的驗證層

### 步驟 1: 創建驗證工具模塊

```bash
# 創建文件
touch functions/utils/input-validator.js
touch functions/middleware/validation-middleware.js
```

### 步驟 2: 實現驗證層

```javascript
// functions/utils/input-validator.js
const { z } = require('zod');

/**
 * 驗證規則定義
 */
const validationSchemas = {
  // LINE 用戶相關
  lineUserId: z.string().regex(/^U[a-f0-9]{32}$/),
  
  // 推薦碼
  referralCode: z.string()
    .length(6)
    .regex(/^[A-Z0-9]+$/)
    .toUpperCase(),
  
  // 貼圖相關
  styleId: z.enum([
    'realistic', 'cute', 'cool', 'funny', 
    'simple', 'anime', 'pixel', 'sketch'
  ]),
  
  stickerCount: z.number()
    .int()
    .min(6)
    .max(40),
  
  framingId: z.string()
    .regex(/^[a-z_]+$/),
  
  // 通用
  userId: z.string().min(1).max(256),
  setId: z.string().uuid(),
  taskId: z.string().uuid(),
  
  // Web API 認證
  authToken: z.string().min(20),
  
  // 圖片相關
  base64Image: z.string()
    .refine(val => val.startsWith('data:image/'), {
      message: '必須是有效的 base64 圖片'
    }),
  
  // Flex Message
  flexMessage: z.object({
    type: z.literal('flex'),
    altText: z.string().max(100),
    contents: z.object({
      type: z.string(),
      body: z.any()
    })
  })
};

/**
 * 驗證輸入
 * @param {any} data - 要驗證的數據
 * @param {string} schemaName - 驗證規則名稱
 * @returns {object} { success: boolean, data?: any, error?: string }
 */
function validateInput(data, schemaName) {
  const schema = validationSchemas[schemaName];
  
  if (!schema) {
    return {
      success: false,
      error: `Unknown validation schema: ${schemaName}`
    };
  }
  
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Validation failed'
      };
    }
    throw error;
  }
}

/**
 * 批量驗證多個字段
 */
function validateMultiple(data, schema) {
  try {
    const validated = z.object(schema).parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.issues.forEach(issue => {
        errors[issue.path[0]] = issue.message;
      });
      return { success: false, errors };
    }
    throw error;
  }
}

module.exports = {
  validationSchemas,
  validateInput,
  validateMultiple
};
```

### 步驟 3: 創建中間件

```javascript
// functions/middleware/validation-middleware.js
const { validateInput } = require('../utils/input-validator');

/**
 * 驗證查詢參數
 */
function validateQuery(requiredFields) {
  return (handler) => async (event) => {
    const errors = {};
    
    for (const [field, schema] of Object.entries(requiredFields)) {
      const value = event.queryStringParameters?.[field];
      const result = validateInput(value, schema);
      
      if (!result.success) {
        errors[field] = result.error;
      }
    }
    
    if (Object.keys(errors).length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid query parameters',
          details: errors
        })
      };
    }
    
    return handler(event);
  };
}

/**
 * 驗證請求體
 */
function validateBody(schema) {
  return (handler) => async (event) => {
    try {
      const body = JSON.parse(event.body || '{}');
      const result = validateInput(body, schema);
      
      if (!result.success) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Invalid request body',
            details: result.error
          })
        };
      }
      
      event.validatedBody = result.data;
      return handler(event);
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Failed to parse request body'
        })
      };
    }
  };
}

module.exports = {
  validateQuery,
  validateBody
};
```

### 步驟 4: 更新現有 API 端點

**示例: web-api-auth-login.js**

```javascript
// ❌ 舊版本
exports.handler = async (event) => {
  const { email, password } = JSON.parse(event.body);
  // 直接使用，沒有驗證
  // ...
};

// ✅ 新版本
const { validateInput } = require('../utils/input-validator');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // 驗證郵箱
    const emailValidation = validateInput(body.email, 'email');
    if (!emailValidation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: '無效的郵箱格式',
          details: emailValidation.error
        })
      };
    }
    
    // 驗證密碼（最少 8 字符）
    if (!body.password || body.password.length < 8) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: '密碼長度至少 8 字符'
        })
      };
    }
    
    // 繼續處理...
    return await handleLogin(emailValidation.data, body.password);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '伺服器錯誤' })
    };
  }
};
```

### 步驟 5: 測試驗證層

```javascript
// functions/__tests__/input-validator.test.js
const { validateInput, validateMultiple } = require('../utils/input-validator');

describe('Input Validator', () => {
  test('should validate referral code correctly', () => {
    const result = validateInput('ABC123', 'referralCode');
    expect(result.success).toBe(true);
    expect(result.data).toBe('ABC123');
  });

  test('should reject invalid referral code', () => {
    const result = validateInput('abc123', 'referralCode');  // 小寫
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/pattern/i);
  });

  test('should validate sticker count', () => {
    const result = validateInput(6, 'stickerCount');
    expect(result.success).toBe(true);
  });

  test('should reject sticker count outside range', () => {
    const result = validateInput(50, 'stickerCount');  // > 40
    expect(result.success).toBe(false);
  });

  test('should validate multiple fields', () => {
    const result = validateMultiple(
      { styleId: 'cute', count: 6 },
      { styleId: 'styleId', count: 'stickerCount' }
    );
    expect(result.success).toBe(true);
  });
});
```

### 步驟 6: 文檔

添加到 README 或新的 API 文檔中：

```markdown
## 輸入驗證

所有 API 端點都使用統一的驗證層，確保數據安全性。

### 驗證規則

- `lineUserId`: LINE 用戶 ID (格式: U + 32 個十六進制字符)
- `referralCode`: 推薦碼 (6 位大寫英數字，例: ABC123)
- `styleId`: 風格 ID (realistic|cute|cool|funny|simple|anime|pixel|sketch)
- `stickerCount`: 貼圖數量 (6-40 之間)

### 錯誤回應

```json
{
  "error": "Invalid request body",
  "details": "推薦碼格式必須為 6 位大寫英數字"
}
```
```

---

## Task 2: 改進異步流程管理 (8-10 小時)

### 目標
統一所有異步操作為 async/await 風格，添加超時保護和錯誤處理

### 步驟 1: 創建異步工具模塊

```javascript
// functions/utils/async-utils.js

/**
 * 為 Promise 添加超時保護
 * @param {Promise} promise
 * @param {number} timeoutMs
 * @param {string} operation
 * @returns {Promise}
 */
async function withTimeout(promise, timeoutMs, operation = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${operation} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

/**
 * 重試機制
 * @param {Function} fn - 異步函數
 * @param {number} maxRetries - 最大重試次數
 * @param {number} delayMs - 重試延遲（毫秒）
 * @param {Function} onRetry - 重試回調
 */
async function withRetry(fn, maxRetries = 3, delayMs = 1000, onRetry = null) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = delayMs * attempt;  // 指數退避
        if (onRetry) {
          onRetry(attempt, error, delay);
        }
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * 並發執行，失敗時返回默認值
 * @param {Array<Promise>} promises
 * @param {*} defaultValue
 */
async function allWithDefaults(promises, defaultValue = null) {
  return Promise.all(
    promises.map(p => p.catch(() => defaultValue))
  );
}

/**
 * 序列執行異步操作
 * @param {Array<Function>} tasks - 返回 Promise 的函數數組
 */
async function sequential(tasks) {
  const results = [];
  
  for (const task of tasks) {
    results.push(await task());
  }
  
  return results;
}

/**
 * 並行執行，但限制並發數
 * @param {Array<Function>} tasks
 * @param {number} concurrency
 */
async function parallelLimit(tasks, concurrency = 5) {
  const results = [];
  const executing = [];
  
  for (const [index, task] of tasks.entries()) {
    const promise = Promise.resolve()
      .then(() => task())
      .then(result => {
        results[index] = result;
        executing.splice(executing.indexOf(promise), 1);
      });
    
    results[index] = promise;
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

module.exports = {
  withTimeout,
  withRetry,
  allWithDefaults,
  sequential,
  parallelLimit
};
```

### 步驟 2: 統一異步流程

**重構範例: supabase-client.js**

```javascript
// ❌ 舊版本：混合風格
async function getOrCreateUser(lineUserId) {
  const existing = await getSupabaseClient()
    .from('users')
    .select('*')
    .eq('line_user_id', lineUserId)
    .limit(1);
    
  if (existing.error) throw existing.error;
  
  if (existing.data && existing.data.length > 0) {
    return existing.data[0];
  }
  
  // 建立新用戶
  return getSupabaseClient()
    .from('users')
    .insert([{ line_user_id: lineUserId }])
    .select()
    .single()
    .then(res => {
      if (res.error) throw res.error;
      return res.data;
    });
}

// ✅ 新版本：統一 async/await
async function getOrCreateUser(lineUserId) {
  const { data: existing, error: existingError } = await getSupabaseClient()
    .from('users')
    .select('*')
    .eq('line_user_id', lineUserId)
    .limit(1);
  
  if (existingError) {
    console.error('Failed to query user:', existingError);
    throw new AppError('查詢用戶失敗', 'USER_QUERY_ERROR');
  }
  
  if (existing && existing.length > 0) {
    return existing[0];
  }
  
  // 建立新用戶
  const { data: newUser, error: createError } = await getSupabaseClient()
    .from('users')
    .insert([{ 
      line_user_id: lineUserId,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (createError) {
    console.error('Failed to create user:', createError);
    throw new AppError('建立用戶失敗', 'USER_CREATE_ERROR');
  }
  
  return newUser;
}
```

### 步驟 3: 添加超時保護

```javascript
// functions/sticker-generator-enhanced.js
const { withTimeout, withRetry } = require('./utils/async-utils');

async function generateStickersWithProtection(photoBase64, style, expressions, options = {}) {
  try {
    // 添加 60 秒超時保護
    const result = await withTimeout(
      generateStickersIntelligent(photoBase64, style, expressions, options),
      60000,
      'Sticker generation'
    );
    
    return result;
  } catch (error) {
    if (error.message.includes('timeout')) {
      console.error('⏱️ 貼圖生成超時');
      throw new AppError(
        '生成超時，請稍後重試',
        'GENERATION_TIMEOUT',
        408
      );
    }
    throw error;
  }
}
```

### 步驟 4: 並發優化

```javascript
// ❌ 順序執行（低效）
const style = await getStyleSettings(styleId);
const framing = await getFramingSettings(framingId);
const scene = await getSceneSettings(sceneId);
const expressions = await getExpressionTemplates();

// ✅ 並發執行（高效）
const [style, framing, scene, expressions] = await Promise.all([
  getStyleSettings(styleId),
  getFramingSettings(framingId),
  getSceneSettings(sceneId),
  getExpressionTemplates()
]);
```

### 步驟 5: 錯誤恢復

```javascript
// ✅ 使用重試機制
const { withRetry } = require('./utils/async-utils');

async function generateImageWithRetry(prompt) {
  return await withRetry(
    async () => {
      return await callAIAPI(prompt);
    },
    3,  // 最多 3 次嘗試
    1000,  // 初始延遲 1 秒
    (attempt, error, delay) => {
      console.log(`第 ${attempt} 次嘗試失敗，${delay}ms 後重試: ${error.message}`);
    }
  );
}
```

---

## Task 3: 代碼複用性提升 (8-10 小時)

### 目標
識別重複代碼，創建共享工具庫，統一實現

### 步驟 1: 審計現有代碼

```bash
# 搜索重複代碼模式
grep -r "truncateText" functions/ --include="*.js"
grep -r "function formatDate" functions/ --include="*.js"
grep -r "const REFERRAL_TOKENS = " functions/ --include="*.js"
```

### 步驟 2: 創建共享工具庫

```javascript
// functions/utils/string-utils.js
/**
 * 截斷文字
 */
function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * 首字母大寫
 */
function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/**
 * 轉換為 Title Case
 */
function toTitleCase(text) {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 移除特殊字符
 */
function sanitizeText(text) {
  return text.replace(/[^\w\s]/g, '').trim();
}

module.exports = {
  truncateText,
  capitalize,
  toTitleCase,
  sanitizeText
};
```

```javascript
// functions/utils/date-utils.js
/**
 * 格式化日期為 YYYY-MM-DD
 */
function formatDate(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * 獲取相對時間 (例: "2 小時前")
 */
function getRelativeTime(date) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  if (days < 7) return `${days} 天前`;
  
  return formatDate(date);
}

/**
 * 檢查是否同一天
 */
function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return formatDate(d1) === formatDate(d2);
}

module.exports = {
  formatDate,
  getRelativeTime,
  isSameDay
};
```

```javascript
// functions/utils/format-utils.js
/**
 * 格式化代幣數量
 */
function formatTokens(amount) {
  return new Intl.NumberFormat('zh-TW').format(amount);
}

/**
 * 格式化檔案大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 格式化百分比
 */
function formatPercent(value, decimals = 1) {
  return (value * 100).toFixed(decimals) + '%';
}

/**
 * 格式化 URL 參數
 */
function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

module.exports = {
  formatTokens,
  formatFileSize,
  formatPercent,
  buildQueryString
};
```

### 步驟 3: 創建常量文件

```javascript
// functions/utils/constants.js
/**
 * 系統常量定義
 */

// 代幣相關
const TOKEN_CONSTANTS = {
  INITIAL_BALANCE: 40,
  REFERRAL_REWARD_REFEREE: 10,
  REFERRAL_REWARD_REFERRER: 10,
  MAX_REFERRALS: 30,
  STICKER_COST: {
    6: 2,
    12: 3,
    16: 4,
    20: 5,
    24: 6,
    32: 8,
    40: 10
  }
};

// 業務限制
const BUSINESS_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10 MB
  MAX_PROMPT_LENGTH: 2000,
  MIN_STICKER_SIZE: 6,
  MAX_STICKER_SIZE: 40,
  CREATION_TIMEOUT: 60000,  // 60 秒
  CACHE_TTL: 30 * 60 * 1000  // 30 分鐘
};

// API 超時
const TIMEOUTS = {
  DEFAULT: 30000,
  AI_GENERATION: 60000,
  IMAGE_PROCESSING: 30000,
  DATABASE: 10000,
  EXTERNAL_API: 20000
};

// 風格定義
const STYLES = {
  REALISTIC: 'realistic',
  CUTE: 'cute',
  COOL: 'cool',
  FUNNY: 'funny',
  SIMPLE: 'simple',
  ANIME: 'anime',
  PIXEL: 'pixel',
  SKETCH: 'sketch'
};

// 狀態定義
const TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const STICKER_SET_STATUS = {
  DRAFT: 'draft',
  READY: 'ready',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

module.exports = {
  TOKEN_CONSTANTS,
  BUSINESS_LIMITS,
  TIMEOUTS,
  STYLES,
  TASK_STATUS,
  STICKER_SET_STATUS
};
```

### 步驟 4: 使用共享工具

```javascript
// ✅ 在其他模塊中導入和使用
const { truncateText, capitalize } = require('./utils/string-utils');
const { formatDate, getRelativeTime } = require('./utils/date-utils');
const { formatTokens } = require('./utils/format-utils');
const { TOKEN_CONSTANTS, STYLES } = require('./utils/constants');

// 使用示例
const name = capitalize(user.display_name);
const createdTime = getRelativeTime(user.created_at);
const formattedTokens = formatTokens(user.sticker_credits);
const reward = TOKEN_CONSTANTS.REFERRAL_REWARD_REFEREE;
```

### 步驟 5: 測試共享工具

```javascript
// functions/__tests__/utils/string-utils.test.js
const { truncateText, capitalize } = require('../../utils/string-utils');

describe('String Utils', () => {
  test('truncateText should add ellipsis', () => {
    const result = truncateText('Hello World', 8);
    expect(result).toBe('Hello...');
  });

  test('truncateText should not truncate short text', () => {
    const result = truncateText('Hi', 8);
    expect(result).toBe('Hi');
  });

  test('capitalize should capitalize first letter', () => {
    const result = capitalize('hello');
    expect(result).toBe('Hello');
  });
});
```

---

## 驗收標準

### Task 1: 輸入驗證
- [ ] 所有 API 端點都有驗證層
- [ ] Zod 規則定義完整
- [ ] 驗證測試覆蓋率 > 80%
- [ ] 錯誤消息清晰易懂

### Task 2: 異步流程
- [ ] 所有異步操作使用 async/await
- [ ] 關鍵操作有超時保護
- [ ] 數據庫查詢使用並發（Promise.all）
- [ ] 重試機制已實現

### Task 3: 代碼複用
- [ ] 共享工具庫已創建
- [ ] 常量文件已定義
- [ ] 代碼複製率 < 10%
- [ ] 文檔已補充

---

## 實施時間表

### 第 1 周
```
Day 1-2: Task 1 - 輸入驗證
Day 3-4: Task 2 - 異步流程
Day 5: Task 3 前一半 - 審計和設計
```

### 第 2 周
```
Day 1-2: Task 3 後一半 - 實現和測試
Day 3-4: 集成測試
Day 5: 部署和驗收
```

---

## 資源需要

- 開發人員: 1-2 人
- 測試人員: 1 人
- 時間: 40-60 小時
- 工具: ESLint, Jest, Zod

---

## 風險與緩解

| 風險 | 可能性 | 影響 | 緩解 |
|------|--------|------|------|
| 改變破壞現有功能 | 中 | 高 | 完整測試套件 |
| 性能回歸 | 低 | 中 | 基準測試 |
| 開發時間超期 | 中 | 低 | 按優先級實施 |

---

## 成功指標

完成後應該看到：
- ✅ 安全性提升（輸入驗證完整）
- ✅ 代碼質量提升（統一風格）
- ✅ 開發效率提高（可複用代碼）
- ✅ Bug 減少 ~20%

---

**下一步**: 獲批後立即開始 Task 1

