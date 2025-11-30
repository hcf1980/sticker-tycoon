/**
 * 錯誤類別測試
 */

const {
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
} = require('../errors');

describe('errors.js', () => {

  // ============================================
  // AppError 測試
  // ============================================
  describe('AppError', () => {
    test('應該正確設定所有屬性', () => {
      const error = new AppError('Test error', 'TEST_CODE', 400, { foo: 'bar' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ foo: 'bar' });
      expect(error.name).toBe('AppError');
      expect(error.timestamp).toBeDefined();
    });

    test('應該有預設值', () => {
      const error = new AppError('Test');

      expect(error.code).toBe('APP_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeNull();
    });

    test('toJSON 應該返回序列化的錯誤', () => {
      const error = new AppError('Test', 'CODE', 400);
      const json = error.toJSON();

      expect(json).toHaveProperty('name', 'AppError');
      expect(json).toHaveProperty('code', 'CODE');
      expect(json).toHaveProperty('message', 'Test');
      expect(json).toHaveProperty('statusCode', 400);
      expect(json).toHaveProperty('timestamp');
    });

    test('應該是 Error 的實例', () => {
      const error = new AppError('Test');
      expect(error instanceof Error).toBe(true);
    });
  });

  // ============================================
  // TokenInsufficientError 測試
  // ============================================
  describe('TokenInsufficientError', () => {
    test('應該包含代幣資訊', () => {
      const error = new TokenInsufficientError(30, 10, 'user-123');

      expect(error.code).toBe('TOKEN_INSUFFICIENT');
      expect(error.statusCode).toBe(400);
      expect(error.details.required).toBe(30);
      expect(error.details.available).toBe(10);
      expect(error.details.userId).toBe('user-123');
      expect(error.message).toContain('30');
      expect(error.message).toContain('10');
    });
  });

  // ============================================
  // AIGenerationError 測試
  // ============================================
  describe('AIGenerationError', () => {
    test('應該正確處理原始錯誤', () => {
      const originalError = new Error('API timeout');
      const error = new AIGenerationError('生成失敗', originalError);

      expect(error.code).toBe('AI_GENERATION_ERROR');
      expect(error.originalError).toBe(originalError);
      expect(error.details.originalError).toBe('API timeout');
    });

    test('應該有預設訊息', () => {
      const error = new AIGenerationError();
      expect(error.message).toBe('AI 圖片生成失敗');
    });
  });

  // ============================================
  // ValidationError 測試
  // ============================================
  describe('ValidationError', () => {
    test('應該包含欄位資訊', () => {
      const error = new ValidationError('名稱不能為空', 'name', '');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details.field).toBe('name');
      expect(error.details.value).toBe('');
    });
  });

  // ============================================
  // NotFoundError 測試
  // ============================================
  describe('NotFoundError', () => {
    test('應該格式化資源訊息', () => {
      const error = new NotFoundError('貼圖組', 'set-123');

      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('貼圖組');
      expect(error.message).toContain('set-123');
    });

    test('沒有 ID 時應該省略', () => {
      const error = new NotFoundError('用戶');
      expect(error.message).toBe('找不到用戶');
    });
  });

  // ============================================
  // RateLimitError 測試
  // ============================================
  describe('RateLimitError', () => {
    test('應該包含重試時間', () => {
      const error = new RateLimitError('請求過多', 60);

      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.statusCode).toBe(429);
      expect(error.details.retryAfter).toBe(60);
    });
  });
});

