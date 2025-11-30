/**
 * 速率限制工具
 * 基於記憶體的簡單速率限制（適用於 Serverless）
 */

const { RateLimitError } = require('../errors');
const logger = require('./logger');

/**
 * 速率限制器類別
 */
class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 10; // 最大請求數
    this.windowMs = options.windowMs || 60000; // 時間窗口（毫秒）
    this.requests = new Map(); // 儲存請求記錄
    
    // 定期清理過期記錄
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.windowMs);
  }

  /**
   * 檢查是否超過速率限制
   * @param {string} key - 識別鍵（如 userId 或 IP）
   * @returns {boolean} 是否允許請求
   */
  check(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // 過濾掉時間窗口外的請求
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (recentRequests.length >= this.maxRequests) {
      logger.warn('速率限制觸發', {
        key,
        requests: recentRequests.length,
        limit: this.maxRequests,
      });
      return false;
    }
    
    // 記錄新請求
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    return true;
  }

  /**
   * 檢查並拋出錯誤（如果超過限制）
   * @param {string} key - 識別鍵
   * @throws {RateLimitError} 超過限制時拋出錯誤
   */
  checkOrThrow(key) {
    if (!this.check(key)) {
      const retryAfter = Math.ceil(this.windowMs / 1000);
      throw new RateLimitError(
        `請求過於頻繁，請 ${retryAfter} 秒後再試`,
        retryAfter
      );
    }
  }

  /**
   * 取得剩餘請求數
   * @param {string} key - 識別鍵
   * @returns {number} 剩餘請求數
   */
  getRemaining(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  /**
   * 重置特定鍵的限制
   * @param {string} key - 識別鍵
   */
  reset(key) {
    this.requests.delete(key);
    logger.debug('速率限制已重置', { key });
  }

  /**
   * 清理過期記錄
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(
        timestamp => now - timestamp < this.windowMs
      );
      
      if (recent.length === 0) {
        this.requests.delete(key);
        cleanedCount++;
      } else if (recent.length < timestamps.length) {
        this.requests.set(key, recent);
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug('清理速率限制記錄', { count: cleanedCount });
    }
  }

  /**
   * 銷毀速率限制器
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

/**
 * 預設速率限制器實例
 */
const defaultLimiter = new RateLimiter({
  maxRequests: 10, // 每分鐘 10 次請求
  windowMs: 60000, // 1 分鐘
});

const strictLimiter = new RateLimiter({
  maxRequests: 3, // 每分鐘 3 次請求（用於敏感操作）
  windowMs: 60000,
});

module.exports = {
  RateLimiter,
  defaultLimiter,
  strictLimiter,
};

