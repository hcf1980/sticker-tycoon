/**
 * 測試實際生成時的 Prompt 長度
 */

const {
  generatePhotoStickerPromptV2,
  StickerStyles,
  StyleEnhancer,
  FramingTemplates,
  SceneTemplates
} = require('./functions/sticker-styles');

// 模擬實際調用
const style = 'cute';
const expression = '早安';
const characterID = 'abc123def456';
const sceneConfig = SceneTemplates.kawaii;
const framingConfig = FramingTemplates.halfbody;

console.log('\n🔍 測試實際生成時的 Prompt 長度\n');
console.log('='.repeat(70));

// 1. 基礎 Prompt（來自 generatePhotoStickerPromptV2）
const { prompt: basePrompt, negativePrompt } = generatePhotoStickerPromptV2(
  style, 
  expression, 
  characterID, 
  sceneConfig, 
  framingConfig
);

console.log('\n📝 1. 基礎 Prompt (generatePhotoStickerPromptV2)');
console.log(`   字元數: ${basePrompt.length}`);
console.log(`   內容預覽:\n${basePrompt.substring(0, 300)}...\n`);

// 2. DeepSeek 增強（模擬）
const enhancedData = {
  characterBase: 'young Asian person with short black hair, round face, friendly smile, casual style',
  outfit: 'plain white t-shirt, no patterns',
  expressions: {
    '早安': 'stretching both arms high above head, eyes half-closed with sleepy smile, yawning slightly, morning energy building up'
  }
};

const characterBase = enhancedData.characterBase || '';
const enhancedExpression = enhancedData.expressions?.[expression] || '';

const deepseekAddition = `

=== DEEPSEEK DYNAMIC ENHANCEMENT ===
Character features: ${characterBase}
Expression detail: ${enhancedExpression}`;

console.log('\n📝 2. DeepSeek 增強部分');
console.log(`   字元數: ${deepseekAddition.length}`);
console.log(`   內容: ${deepseekAddition.trim()}\n`);

// 3. 最終要求（absoluteRequirements）- V8.0 極簡版
const absoluteRequirements = `

CRITICAL: Transparent BG (alpha=0), NO white/gray, NO circular frames, Character ID:${characterID} same face, warm peachy skin tone consistent`;

console.log('\n📝 3. 最終要求 (absoluteRequirements)');
console.log(`   字元數: ${absoluteRequirements.length}`);
console.log(`   內容: ${absoluteRequirements.trim()}\n`);

// 4. 最終完整 Prompt
const finalPrompt = basePrompt + deepseekAddition + absoluteRequirements;

console.log('\n' + '='.repeat(70));
console.log('\n🎯 最終完整 Prompt 統計：\n');
console.log(`📏 基礎 Prompt:           ${basePrompt.length.toString().padStart(5)} 字元`);
console.log(`📏 DeepSeek 增強:         ${deepseekAddition.length.toString().padStart(5)} 字元`);
console.log(`📏 最終要求:              ${absoluteRequirements.length.toString().padStart(5)} 字元`);
console.log(`${'─'.repeat(40)}`);
console.log(`📏 總計:                  ${finalPrompt.length.toString().padStart(5)} 字元`);

console.log('\n💡 分析：');
console.log(`   - V7.0 宣稱「從 1300字 → 700字」`);
console.log(`   - 實際基礎 Prompt: ${basePrompt.length} 字元`);
console.log(`   - 加上 DeepSeek + 最終要求後: ${finalPrompt.length} 字元`);

if (finalPrompt.length > 1300) {
  console.log(`   ⚠️  實際超過 1300 字元！`);
} else if (finalPrompt.length > 700) {
  console.log(`   ⚠️  實際超過 700 字元目標！`);
} else {
  console.log(`   ✅ 符合 700 字元目標！`);
}

console.log('\n🔍 檢查是否使用精簡版 FRAMING：');
if (basePrompt.includes('CRITICAL MEASUREMENTS')) {
  console.log(`   ❌ 使用了完整版 FRAMING (720 字元)`);
} else if (basePrompt.includes('Waist up, 25% head')) {
  console.log(`   ✅ 使用了精簡版 FRAMING (52 字元)`);
} else {
  console.log(`   ⚠️  無法判斷`);
}

console.log('\n📄 完整 Prompt 內容：');
console.log('='.repeat(70));
console.log(finalPrompt);
console.log('='.repeat(70));
console.log('\n');

