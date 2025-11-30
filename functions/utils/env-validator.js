/**
 * 環境變數驗證工具
 * 使用 Zod 進行型別安全的環境變數驗證
 */

const { z } = require('zod');

/**
 * 環境變數 Schema
 */
const envSchema = z.object({
  // LINE Bot 設定
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1, 'LINE_CHANNEL_ACCESS_TOKEN 是必要的'),
  LINE_CHANNEL_SECRET: z.string().min(1, 'LINE_CHANNEL_SECRET 是必要的'),

  // Supabase 設定
  SUPABASE_URL: z.string().url('SUPABASE_URL 必須是有效的 URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY 是必要的'),

  // AI 圖片生成設定
  AI_IMAGE_API_URL: z.string().url('AI_IMAGE_API_URL 必須是有效的 URL'),
  AI_IMAGE_API_KEY: z.string().min(1, 'AI_IMAGE_API_KEY 是必要的'),
  AI_MODEL: z.string().default('gemini-2.0-flash-exp-image-generation'),

  // 可選：DeepSeek
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_API_URL: z.string().url().optional(),
});

/**
 * 驗證環境變數
 * @returns {Object} 驗證後的環境變數
 * @throws {Error} 驗證失敗時拋出錯誤
 */
function validateEnv() {
  try {
    const validated = envSchema.parse(process.env);
    console.log('✅ 環境變數驗證通過');
    return validated;
  } catch (error) {
    console.error('❌ 環境變數驗證失敗:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('環境變數設定不正確，請檢查 .env 檔案');
  }
}

/**
 * 取得驗證後的環境變數
 * 使用快取避免重複驗證
 */
let cachedEnv = null;

function getEnv() {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

module.exports = {
  validateEnv,
  getEnv,
  envSchema,
};

