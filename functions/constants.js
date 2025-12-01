/**
 * 常數配置檔案
 * 集中管理所有 Magic Numbers 和配置值
 */

// ============================================
// 代幣系統設定
// ============================================
const TOKEN_CONFIG = {
  // 新用戶初始代幣
  INITIAL_TOKENS: 40,

  // 推薦獎勵
  REFERRAL_BONUS: {
    REFERRER: 10,   // 推薦人獲得
    REFEREE: 5      // 被推薦人獲得
  },

  // 貼圖生成費用（9宮格批次生成特價）
  GENERATION_COST: {
    // 9宮格模式：每次API調用生成9張，消耗3枚代幣
    PER_API_CALL: 3,       // 每次API調用（生成9張）
    PER_9_STICKERS: 3,     // 9張 = 1次API = 3代幣
    PER_18_STICKERS: 6,    // 18張 = 2次API = 6代幣
    PER_27_STICKERS: 9,    // 27張 = 3次API = 9代幣
    // 向後兼容舊設定（已棄用）
    PER_4_STICKERS: 10,
    PER_8_STICKERS: 20,
    PER_12_STICKERS: 30
  },

  // 代幣交易類型
  TRANSACTION_TYPES: {
    INITIAL: 'initial',
    REFERRAL_BONUS: 'referral_bonus',
    GENERATION: 'generation',
    REFUND: 'refund',
    PURCHASE: 'purchase',
    ADMIN_ADJUSTMENT: 'admin_adjustment'
  }
};

// ============================================
// 上傳佇列設定
// ============================================
const UPLOAD_QUEUE_CONFIG = {
  MAX_ITEMS: 40,
  MIN_FOR_SUBMISSION: 8
};

// ============================================
// API 重試設定
// ============================================
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
  BACKOFF_MULTIPLIER: 2
};

// ============================================
// 圖片處理設定
// ============================================
const IMAGE_CONFIG = {
  // LINE 貼圖規格
  STICKER: {
    MAX_WIDTH: 370,
    MAX_HEIGHT: 320,
    PADDING: 10
  },

  // 主圖規格
  MAIN: {
    WIDTH: 240,
    HEIGHT: 240
  },

  // 標籤圖規格
  TAB: {
    WIDTH: 96,
    HEIGHT: 74
  },

  // 檔案大小限制
  MAX_FILE_SIZE: 1024 * 1024,        // 1MB
  MAX_ZIP_SIZE: 60 * 1024 * 1024,    // 60MB

  // 有效貼圖數量
  VALID_COUNTS: [4, 8, 12],

  // 圖片增強設定
  ENHANCEMENT: {
    SATURATION: 1.25,
    BRIGHTNESS: 1.02,
    CONTRAST: 1.15
  }
};

// ============================================
// API 超時設定（毫秒）
// ============================================
const TIMEOUT_CONFIG = {
  LINE_API: 10000,
  AI_API: 60000,
  DEEPSEEK_API: 30000,
  SUPABASE: 15000
};

// ============================================
// 快取設定
// ============================================
const CACHE_CONFIG = {
  // 對話狀態快取時間（毫秒）
  CONVERSATION_STATE_TTL: 30 * 60 * 1000,  // 30 分鐘

  // Reply Token 去重時間（毫秒）
  REPLY_TOKEN_TTL: 5 * 60 * 1000           // 5 分鐘
};

// ============================================
// 訊息長度限制
// ============================================
const TEXT_LIMITS = {
  STICKER_SET_NAME: 40,
  STICKER_DESCRIPTION: 160,
  CREATOR_NAME: 50,
  COPYRIGHT: 50
};

// ============================================
// 生成任務狀態
// ============================================
const TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// ============================================
// 貼圖組狀態
// ============================================
const STICKER_SET_STATUS = {
  DRAFT: 'draft',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SUBMITTED: 'submitted'
};

module.exports = {
  TOKEN_CONFIG,
  UPLOAD_QUEUE_CONFIG,
  RETRY_CONFIG,
  IMAGE_CONFIG,
  TIMEOUT_CONFIG,
  CACHE_CONFIG,
  TEXT_LIMITS,
  TASK_STATUS,
  STICKER_SET_STATUS
};

