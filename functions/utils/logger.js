/**
 * 統一的日誌工具
 * 提供結構化、有顏色的日誌輸出
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

/**
 * 格式化日誌訊息
 * @param {string} level - 日誌等級
 * @param {string} message - 訊息
 * @param {Object} meta - 額外資訊
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

/**
 * Debug 等級日誌
 */
function debug(message, meta) {
  if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
    console.log(`🔍 ${formatLog('DEBUG', message, meta)}`);
  }
}

/**
 * Info 等級日誌
 */
function info(message, meta) {
  if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
    console.log(`ℹ️ ${formatLog('INFO', message, meta)}`);
  }
}

/**
 * Warn 等級日誌
 */
function warn(message, meta) {
  if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
    console.warn(`⚠️ ${formatLog('WARN', message, meta)}`);
  }
}

/**
 * Error 等級日誌
 */
function error(message, meta) {
  if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
    console.error(`❌ ${formatLog('ERROR', message, meta)}`);
  }
}

/**
 * Success 日誌（總是顯示）
 */
function success(message, meta) {
  console.log(`✅ ${formatLog('SUCCESS', message, meta)}`);
}

/**
 * 記錄函數執行時間
 */
function logExecutionTime(funcName, startTime) {
  const duration = Date.now() - startTime;
  info(`${funcName} 執行完成`, { duration: `${duration}ms` });
}

/**
 * 創建帶有 userId 的日誌器
 */
function createUserLogger(userId) {
  return {
    debug: (msg, meta) => debug(msg, { userId, ...meta }),
    info: (msg, meta) => info(msg, { userId, ...meta }),
    warn: (msg, meta) => warn(msg, { userId, ...meta }),
    error: (msg, meta) => error(msg, { userId, ...meta }),
    success: (msg, meta) => success(msg, { userId, ...meta }),
  };
}

module.exports = {
  debug,
  info,
  warn,
  error,
  success,
  logExecutionTime,
  createUserLogger,
  LOG_LEVELS,
};

