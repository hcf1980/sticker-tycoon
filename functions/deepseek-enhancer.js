/**
 * DeepSeek Expression Enhancer
 * 使用 DeepSeek API 動態優化表情描述
 * 讓每組貼圖的風格更有變化，同時保持一致性
 */

const axios = require('axios');

// DeepSeek API 設定
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://tbnx.plus7.plus/v1/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

/**
 * 檢查 DeepSeek API 是否可用
 */
function isDeepSeekAvailable() {
  return !!(DEEPSEEK_API_KEY && DEEPSEEK_API_URL);
}

/**
 * 🎨 使用 DeepSeek 動態優化表情描述
 * 
 * @param {string} style - 貼圖風格 (cute/cool/funny 等)
 * @param {string[]} expressions - 原始表情列表
 * @param {string} characterID - 角色一致性 ID
 * @returns {Object} 優化後的表情描述 Map
 */
async function enhanceExpressions(style, expressions, characterID) {
  if (!isDeepSeekAvailable()) {
    console.log('⚠️ DeepSeek API 未設定，使用預設表情描述');
    return null;
  }

  console.log(`🧠 使用 DeepSeek 優化表情描述...`);
  console.log(`🎨 風格：${style}`);
  console.log(`🆔 角色 ID：${characterID}`);
  console.log(`📝 表情數量：${expressions.length}`);

  const prompt = `你是一位專業的 LINE 貼圖設計師，請幫我優化以下表情描述。

## 任務
為以下表情生成**英文描述**，用於 AI 圖片生成。

## 要求
1. 每個表情描述要**生動、具體、有創意**
2. 保持整組貼圖的**風格一致性**（角色 ID: ${characterID}）
3. 描述要適合 ${style} 風格
4. 每個描述約 15-25 個英文單詞
5. 加入**隨機元素**讓每次生成都有變化（如不同手勢、小道具、背景元素暗示）
6. 但保持角色的**服裝、髮型、體型**描述一致

## 風格說明
${getStyleDescription(style)}

## 需要優化的表情
${expressions.map((exp, i) => `${i + 1}. ${exp}`).join('\n')}

## 輸出格式（JSON）
請直接輸出 JSON 物件，不要其他說明：
{
  "characterBase": "（20字內的角色基本特徵描述，所有表情共用）",
  "expressions": {
    "表情1": "英文描述...",
    "表情2": "英文描述..."
  }
}`;

  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a creative LINE sticker designer. Output valid JSON only, no markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8, // 增加隨機性
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const content = response.data.choices[0].message.content;
    console.log('📥 DeepSeek 回應:', content.substring(0, 200) + '...');

    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('無法解析 JSON 回應');
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log('✅ 表情優化完成！');
    console.log(`📝 角色基礎：${result.characterBase}`);
    
    return result;

  } catch (error) {
    console.error('❌ DeepSeek API 錯誤:', error.message);
    if (error.response) {
      console.error('📋 錯誤詳情:', JSON.stringify(error.response.data).substring(0, 500));
    }
    return null;
  }
}

/**
 * 取得風格描述（給 DeepSeek 參考）
 */
function getStyleDescription(style) {
  const descriptions = {
    cute: '可愛風 - 圓潤造型、大眼睛、粉嫩色調、療癒系、kawaii 風格',
    cool: '酷炫風 - 帥氣動感、潮流街頭、大膽配色、自信表情',
    funny: '搞笑風 - 誇張表情、幽默搞怪、喜劇效果、迷因風格',
    simple: '簡約風 - 極簡線條、乾淨設計、優雅簡潔',
    anime: '動漫風 - 日系風格、漫畫表現、動態感、閃亮眼睛',
    pixel: '像素風 - 復古 8-bit、像素藝術、遊戲懷舊感',
    watercolor: '水彩風 - 柔和筆觸、夢幻氛圍、藝術手繪感',
    doodle: '塗鴉風 - 隨性手繪、素描線條、筆記本塗鴉感'
  };
  return descriptions[style] || descriptions.cute;
}

/**
 * 🎯 生成優化後的 Prompt
 */
function buildEnhancedPrompt(basePrompt, enhancedData, expression) {
  if (!enhancedData) {
    return basePrompt;
  }

  const characterBase = enhancedData.characterBase || '';
  const enhancedExpression = enhancedData.expressions[expression] || expression;

  return `${basePrompt}

=== DYNAMIC CHARACTER DETAILS ===
${characterBase}

=== ENHANCED EXPRESSION ===
${enhancedExpression}`;
}

module.exports = {
  isDeepSeekAvailable,
  enhanceExpressions,
  getStyleDescription,
  buildEnhancedPrompt
};

