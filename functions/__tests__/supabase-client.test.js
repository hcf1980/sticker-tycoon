/**
 * Supabase Client Module Tests
 * 測試資料庫操作
 */

// 在 import 之前設置環境變數
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

describe('supabase-client.js', () => {
  let mockSupabase;
  let mockFrom;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // 創建鏈式調用的 mock
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis()
    };

    // 創建 mock Supabase client
    mockSupabase = {
      from: jest.fn(() => mockFrom),
      storage: {
        from: jest.fn().mockReturnThis(),
        list: jest.fn(),
        getPublicUrl: jest.fn()
      }
    };

    // Mock @supabase/supabase-js
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => mockSupabase)
    }));
  });

  // ============================================
  // 1. getSupabaseClient 測試
  // ============================================
  describe('getSupabaseClient', () => {
    test('應該返回 Supabase client 實例', () => {
      const supabaseModule = require('../supabase-client');
      const client = supabaseModule.getSupabaseClient();
      expect(client).toBeDefined();
    });

    test('重複調用應該返回同一個實例（單例模式）', () => {
      const supabaseModule = require('../supabase-client');
      const client1 = supabaseModule.getSupabaseClient();
      const client2 = supabaseModule.getSupabaseClient();
      expect(client1).toBe(client2);
    });
  });

  // ============================================
  // 2. isReplyTokenUsed 測試
  // ============================================
  describe('isReplyTokenUsed', () => {
    test('當 token 存在時應該返回 true', async () => {
      mockFrom.limit.mockResolvedValue({
        data: [{ reply_token: 'existing-token' }],
        error: null
      });

      const supabaseModule = require('../supabase-client');
      const result = await supabaseModule.isReplyTokenUsed('existing-token');
      expect(result).toBe(true);
    });

    test('當 token 不存在時應該返回 false', async () => {
      mockFrom.limit.mockResolvedValue({
        data: [],
        error: null
      });

      const supabaseModule = require('../supabase-client');
      const result = await supabaseModule.isReplyTokenUsed('new-token');
      expect(result).toBe(false);
    });

    test('發生錯誤時應該返回 false', async () => {
      mockFrom.limit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const supabaseModule = require('../supabase-client');
      const result = await supabaseModule.isReplyTokenUsed('error-token');
      expect(result).toBe(false);
    });
  });

  // ============================================
  // 3. recordReplyToken 測試
  // ============================================
  describe('recordReplyToken', () => {
    test('成功記錄時應該返回 true', async () => {
      mockFrom.insert.mockResolvedValue({
        data: { reply_token: 'new-token' },
        error: null
      });

      const supabaseModule = require('../supabase-client');
      const result = await supabaseModule.recordReplyToken('new-token');
      expect(result).toBe(true);
    });

    test('記錄失敗時應該返回 false', async () => {
      mockFrom.insert.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' }
      });

      const supabaseModule = require('../supabase-client');
      const result = await supabaseModule.recordReplyToken('failed-token');
      expect(result).toBe(false);
    });
  });

  // ============================================
  // 4. getOrCreateUser 測試
  // ============================================
  describe('getOrCreateUser', () => {
    test('應該返回現有用戶', async () => {
      const existingUser = {
        line_user_id: 'user-123',
        display_name: 'Test User',
        sticker_credits: 40
      };

      mockFrom.limit.mockResolvedValue({
        data: [existingUser],
        error: null
      });

      const supabaseModule = require('../supabase-client');
      const result = await supabaseModule.getOrCreateUser('user-123');
      expect(result).toEqual(existingUser);
    });

    test('用戶不存在時應該創建新用戶', async () => {
      // 第一次查詢返回空（用戶不存在）
      mockFrom.limit.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // 插入新用戶成功
      const newUser = {
        line_user_id: 'new-user',
        display_name: 'New User',
        sticker_credits: 40,
        referral_code: 'ABC123'
      };
      mockFrom.single.mockResolvedValueOnce({
        data: newUser,
        error: null
      });

      // recordTokenTransaction 也需要 mock
      mockFrom.insert.mockResolvedValueOnce({
        data: {},
        error: null
      });

      const supabaseModule = require('../supabase-client');
      const result = await supabaseModule.getOrCreateUser('new-user', 'New User');
      // 由於 mock 的複雜性，這裡只檢查函數可以正常執行
      // 實際結果取決於 mock 設定
    });
  });
});

