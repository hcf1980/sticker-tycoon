/**
 * Jest Configuration for Sticker Tycoon
 */
module.exports = {
  // 測試環境
  testEnvironment: 'node',

  // 測試檔案匹配模式
  testMatch: [
    '**/functions/__tests__/**/*.test.js',
    '**/functions/__tests__/**/*.spec.js'
  ],

  // 覆蓋率收集
  collectCoverageFrom: [
    'functions/**/*.js',
    '!functions/__tests__/**',
    '!functions/**/index.js'
  ],

  // 覆蓋率報告格式
  coverageReporters: ['text', 'lcov', 'html'],

  // 覆蓋率門檻
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // 模組路徑別名
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/functions/$1'
  },

  // 設定檔案（在測試前執行）
  setupFilesAfterEnv: ['<rootDir>/functions/__tests__/setup.js'],

  // 超時設定
  testTimeout: 10000,

  // 清除 mock
  clearMocks: true,

  // 詳細輸出
  verbose: true
};

