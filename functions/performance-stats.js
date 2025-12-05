/**
 * 性能統計 API
 * 查看系統性能指標和快取統計
 */

const { globalMonitor } = require('./utils/performance-monitor');
const { globalCache } = require('./utils/cache-manager');

exports.handler = async (event) => {
  try {
    // 檢查授權（簡單的 token 驗證）
    const authToken = event.headers.authorization || event.headers.Authorization;
    const expectedToken = process.env.ADMIN_TOKEN || 'your-secret-token';
    
    if (authToken !== `Bearer ${expectedToken}`) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // 取得性能統計
    const performanceStats = globalMonitor.getAllStats();
    
    // 取得快取統計
    const cacheStats = globalCache.getStats();

    // 計算總體統計
    const summary = {
      timestamp: new Date().toISOString(),
      cache: cacheStats,
      performance: performanceStats,
      topSlowest: getTopSlowest(performanceStats, 5),
      topFastest: getTopFastest(performanceStats, 5)
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(summary, null, 2)
    };
  } catch (error) {
    console.error('取得性能統計失敗:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

/**
 * 取得最慢的操作
 */
function getTopSlowest(stats, limit = 5) {
  const entries = Object.entries(stats)
    .filter(([_, stat]) => stat !== null)
    .sort((a, b) => b[1].p95 - a[1].p95)
    .slice(0, limit);
  
  return entries.map(([label, stat]) => ({
    operation: label,
    p95: stat.p95,
    avg: stat.avg,
    count: stat.count
  }));
}

/**
 * 取得最快的操作
 */
function getTopFastest(stats, limit = 5) {
  const entries = Object.entries(stats)
    .filter(([_, stat]) => stat !== null)
    .sort((a, b) => a[1].avg - b[1].avg)
    .slice(0, limit);
  
  return entries.map(([label, stat]) => ({
    operation: label,
    avg: stat.avg,
    min: stat.min,
    count: stat.count
  }));
}

