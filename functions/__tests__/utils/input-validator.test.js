/**
 * 輸入驗證工具測試套件
 */

const {
  validateInput,
  validateMultiple,
  sanitizeString,
  sanitizeObject,
  validateLineWebhookEvent
} = require('../../utils/input-validator');

describe('Input Validator', () => {
  // ========== validateInput 測試 ==========

  describe('validateInput - Referral Code', () => {
    test('應該接受有效的推薦碼', () => {
      const result = validateInput('ABC123', 'referralCode');
      expect(result.success).toBe(true);
      expect(result.data).toBe('ABC123');
    });

    test('應該轉換小寫為大寫', () => {
      const result = validateInput('abc123', 'referralCode');
      expect(result.success).toBe(true);
      expect(result.data).toBe('ABC123');
    });

    test('應該拒絕太短的推薦碼', () => {
      const result = validateInput('ABC12', 'referralCode');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/6 位/);
    });

    test('應該拒絕包含特殊字符的推薦碼', () => {
      const result = validateInput('ABC-123', 'referralCode');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/大寫英文和數字/);
    });

    test('應該拒絕空字符串', () => {
      const result = validateInput('', 'referralCode');
      expect(result.success).toBe(false);
    });
  });

  describe('validateInput - Style ID', () => {
    test('應該接受有效的風格 ID', () => {
      const validStyles = ['realistic', 'cute', 'cool', 'funny', 'simple', 'anime', 'pixel', 'sketch'];

      validStyles.forEach(style => {
        const result = validateInput(style, 'styleId');
        expect(result.success).toBe(true);
        expect(result.data).toBe(style);
      });
    });

    test('應該拒絕無效的風格 ID', () => {
      const result = validateInput('invalid_style', 'styleId');
      expect(result.success).toBe(false);
    });
  });

  describe('validateInput - Sticker Count', () => {
    test('應該接受有效的貼圖數量', () => {
      [6, 8, 16, 24, 32, 40].forEach(count => {
        const result = validateInput(count, 'stickerCount');
        expect(result.success).toBe(true);
        expect(result.data).toBe(count);
      });
    });

    test('應該拒絕太小的數量', () => {
      const result = validateInput(5, 'stickerCount');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/最少 6 張/);
    });

    test('應該拒絕超過限制的數量', () => {
      const result = validateInput(41, 'stickerCount');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/最多 40 張/);
    });

    test('應該拒絕非整數', () => {
      const result = validateInput(6.5, 'stickerCount');
      expect(result.success).toBe(false);
    });
  });

  describe('validateInput - LINE User ID', () => {
    test('應該接受有效的 LINE 用戶 ID', () => {
      const validId = 'U' + 'a'.repeat(32);
      const result = validateInput(validId, 'lineUserId');
      expect(result.success).toBe(true);
    });

    test('應該拒絕無效格式的用戶 ID', () => {
      const result = validateInput('invalid_user_id', 'lineUserId');
      expect(result.success).toBe(false);
    });

    test('應該拒絕太短的用戶 ID', () => {
      const result = validateInput('U' + 'a'.repeat(10), 'lineUserId');
      expect(result.success).toBe(false);
    });
  });

  describe('validateInput - Email', () => {
    test('應該接受有效的郵箱', () => {
      const result = validateInput('user@example.com', 'email');
      expect(result.success).toBe(true);
    });

    test('應該拒絕無效的郵箱', () => {
      const result = validateInput('invalid-email', 'email');
      expect(result.success).toBe(false);
    });
  });

  describe('validateInput - Password', () => {
    test('應該接受符合要求的密碼', () => {
      const result = validateInput('password123', 'password');
      expect(result.success).toBe(true);
    });

    test('應該拒絕太短的密碼', () => {
      const result = validateInput('pass123', 'password');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/8 位/);
    });
  });

  describe('validateInput - Unknown Schema', () => {
    test('應該拒絕未知的驗證規則', () => {
      const result = validateInput('test', 'unknown_schema');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/未知的驗證規則/);
    });
  });

  // ========== validateMultiple 測試 ==========

  describe('validateMultiple', () => {
    test('應該驗證多個有效的字段', () => {
      const result = validateMultiple(
        { styleId: 'cute', count: 6, code: 'abc123' },
        { styleId: 'styleId', count: 'stickerCount', code: 'referralCode' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        styleId: 'cute',
        count: 6,
        code: 'ABC123'
      });
    });

    test('應該返回多個錯誤', () => {
      const result = validateMultiple(
        { styleId: 'invalid', count: 50, code: 'abc' },
        { styleId: 'styleId', count: 'stickerCount', code: 'referralCode' }
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('styleId');
      expect(result.errors).toHaveProperty('count');
      expect(result.errors).toHaveProperty('code');
    });

    test('應該處理部分字段無效的情況', () => {
      const result = validateMultiple(
        { styleId: 'cute', count: 50 },
        { styleId: 'styleId', count: 'stickerCount' }
      );

      expect(result.success).toBe(false);
      expect(result.errors).not.toHaveProperty('styleId');
      expect(result.errors).toHaveProperty('count');
    });

    test('應該拒絕未知的驗證規則', () => {
      const result = validateMultiple(
        { field: 'value' },
        { field: 'unknown_schema' }
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('field');
    });
  });

  // ========== sanitizeString 測試 ==========

  describe('sanitizeString', () => {
    test('應該移除前後空格', () => {
      const result = sanitizeString('  hello  ');
      expect(result).toBe('hello');
    });

    test('應該保留有效字符', () => {
      const result = sanitizeString('Hello World 123');
      expect(result).toBe('Hello World 123');
    });

    test('應該處理空字符串', () => {
      const result = sanitizeString('');
      expect(result).toBe('');
    });

    test('應該將非字符串轉換為空字符串', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
    });
  });

  // ========== sanitizeObject 測試 ==========

  describe('sanitizeObject', () => {
    test('應該只保留允許的鍵', () => {
      const input = {
        allowed1: 'value1',
        allowed2: 'value2',
        notAllowed: 'value3'
      };

      const result = sanitizeObject(input, ['allowed1', 'allowed2']);

      expect(result).toEqual({
        allowed1: 'value1',
        allowed2: 'value2'
      });
      expect(result).not.toHaveProperty('notAllowed');
    });

    test('應該排除 null 和 undefined 值', () => {
      const input = {
        valid: 'value',
        nullValue: null,
        undefinedValue: undefined
      };

      const result = sanitizeObject(input, ['valid', 'nullValue', 'undefinedValue']);

      expect(result).toEqual({ valid: 'value' });
    });

    test('應該處理非對象輸入', () => {
      expect(sanitizeObject(null)).toEqual({});
      expect(sanitizeObject(undefined)).toEqual({});
      expect(sanitizeObject('string')).toEqual({});
    });
  });

  // ========== validateLineWebhookEvent 測試 ==========

  describe('validateLineWebhookEvent', () => {
    const validEvent = {
      replyToken: 'nHuyWiB7yP5Zw52FIkcQT',
      source: {
        userId: 'U' + 'a'.repeat(32)
      },
      message: {
        type: 'text',
        text: 'hello'
      },
      timestamp: Date.now()
    };

    test('應該驗證有效的 Webhook 事件', () => {
      const result = validateLineWebhookEvent(validEvent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('replyToken');
      expect(result.data).toHaveProperty('userId');
      expect(result.data).toHaveProperty('message');
    });

    test('應該拒絕缺少 replyToken 的事件', () => {
      const event = { ...validEvent };
      delete event.replyToken;

      const result = validateLineWebhookEvent(event);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/無效的 LINE Webhook 事件結構/);
    });

    test('應該拒絕缺少 userId 的事件', () => {
      const event = {
        ...validEvent,
        source: {}
      };

      const result = validateLineWebhookEvent(event);

      expect(result.success).toBe(false);
    });

    test('應該拒絕無效的 userId 格式', () => {
      const event = {
        ...validEvent,
        source: {
          userId: 'invalid_user_id'
        }
      };

      const result = validateLineWebhookEvent(event);

      expect(result.success).toBe(false);
    });
  });
});
