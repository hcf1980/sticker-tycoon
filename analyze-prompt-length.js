/**
 * 分析 Prompt 各區塊字元數
 */

const {
  StickerStyles,
  StyleEnhancer,
  FramingTemplates,
  ExpressionEnhancer,
  SceneTemplates
} = require('./functions/sticker-styles');

// 選擇一個典型的例子來分析
const style = 'cute';
const expression = '早安';
const characterID = 'test123456';

const styleConfig = StickerStyles[style];
const styleEnhance = StyleEnhancer[style];
const framing = FramingTemplates.halfbody;
const expressionData = ExpressionEnhancer[expression];
const decoration = SceneTemplates.kawaii;

// 計算各區塊字元數
const blocks = {
  '1️⃣ promptBase (基礎風格描述)': styleConfig.promptBase.trim(),
  '2️⃣ coreStyle (核心風格)': styleEnhance.coreStyle,
  '3️⃣ lighting (光線設定)': styleEnhance.lighting,
  '4️⃣ composition (構圖)': styleEnhance.composition,
  '5️⃣ brushwork (筆觸)': styleEnhance.brushwork,
  '6️⃣ mood (氛圍)': styleEnhance.mood,
  '7️⃣ colorPalette (色彩)': styleEnhance.colorPalette,
  '8️⃣ forbidden (禁止元素)': styleEnhance.forbidden,
  '9️⃣ reference (參考)': styleEnhance.reference,
  '[object Object] action (表情動作)': expressionData.action,
  '1️⃣1️⃣ decorations (裝飾元素)': expressionData.decorations,
  '1️⃣2️⃣ FRAMING 完整版': framing.promptAddition?.trim() || '',
  '1️⃣3️⃣ FRAMING 精簡版': framing.compactPrompt || 'Waist up, 25% head, hands visible, 85% vertical fill',
  '1️⃣4️⃣ 固定模板文字': `LINE sticker from photo: 

🎨 STYLE: 
Lighting:  | 
Colors: 
Avoid: 

😊 EXPRESSION: 
Clear pose, readable at small size

🎀 DECORATIONS: 
Dynamic layout, varied sizes

👤 CHARACTER (ID: ):
- Copy exact face/hair from photo
- Colorful casual outfit
- Consistent across set

🖼️ FRAMING: 

📐 SIZE: 370x320px LINE sticker
- Character fills 85-90% of frame
- 10px safe margin
- Transparent background (alpha=0)
- Thick outlines for small size

OUTPUT:  style, transparent BG, 370x320px`
};

console.log('\n📊 Prompt 各區塊字元數分析\n');
console.log('='.repeat(70));

const results = Object.entries(blocks).map(([name, content]) => {
  const length = content.length;
  const preview = content.substring(0, 80).replace(/\n/g, ' ').replace(/\s+/g, ' ');
  return { name, length, preview };
});

// 按字元數排序
results.sort((a, b) => b.length - a.length);

let totalChars = 0;
results.forEach((item, index) => {
  totalChars += item.length;
  const percentage = ((item.length / 2000) * 100).toFixed(1); // 假設總長約2000字元
  console.log(`\n${index + 1}. ${item.name}`);
  console.log(`   📏 字元數: ${item.length} (約${percentage}%)`);
  console.log(`   📝 預覽: ${item.preview}...`);
});

console.log('\n' + '='.repeat(70));
console.log('\n🏆 TOP 3 最長區塊：\n');
results.slice(0, 3).forEach((item, index) => {
  const percentage = ((item.length / totalChars) * 100).toFixed(1);
  console.log(`${index + 1}. ${item.name}`);
  console.log(`   ${item.length} 字元 (佔總長 ${percentage}%)`);
});

console.log(`\n📊 總字元數: ${totalChars}`);
console.log('\n💡 建議：如果要精簡 Prompt，優先從 TOP 3 區塊下手！\n');

