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
  realistic: {
    lighting: "soft diffused beauty lighting, gentle fill light, flattering glow on face",
    composition: "beauty portrait framing, flawless skin focus, elegant proportions",
    brushwork: "smooth airbrushed skin, subtle pore texture, refined soft details",
    mood: "beauty camera aesthetic, youthful radiant glow, naturally enhanced look"
  },
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
  // ===== 基本日常（含 POP 文字建議）=====
  "早安": { action: "stretching arms up, bright morning smile, energetic wake-up pose", popText: "早安!!!", decorations: "sun rays, sparkles, musical notes" },
  "晚安": { action: "sleepy yawning, hands together by cheek, peaceful drowsy expression", popText: "晚安~", decorations: "moon, stars, zzz bubbles" },
  "Hi": { action: "cheerful waving hand high, bright smile, friendly greeting pose", popText: "Hi~", decorations: "colorful stars, sparkles" },
  "OK": { action: "confident OK hand gesture near face, winking, assured smile", popText: "OK!!!", decorations: "thumbs up emoji, check marks" },
  "Yes": { action: "enthusiastic fist pump, nodding head, victory pose", popText: "Yes!", decorations: "stars, confetti, exclamation marks" },
  "No": { action: "crossing arms in X shape, shaking head, firm refusal expression", popText: "No!!!", decorations: "X marks, stop signs" },
  "讚讚": { action: "double thumbs up high, big approving smile, encouraging pose", popText: "讚讚", decorations: "stars, sparkles, hearts" },
  "加油": { action: "fist pump with both hands, determined fierce expression, fighting pose", popText: "加油!!!", decorations: "flames, lightning bolts, stars" },

  // ===== 情緒表達 =====
  "開心": { action: "arms raised in celebration, jumping pose, radiating joy expression", popText: null, decorations: "confetti, stars, hearts" },
  "大笑": { action: "holding stomach laughing, tears of joy, body shaking with laughter", popText: "哈哈哈", decorations: "laughing emojis, tears" },
  "哭哭": { action: "covering face with hands, tears streaming down, sobbing pose", popText: "哭哭", decorations: "tear drops, sad cloud" },
  "生氣": { action: "stomping foot, clenched fists, angry red face, steam from ears", popText: "氣噗噗", decorations: "anger symbols, lightning" },
  "驚訝": { action: "hands on cheeks, wide open mouth, shocked jump back pose", popText: "天啊!", decorations: "exclamation marks, sweat drops" },
  "傻眼": { action: "blank stare, jaw dropped, frozen in disbelief pose", popText: "傻眼...", decorations: "dots, question marks" },

  // ===== 可愛撒嬌 =====
  "撒嬌": { action: "hands clasped pleading, puppy dog eyes, cute head tilt", popText: "拜託嘛~", decorations: "hearts, sparkles, cute flowers" },
  "害羞": { action: "covering blushing cheeks, shy side glance, fidgeting pose", popText: "害~", decorations: "pink hearts, blush marks" },
  "嘿嘿嘿": { action: "mischievous grin, fingers touching together, playful scheming pose", popText: "嘿嘿嘿", decorations: "sweat drop, sparkles" },
  "噓": { action: "finger on lips, winking, secretive quiet gesture", popText: "噓~", decorations: "speech bubble, dots" },
  "啾啾": { action: "blowing kiss with hand, puckered lips, sending love pose", popText: "啾啾", decorations: "flying hearts, kiss marks" },
  "抱抱": { action: "arms wide open, warm inviting smile, ready for hug pose", popText: "抱抱~", decorations: "hearts, warm glow" },

  // ===== 社交應答 =====
  "謝謝": { action: "hands together bow, grateful warm smile, appreciative pose", popText: "謝謝", decorations: "flowers, hearts, sparkles" },
  "Sorry": { action: "apologetic deep bow, regretful puppy eyes, hands pressed together", popText: "Sorry", decorations: "sweat drops, apologetic marks" },
  "等等": { action: "hand up stop gesture, urgent expression, asking to pause", popText: "等等!", decorations: "clock, exclamation" },
  "再見": { action: "waving goodbye, bittersweet smile, farewell hand gesture", popText: "Bye~", decorations: "waving hand emoji, hearts" },
  "好想吃": { action: "drooling expression, hands on cheeks, craving food pose", popText: "好想吃!!!", decorations: "food emojis, drool drops" },
  "我想想": { action: "finger on chin, looking up thinking, contemplating pose", popText: "我想想...", decorations: "thought bubbles, question marks" },

  // ===== 特殊場合 =====
  "生日快樂": { action: "holding birthday cake, party hat, celebration pose", popText: "生日快樂", decorations: "balloons, confetti, cake" },
  "感謝": { action: "deep grateful bow, hands together, heartfelt appreciation", popText: "感謝", decorations: "flowers, hearts, sparkles" },
  "恭喜": { action: "clapping hands, excited congratulating smile, celebration pose", popText: "恭喜!", decorations: "confetti, stars, fireworks" },
  "加班中": { action: "exhausted at desk, coffee cup, late night working expression", popText: "加班中...", decorations: "coffee cup, zzz, moon" },
  "放假": { action: "arms stretched wide, relieved happy expression, freedom pose", popText: "放假!", decorations: "sun, palm trees, sparkles" },
  "累累": { action: "drooping shoulders, tired eyes, exhausted slumped pose", popText: "累...", decorations: "sweat drops, tired marks" }
};

// ============================================
// 貼圖風格定義（基礎版）
// ============================================

const StickerStyles = {
  realistic: {
    id: 'realistic',
    name: '美顏真實',
    emoji: '📸',
    description: '美顏相機風、細緻柔膚、自然美感',
    promptBase: `
      beauty camera style portrait, soft airbrushed skin texture,
      natural beauty enhancement, flawless complexion, youthful glow,
      soft diffused lighting, gentle skin smoothing, refined facial features,
      warm healthy skin tone, subtle makeup look, naturally beautiful
    `,
    negativePrompt: `
      cartoon, anime, chibi, pixel art, doodle,
      harsh shadows, rough skin texture, exaggerated features,
      blurry, low quality, distorted proportions
    `
  },

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
 * 預設表情組合 - 每組 8 個不重複、動作明確的表情
 */
const DefaultExpressions = {
  basic: {
    id: 'basic',
    name: '基本日常',
    emoji: '😊',
    expressions: ['早安', 'Hi', 'OK', '讚讚', '加油', '謝謝', '晚安', 'Yes']
  },
  cute: {
    id: 'cute',
    name: '可愛撒嬌',
    emoji: '🥺',
    expressions: ['撒嬌', '害羞', '噓', '啾啾', '嘿嘿嘿', '抱抱', '好想吃', '哭哭']
  },
  office: {
    id: 'office',
    name: '辦公室',
    emoji: '💼',
    expressions: ['OK', '讚讚', '加班中', '累累', '我想想', 'Sorry', '等等', '放假']
  },
  social: {
    id: 'social',
    name: '社交常用',
    emoji: '💬',
    expressions: ['Hi', '謝謝', 'Sorry', 'OK', 'Yes', 'No', '再見', '等等']
  },
  emotion: {
    id: 'emotion',
    name: '情緒表達',
    emoji: '🎭',
    expressions: ['開心', '大笑', '哭哭', '生氣', '驚訝', '傻眼', '害羞', '累累']
  },
  special: {
    id: 'special',
    name: '特殊場合',
    emoji: '🎉',
    expressions: ['生日快樂', '恭喜', '感謝', '加油', 'Yes', '開心', '啾啾', '抱抱']
  }
};

/**
 * � 裝飾風格模板
 * 控制貼圖的裝飾元素風格（POP文字、愛心、星星等）
 */
const SceneTemplates = {
  none: {
    id: 'none',
    name: '簡約風',
    emoji: '✨',
    description: '乾淨簡約，少量裝飾',
    decorationStyle: 'minimal decorations, clean design',
    decorationElements: ['small sparkles', 'subtle glow'],
    popTextStyle: 'simple clean text, small font'
  },
  pop: {
    id: 'pop',
    name: 'POP風格',
    emoji: '�',
    description: '活潑POP文字、大膽配色',
    decorationStyle: 'bold POP art style, vibrant colors, dynamic layout',
    decorationElements: ['bold text bubbles', 'comic style effects', 'exclamation marks', 'star bursts'],
    popTextStyle: 'large bold POP text, colorful outline, comic book style, impactful typography'
  },
  kawaii: {
    id: 'kawaii',
    name: '夢幻可愛',
    emoji: '💖',
    description: '粉嫩夢幻、愛心星星',
    decorationStyle: 'kawaii pastel style, dreamy soft colors',
    decorationElements: ['floating hearts', 'sparkling stars', 'cute flowers', 'rainbow sparkles', 'blush marks'],
    popTextStyle: 'cute rounded text, pastel colors, soft bubble font'
  },
  energetic: {
    id: 'energetic',
    name: '活力四射',
    emoji: '⚡',
    description: '動感線條、速度感',
    decorationStyle: 'dynamic energetic style, motion lines, high impact',
    decorationElements: ['speed lines', 'lightning bolts', 'explosion effects', 'action swooshes', 'dynamic splashes'],
    popTextStyle: 'bold italic text, action font, dynamic angle'
  },
  colorful: {
    id: 'colorful',
    name: '繽紛彩色',
    emoji: '�',
    description: '彩色潑墨、七彩裝飾',
    decorationStyle: 'colorful splash style, rainbow palette, artistic paint effects',
    decorationElements: ['color splashes', 'paint splatters', 'rainbow confetti', 'watercolor spots', 'geometric shapes'],
    popTextStyle: 'colorful gradient text, artistic typography'
  },
  elegant: {
    id: 'elegant',
    name: '優雅質感',
    emoji: '✨',
    description: '精緻金邊、高級感',
    decorationStyle: 'elegant sophisticated style, premium feel',
    decorationElements: ['golden sparkles', 'elegant flourishes', 'soft bokeh', 'delicate frames'],
    popTextStyle: 'elegant serif text, gold accents, refined typography'
  },
  custom: {
    id: 'custom',
    name: '自訂風格',
    emoji: '✏️',
    description: '自己描述想要的裝飾風格',
    decorationStyle: '',
    decorationElements: [],
    popTextStyle: ''
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
 * 🎯 生成照片貼圖的增強 Prompt V4.0
 * - 透明背景
 * - 風格差異化（StyleEnhancer）
 * - 角色一致性
 * - POP文字 + 裝飾元素支援
 */
function generatePhotoStickerPromptV2(style, expression, characterID = null, sceneConfig = null) {
  const styleConfig = StickerStyles[style] || StickerStyles.cute;
  const styleEnhance = StyleEnhancer[style] || StyleEnhancer.cute;

  // 取得表情增強（新格式包含 action, popText, decorations）
  const expressionData = ExpressionEnhancer[expression];
  let actionDesc, popText, decorations;

  if (typeof expressionData === 'object' && expressionData !== null) {
    // 新格式
    actionDesc = expressionData.action;
    popText = expressionData.popText;
    decorations = expressionData.decorations;
  } else {
    // 舊格式或不存在
    actionDesc = expressionData || expression;
    popText = null;
    decorations = 'sparkles, small hearts';
  }

  // 裝飾風格配置（如果有）
  const decoration = sceneConfig || SceneTemplates.none;
  const decorationPrompt = decoration.decorationStyle
    ? `\n- DECORATION STYLE: ${decoration.decorationStyle}`
    : '';
  const elementsPrompt = decoration.decorationElements?.length > 0
    ? `\n- DECORATION ELEMENTS: ${decoration.decorationElements.join(', ')}`
    : '';
  const textStylePrompt = decoration.popTextStyle
    ? `\n- TEXT STYLE: ${decoration.popTextStyle}`
    : '';

  // POP 文字指示
  const popTextPrompt = popText
    ? `\n\n=== 📝 POP TEXT (IMPORTANT) ===
Add "${popText}" as decorative text element:
- Large, bold, eye-catching typography
- Placed near character (top, side, or as speech bubble)
- ${decoration.popTextStyle || 'colorful and fun style'}
- Text should complement the expression`
    : '';

  const prompt = `Transform this photo into a LINE sticker illustration with decorative elements.

=== 🎨 ART STYLE: ${styleConfig.name} (${style.toUpperCase()}) ===
${styleConfig.promptBase}

STYLE DETAILS:
- Lighting: ${styleEnhance.lighting}
- Composition: ${styleEnhance.composition}
- Brushwork: ${styleEnhance.brushwork}
- Mood: ${styleEnhance.mood}

=== 😊 EXPRESSION & ACTION: ${expression} ===
ACTION: ${actionDesc}
- Show emotion through CLEAR BODY POSE and HAND GESTURE
- Expression must be dramatic and readable at small size
- Hands and arms should be visible and expressive${decorationPrompt}${elementsPrompt}${textStylePrompt}${popTextPrompt}

=== 🎀 DECORATIONS ===
Add floating decorative elements around character:
- ${decorations || 'sparkles, hearts, stars'}
- ${decoration.decorationElements?.slice(0, 3).join(', ') || 'colorful accents'}
- Keep decorations OUTSIDE of character, floating around
- Decorations should enhance mood without overwhelming

=== 👤 CHARACTER (MUST BE CONSISTENT) ===
Character ID: ${characterID || 'default'}
- Copy EXACT face from photo: same face shape, eyes, nose, mouth
- Copy EXACT hairstyle and hair color from photo
- CLOTHING: Colorful casual outfit (can vary per sticker)
- Upper body to waist visible (show hand gestures clearly)

=== ⚠️ TECHNICAL REQUIREMENTS (STRICT) ===
1. BACKGROUND: 100% TRANSPARENT (alpha=0) - NO white, NO gray
2. OUTLINES: Thick clean lines for visibility
3. COMPOSITION: Character centered, decorations floating around
4. IMAGE SIZE: 370px width × 320px height

=== 🚫 ABSOLUTELY FORBIDDEN ===
- NO circular frame, NO round border, NO circle crop
- NO avatar style, NO profile picture frame
- Character must be FREE-FLOATING on transparent background

=== 🎨 COLOR & CONSISTENCY ===
- SKIN TONE: Warm healthy tone, consistent across ALL stickers
- HAIR COLOR: Same exact color in ALL stickers
- HIGH SATURATION: Vivid, vibrant colors
- HIGH CONTRAST: Strong visual impact

OUTPUT: ${styleConfig.name} LINE sticker with ${popText ? `"${popText}" text and ` : ''}decorations, 370x320px, TRANSPARENT background.`;

  const negativePrompt = `
    white background, gray background, colored background, solid background,
    circular frame, round border, circle crop, avatar style, profile picture frame,
    full body with legs, feet showing,
    different face, inconsistent character, pale skin, gray skin,
    realistic photo, 3D render, blurry, low quality
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

