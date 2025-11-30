/**
 * 統一錯誤處理工具
 * 提供一致的錯誤處理和日誌記錄
 */

const {
  AppError,
  TokenInsufficientError,
  AIGenerationError,
  DatabaseError,
  LineAPIError
} = require('./errors');

/**
 * 生成唯一的請求 ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * 格式化錯誤訊息
 */
function formatError(error, requestId = null) {
  const baseInfo = {
    requestId,
    timestamp: new Date().toISOString(),
    name: error.name || 'Error',
    message: error.message
  };

  if (error instanceof AppError) {
    return {
      ...baseInfo,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details
    };
  }

  return {
    ...baseInfo,
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
}

/**
 * 記錄錯誤日誌
 * @param {Error} error - 錯誤物件
 * @param {string} context - 錯誤發生的上下文
 * @param {Object} metadata - 額外的元數據
 */
function logError(error, context = '', metadata = {}) {
  const requestId = metadata.requestId || generateRequestId();
  const formattedError = formatError(error, requestId);

  const logEntry = {
    level: 'error',
    context,
    ...formattedError,
    ...metadata,
    userId: metadata.userId || 'unknown'
  };

  // 根據錯誤類型決定日誌級別
  if (error instanceof TokenInsufficientError) {
    console.warn(`⚠️ [${requestId}] ${context}:`, logEntry);
  } else {
    console.error(`❌ [${requestId}] ${context}:`, logEntry);
  }

  return requestId;
}

/**
 * 安全執行函數（包裝 try-catch）
 * @param {Function} fn - 要執行的函數
 * @param {Object} options - 選項
 * @returns {Object} { success, data, error }
 */
async function safeExecute(fn, options = {}) {
  const {
    context = 'Unknown operation',
    defaultValue = null,
    userId = null,
    throwError = false
  } = options;

  try {
    const result = await fn();
    return { success: true, data: result, error: null };
  } catch (error) {
    const requestId = logError(error, context, { userId });

    if (throwError) {
      throw error;
    }

    return {
      success: false,
      data: defaultValue,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        requestId
      }
    };
  }
}

/**
 * 帶重試的安全執行
 * @param {Function} fn - 要執行的函數
 * @param {Object} options - 選項
 */
async function safeExecuteWithRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    context = 'Unknown operation',
    userId = null,
    retryableErrors = [AIGenerationError, DatabaseError]
  } = options;

  let lastError = null;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { success: true, data: result, error: null, attempts: attempt };
    } catch (error) {
      lastError = error;

      // 檢查是否為可重試的錯誤
      const isRetryable = retryableErrors.some(ErrorClass => error instanceof ErrorClass);

      if (!isRetryable || attempt === maxRetries) {
        break;
      }

      console.warn(`⏳ [${context}] 重試 ${attempt}/${maxRetries}，等待 ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= backoffMultiplier;
    }
  }

  const requestId = logError(lastError, context, { userId });
  return {
    success: false,
    data: null,
    error: {
      message: lastError.message,
      code: lastError.code || 'UNKNOWN_ERROR',
      requestId
    },
    attempts: options.maxRetries
  };
}

/**
 * 創建標準的錯誤回應
 */
function createErrorResponse(error, statusCode = 500) {
  return {
    statusCode,
    body: JSON.stringify({
      success: false,
      error: error instanceof AppError ? error.toJSON() : {
        code: 'INTERNAL_ERROR',
        message: '發生內部錯誤，請稍後再試'
      }
    })
  };
}

module.exports = {
  generateRequestId,
  formatError,
  logError,
  safeExecute,
  safeExecuteWithRetry,
  createErrorResponse
};

