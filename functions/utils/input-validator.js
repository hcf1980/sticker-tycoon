/**
 * 輸入驗證工具模塊 v1.0
 * 提供統一的數據驗證和清理功能
 *
 * 使用 Zod 進行型別安全的驗證
 */

const { z } = require('zod');

/**
 * 驗證規則定義
 * 統一管理所有驗證規則
 */
const validationSchemas = {
  // LINE 用戶相關
  lineUserId: z.string()
    .regex(/^U[a-f0-9]{32}$/, '無效的 LINE 用戶 ID 格式')
    .describe('LINE 用戶 ID (32 位十六進制)'),

  // 推薦碼相關
  referralCode: z.string()
    .transform(val => val.toUpperCase())
    .refine(val => /^[A-Z0-9]+$/.test(val), {
      message: '推薦碼只能包含大寫英文和數字'
    })
    .refine(val => val.length === 6, {
      message: '推薦碼必須是 6 位'
    })
    .describe('推薦碼 (6 位大寫英數字)'),

  // 貼圖風格
  styleId: z.enum([
    'realistic',  // 美顏真實
    'cute',       // 可愛風
    'cool',       // 酷炫風
    'funny',      // 搞笑風
    'simple',     // 簡約風
    'anime',      // 動漫風
    'pixel',      // 像素風
    'sketch'      // 素描風
  ]).describe('貼圖風格'),

  // 貼圖數量
  stickerCount: z.number()
    .int('貼圖數量必須是整數')
    .min(6, '最少 6 張')
    .max(40, '最多 40 張')
    .describe('貼圖數量 (6-40)'),

  // 構圖 ID
  framingId: z.string()
    .regex(/^[a-z_]+$/, '構圖 ID 格式無效')
    .describe('構圖 ID'),

  // 場景 ID
  sceneId: z.string()
    .regex(/^[a-z_]+$/, '場景 ID 格式無效')
    .describe('場景 ID'),

  // 通用用戶 ID
  userId: z.string()
    .min(1, '用戶 ID 不能為空')
    .max(256, '用戶 ID 過長')
    .describe('用戶 ID'),

  // UUID 相關
  setId: z.string()
    .uuid('無效的貼圖組 ID 格式')
    .describe('貼圖組 ID (UUID)'),

  taskId: z.string()
    .uuid('無效的任務 ID 格式')
    .describe('任務 ID (UUID)'),

  // Web API 認證
  authToken: z.string()
    .min(20, '認證令牌無效')
    .describe('認證令牌'),

  // 郵箱
  email: z.string()
    .email('無效的郵箱格式')
    .describe('郵箱地址'),

  // 密碼
  password: z.string()
    .min(8, '密碼長度至少 8 位')
    .describe('密碼'),

  // Base64 圖片
  base64Image: z.string()
    .refine(val => val.startsWith('data:image/'), {
      message: '必須是有效的 base64 圖片 (data:image/...)'
    })
    .describe('Base64 編碼的圖片'),

  // 表情列表
  expressions: z.array(z.string())
    .min(1, '至少需要一個表情')
    .max(40, '最多 40 個表情')
    .describe('表情列表'),

  // Flex Message
  flexMessage: z.object({
    type: z.literal('flex'),
    altText: z.string().max(100),
    contents: z.object({
      type: z.string(),
      body: z.any()
    })
  }).describe('LINE Flex Message'),

  // 推薦碼狀態
  referralStatus: z.enum(['pending', 'approved', 'rejected'])
    .describe('推薦碼審核狀態')
};

/**
 * 驗證單個輸入值
 *
 * @param {*} data - 要驗證的數據
 * @param {string} schemaName - 驗證規則名稱
 * @returns {{success: boolean, data?: any, error?: string}}
 *
 * @example
 * const result = validateInput('ABC123', 'referralCode');
 * if (result.success) {
 *   console.log(result.data); // 'ABC123'
 * } else {
 *   console.error(result.error);
 * }
 */
function validateInput(data, schemaName) {
  const schema = validationSchemas[schemaName];

  if (!schema) {
    return {
      success: false,
      error: `未知的驗證規則: ${schemaName}`
    };
  }

  try {
    const validated = schema.parse(data);
    return {
      success: true,
      data: validated
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return {
        success: false,
        error: issue?.message || '驗證失敗'
      };
    }
    throw error;
  }
}

/**
 * 批量驗證多個字段
 *
 * @param {object} data - 要驗證的數據對象
 * @param {object} schema - 驗證規則對象 (key -> schemaName)
 * @returns {{success: boolean, data?: object, errors?: object}}
 *
 * @example
 * const result = validateMultiple(
 *   { styleId: 'cute', count: 6 },
 *   { styleId: 'styleId', count: 'stickerCount' }
 * );
 * if (result.success) {
 *   console.log(result.data); // { styleId: 'cute', count: 6 }
 * } else {
 *   console.error(result.errors); // { count: '...' }
 * }
 */
function validateMultiple(data, schema) {
  const zodSchema = {};
  const schemaNames = {};

  // 構建 Zod schema
  for (const [key, schemaName] of Object.entries(schema)) {
    if (!validationSchemas[schemaName]) {
      return {
        success: false,
        errors: { [key]: `未知的驗證規則: ${schemaName}` }
      };
    }
    zodSchema[key] = validationSchemas[schemaName];
    schemaNames[key] = schemaName;
  }

  try {
    const validated = z.object(zodSchema).parse(data);
    return {
      success: true,
      data: validated
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.issues.forEach(issue => {
        const field = issue.path[0];
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      });
      return {
        success: false,
        errors
      };
    }
    throw error;
  }
}

/**
 * 清理字符串輸入（移除危險字符）
 *
 * @param {string} input - 輸入字符串
 * @returns {string} 清理後的字符串
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim();
}

/**
 * 清理對象輸入（移除危險字段）
 *
 * @param {object} obj - 輸入對象
 * @param {string[]} allowedKeys - 允許的鍵列表
 * @returns {object} 清理後的對象
 */
function sanitizeObject(obj, allowedKeys = []) {
  if (typeof obj !== 'object' || obj === null) {
    return {};
  }

  const sanitized = {};
  allowedKeys.forEach(key => {
    if (key in obj && obj[key] !== null && obj[key] !== undefined) {
      sanitized[key] = obj[key];
    }
  });

  return sanitized;
}

/**
 * 驗證和清理 LINE Webhook 事件
 *
 * @param {object} event - LINE Webhook 事件
 * @returns {{success: boolean, data?: object, error?: string}}
 */
function validateLineWebhookEvent(event) {
  try {
    // 驗證基本結構
    if (!event.replyToken || !event.source || !event.source.userId || !event.message) {
      return {
        success: false,
        error: '無效的 LINE Webhook 事件結構'
      };
    }

    // 驗證 userId
    const userIdResult = validateInput(event.source.userId, 'lineUserId');
    if (!userIdResult.success) {
      return {
        success: false,
        error: userIdResult.error
      };
    }

    return {
      success: true,
      data: {
        replyToken: event.replyToken,
        userId: userIdResult.data,
        message: event.message,
        timestamp: event.timestamp
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Webhook 驗證失敗: ${error.message}`
    };
  }
}

module.exports = {
  validationSchemas,
  validateInput,
  validateMultiple,
  sanitizeString,
  sanitizeObject,
  validateLineWebhookEvent
};
