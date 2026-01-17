/**
 * 自訂錯誤類別
 * 提供結構化的錯誤處理
 */

/**
 * 基礎應用程式錯誤
 */
class AppError extends Error {
  constructor(message, code = 'APP_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // 維持正確的 stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * 張數不足錯誤
 */
class TokenInsufficientError extends AppError {
  constructor(required, available, userId = null) {
    super(
      `張數不足：需要 ${required}，目前只有 ${available}`,
      'TOKEN_INSUFFICIENT',
      400,
      { required, available, userId }
    );
    this.name = 'TokenInsufficientError';
  }
}

/**
 * AI 生成錯誤
 */
class AIGenerationError extends AppError {
  constructor(message, originalError = null) {
    super(
      message || 'AI 圖片生成失敗',
      'AI_GENERATION_ERROR',
      500,
      { originalError: originalError?.message }
    );
    this.name = 'AIGenerationError';
    this.originalError = originalError;
  }
}

/**
 * 儲存上傳錯誤
 */
class StorageUploadError extends AppError {
  constructor(message, fileName = null, originalError = null) {
    super(
      message || '檔案上傳失敗',
      'STORAGE_UPLOAD_ERROR',
      500,
      { fileName, originalError: originalError?.message }
    );
    this.name = 'StorageUploadError';
    this.originalError = originalError;
  }
}

/**
 * 資料庫錯誤
 */
class DatabaseError extends AppError {
  constructor(message, operation = null, originalError = null) {
    super(
      message || '資料庫操作失敗',
      'DATABASE_ERROR',
      500,
      { operation, originalError: originalError?.message }
    );
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * LINE API 錯誤
 */
class LineAPIError extends AppError {
  constructor(message, lineErrorCode = null, originalError = null) {
    super(
      message || 'LINE API 呼叫失敗',
      'LINE_API_ERROR',
      500,
      { lineErrorCode, originalError: originalError?.message }
    );
    this.name = 'LineAPIError';
    this.originalError = originalError;
  }
}

/**
 * 驗證錯誤
 */
class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(
      message || '輸入驗證失敗',
      'VALIDATION_ERROR',
      400,
      { field, value }
    );
    this.name = 'ValidationError';
  }
}

/**
 * 權限錯誤
 */
class PermissionError extends AppError {
  constructor(message, userId = null, resource = null) {
    super(
      message || '沒有權限執行此操作',
      'PERMISSION_ERROR',
      403,
      { userId, resource }
    );
    this.name = 'PermissionError';
  }
}

/**
 * 資源未找到錯誤
 */
class NotFoundError extends AppError {
  constructor(resourceType, resourceId = null) {
    super(
      `找不到${resourceType}${resourceId ? `: ${resourceId}` : ''}`,
      'NOT_FOUND',
      404,
      { resourceType, resourceId }
    );
    this.name = 'NotFoundError';
  }
}

/**
 * 速率限制錯誤
 */
class RateLimitError extends AppError {
  constructor(message, retryAfter = null) {
    super(
      message || '請求過於頻繁，請稍後再試',
      'RATE_LIMIT_ERROR',
      429,
      { retryAfter }
    );
    this.name = 'RateLimitError';
  }
}

module.exports = {
  AppError,
  TokenInsufficientError,
  AIGenerationError,
  StorageUploadError,
  DatabaseError,
  LineAPIError,
  ValidationError,
  PermissionError,
  NotFoundError,
  RateLimitError
};

