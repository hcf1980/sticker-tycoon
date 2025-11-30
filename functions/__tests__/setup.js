/**
 * Jest Setup File
 * 在所有測試執行前運行
 */

// 設定測試用環境變數
process.env.NODE_ENV = 'test';

// Mock 環境變數（避免測試時連接真實服務）
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-line-access-token';
process.env.LINE_CHANNEL_SECRET = 'test-line-channel-secret';
process.env.AI_IMAGE_API_KEY = 'test-ai-api-key';
process.env.AI_IMAGE_API_URL = 'https://test-ai-api.com';
process.env.AI_MODEL = 'test-model';
process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
process.env.DEEPSEEK_API_URL = 'https://test-deepseek-api.com';

// 全局 mock console.error 和 console.warn（減少測試噪音）
// 如果需要看到日誌，可以註解這些
// global.console.error = jest.fn();
// global.console.warn = jest.fn();

// 全局測試工具
global.testUtils = {
  /**
   * 創建模擬的 LINE 事件
   */
  createMockLineEvent: (type = 'message', data = {}) => ({
    type,
    replyToken: 'test-reply-token-' + Date.now(),
    source: {
      userId: 'test-user-id',
      type: 'user'
    },
    timestamp: Date.now(),
    ...data
  }),

  /**
   * 創建模擬的文字訊息事件
   */
  createMockTextMessage: (text) => ({
    type: 'message',
    replyToken: 'test-reply-token-' + Date.now(),
    source: {
      userId: 'test-user-id',
      type: 'user'
    },
    timestamp: Date.now(),
    message: {
      type: 'text',
      id: 'test-message-id',
      text
    }
  }),

  /**
   * 等待指定毫秒
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// 測試結束後清理
afterAll(() => {
  // 清理工作
});

