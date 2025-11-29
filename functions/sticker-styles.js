/**
 * Sticker Styles Module v2.0
 * 定義各種貼圖風格和對應的 AI 提示詞
 *
 * 新增功能：
 * - Character Identity Generator（角色一致性系統）
 * - Style Enhancement Presets（風格強化層）
 * - Expression Enhancer（表情增強系統）
 */

const crypto = require('crypto');

// ============================================
// 1️⃣ Character Identity Generator（角色一致性系統）
// ============================================

/**
 * 依角色文字描述生成一個固定的身份代碼
 * 讓同一描述永遠產生相同的 identity code
 */
function generateCharacterID(characterDescription) {
  return crypto.createHash('md5')
    .update(characterDescription)
    .digest('hex')
    .slice(0, 12); // 12碼 identity code
}

// ============================================
// 2️⃣ Style Enhancement Presets（風格強化層）
// ============================================

const StyleEnhancer = {
  cute: {
    lighting: "soft ambient lighting, gentle bounce light, warm glow",
    composition: "round composition, centered, thick outline, balanced proportions",
    brushwork: "smooth soft shading, glossy highlights, clean edges",
    mood: "warm cozy atmosphere, heartwarming feeling"
  },
  cool: {
    lighting: "strong rim light, neon glowing edges, dramatic shadows, high contrast",
    composition: "dynamic diagonal composition, energetic silhouette, bold framing",
    brushwork: "bold sharp strokes, high contrast shading, defined edges",
    mood: "powerful confident atmosphere, street style energy"
  },
  funny: {
    lighting: "flat comedy lighting, simple shadows, bright overall",
    composition: "exaggerated distorted perspective, off-center for comedy effect",
    brushwork: "cartoon bold strokes, over-expressive lines, wobbly outlines",
    mood: "chaotic, humorous, playful vibes, meme energy"
  },
  simple: {
    lighting: "minimal soft lighting, flat illumination",
    composition: "clean centered flat layout, geometric balance",
    brushwork: "thin vector-like lines, minimal shading, crisp edges",
    mood: "clean modern neutral tone, sophisticated simplicity"
  },
  anime: {
    lighting: "vivid anime highlight, cel shading, dramatic rim light",
    composition: "strong silhouette, clean framing, dynamic angles",
    brushwork: "cel-shaded edges, gradient hair highlights, smooth color blocks",
    mood: "energetic dramatic anime style, Japanese illustration feel"
  },
  pixel: {
    lighting: "pixel shading blocks, dithering effects",
    composition: "8-bit center framing, grid-aligned positioning",
    brushwork: "pixel clusters, clean grid alignment, limited color dithering",
    mood: "retro gaming charm, nostalgic 8-bit aesthetic"
  },
  watercolor: {
    lighting: "soft natural lighting, diffused glow",
    composition: "organic flowing shapes, asymmetric beauty",
    brushwork: "bleeding pigments, textured watercolor paper, wet-on-wet effects",
    mood: "calm dreamy softness, artistic tranquility"
  },
  doodle: {
    lighting: "hand-drawn naive shading, casual light source",
    composition: "loose sketchy framing, organic placement",
    brushwork: "imperfect uneven pen strokes, charming wobbles",
    mood: "casual fun notebook style, spontaneous creativity"
  }
};

// ============================================
// 3️⃣ Expression Enhancer（表情增強系統）
// ============================================

const ExpressionEnhancer = {
  // 基本日常
  "開心": "wide genuine smile, bright sparkling eyes, cheerful pose, radiating joy",
  "開心打招呼": "waving hand, warm smile, friendly welcoming pose, bright eyes",
  "大笑": "open-mouth laughing, squinting happy eyes, high energy, body shaking with laughter",
  "哭泣": "teary eyes, trembling lips, emotional expression, tears streaming down",
  "生氣": "angry furrowed eyebrows, strong frowning mouth, tense pose, steam effect",
  "驚訝": "wide-open shocked eyes, dropped jaw, hands up in surprise, dramatic reaction",
  "愛心眼": "heart-shaped sparkling eyes, blushing cheeks, overwhelmed with love",
  "睡覺": "closed peaceful eyes, zzz bubbles, relaxed sleeping pose, drooling slightly",
  "加油": "fist pump pose, determined expression, motivational energy, confident stance",

  // 可愛表情
  "賣萌": "puppy dog eyes, pouty lips, head tilt, irresistibly cute pose",
  "害羞": "blushing red cheeks, shy downward gaze, fidgeting hands, timid smile",
  "撒嬌": "clingy adorable pose, pleading eyes, cute pouting, wanting attention",
  "委屈": "teary puppy eyes, quivering lip, pitiful expression, seeking comfort",
  "興奮": "sparkling excited eyes, jumping pose, overwhelming enthusiasm, vibrating energy",
  "期待": "hopeful shining eyes, leaning forward eagerly, anticipating expression",
  "無奈": "sighing expression, drooping shoulders, exasperated look, sweat drop",
  "謝謝": "grateful bow, warm appreciative smile, hands together, heartfelt thanks",

  // 辦公室
  "OK": "confident OK hand sign, assured smile, thumbs up energy",
  "讚": "enthusiastic thumbs up, approving smile, encouraging expression",
  "加班中": "tired but determined eyes, coffee cup, late night working pose",
  "累了": "exhausted droopy eyes, slumped posture, desperately tired expression",
  "開會": "serious focused expression, professional pose, attentive listening",
  "截止日": "panicked stressed expression, sweating, racing against time",
  "薪水": "money eyes, excited greedy expression, payday happiness",
  "下班": "relieved happy expression, freedom pose, escaping work joy",

  // 社交常用
  "抱歉": "apologetic bow, sorry expression, regretful eyes, humble pose",
  "沒問題": "confident reassuring smile, no worries gesture, easygoing pose",
  "好的": "agreeable nodding, affirmative expression, understanding smile",
  "等等": "hand up stop gesture, patient expression, asking to wait",
  "再見": "waving goodbye, bittersweet smile, farewell gesture",
  "晚安": "sleepy peaceful expression, yawning, ready for bed pose",
  "早安": "fresh morning energy, stretching awake, bright greeting smile",

  // 戀愛日常
  "愛你": "heart hands gesture, loving gaze, deeply affectionate expression",
  "想你": "longing distant gaze, hand on heart, missing you expression",
  "抱抱": "arms open wide for hug, warm inviting expression, seeking embrace",
  "親親": "puckered kiss lips, blowing kiss, loving smooch expression",
  "吃醋": "jealous pouting, side-eye glare, envious sulking expression",
  "約會": "excited dressed up, anticipating love, romantic readiness",

  // 心情寫照
  "難過": "downcast sad eyes, frowning, melancholy expression, heavy heart",
  "焦慮": "worried nervous expression, biting nails, anxious fidgeting",
  "放鬆": "peaceful calm expression, zen pose, stress-free contentment",
  "無聊": "bored blank stare, yawning, listless expression, killing time",
  "困惑": "confused tilted head, question marks, puzzled expression"
};

// ============================================
// 貼圖風格定義（基礎版）
// ============================================

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
 * 生成完整的 AI 提示詞（舊版，保留向後兼容）
 */
function generateStickerPrompt(style, characterDescription, expression) {
  const styleConfig = StickerStyles[style] || StickerStyles.cute;

  return {
    prompt: `${styleConfig.promptBase}, ${characterDescription}, showing expression: ${expression}, sticker design, transparent background, PNG format, centered composition, high quality illustration`,
    negativePrompt: `${styleConfig.negativePrompt}, text, watermark, signature, border, frame, background scenery, multiple characters`
  };
}

/**
 * 🎯 生成完整的 AI 提示詞 V2（增強版）
 * 包含：角色一致性、風格強化、表情增強
 */
function generateStickerPromptV2(style, characterDescription, expression) {
  const styleConfig = StickerStyles[style] || StickerStyles.cute;
  const styleEnhance = StyleEnhancer[style] || StyleEnhancer.cute;
  const expressionEnhance = ExpressionEnhancer[expression] || expression;

  // 產生固定角色識別碼（確保一致性）
  const characterID = generateCharacterID(characterDescription);

  const prompt = `
    ${styleConfig.promptBase},

    LIGHTING: ${styleEnhance.lighting},
    COMPOSITION: ${styleEnhance.composition},
    BRUSHWORK: ${styleEnhance.brushwork},
    MOOD: ${styleEnhance.mood},

    CONSISTENT CHARACTER IDENTITY CODE: ${characterID},
    CHARACTER: ${characterDescription},

    EXPRESSION: ${expressionEnhance},
    EMOTION: ${expression},

    high-charm factor, expressive pose,
    LINE-sticker optimized clarity,
    transparent background,
    sticker illustration, high readability,
    thick clean outline, vector-friendly quality,
    visually iconic mascot design,
    single character only, centered composition
  `.replace(/\s+/g, ' ').trim();

  const negativePrompt = `
    ${styleConfig.negativePrompt},
    clutter, dull colors, text, watermark, signature,
    realistic anatomy, ultra-realism, photorealistic,
    multiple characters, messy background, complex background,
    inconsistent character features, deformed, bad anatomy,
    low-resolution, blurry, pixelated, jpeg artifacts,
    border, frame, logo, words, letters, caption
  `.replace(/\s+/g, ' ').trim();

  return {
    prompt,
    negativePrompt,
    characterID
  };
}

/**
 * 🎯 生成照片貼圖的增強 Prompt V2.2
 * 專門用於從照片生成貼圖，保留臉部特徵
 *
 * 符合 LINE Creators Market 審核準則
 */
function generatePhotoStickerPromptV2(style, expression, characterID = null) {
  const styleConfig = StickerStyles[style] || StickerStyles.cute;
  const styleEnhance = StyleEnhancer[style] || StyleEnhancer.cute;
  const expressionEnhance = ExpressionEnhancer[expression] || expression;

  const prompt = `Create a LINE sticker from this photo.

=== 🚨 LINE CREATORS MARKET REVIEW GUIDELINES ===
REJECTION REASONS TO AVOID:
1. Background NOT transparent → REJECTED (Rule 1.1)
2. Hard to recognize/too small → REJECTED (Rule 1.3)
3. Unbalanced colors (all light/pale) → REJECTED (Rule 1.4)
4. Contains ANY text/letters → REJECTED (Rule 1.6, 1.7)
5. Not suitable for chat/communication → REJECTED (Rule 1.2)
6. Violent/inappropriate content → REJECTED (Rule 3.x)

=== ⚠️ ABSOLUTE REQUIREMENTS ===
1. TRANSPARENT BACKGROUND - pure alpha channel, NOT white, NOT gray
2. PLAIN WHITE T-SHIRT - absolutely NO patterns, NO stripes, NO prints
3. CHARACTER ID: ${characterID || 'default'} - same person in all stickers
4. UPPER BODY ONLY - head to chest, easy to see in small chat bubbles
5. NO TEXT AT ALL - zero letters, numbers, words, symbols
6. HIGH CONTRAST COLORS - visible at small sizes, not all pale/light
7. SUITABLE FOR CHAT - friendly, expressive, communication-ready

=== CHARACTER CONSISTENCY ===
- EXACT face from photo: shape, eyes, nose, mouth, skin tone
- EXACT hairstyle and hair color (no changes)
- EXACT same plain white t-shirt across ALL stickers
- SAME body proportions

=== STYLE: ${styleConfig.name} ===
${styleConfig.promptBase}
Lighting: ${styleEnhance.lighting}
Mood: ${styleEnhance.mood}

=== EXPRESSION: ${expression} ===
${expressionEnhance}
- Clear emotion visible even at small size
- Expressive face + simple hand gestures
- Friendly and appropriate for all ages

=== TECHNICAL SPECS (LINE Official) ===
- Max size: 370 × 320 pixels
- Format: PNG with TRANSPARENT background
- Margin: 10px padding
- Character fills 70-80% of canvas, centered
- Thick BLACK outlines for visibility
- Vibrant colors with good contrast

=== CONTENT GUIDELINES ===
✓ Friendly, positive, suitable for chat
✓ Clear expression readable at small size
✓ Balanced colors (not all pale)
✗ NO violence, weapons, blood
✗ NO inappropriate/adult content
✗ NO political/religious symbols
✗ NO real brand logos or trademarks

OUTPUT: Single LINE sticker with TRANSPARENT background, PLAIN WHITE T-SHIRT, clear expression, NO text.`;

  const negativePrompt = `
    white background, gray background, colored background, solid background, any background color,
    patterned clothing, striped shirt, printed shirt, decorated clothing, logo on shirt,
    text, words, letters, numbers, caption, watermark, signature, logo, brand,
    multiple characters, complex background, scenery, landscape,
    realistic photo, photorealistic, 3D render,
    different face, inconsistent features, wrong identity,
    full body, legs, feet, distant view, tiny character,
    violence, weapons, blood, adult content, inappropriate,
    pale colors only, low contrast, hard to see,
    political symbols, religious symbols, trademarks
  `.replace(/\s+/g, ' ').trim();

  return {
    prompt,
    negativePrompt
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
 * 取得表情增強描述
 */
function getExpressionEnhancement(expression) {
  return ExpressionEnhancer[expression] || expression;
}

/**
 * 取得風格增強設定
 */
function getStyleEnhancement(style) {
  return StyleEnhancer[style] || StyleEnhancer.cute;
}

/**
 * LINE 貼圖官方規格
 * 來源：https://creator.line.me/zh-hant/guideline/sticker/
 */
const LineStickerSpecs = {
  // 主要圖片（必須）
  mainImage: {
    width: 240,
    height: 240,
    description: '貼圖組封面圖'
  },

  // 貼圖圖片（必須）
  stickerImage: {
    maxWidth: 370,
    maxHeight: 320,
    description: '單張貼圖最大尺寸'
  },

  // 聊天室標籤圖片（必須）
  tabImage: {
    width: 96,
    height: 74,
    description: '聊天室貼圖選單標籤'
  },

  // 通用規格
  padding: 10,              // 留白邊距（px）
  format: 'PNG',            // 圖檔格式
  colorMode: 'RGB',         // 色彩模式
  minDpi: 72,               // 最低解析度
  maxFileSize: 1024 * 1024, // 單張最大 1MB
  maxZipSize: 60 * 1024 * 1024, // ZIP 最大 60MB

  // 可選數量
  validCounts: [8, 16, 24, 32, 40],

  // 文字限制
  textLimits: {
    creatorName: 50,        // 創意人名稱
    stickerName: 40,        // 貼圖名稱
    description: 160,       // 貼圖說明
    copyright: 50           // 版權標記（英文或數字）
  },

  // ZIP 檔案命名規則
  fileNaming: {
    main: 'main.png',       // 主要圖片
    tab: 'tab.png',         // 標籤圖片
    sticker: (index) => `${String(index).padStart(2, '0')}.png` // 01.png, 02.png, ...
  }
};

module.exports = {
  StickerStyles,
  StyleEnhancer,
  ExpressionEnhancer,
  DefaultExpressions,
  generateCharacterID,
  generateStickerPrompt,
  generateStickerPromptV2,
  generatePhotoStickerPromptV2,
  getAllStyles,
  getAllExpressionTemplates,
  getExpressionEnhancement,
  getStyleEnhancement,
  LineStickerSpecs
};

