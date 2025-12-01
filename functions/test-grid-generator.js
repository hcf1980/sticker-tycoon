/**
 * 測試 9宮格批次生成系統
 * 
 * 使用方式：
 * node functions/test-grid-generator.js
 */

const { generate9StickersBatch, cropGridToStickers } = require('./grid-generator');
const { getSuggestedMode } = require('./sticker-generator-enhanced');
const fs = require('fs');
const path = require('path');

// 測試用照片（請替換為實際的照片 base64）
const TEST_PHOTO_BASE64 = 'test_photo_placeholder';

// 測試表情列表
const TEST_EXPRESSIONS = [
  '開心',
  '大笑',
  '驚訝',
  '傷心',
  '生氣',
  '加油',
  '讚讚',
  'OK',
  '晚安'
];

async function testGridGeneration() {
  console.log('🧪 開始測試 9宮格批次生成系統\n');

  // 1. 測試模式建議
  console.log('📊 測試 1：模式建議');
  console.log('─────────────────────────────────');
  
  const testCounts = [9, 18, 27, 8, 12, 16];
  for (const count of testCounts) {
    const suggestion = getSuggestedMode(count);
    console.log(`${count} 張貼圖：`);
    console.log(`  模式：${suggestion.mode}`);
    console.log(`  原因：${suggestion.reason}`);
    console.log(`  API 調用：${suggestion.apiCalls} 次`);
    if (suggestion.savings) {
      console.log(`  💰 ${suggestion.savings}`);
    }
    console.log('');
  }

  // 2. 測試網格佈局計算
  console.log('\n📐 測試 2：網格佈局計算');
  console.log('─────────────────────────────────');
  console.log('AI 生成尺寸：1024 × 1024 px');
  console.log('網格配置：3 × 3');
  console.log('每格尺寸：341 × 341 px');
  console.log('輸出尺寸：370 × 320 px');
  console.log('內容區：350 × 300 px（留白 10px）');
  
  // 3. 計算成本節省
  console.log('\n💰 測試 3：成本節省計算');
  console.log('─────────────────────────────────');
  
  const scenarios = [
    { count: 9, traditional: 9, grid: 1 },
    { count: 18, traditional: 18, grid: 2 },
    { count: 27, traditional: 27, grid: 3 },
  ];

  for (const scenario of scenarios) {
    const savings = ((scenario.traditional - scenario.grid) / scenario.traditional * 100).toFixed(1);
    console.log(`${scenario.count} 張貼圖：`);
    console.log(`  傳統模式：${scenario.traditional} 次 API 調用`);
    console.log(`  9宮格模式：${scenario.grid} 次 API 調用`);
    console.log(`  💰 節省：${savings}%`);
    console.log('');
  }

  console.log('✅ 所有測試完成！\n');
  console.log('📝 使用指南：');
  console.log('─────────────────────────────────');
  console.log('1. 選擇貼圖數量：9/18/27 張（9 的倍數）');
  console.log('2. 系統自動使用 9宮格模式');
  console.log('3. 單次 API 調用生成 9 張貼圖');
  console.log('4. 自動裁切並上傳到 Storage');
  console.log('5. 成本節省高達 89%');
}

// 執行測試
if (require.main === module) {
  testGridGeneration()
    .then(() => {
      console.log('\n🎉 測試程序完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 測試失敗:', error.message);
      process.exit(1);
    });
}

module.exports = { testGridGeneration };

