/**
 * 快取管理器
 * 提供記憶體快取功能，減少資料庫查詢次數
 */

class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 300000; // 預設 5 分鐘
    this.maxSize = options.maxSize || 1000; // 最大快取數量
    
    // 定期清理過期快取
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分鐘清理一次
  }

  /**
   * 生成快取鍵
   */
  generateKey(prefix, ...args) {
    return `${prefix}:${args.join(':')}`;
  }

  /**
   * 設定快取
   */
  set(key, value, ttl = this.defaultTTL) {
    // 如果超過最大容量，刪除最舊的項目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expireAt: Date.now() + ttl
    });
  }

  /**
   * 取得快取
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 檢查是否過期
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * 刪除快取
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * 清除特定前綴的快取
   */
  deleteByPrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * 清空所有快取
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 取得或設定快取（如果不存在則執行函數）
   */
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    // 先嘗試從快取取得
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // 執行函數取得資料
    const value = await fetchFn();
    
    // 只快取有效值
    if (value !== null && value !== undefined) {
      this.set(key, value, ttl);
    }

    return value;
  }

  /**
   * 清理過期快取
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expireAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理過期快取: ${cleanedCount} 項`);
    }
  }

  /**
   * 取得快取統計
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: `${((this.cache.size / this.maxSize) * 100).toFixed(1)}%`
    };
  }

  /**
   * 銷毀快取管理器
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// 建立全域快取實例
const globalCache = new CacheManager({
  defaultTTL: 300000, // 5 分鐘
  maxSize: 1000
});

module.exports = {
  CacheManager,
  globalCache
};

