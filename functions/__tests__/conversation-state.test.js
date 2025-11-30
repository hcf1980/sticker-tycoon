/**
 * Conversation State Module Tests
 * 測試對話狀態管理
 */

// Mock Supabase Client
jest.mock('../supabase-client', () => ({
  getSupabaseClient: jest.fn()
}));

const { getSupabaseClient } = require('../supabase-client');
const {
  ConversationStage,
  getConversationState,
  updateConversationState,
  resetConversationState,
  isInCreationFlow
} = require('../conversation-state');

describe('conversation-state.js', () => {

  // ============================================
  // 1. ConversationStage 常數測試
  // ============================================
  describe('ConversationStage', () => {
    test('應該包含所有預期的階段', () => {
      expect(ConversationStage.IDLE).toBe('idle');
      expect(ConversationStage.NAMING).toBe('naming');
      expect(ConversationStage.UPLOAD_PHOTO).toBe('upload_photo');
      expect(ConversationStage.STYLING).toBe('styling');
      expect(ConversationStage.CHARACTER).toBe('character');
      expect(ConversationStage.FRAMING).toBe('framing');
      expect(ConversationStage.EXPRESSIONS).toBe('expressions');
      expect(ConversationStage.SCENE_SELECT).toBe('scene_select');
      expect(ConversationStage.CUSTOM_SCENE).toBe('custom_scene');
      expect(ConversationStage.COUNT_SELECT).toBe('count_select');
      expect(ConversationStage.CONFIRMING).toBe('confirming');
      expect(ConversationStage.GENERATING).toBe('generating');
      expect(ConversationStage.EDITING).toBe('editing');
    });

    test('所有階段值應該是字串', () => {
      Object.values(ConversationStage).forEach(stage => {
        expect(typeof stage).toBe('string');
      });
    });
  });

  // ============================================
  // 2. isInCreationFlow 測試（純函數）
  // ============================================
  describe('isInCreationFlow', () => {
    test('IDLE 階段不在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.IDLE)).toBe(false);
    });

    test('GENERATING 階段不在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.GENERATING)).toBe(false);
    });

    test('EDITING 階段不在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.EDITING)).toBe(false);
    });

    test('NAMING 階段在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.NAMING)).toBe(true);
    });

    test('UPLOAD_PHOTO 階段在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.UPLOAD_PHOTO)).toBe(true);
    });

    test('STYLING 階段在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.STYLING)).toBe(true);
    });

    test('FRAMING 階段在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.FRAMING)).toBe(true);
    });

    test('EXPRESSIONS 階段在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.EXPRESSIONS)).toBe(true);
    });

    test('SCENE_SELECT 階段在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.SCENE_SELECT)).toBe(true);
    });

    test('CUSTOM_SCENE 階段在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.CUSTOM_SCENE)).toBe(true);
    });

    test('COUNT_SELECT 階段在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.COUNT_SELECT)).toBe(true);
    });

    test('CONFIRMING 階段在創建流程中', () => {
      expect(isInCreationFlow(ConversationStage.CONFIRMING)).toBe(true);
    });

    test('無效階段不在創建流程中', () => {
      expect(isInCreationFlow('unknown_stage')).toBe(false);
      expect(isInCreationFlow(null)).toBe(false);
      expect(isInCreationFlow(undefined)).toBe(false);
    });
  });

  // ============================================
  // 3. getConversationState 測試（需要 mock）
  // ============================================
  describe('getConversationState', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('應該返回用戶的對話狀態', async () => {
      const mockState = {
        user_id: 'test-user',
        current_stage: ConversationStage.STYLING,
        current_set_id: 'set-123',
        temp_data: { name: 'My Stickers' }
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockState, error: null });

      getSupabaseClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          single: mockSingle
        })
      });

      const result = await getConversationState('test-user');
      expect(result).toEqual(mockState);
    });

    test('找不到用戶時應該返回預設狀態', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // 找不到記錄
      });

      getSupabaseClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          single: mockSingle
        })
      });

      const result = await getConversationState('new-user');
      expect(result.current_stage).toBe(ConversationStage.IDLE);
      expect(result.current_set_id).toBeNull();
      expect(result.temp_data).toEqual({});
    });

    test('發生錯誤時應該返回預設狀態', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Database error' }
      });

      getSupabaseClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          single: mockSingle
        })
      });

      const result = await getConversationState('error-user');
      expect(result.current_stage).toBe(ConversationStage.IDLE);
    });
  });

  // ============================================
  // 4. updateConversationState 測試
  // ============================================
  describe('updateConversationState', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('應該成功更新用戶的對話狀態', async () => {
      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ user_id: 'test-user', current_stage: 'styling' }],
        error: null
      });

      getSupabaseClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          upsert: mockUpsert,
          select: mockSelect
        })
      });

      const result = await updateConversationState(
        'test-user',
        ConversationStage.STYLING,
        { name: 'My Stickers' },
        'set-123'
      );

      expect(result).toBe(true);
    });

    test('更新失敗時應該返回 false', async () => {
      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      getSupabaseClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          upsert: mockUpsert,
          select: mockSelect
        })
      });

      const result = await updateConversationState('test-user', ConversationStage.STYLING);
      expect(result).toBe(false);
    });
  });

  // ============================================
  // 5. resetConversationState 測試
  // ============================================
  describe('resetConversationState', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('應該將狀態重置為 IDLE', async () => {
      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ user_id: 'test-user', current_stage: 'idle' }],
        error: null
      });

      getSupabaseClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          upsert: mockUpsert,
          select: mockSelect
        })
      });

      const result = await resetConversationState('test-user');
      expect(result).toBe(true);

      // 驗證 upsert 被調用時包含正確的參數
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user',
          current_stage: ConversationStage.IDLE,
          current_set_id: null,
          temp_data: {}
        }),
        expect.any(Object)
      );
    });
  });
});

