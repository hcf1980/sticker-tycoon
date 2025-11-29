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
    promptBase: `
      cute kawaii chibi style, rounded shapes, oversized sparkling eyes,
      soft pastel palette, glossy highlights, warm ambient lighting,
      thick clean outline, high charm factor, simplified sticker-friendly composition
    `,
    negativePrompt: `
      realistic, scary, dark, horror, violent,
      cluttered background, detailed scenery, text, watermark
    `
  },

  cool: {
    id: 'cool',
    name: '酷炫風',
    emoji: '😎',
    description: '帥氣、動感、潮流感',
    promptBase: `
      cool stylish character, bold neon colors, dramatic rim light,
      dynamic action pose, street-fashion vibes,
      sharp outline, high contrast shading, energetic composition
    `,
    negativePrompt: `
      cute, childish, boring, static pose,
      realism, dull colors, low contrast
    `
  },

  funny: {
    id: 'funny',
    name: '搞笑風',
    emoji: '🤣',
    description: '誇張表情、幽默感、搞怪',
    promptBase: `
      funny cartoon style, extreme exaggerated facial expressions,
      comedic timing pose, distorted proportions, meme-style humor,
      bold lines, bright punchy colors, high emotional clarity
    `,
    negativePrompt: `
      serious, realistic anatomy, elegant style,
      low energy, subtle expression
    `
  },

  simple: {
    id: 'simple',
    name: '簡約風',
    emoji: '✨',
    description: '線條簡潔、極簡設計、清新',
    promptBase: `
      minimalist flat line art style, soft clean lines,
      super simple shapes, limited calm color palette,
      modern graphic-design look, high readability sticker design
    `,
    negativePrompt: `
      detailed, textured, realistic shading,
      busy composition, gradients
    `
  },

  anime: {
    id: 'anime',
    name: '動漫風',
    emoji: '🎌',
    description: '日系動漫、漫畫風格',
    promptBase: `
      anime manga style, vivid cel shading, expressive anime eyes,
      clean dynamic outlines, saturated colors, high energy pose,
      iconic anime highlight, polished character silhouette
    `,
    negativePrompt: `
      3D render, western cartoon, realism,
      grainy shading, muddy colors
    `
  },

  pixel: {
    id: 'pixel',
    name: '像素風',
    emoji: '👾',
    description: '復古像素、8-bit 風格',
    promptBase: `
      pixel art 8-bit retro style, clean pixel clusters,
      nostalgic game palette, center simple shape,
      clear silhouette, limited color blocks, crisp pixel edges
    `,
    negativePrompt: `
      smooth gradient, high resolution shading,
      anti-aliased edges, realistic textures
    `
  },

  watercolor: {
    id: 'watercolor',
    name: '水彩風',
    emoji: '🎨',
    description: '柔和水彩、藝術感',
    promptBase: `
      watercolor illustration style, soft bleeding pigments,
      natural brush texture, dreamy pastel wash,
      hand-painted feel, airy composition, gentle outlines
    `,
    negativePrompt: `
      sharp edges, flat digital colors,
      vector lines, solid hard shadows
    `
  },

  doodle: {
    id: 'doodle',
    name: '塗鴉風',
    emoji: '✏️',
    description: '手繪塗鴉、隨性可愛',
    promptBase: `
      hand-drawn doodle sketch style, imperfect charming strokes,
      notebook doodle vibe, naive line expression,
      playful loose composition, rough cute shapes
    `,
    negativePrompt: `
      polished, perfect shapes, digital clean shading,
      complex background, realistic proportions
    `
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
 * 🌍 場景/配件模板
 * 用戶可選擇場景，DeepSeek 會根據場景生成對應的動作/配件描述
 * 注意：背景仍然是透明的，只是動作和配件會參考場景
 */
const SceneTemplates = {
  none: {
    id: 'none',
    name: '無場景',
    emoji: '✨',
    description: '純淨簡約，無特殊場景',
    promptHint: 'simple clean pose, no props, no accessories',
    suggestedProps: []
  },
  office: {
    id: 'office',
    name: '辦公室',
    emoji: '💼',
    description: '上班族日常、辦公室場景',
    promptHint: 'office worker pose, business casual style',
    suggestedProps: ['laptop', 'coffee cup', 'documents', 'pen', 'phone']
  },
  travel_asia: {
    id: 'travel_asia',
    name: '亞洲旅遊',
    emoji: '🏯',
    description: '亞洲景點打卡（中正紀念堂、魚尾獅等）',
    promptHint: 'tourist pose, travel photo style, sightseeing gesture',
    suggestedProps: ['camera', 'peace sign', 'map', 'backpack', 'souvenir']
  },
  travel_europe: {
    id: 'travel_europe',
    name: '歐洲旅遊',
    emoji: '🗼',
    description: '歐洲景點打卡（羅浮宮、艾菲爾鐵塔等）',
    promptHint: 'elegant tourist pose, artistic photo style',
    suggestedProps: ['camera', 'beret', 'croissant', 'wine glass', 'art book']
  },
  fitness: {
    id: 'fitness',
    name: '運動健身',
    emoji: '💪',
    description: '健身、瑜伽、運動場景',
    promptHint: 'athletic pose, energetic sports gesture',
    suggestedProps: ['dumbbell', 'yoga mat', 'water bottle', 'towel', 'headband']
  },
  food: {
    id: 'food',
    name: '美食饗宴',
    emoji: '🍜',
    description: '吃貨日常、美食場景',
    promptHint: 'foodie pose, eating gesture, happy dining',
    suggestedProps: ['chopsticks', 'fork', 'bowl', 'cup', 'chef hat']
  },
  music: {
    id: 'music',
    name: '音樂表演',
    emoji: '🎤',
    description: '唱歌、演奏、音樂場景',
    promptHint: 'performer pose, singing or playing instrument gesture',
    suggestedProps: ['microphone', 'guitar', 'headphones', 'music notes']
  },
  relaxing: {
    id: 'relaxing',
    name: '居家放鬆',
    emoji: '🛋️',
    description: '在家耍廢、追劇、放鬆',
    promptHint: 'relaxed lazy pose, cozy at home gesture',
    suggestedProps: ['pillow', 'blanket', 'snacks', 'remote control', 'slippers']
  },
  celebration: {
    id: 'celebration',
    name: '節慶派對',
    emoji: '🎉',
    description: '生日、節日、慶祝場景',
    promptHint: 'celebration pose, party gesture, festive mood',
    suggestedProps: ['party hat', 'balloon', 'confetti', 'gift box', 'cake']
  },
  custom: {
    id: 'custom',
    name: '自訂場景',
    emoji: '✏️',
    description: '自己描述想要的場景',
    promptHint: '',
    suggestedProps: []
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
 * 🎯 生成照片貼圖的增強 Prompt V3.0
 * - 透明背景
 * - 風格差異化（StyleEnhancer）
 * - 角色一致性
 * - 場景/配件支援（V3.1）
 */
function generatePhotoStickerPromptV2(style, expression, characterID = null, sceneConfig = null) {
  const styleConfig = StickerStyles[style] || StickerStyles.cute;
  const styleEnhance = StyleEnhancer[style] || StyleEnhancer.cute;
  const expressionEnhance = ExpressionEnhancer[expression] || expression;

  // 場景配置（如果有）
  const scene = sceneConfig || { promptHint: '', suggestedProps: [] };
  const scenePrompt = scene.promptHint ? `\n- SCENE CONTEXT: ${scene.promptHint}` : '';
  const propsPrompt = scene.suggestedProps?.length > 0
    ? `\n- MAY INCLUDE PROPS: ${scene.suggestedProps.slice(0, 2).join(', ')} (optional, small and simple)`
    : '';

  const prompt = `Transform this photo into a LINE sticker illustration.

=== 🎨 ART STYLE: ${styleConfig.name} (${style.toUpperCase()}) ===
${styleConfig.promptBase}

STYLE DETAILS:
- Lighting: ${styleEnhance.lighting}
- Composition: ${styleEnhance.composition}
- Brushwork: ${styleEnhance.brushwork}
- Mood: ${styleEnhance.mood}

=== 😊 EXPRESSION: ${expression} ===
${expressionEnhance}
- Show emotion through FACE and HAND GESTURE
- Make expression clear and exaggerated for sticker use${scenePrompt}${propsPrompt}

=== 👤 CHARACTER (MUST BE CONSISTENT) ===
Character ID: ${characterID || 'default'}
- Copy EXACT face from photo: same face shape, eyes, nose, mouth
- Copy EXACT hairstyle and hair color from photo
- SAME outfit in ALL stickers: plain white t-shirt, NO patterns
- Upper body only (head to chest)

=== ⚠️ TECHNICAL REQUIREMENTS (STRICT) ===
1. BACKGROUND: 100% TRANSPARENT (alpha=0) - NO white, NO gray, NO color
2. T-SHIRT: Solid pure white (#FFFFFF), NO patterns, NO stripes
3. OUTLINES: Thick black lines (2-3px) for visibility
4. COMPOSITION: Centered, fills 70-80% of canvas
5. NO TEXT: Zero letters, numbers, symbols, watermarks
6. IMAGE SIZE: 370px width × 320px height

=== 🚫 ABSOLUTELY FORBIDDEN (一致性必須遵守) ===
- NO circular frame, NO round border, NO circle crop, NO vignette
- NO profile picture style, NO avatar circle
- Character must be FREE-FLOATING on transparent background
- NO decorative borders or frames of any kind

=== 🎨 COLOR CONSISTENCY (必須一致) ===
- SKIN TONE: Warm peachy-beige (#FFCCAA to #FFE4C4), consistent across ALL stickers
- HAIR COLOR: Same exact color in ALL stickers (copy from photo)
- CHEEKS: Soft pink blush (#FFB6C1) for cute expressions
- EYES: Same eye color in ALL stickers
- HIGH SATURATION: Vivid colors, not pale or washed out
- HIGH CONTRAST: Strong light/dark distinction

CRITICAL:
- Background MUST be fully transparent (PNG cutout style)
- NO circular frames or borders
- Same skin tone, hair color, eye color in EVERY sticker

OUTPUT: ${styleConfig.name} LINE sticker, 370x320px, TRANSPARENT background, NO frame, consistent ${expression} face.`;

  const negativePrompt = `
    white background, gray background, colored background, solid background,
    circular frame, round border, circle crop, avatar style, profile picture frame, vignette,
    decorative border, ornamental frame,
    patterned shirt, striped shirt, printed shirt, gray shirt,
    text, words, letters, numbers, watermark, logo,
    full body, legs, feet,
    different face, inconsistent character, different skin tone, pale skin, gray skin,
    realistic photo, 3D render
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
 * 取得所有場景模板
 */
function getAllSceneTemplates() {
  return Object.values(SceneTemplates);
}

/**
 * 取得場景配置
 */
function getSceneConfig(sceneId) {
  return SceneTemplates[sceneId] || SceneTemplates.none;
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
  SceneTemplates,
  generateCharacterID,
  generateStickerPrompt,
  generateStickerPromptV2,
  generatePhotoStickerPromptV2,
  getAllStyles,
  getAllExpressionTemplates,
  getAllSceneTemplates,
  getSceneConfig,
  getExpressionEnhancement,
  getStyleEnhancement,
  LineStickerSpecs
};

