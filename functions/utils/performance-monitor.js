/**
 * 性能監控工具
 * 追蹤和記錄關鍵操作的執行時間
 */

class PerformanceMonitor {
  constructor() {
    this.timers = new Map();
    this.metrics = new Map();
  }

  /**
   * 開始計時
   */
  start(label) {
    this.timers.set(label, Date.now());
  }

  /**
   * 結束計時並記錄
   */
  end(label) {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`⚠️ 找不到計時器: ${label}`);
      return null;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);

    // 記錄到指標
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    const metricArray = this.metrics.get(label);
    metricArray.push(duration);

    // 只保留最近 100 筆記錄
    if (metricArray.length > 100) {
      metricArray.shift();
    }

    console.log(`⏱️ [${label}] ${duration}ms`);
    return duration;
  }

  /**
   * 取得指標統計
   */
  getStats(label) {
    const metrics = this.metrics.get(label);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const sorted = [...metrics].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      count: sorted.length,
      avg: Math.round(avg),
      min,
      max,
      p50,
      p95,
      p99
    };
  }

  /**
   * 取得所有指標統計
   */
  getAllStats() {
    const stats = {};
    for (const label of this.metrics.keys()) {
      stats[label] = this.getStats(label);
    }
    return stats;
  }

  /**
   * 清除指標
   */
  clear(label) {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * 包裝非同步函數並自動計時
   */
  async measure(label, fn) {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

// 全域監控實例
const globalMonitor = new PerformanceMonitor();

module.exports = {
  PerformanceMonitor,
  globalMonitor
};

