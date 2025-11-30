/**
 * DeepSeek Enhancer Module Tests
 * 測試 DeepSeek API 表情優化功能
 */

// Mock axios
jest.mock('axios');

const axios = require('axios');
const {
  isDeepSeekAvailable,
  enhanceExpressions,
  getStyleDescription,
  buildEnhancedPrompt
} = require('../deepseek-enhancer');

describe('deepseek-enhancer.js', () => {

  // 儲存原始環境變數
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // 重置環境變數
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ============================================
  // 1. isDeepSeekAvailable 測試
  // ============================================
  describe('isDeepSeekAvailable', () => {
    test('當環境變數都存在時應該返回 true', () => {
      process.env.DEEPSEEK_API_KEY = 'test-key';
      process.env.DEEPSEEK_API_URL = 'https://api.deepseek.com';
      
      // 需要重新載入模組以反映環境變數變化
      jest.resetModules();
      const { isDeepSeekAvailable: freshIsAvailable } = require('../deepseek-enhancer');
      expect(freshIsAvailable()).toBe(true);
    });

    test('當 API KEY 不存在時應該返回 false', () => {
      delete process.env.DEEPSEEK_API_KEY;
      process.env.DEEPSEEK_API_URL = 'https://api.deepseek.com';
      
      jest.resetModules();
      const { isDeepSeekAvailable: freshIsAvailable } = require('../deepseek-enhancer');
      expect(freshIsAvailable()).toBe(false);
    });
  });

  // ============================================
  // 2. getStyleDescription 測試（純函數）
  // ============================================
  describe('getStyleDescription', () => {
    test('應該返回 cute 風格的描述', () => {
      const desc = getStyleDescription('cute');
      expect(desc).toContain('可愛風');
      expect(desc).toContain('kawaii');
    });

    test('應該返回 cool 風格的描述', () => {
      const desc = getStyleDescription('cool');
      expect(desc).toContain('酷炫風');
    });

    test('應該返回 funny 風格的描述', () => {
      const desc = getStyleDescription('funny');
      expect(desc).toContain('搞笑風');
    });

    test('應該返回 anime 風格的描述', () => {
      const desc = getStyleDescription('anime');
      expect(desc).toContain('動漫風');
    });

    test('應該返回 pixel 風格的描述', () => {
      const desc = getStyleDescription('pixel');
      expect(desc).toContain('像素風');
    });

    test('未知風格應該返回 cute 的描述作為預設', () => {
      const desc = getStyleDescription('unknown_style');
      expect(desc).toContain('可愛風');
    });
  });

  // ============================================
  // 3. buildEnhancedPrompt 測試
  // ============================================
  describe('buildEnhancedPrompt', () => {
    test('當 enhancedData 為 null 時應該返回原始 prompt', () => {
      const basePrompt = 'Create a cute sticker';
      const result = buildEnhancedPrompt(basePrompt, null, '開心');
      expect(result).toBe(basePrompt);
    });

    test('應該將增強資料合併到 prompt 中', () => {
      const basePrompt = 'Create a cute sticker';
      const enhancedData = {
        characterBase: 'chibi style character',
        expressions: {
          '開心': 'smiling widely with sparkly eyes'
        }
      };
      
      const result = buildEnhancedPrompt(basePrompt, enhancedData, '開心');
      expect(result).toContain(basePrompt);
      expect(result).toContain('chibi style character');
      expect(result).toContain('smiling widely with sparkly eyes');
    });

    test('當表情不在 enhancedData 中時應該使用原始表情', () => {
      const basePrompt = 'Create a sticker';
      const enhancedData = {
        characterBase: 'cute character',
        expressions: {}
      };
      
      const result = buildEnhancedPrompt(basePrompt, enhancedData, '不存在的表情');
      expect(result).toContain('不存在的表情');
    });
  });

  // ============================================
  // 4. enhanceExpressions 測試（需要 mock API）
  // ============================================
  describe('enhanceExpressions', () => {
    beforeEach(() => {
      // 設定環境變數
      process.env.DEEPSEEK_API_KEY = 'test-key';
      process.env.DEEPSEEK_API_URL = 'https://test-api.com';
      jest.resetModules();
    });

    test('API 不可用時應該返回 null', async () => {
      delete process.env.DEEPSEEK_API_KEY;
      jest.resetModules();
      const { enhanceExpressions: freshEnhance } = require('../deepseek-enhancer');
      
      const result = await freshEnhance('cute', ['開心', '難過'], 'char-123');
      expect(result).toBeNull();
    });
  });
});

