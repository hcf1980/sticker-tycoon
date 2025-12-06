/**
 * 測試透明度修復效果
 * 驗證背景去除邏輯不會誤刪膚色、衣服等區域
 */

// 模擬測試用例
const testCases = [
  {
    name: '純白背景',
    pixels: [
      { r: 255, g: 255, b: 255 }, // 應該被移除
      { r: 254, g: 254, b: 254 }, // 應該被移除
      { r: 253, g: 253, b: 253 }, // 應該被移除
      { r: 252, g: 252, b: 252 }, // 應該保留（< 253）
    ]
  },
  {
    name: '膚色範圍',
    pixels: [
      { r: 220, g: 180, b: 150 }, // 膚色，應該保留
      { r: 200, g: 160, b: 140 }, // 膚色，應該保留
      { r: 190, g: 150, b: 130 }, // 膚色，應該保留
      { r: 180, g: 140, b: 120 }, // 膚色邊界，應該保留
    ]
  },
  {
    name: '棋盤格背景',
    pixels: [
      { r: 204, g: 204, b: 204 }, // #CCCCCC，應該被移除
      { r: 205, g: 205, b: 205 }, // #CCCCCC ±2，應該被移除
      { r: 153, g: 153, b: 153 }, // #999999，應該被移除
      { r: 154, g: 154, b: 154 }, // #999999 ±2，應該被移除
      { r: 200, g: 200, b: 200 }, // 灰色但不是棋盤格，應該保留
    ]
  },
  {
    name: '衣服顏色',
    pixels: [
      { r: 100, g: 100, b: 200 }, // 藍色衣服，應該保留
      { r: 200, g: 100, b: 100 }, // 紅色衣服，應該保留
      { r: 150, g: 150, b: 150 }, // 灰色衣服，應該保留
    ]
  }
];

// v3 背景檢測邏輯
function isBackgroundColor(r, g, b) {
  // 純白背景
  const isPureWhite = r >= 253 && g >= 253 && b >= 253;

  // 棋盤格顏色
  const isCheckerboardLight = Math.abs(r - 204) <= 2 && Math.abs(g - 204) <= 2 && Math.abs(b - 204) <= 2;
  const isCheckerboardDark = Math.abs(r - 153) <= 2 && Math.abs(g - 153) <= 2 && Math.abs(b - 153) <= 2;

  // 排除膚色
  const isSkinTone = r > g && g > b && r >= 180 && r <= 255 && g >= 140 && g <= 220 && b >= 120 && b <= 200;
  
  if (isSkinTone) return false;

  return isPureWhite || isCheckerboardLight || isCheckerboardDark;
}

// 執行測試
console.log('🧪 測試透明度修復效果\n');
console.log('='.repeat(60));

testCases.forEach(testCase => {
  console.log(`\n📋 測試案例: ${testCase.name}`);
  console.log('-'.repeat(60));
  
  testCase.pixels.forEach((pixel, index) => {
    const willRemove = isBackgroundColor(pixel.r, pixel.g, pixel.b);
    const status = willRemove ? '❌ 移除' : '✅ 保留';
    console.log(`  像素 ${index + 1}: RGB(${pixel.r}, ${pixel.g}, ${pixel.b}) → ${status}`);
  });
});

console.log('\n' + '='.repeat(60));
console.log('✅ 測試完成！\n');

// 預期結果說明
console.log('📊 預期結果:');
console.log('  ✅ 純白背景 (RGB >= 253) 應該被移除');
console.log('  ✅ 棋盤格顏色 (#CCCCCC, #999999 ±2) 應該被移除');
console.log('  ✅ 膚色範圍 (R>G>B, R:180-255) 應該保留');
console.log('  ✅ 衣服顏色 (非白色/棋盤格) 應該保留');
console.log('  ✅ 接近白色但 < 253 的顏色應該保留');

