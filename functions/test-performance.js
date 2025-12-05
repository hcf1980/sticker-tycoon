/**
 * 性能測試腳本
 * 測試快取和優化功能
 */

const { globalCache } = require('./utils/cache-manager');
const { globalMonitor } = require('./utils/performance-monitor');

async function testCache() {
  console.log('\n🧪 測試快取功能...\n');

  // 測試基本操作
  const key = 'test:user:123';
  
  console.log('1. 設定快取...');
  globalCache.set(key, { name: 'Test User', credits: 100 }, 5000);
  
  console.log('2. 讀取快取...');
  const cached = globalCache.get(key);
  console.log('   快取內容:', cached);
  
  console.log('3. 測試 getOrSet...');
  const result = await globalCache.getOrSet(
    'test:data',
    async () => {
      console.log('   執行資料取得函數...');
      return { data: 'test' };
    },
    5000
  );
  console.log('   結果:', result);
  
  console.log('4. 再次讀取（應該使用快取）...');
  const result2 = await globalCache.getOrSet(
    'test:data',
    async () => {
      console.log('   這行不應該出現（應該使用快取）');
      return { data: 'test' };
    },
    5000
  );
  console.log('   結果:', result2);
  
  console.log('5. 快取統計:');
  console.log('  ', globalCache.getStats());
  
  console.log('6. 清除快取...');
  globalCache.clear();
  console.log('   清除後統計:', globalCache.getStats());
  
  console.log('\n✅ 快取測試完成\n');
}

async function testPerformanceMonitor() {
  console.log('\n🧪 測試性能監控...\n');
  
  console.log('1. 測試基本計時...');
  globalMonitor.start('test_operation');
  await sleep(100);
  globalMonitor.end('test_operation');
  
  console.log('2. 測試 measure 包裝...');
  await globalMonitor.measure('test_async', async () => {
    await sleep(50);
    return 'done';
  });
  
  console.log('3. 多次執行以收集統計...');
  for (let i = 0; i < 10; i++) {
    await globalMonitor.measure('repeated_operation', async () => {
      await sleep(Math.random() * 100);
    });
  }
  
  console.log('4. 查看統計:');
  const stats = globalMonitor.getStats('repeated_operation');
  console.log('  ', stats);
  
  console.log('5. 所有統計:');
  console.log('  ', globalMonitor.getAllStats());
  
  console.log('\n✅ 性能監控測試完成\n');
}

async function testCachePerformance() {
  console.log('\n🧪 測試快取性能提升...\n');
  
  // 模擬資料庫查詢
  const mockDbQuery = async () => {
    await sleep(100); // 模擬 100ms 的資料庫查詢
    return { user: 'test', credits: 100 };
  };
  
  console.log('1. 無快取查詢（10 次）...');
  globalMonitor.start('without_cache');
  for (let i = 0; i < 10; i++) {
    await mockDbQuery();
  }
  const withoutCache = globalMonitor.end('without_cache');
  
  console.log('2. 有快取查詢（10 次）...');
  globalMonitor.start('with_cache');
  for (let i = 0; i < 10; i++) {
    await globalCache.getOrSet('test:perf', mockDbQuery, 60000);
  }
  const withCache = globalMonitor.end('with_cache');
  
  console.log('\n📊 結果比較:');
  console.log(`   無快取: ${withoutCache}ms`);
  console.log(`   有快取: ${withCache}ms`);
  console.log(`   提升: ${Math.round((1 - withCache / withoutCache) * 100)}%`);
  
  globalCache.clear();
  console.log('\n✅ 性能測試完成\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 執行測試
async function runTests() {
  console.log('='.repeat(50));
  console.log('🚀 開始性能優化測試');
  console.log('='.repeat(50));
  
  try {
    await testCache();
    await testPerformanceMonitor();
    await testCachePerformance();
    
    console.log('='.repeat(50));
    console.log('✅ 所有測試完成');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

// 如果直接執行此檔案
if (require.main === module) {
  runTests();
}

module.exports = { runTests };

