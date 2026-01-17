/**
 * 輸入驗證工具
 * 使用 Zod 進行用戶輸入驗證
 */

const { z } = require('zod');

/**
 * 用戶輸入驗證 Schema
 */
const schemas = {
  // 貼圖組名稱
  stickerSetName: z.string()
    .min(1, '貼圖組名稱不能為空')
    .max(50, '貼圖組名稱不能超過 50 個字元')
    .trim(),

  // 角色描述
  characterDescription: z.string()
    .min(2, '角色描述至少需要 2 個字元')
    .max(500, '角色描述不能超過 500 個字元')
    .trim(),

  // 風格選擇
  styleId: z.enum(['cute', 'cool', 'funny', 'simple', 'anime', 'pixel', 'doodle', 'photo']),

  // 取景選擇
  framingId: z.enum(['fullbody', 'halfbody', 'portrait', 'closeup']),

  // 場景選擇
  sceneId: z.string().min(1),

  // 貼圖數量
  stickerCount: z.number()
    .int('數量必須是整數')
    .positive('數量必須大於 0')
    .refine(val => [8, 16, 24, 32, 40].includes(val), {
      message: '數量必須是 8, 16, 24, 32 或 40'
    }),

  // LINE User ID
  lineUserId: z.string()
    .min(1, 'LINE User ID 不能為空')
    .regex(/^U[0-9a-f]{32}$/, 'LINE User ID 格式不正確'),

  // 推薦碼
  referralCode: z.string()
    .length(6, '推薦碼必須是 6 位')
    .regex(/^[A-Z0-9]{6}$/, '推薦碼格式不正確'),

  // 轉帳後五碼
  transferCode: z.string()
    .length(5, '轉帳後五碼必須是 5 位')
    .regex(/^[0-9]{5}$/, '轉帳後五碼必須是數字'),

  // 張數數量
  tokenAmount: z.number()
    .int('張數數量必須是整數')
    .positive('張數數量必須大於 0')
    .max(10000, '張數數量不能超過 10000'),

  // 貼圖組 ID (UUID)
  setId: z.string()
    .uuid('貼圖組 ID 格式不正確'),

  // URL
  url: z.string()
    .url('URL 格式不正確'),

  // Email
  email: z.string()
    .email('Email 格式不正確'),
};

/**
 * 驗證輸入
 * @param {string} schemaName - Schema 名稱
 * @param {any} value - 要驗證的值
 * @returns {Object} { success: boolean, data?: any, error?: string }
 */
function validate(schemaName, value) {
  const schema = schemas[schemaName];
  
  if (!schema) {
    return {
      success: false,
      error: `未知的驗證 Schema: ${schemaName}`,
    };
  }

  try {
    const data = schema.parse(value);
    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }
    return {
      success: false,
      error: '驗證失敗',
    };
  }
}

/**
 * 安全驗證（拋出錯誤版本）
 * @param {string} schemaName - Schema 名稱
 * @param {any} value - 要驗證的值
 * @returns {any} 驗證後的值
 * @throws {Error} 驗證失敗時拋出錯誤
 */
function validateOrThrow(schemaName, value) {
  const result = validate(schemaName, value);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

/**
 * 批次驗證
 * @param {Object} values - { schemaName: value } 的對應
 * @returns {Object} { success: boolean, data?: Object, errors?: Object }
 */
function validateBatch(values) {
  const results = {};
  const errors = {};
  let allSuccess = true;

  for (const [schemaName, value] of Object.entries(values)) {
    const result = validate(schemaName, value);
    if (result.success) {
      results[schemaName] = result.data;
    } else {
      errors[schemaName] = result.error;
      allSuccess = false;
    }
  }

  if (allSuccess) {
    return { success: true, data: results };
  }
  return { success: false, errors };
}

module.exports = {
  validate,
  validateOrThrow,
  validateBatch,
  schemas,
};

