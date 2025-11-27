/**
 * Sticker Styles Module
 * 定義各種貼圖風格和對應的 AI 提示詞
 */

// 貼圖風格定義
const StickerStyles = {
  cute: {
    id: 'cute',
    name: '可愛風',
    emoji: '🥰',
    description: '圓潤可愛、大眼睛、療癒系',
    promptBase: 'cute kawaii style, chibi character, rounded shapes, big sparkling eyes, soft pastel colors, adorable expression, simple clean lines',
    negativePrompt: 'realistic, scary, dark, violent, complex background'
  },
  cool: {
    id: 'cool',
    name: '酷炫風',
    emoji: '😎',
    description: '帥氣、動感、潮流感',
    promptBase: 'cool stylish character, dynamic pose, trendy street style, bold colors, confident expression, modern design',
    negativePrompt: 'cute, childish, boring, static'
  },
  funny: {
    id: 'funny',
    name: '搞笑風',
    emoji: '🤣',
    description: '誇張表情、幽默感、搞怪',
    promptBase: 'funny cartoon style, exaggerated expressions, humorous pose, comedic character, playful and silly, meme-worthy',
    negativePrompt: 'serious, realistic, elegant'
  },
  simple: {
    id: 'simple',
    name: '簡約風',
    emoji: '✨',
    description: '線條簡潔、極簡設計、清新',
    promptBase: 'minimalist line art style, simple clean design, minimal colors, elegant simplicity, modern flat design',
    negativePrompt: 'complex, detailed, cluttered, realistic'
  },
  anime: {
    id: 'anime',
    name: '動漫風',
    emoji: '🎌',
    description: '日系動漫、漫畫風格',
    promptBase: 'anime manga style, Japanese illustration, expressive anime eyes, vibrant colors, dynamic character design',
    negativePrompt: 'realistic, western cartoon, 3D render'
  },
  pixel: {
    id: 'pixel',
    name: '像素風',
    emoji: '👾',
    description: '復古像素、8-bit 風格',
    promptBase: 'pixel art style, retro 8-bit game character, pixelated, nostalgic gaming aesthetic, limited color palette',
    negativePrompt: 'smooth, realistic, high resolution, gradient'
  },
  watercolor: {
    id: 'watercolor',
    name: '水彩風',
    emoji: '🎨',
    description: '柔和水彩、藝術感',
    promptBase: 'watercolor illustration style, soft brush strokes, gentle color bleeding, artistic hand-painted look, dreamy atmosphere',
    negativePrompt: 'digital, sharp edges, flat colors'
  },
  doodle: {
    id: 'doodle',
    name: '塗鴉風',
    emoji: '✏️',
    description: '手繪塗鴉、隨性可愛',
    promptBase: 'hand-drawn doodle style, sketchy lines, casual and playful, notebook doodle aesthetic, imperfect charming lines',
    negativePrompt: 'polished, perfect, digital, complex'
  }
};

/**
 * 預設表情組合
 */
const DefaultExpressions = {
  basic: {
    id: 'basic',
    name: '基本日常',
    expressions: ['開心打招呼', '大笑', '哭泣', '生氣', '驚訝', '愛心眼', '睡覺', '加油']
  },
  cute: {
    id: 'cute',
    name: '可愛表情',
    expressions: ['賣萌', '害羞', '撒嬌', '委屈', '興奮', '期待', '無奈', '謝謝']
  },
  office: {
    id: 'office',
    name: '辦公室',
    expressions: ['OK', '讚', '加班中', '累了', '開會', '截止日', '薪水', '下班']
  },
  social: {
    id: 'social',
    name: '社交常用',
    expressions: ['謝謝', '抱歉', '沒問題', '好的', '等等', '再見', '晚安', '早安']
  },
  love: {
    id: 'love',
    name: '戀愛日常',
    expressions: ['愛你', '想你', '抱抱', '親親', '吃醋', '撒嬌', '害羞', '約會']
  },
  mood: {
    id: 'mood',
    name: '心情寫照',
    expressions: ['開心', '難過', '焦慮', '放鬆', '無聊', '興奮', '困惑', '滿足']
  }
};

/**
 * 生成完整的 AI 提示詞
 */
function generateStickerPrompt(style, characterDescription, expression) {
  const styleConfig = StickerStyles[style] || StickerStyles.cute;
  
  return {
    prompt: `${styleConfig.promptBase}, ${characterDescription}, showing expression: ${expression}, sticker design, transparent background, PNG format, centered composition, high quality illustration`,
    negativePrompt: `${styleConfig.negativePrompt}, text, watermark, signature, border, frame, background scenery, multiple characters`
  };
}

/**
 * 取得所有可用風格
 */
function getAllStyles() {
  return Object.values(StickerStyles);
}

/**
 * 取得所有表情模板
 */
function getAllExpressionTemplates() {
  return Object.values(DefaultExpressions);
}

/**
 * LINE 貼圖規格
 */
const LineStickerSpecs = {
  mainImage: { width: 240, height: 240 },
  stickerImage: { maxWidth: 370, maxHeight: 320 },
  tabImage: { width: 96, height: 74 },
  padding: 10,
  format: 'PNG',
  maxFileSize: 1024 * 1024,  // 1MB
  maxZipSize: 60 * 1024 * 1024,  // 60MB
  validCounts: [8, 16, 24, 32, 40]
};

module.exports = {
  StickerStyles,
  DefaultExpressions,
  generateStickerPrompt,
  getAllStyles,
  getAllExpressionTemplates,
  LineStickerSpecs
};

