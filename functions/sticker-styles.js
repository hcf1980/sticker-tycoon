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
    coreStyle: "(((PHOTOREALISTIC BEAUTY FILTER STYLE))) - Instagram beauty filter aesthetic, professional beauty photography",
    lighting: "soft diffused beauty lighting with gentle fill light, flattering glow on face, professional studio quality",
    composition: "beauty portrait framing, flawless skin focus, elegant proportions, magazine cover quality",
    brushwork: "smooth airbrushed skin with subtle pore texture, refined soft details, high-end retouching",
    mood: "beauty camera aesthetic, youthful radiant glow, naturally enhanced look",
    colorPalette: "natural skin tones, soft warm colors, subtle pastels",
    forbidden: "cartoon, anime, chibi, illustration, painting, sketch, flat colors, cel shading",
    reference: "beauty influencer selfie, professional portrait photography, high-end beauty ads"
  },
  cute: {
    coreStyle: "(((KAWAII CHIBI ILLUSTRATION STYLE))) - Sanrio/Line Friends character design, super deformed proportions",
    lighting: "soft ambient lighting, gentle bounce light, warm glow, no harsh shadows",
    composition: "round composition, oversized head (head:body = 1:1 ratio), huge sparkling eyes (40% of face), centered, thick outline",
    brushwork: "smooth soft shading, glossy highlights, clean edges, rounded everything",
    mood: "warm cozy atmosphere, heartwarming feeling, adorable charm",
    colorPalette: "pastel pink, baby blue, mint green, lavender, soft yellows",
    forbidden: "realistic, detailed anatomy, sharp edges, dark colors, gritty textures",
    reference: "Pusheen, Molang, Rilakkuma, Line Friends, Sanrio characters"
  },
  cool: {
    coreStyle: "(((URBAN STREET STYLE ILLUSTRATION))) - Cyberpunk neon aesthetic, edgy modern design",
    lighting: "strong rim light with neon glowing edges (cyan/pink), dramatic shadows, high contrast black shadows",
    composition: "dynamic diagonal composition, sharp angular features, energetic silhouette, bold framing, confident pose",
    brushwork: "bold sharp strokes, high contrast shading, defined edges, graffiti art influence",
    mood: "powerful confident atmosphere, street style energy, rebellious attitude",
    colorPalette: "neon cyan, hot pink, electric purple, black, white accents",
    forbidden: "cute, soft, pastel, rounded, gentle, sweet, kawaii",
    reference: "street art, hip-hop album covers, cyberpunk aesthetics, urban fashion"
  },
  funny: {
    coreStyle: "(((COMEDY CARTOON STYLE))) - Exaggerated expressions, meme-worthy humor",
    lighting: "bright cheerful lighting, simple shadows, playful glow, high visibility",
    composition: "centered composition, exaggerated expressions (not distorted face), playful framing, comedic timing",
    brushwork: "cartoon bold strokes, expressive lines, clean outlines, dynamic action lines",
    mood: "humorous, playful vibes, fun energy, laugh-out-loud funny",
    colorPalette: "bright primary colors, bold contrasts, vibrant saturated tones",
    forbidden: "serious, elegant, subtle, realistic, sophisticated",
    reference: "classic cartoons, comic strips, meme illustrations, funny stickers"
  },
  simple: {
    coreStyle: "(((MINIMALIST FLAT DESIGN))) - Clean geometric shapes, modern simplicity",
    lighting: "minimal soft lighting, flat illumination, no dramatic shadows",
    composition: "clean centered flat layout, geometric balance, negative space emphasis",
    brushwork: "thin vector-like lines (1-2px), minimal shading, crisp edges, flat colors",
    mood: "clean modern neutral tone, sophisticated simplicity, zen aesthetic",
    colorPalette: "limited palette (2-4 colors), muted tones, black and white accents",
    forbidden: "detailed, textured, gradient-heavy, complex shading, busy patterns",
    reference: "flat design icons, minimalist logos, modern UI design, Scandinavian design"
  },
  anime: {
    coreStyle: "(((JAPANESE ANIME STYLE))) - Manga/anime illustration, cel-shaded aesthetic",
    lighting: "vivid anime highlight, cel shading, dramatic rim light, high contrast",
    composition: "strong silhouette, clean framing, dynamic angles, action-ready pose",
    brushwork: "cel-shaded edges, gradient hair highlights, smooth color blocks, sharp outlines",
    mood: "energetic dramatic anime style, Japanese illustration feel, dynamic action",
    colorPalette: "vibrant saturated colors, anime skin tones, gradient hair colors",
    forbidden: "realistic shading, western cartoon, 3D render, photorealistic",
    reference: "popular anime series, manga illustrations, Japanese mobile game art"
  },
  pixel: {
    coreStyle: "(((8-BIT PIXEL ART STYLE))) - Retro gaming aesthetic, grid-based design",
    lighting: "pixel shading blocks, dithering effects, limited color gradients",
    composition: "8-bit center framing, grid-aligned positioning (pixel-perfect)",
    brushwork: "pixel clusters, clean grid alignment, limited color dithering, no anti-aliasing",
    mood: "retro gaming charm, nostalgic 8-bit aesthetic, arcade game feel",
    colorPalette: "limited 16-color palette, retro game colors, high contrast",
    forbidden: "smooth gradients, anti-aliasing, high resolution, detailed shading",
    reference: "NES/SNES games, Game Boy graphics, retro arcade games"
  },
  sketch: {
    coreStyle: "(((HYPERREALISTIC PENCIL SKETCH))) - Fine art graphite drawing, museum quality",
    lighting: "single directional light source, strong tonal contrast, dramatic shadow mapping",
    composition: "portrait-focused framing, classical fine art composition, balanced negative space",
    brushwork: "precise graphite pencil strokes, cross-hatching for shadows, smooth gradient tones, visible pencil texture",
    mood: "fine art aesthetic, museum-quality portrait, timeless elegance, artistic mastery",
    colorPalette: "monochromatic grayscale, deep blacks to subtle grays, paper white",
    forbidden: "colored, vibrant colors, digital art, cartoon, anime, flat shading",
    reference: "classical portrait drawings, fine art sketches, Renaissance drawings"
  }
};

// ============================================
// 3️⃣ Expression Enhancer（表情增強系統）
// ============================================

const ExpressionEnhancer = {
  // ===== 基本日常（POP 文字全部英文）=====
  "早安": { action: "stretching arms up, bright morning smile, energetic wake-up pose", popText: "Morning!", decorations: "sun rays, sparkles, musical notes" },
  "晚安": { action: "sleepy yawning, hands together by cheek, peaceful drowsy expression", popText: "Night~", decorations: "moon, stars, zzz bubbles" },
  "Hi": { action: "cheerful waving hand high, bright smile, friendly greeting pose", popText: "Hi~", decorations: "colorful stars, sparkles" },
  "OK": { action: "confident OK hand gesture near face, winking, assured smile", popText: "OK!", decorations: "thumbs up emoji, check marks" },
  "Yes": { action: "enthusiastic fist pump, nodding head, victory pose", popText: "Yes!", decorations: "stars, confetti, exclamation marks" },
  "No": { action: "crossing arms in X shape, shaking head, firm refusal expression", popText: "No!", decorations: "X marks, stop signs" },
  "讚讚": { action: "double thumbs up high, big approving smile, encouraging pose", popText: "Good!", decorations: "stars, sparkles, hearts" },
  "加油": { action: "fist pump with both hands, determined fierce expression, fighting pose", popText: "Go!", decorations: "flames, lightning bolts, stars" },

  // ===== 情緒表達 =====
  "開心": { action: "arms raised in celebration, jumping pose, radiating joy expression", popText: "YAY!", decorations: "confetti, stars, hearts" },
  "大笑": { action: "holding stomach laughing, tears of joy, body shaking with laughter", popText: "LOL", decorations: "laughing emojis, tears" },
  "哭哭": { action: "covering face with hands, tears streaming down, sobbing pose", popText: "Sad~", decorations: "tear drops, sad cloud" },
  "生氣": { action: "stomping foot, clenched fists, angry red face, steam from ears", popText: "Angry!", decorations: "anger symbols, lightning" },
  "驚訝": { action: "hands on cheeks, wide open mouth, shocked jump back pose", popText: "OMG!", decorations: "exclamation marks, sweat drops" },
  "傻眼": { action: "blank stare, jaw dropped, frozen in disbelief pose", popText: "What?!", decorations: "dots, question marks" },

  // ===== 可愛撒嬌 =====
  "撒嬌": { action: "hands clasped pleading, puppy dog eyes, cute head tilt", popText: "Please~", decorations: "hearts, sparkles, cute flowers" },
  "害羞": { action: "covering blushing cheeks, shy side glance, fidgeting pose", popText: "Shy~", decorations: "pink hearts, blush marks" },
  "嘿嘿嘿": { action: "mischievous grin, fingers touching together, playful scheming pose", popText: "Hehe~", decorations: "sweat drop, sparkles" },
  "噓": { action: "finger on lips, winking, secretive quiet gesture", popText: "Shh~", decorations: "speech bubble, dots" },
  "啾啾": { action: "blowing kiss with hand, puckered lips, sending love pose", popText: "Muah!", decorations: "flying hearts, kiss marks" },
  "抱抱": { action: "arms wide open, warm inviting smile, ready for hug pose", popText: "Hug~", decorations: "hearts, warm glow" },

  // ===== 社交應答 =====
  "謝謝": { action: "hands together bow, grateful warm smile, appreciative pose", popText: "Thanks!", decorations: "flowers, hearts, sparkles" },
  "Sorry": { action: "apologetic deep bow, regretful puppy eyes, hands pressed together", popText: "Sorry", decorations: "sweat drops, apologetic marks" },
  "等等": { action: "hand up stop gesture, urgent expression, asking to pause", popText: "Wait!", decorations: "clock, exclamation" },
  "再見": { action: "waving goodbye, bittersweet smile, farewell hand gesture", popText: "Bye~", decorations: "waving hand emoji, hearts" },
  "好想吃": { action: "drooling expression, hands on cheeks, craving food pose", popText: "Yummy!", decorations: "food emojis, drool drops" },
  "我想想": { action: "finger on chin, looking up thinking, contemplating pose", popText: "Hmm...", decorations: "thought bubbles, question marks" },

  // ===== 特殊場合 =====
  "生日快樂": { action: "holding birthday cake, party hat, celebration pose", popText: "HBD!", decorations: "balloons, confetti, cake" },
  "感謝": { action: "deep grateful bow, hands together, heartfelt appreciation", popText: "THX!", decorations: "flowers, hearts, sparkles" },
  "恭喜": { action: "clapping hands, excited congratulating smile, celebration pose", popText: "WOW!", decorations: "confetti, stars, fireworks" },
  "加班中": { action: "exhausted at desk, coffee cup, late night working expression", popText: "Work...", decorations: "coffee cup, zzz, moon" },
  "放假": { action: "arms stretched wide, relieved happy expression, freedom pose", popText: "Free!", decorations: "sun, palm trees, sparkles" },
  "累累": { action: "drooping shoulders, tired eyes, exhausted slumped pose", popText: "Tired~", decorations: "sweat drops, tired marks" },

  // ===== 新增基本日常 =====
  "你好": { action: "friendly wave, warm smile, welcoming gesture", popText: "Hello!", decorations: "sparkles, stars" },
  "掰掰": { action: "waving goodbye, sweet smile, farewell pose", popText: "Bye!", decorations: "waving hand, hearts" },
  "了解": { action: "nodding head, understanding expression, thumbs up", popText: "Got it!", decorations: "check marks, sparkles" },
  "收到": { action: "saluting gesture, confident nod, acknowledgment pose", popText: "Roger!", decorations: "check marks, stars" },
  "沒問題": { action: "confident thumbs up, reassuring smile, reliable pose", popText: "No prob!", decorations: "thumbs up, sparkles" },
  "辛苦了": { action: "gentle bow, appreciative smile, respectful gesture", popText: "Good job!", decorations: "flowers, hearts" },
  "午安": { action: "cheerful wave, bright smile, midday greeting", popText: "Hi~", decorations: "sun, sparkles" },
  "好的": { action: "nodding with smile, agreeable expression, positive gesture", popText: "OK!", decorations: "check marks, stars" },
  "好棒": { action: "clapping hands, impressed expression, praising pose", popText: "Great!", decorations: "stars, confetti" },
  "太好了": { action: "jumping with joy, excited fist pump, celebration pose", popText: "Yay!", decorations: "confetti, stars, hearts" },
  "明天見": { action: "waving with smile, hopeful expression, farewell pose", popText: "See ya!", decorations: "moon, stars" },
  "晚點說": { action: "finger pointing, thoughtful expression, postponing gesture", popText: "Later~", decorations: "clock, dots" },
  "我來了": { action: "running pose, excited expression, arriving gesture", popText: "Coming!", decorations: "speed lines, sparkles" },
  "等我": { action: "running with hand up, urgent expression, rushing pose", popText: "Wait!", decorations: "speed lines, sweat drops" },
  "出發": { action: "pointing forward, determined expression, adventure pose", popText: "Go!", decorations: "arrows, sparkles" },
  "到了": { action: "arms spread wide, relieved smile, arrival pose", popText: "Here!", decorations: "location pin, sparkles" },

  // ===== 新增可愛撒嬌 =====
  "求求你": { action: "hands clasped begging, puppy eyes, pleading pose", popText: "Pls~", decorations: "tears, hearts" },
  "人家": { action: "shy pout, finger twirling hair, cute sulking pose", popText: "Hmph~", decorations: "hearts, blush marks" },
  "討厭啦": { action: "playful hitting gesture, blushing, fake angry cute pose", popText: "Meanie!", decorations: "hearts, angry marks" },
  "好可愛": { action: "hands on cheeks, sparkling eyes, adoring expression", popText: "Cute!", decorations: "hearts, sparkles, stars" },
  "委屈": { action: "teary eyes, pouting lips, sad puppy expression", popText: "Sad~", decorations: "tear drops, sad cloud" },
  "賣萌": { action: "peace sign near face, winking, cute pose", popText: "Kawaii!", decorations: "hearts, sparkles" },
  "心心": { action: "making heart shape with hands, loving expression", popText: "Love!", decorations: "floating hearts" },
  "愛你": { action: "blowing kiss, heart hands, loving expression", popText: "Love U!", decorations: "hearts, kiss marks" },
  "羞羞": { action: "covering face, peeking through fingers, blushing", popText: "Shy~", decorations: "blush marks, hearts" },
  "嘟嘴": { action: "pouting lips, cute sulking, demanding attention pose", popText: "Hmph!", decorations: "hearts, angry marks" },
  "眨眼": { action: "playful wink, finger gun, flirty pose", popText: "Wink!", decorations: "sparkles, stars" },
  "偷笑": { action: "covering mouth giggling, mischievous eyes, sneaky smile", popText: "Hehe~", decorations: "sparkles, sweat drop" },
  "飛吻": { action: "blowing kiss with hand, puckered lips, sending love", popText: "Muah!", decorations: "flying hearts, kiss marks" },
  "撒花": { action: "throwing confetti, joyful expression, celebration pose", popText: "Yay!", decorations: "flowers, confetti, sparkles" },
  "轉圈": { action: "spinning with arms out, happy dizzy expression, dancing pose", popText: "Wheee!", decorations: "sparkles, stars, motion lines" },
  "比心": { action: "finger heart gesture, sweet smile, loving pose", popText: "Heart!", decorations: "hearts, sparkles" },

  // ===== 新增辦公室 =====
  "開會中": { action: "serious expression, holding documents, professional pose", popText: "Meeting", decorations: "documents, clock" },
  "忙碌": { action: "multitasking pose, stressed expression, busy hands", popText: "Busy!", decorations: "papers flying, sweat drops" },
  "下班": { action: "stretching arms, relieved smile, freedom pose", popText: "Done!", decorations: "clock, sparkles" },
  "處理中": { action: "focused typing, concentrated expression, working pose", popText: "On it!", decorations: "gears, loading" },
  "已完成": { action: "satisfied smile, dusting hands off, accomplished pose", popText: "Done!", decorations: "check marks, stars" },
  "請假": { action: "waving goodbye, relaxed smile, vacation pose", popText: "Off!", decorations: "palm tree, sun" },
  "補班": { action: "tired expression, dragging feet, reluctant pose", popText: "Work...", decorations: "sad cloud, sweat drops" },
  "喝咖啡": { action: "holding coffee cup, satisfied sip, relaxed pose", popText: "Coffee!", decorations: "coffee cup, steam, hearts" },
  "趕報告": { action: "frantic typing, stressed expression, deadline panic", popText: "Rush!", decorations: "papers, clock, sweat drops" },
  "老闆叫": { action: "nervous expression, standing at attention, worried pose", popText: "Boss!", decorations: "exclamation marks, sweat drops" },
  "午休": { action: "stretching, yawning, relaxed lunch break pose", popText: "Break~", decorations: "food, zzz" },
  "打卡": { action: "checking watch, rushing pose, time-conscious expression", popText: "Clock in!", decorations: "clock, check mark" },
  "週五了": { action: "excited celebration, arms up, weekend joy pose", popText: "TGIF!", decorations: "confetti, stars, party" },
  "禮拜一": { action: "tired dragging, Monday blues expression, reluctant pose", popText: "Monday...", decorations: "sad cloud, coffee" },
  "衝業績": { action: "determined fist pump, fierce expression, motivated pose", popText: "Go!", decorations: "flames, arrows, stars" },

  // ===== 新增社交常用 =====
  "好久不見": { action: "excited wave, surprised happy expression, reunion pose", popText: "Miss U!", decorations: "hearts, sparkles" },
  "沒關係": { action: "gentle wave off, understanding smile, forgiving pose", popText: "It's OK!", decorations: "hearts, sparkles" },
  "不客氣": { action: "humble bow, warm smile, gracious pose", popText: "Welcome!", decorations: "flowers, sparkles" },
  "隨時": { action: "thumbs up, ready expression, available pose", popText: "Anytime!", decorations: "check marks, sparkles" },
  "改天": { action: "pointing to calendar, apologetic smile, postponing gesture", popText: "Later~", decorations: "calendar, clock" },
  "下次": { action: "waving with smile, promising expression, farewell pose", popText: "Next time!", decorations: "sparkles, stars" },
  "約嗎": { action: "excited pointing, hopeful expression, inviting pose", popText: "Hang out?", decorations: "question marks, sparkles" },
  "在哪": { action: "looking around, curious expression, searching pose", popText: "Where?", decorations: "question marks, location pin" },
  "出來玩": { action: "beckoning gesture, excited expression, inviting pose", popText: "Let's go!", decorations: "sparkles, stars" },
  "聚一下": { action: "gathering gesture, friendly smile, social pose", popText: "Meet up!", decorations: "people icons, hearts" },
  "回覆晚": { action: "apologetic bow, sorry expression, late reply pose", popText: "Sorry!", decorations: "clock, sweat drops" },
  "剛看到": { action: "surprised expression, phone in hand, just noticed pose", popText: "Just saw!", decorations: "phone, exclamation" },
  "好喔": { action: "casual thumbs up, relaxed smile, agreeable pose", popText: "Sure~", decorations: "check marks, sparkles" },
  "看你": { action: "shrugging shoulders, open palms, flexible pose", popText: "Up to U!", decorations: "question marks, sparkles" },
  "都可以": { action: "open arms, easy-going smile, flexible pose", popText: "Either!", decorations: "check marks, sparkles" },

  // ===== 新增情緒表達 =====
  "超爽": { action: "victory pose, ecstatic expression, triumphant jump", popText: "Awesome!", decorations: "stars, confetti, flames" },
  "崩潰": { action: "hands on head, screaming expression, breakdown pose", popText: "OMG!", decorations: "cracks, lightning, sweat drops" },
  "無奈": { action: "shrugging shoulders, helpless expression, resigned pose", popText: "Sigh~", decorations: "sweat drops, dots" },
  "感動": { action: "hands on heart, teary eyes, touched expression", popText: "Touched!", decorations: "tears, hearts, sparkles" },
  "緊張": { action: "fidgeting hands, nervous expression, anxious pose", popText: "Nervous!", decorations: "sweat drops, exclamation" },
  "期待": { action: "sparkling eyes, excited expression, anticipation pose", popText: "Can't wait!", decorations: "sparkles, stars, hearts" },
  "難過": { action: "head down, sad expression, dejected pose", popText: "Sad...", decorations: "rain cloud, tear drops" },
  "煩躁": { action: "scratching head, frustrated expression, irritated pose", popText: "Ugh!", decorations: "anger marks, sweat drops" },
  "興奮": { action: "jumping with joy, thrilled expression, excited pose", popText: "Excited!", decorations: "sparkles, stars, confetti" },
  "困惑": { action: "scratching head, puzzled expression, confused pose", popText: "Huh?", decorations: "question marks, dots" },
  "心碎": { action: "clutching chest, heartbroken expression, devastated pose", popText: "Broken...", decorations: "broken heart, tears" },
  "陶醉": { action: "dreamy expression, floating pose, blissful state", popText: "Bliss~", decorations: "hearts, sparkles, clouds" },
  "不爽": { action: "crossed arms, annoyed expression, displeased pose", popText: "Hmph!", decorations: "anger marks, dark cloud" },
  "爆炸": { action: "steam from ears, furious expression, explosive anger", popText: "BOOM!", decorations: "explosion, flames, lightning" },
  "放空": { action: "blank stare, zoned out expression, empty mind pose", popText: "...", decorations: "dots, empty bubble" },
  "翻白眼": { action: "rolling eyes, exasperated expression, done with it pose", popText: "Whatever", decorations: "sweat drop, dots" },

  // ===== 新增特殊場合 =====
  "新年快樂": { action: "festive celebration, red envelope, new year pose", popText: "Happy NY!", decorations: "fireworks, red envelopes, lanterns" },
  "聖誕快樂": { action: "santa hat, gift giving, christmas joy pose", popText: "Merry X'mas!", decorations: "christmas tree, gifts, snowflakes" },
  "情人節": { action: "holding heart, romantic expression, love pose", popText: "Be Mine!", decorations: "hearts, roses, cupid" },
  "中秋快樂": { action: "holding mooncake, moon gazing, festival pose", popText: "Happy!", decorations: "moon, lanterns, mooncakes" },
  "母親節": { action: "giving flowers, grateful expression, loving pose", popText: "Mom!", decorations: "carnations, hearts" },
  "父親節": { action: "giving gift, respectful expression, appreciative pose", popText: "Dad!", decorations: "tie, hearts, stars" },
  "畢業": { action: "throwing graduation cap, proud expression, achievement pose", popText: "Grad!", decorations: "graduation cap, diploma, confetti" },
  "升遷": { action: "victory pose, proud expression, success celebration", popText: "Promoted!", decorations: "trophy, stars, confetti" },
  "結婚快樂": { action: "wedding bells, joyful expression, celebration pose", popText: "Congrats!", decorations: "rings, hearts, flowers" },
  "喬遷": { action: "holding house key, excited expression, new home pose", popText: "New Home!", decorations: "house, keys, sparkles" },
  "考試加油": { action: "fist pump, determined expression, fighting pose", popText: "Good luck!", decorations: "books, stars, flames" },
  "面試成功": { action: "confident thumbs up, professional smile, success pose", popText: "Nailed it!", decorations: "briefcase, stars, check marks" },
  "發大財": { action: "money gesture, excited expression, prosperity pose", popText: "Rich!", decorations: "gold coins, money, sparkles" },
  "身體健康": { action: "flexing muscles, healthy expression, strong pose", popText: "Healthy!", decorations: "hearts, sparkles, sun" },
  "萬事如意": { action: "blessing gesture, peaceful expression, wishing pose", popText: "Best wishes!", decorations: "lucky symbols, sparkles" },
  "心想事成": { action: "making wish, hopeful expression, dreaming pose", popText: "Wish!", decorations: "stars, sparkles, rainbow" }
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
      funny cartoon style, exaggerated facial expressions (not distorted face),
      comedic timing pose, playful proportions, meme-style humor,
      bold lines, bright punchy colors, high emotional clarity
    `,
    negativePrompt: `
      serious, realistic anatomy, elegant style,
      low energy, subtle expression,
      distorted face, warped features, deformed proportions
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

  sketch: {
    id: 'sketch',
    name: '素描風',
    emoji: '✏️',
    description: '逼真鉛筆素描、藝術質感',
    promptBase: `
      hyperrealistic graphite pencil portrait drawing,
      fine art museum quality pencil sketch,
      detailed cross-hatching and smooth gradient shading,
      visible pencil strokes and texture on paper grain,
      masterful tonal values from deep black to subtle gray,
      professional artist hand-drawn portrait,
      precise anatomical features with artistic interpretation,
      single directional dramatic lighting creating depth,
      elegant monochromatic grayscale palette,
      high contrast shadow mapping,
      soft edges blending into paper texture,
      classical portrait composition
    `,
    negativePrompt: `
      colored, vibrant colors, digital art, cartoon, anime,
      watercolor, oil painting, 3D render, photograph,
      blurry, smudged, messy, childish doodle,
      flat shading, cel shading, vector art
    `
  }
};

/**
 * 🖼️ 人物構圖模板
 * 控制貼圖中人物的取景範圍
 *
 * ⚠️ LINE 貼圖規格：370px × 320px，需留邊 10px
 * 有效繪製區域：350px × 300px
 * 目標：角色佔有效區域 85-90%
 */
const FramingTemplates = {
  fullbody: {
    id: 'fullbody',
    name: '全身',
    emoji: '🧍',
    description: '完整全身，適合動作表情',
    promptAddition: `
      (((FULL BODY SHOT - HEAD TO TOE)))

      CRITICAL MEASUREMENTS:
      - Head size: 15% of frame height (SMALL head relative to body)
      - Body length: 80% of frame height
      - Feet MUST be visible at bottom edge
      - Top margin: 5%, Bottom margin: 5%
      - Character fills 90% of vertical space

      COMPOSITION RULES:
      - Standing, walking, jumping, or full-body action pose
      - Entire body from head to feet visible
      - Legs fully extended and visible
      - Feet touching or near bottom edge
      - Camera angle: Eye-level or slightly below

      ABSOLUTELY FORBIDDEN:
      - Cropped legs or cut-off feet
      - Close-up shots
      - Large head proportions
      - Character smaller than 80% of frame
      - Excessive empty space above or below
    `,
    characterFocus: 'FULL BODY visible head to toe, character fills 90% of frame height, SMALL head (15%), legs and feet visible'
  },
  halfbody: {
    id: 'halfbody',
    name: '半身',
    emoji: '👤',
    description: '上半身，表情手勢兼顧',
    promptAddition: `
      (((HALF BODY SHOT - WAIST UP)))

      CRITICAL MEASUREMENTS:
      - Head size: 25% of frame height (MEDIUM head)
      - Torso: 60% of frame height
      - Cut at waist level (belly button visible)
      - Hands and arms MUST be in frame
      - Character fills 85% of vertical space

      COMPOSITION RULES:
      - Upper body from waist up
      - Both arms visible and expressive
      - Hands doing gestures (waving, pointing, etc.)
      - Torso and chest clearly visible
      - Camera angle: Slightly below eye-level

      ABSOLUTELY FORBIDDEN:
      - Full body with legs visible
      - Head-only shots
      - Cut at chest level
      - Arms cropped out of frame
      - Character smaller than 80% of frame
    `,
    characterFocus: 'UPPER BODY waist up, character fills 85% of frame, MEDIUM head (25%), hands visible and gesturing'
  },
  portrait: {
    id: 'portrait',
    name: '大頭',
    emoji: '😊',
    description: '頭部特寫，表情清晰',
    promptAddition: `
      (((HEAD AND SHOULDERS PORTRAIT)))

      CRITICAL MEASUREMENTS:
      - Head size: 60% of frame height (LARGE head)
      - Face fills 50% of total frame area
      - Shoulders visible (cut at mid-chest)
      - Neck fully visible
      - Character fills 85% of vertical space

      COMPOSITION RULES:
      - Head and shoulders only
      - Face is the main focus
      - Facial expression clearly readable
      - Shoulders provide context
      - Camera angle: Eye-level, straight on

      ABSOLUTELY FORBIDDEN:
      - Full body or half body visible
      - Extreme close-up (face only)
      - Profile or side view
      - Small head with too much space
      - Character smaller than 80% of frame
    `,
    characterFocus: 'HEAD AND SHOULDERS, character fills 85% of frame, LARGE head (60%), face is main focus'
  },
  closeup: {
    id: 'closeup',
    name: '特寫',
    emoji: '👁️',
    description: '臉部特寫，表情超大',
    promptAddition: `
      (((EXTREME FACE CLOSE-UP)))

      CRITICAL MEASUREMENTS:
      - Face fills 85% of frame (HUGE face)
      - Eyes at center of frame
      - Forehead may be slightly cropped
      - Chin visible at bottom
      - Face nearly touches all edges

      COMPOSITION RULES:
      - Face only, no shoulders
      - Eyes are the focal point
      - Every facial detail visible
      - Intimate emotional connection
      - Camera angle: Straight on, direct eye contact

      ABSOLUTELY FORBIDDEN:
      - Shoulders or body visible
      - Full head with space around
      - Distant shot
      - Small face with empty space
      - Face smaller than 80% of frame
    `,
    characterFocus: 'EXTREME FACE CLOSE-UP, face fills 85% of frame, HUGE face nearly touching edges, eyes at center'
  }
};

/**
 * 預設表情組合 - 每組 24 個表情，選擇時隨機取用
 */
const DefaultExpressions = {
  basic: {
    id: 'basic',
    name: '基本日常',
    emoji: '😊',
    expressions: [
      '早安', 'Hi', 'OK', '讚讚', '加油', '謝謝', '晚安', 'Yes',
      '你好', '掰掰', '了解', '收到', '沒問題', '辛苦了', '午安', '好的',
      '好棒', '太好了', '明天見', '晚點說', '我來了', '等我', '出發', '到了'
    ]
  },
  cute: {
    id: 'cute',
    name: '可愛撒嬌',
    emoji: '🥺',
    expressions: [
      '撒嬌', '害羞', '噓', '啾啾', '嘿嘿嘿', '抱抱', '好想吃', '哭哭',
      '求求你', '人家', '討厭啦', '好可愛', '委屈', '賣萌', '心心', '愛你',
      '羞羞', '嘟嘴', '眨眼', '偷笑', '飛吻', '撒花', '轉圈', '比心'
    ]
  },
  office: {
    id: 'office',
    name: '辦公室',
    emoji: '💼',
    expressions: [
      'OK', '讚讚', '加班中', '累累', '我想想', 'Sorry', '等等', '放假',
      '開會中', '忙碌', '下班', '收到', '處理中', '已完成', '請假', '補班',
      '喝咖啡', '趕報告', '老闆叫', '午休', '打卡', '週五了', '禮拜一', '衝業績'
    ]
  },
  social: {
    id: 'social',
    name: '社交常用',
    emoji: '💬',
    expressions: [
      'Hi', '謝謝', 'Sorry', 'OK', 'Yes', 'No', '再見', '等等',
      '好久不見', '恭喜', '沒關係', '不客氣', '隨時', '改天', '下次', '約嗎',
      '在哪', '出來玩', '聚一下', '回覆晚', '剛看到', '好喔', '看你', '都可以'
    ]
  },
  emotion: {
    id: 'emotion',
    name: '情緒表達',
    emoji: '🎭',
    expressions: [
      '開心', '大笑', '哭哭', '生氣', '驚訝', '傻眼', '害羞', '累累',
      '超爽', '崩潰', '無奈', '感動', '緊張', '期待', '難過', '煩躁',
      '興奮', '困惑', '心碎', '陶醉', '不爽', '爆炸', '放空', '翻白眼'
    ]
  },
  special: {
    id: 'special',
    name: '特殊場合',
    emoji: '🎉',
    expressions: [
      '生日快樂', '恭喜', '感謝', '加油', 'Yes', '開心', '啾啾', '抱抱',
      '新年快樂', '聖誕快樂', '情人節', '中秋快樂', '母親節', '父親節', '畢業', '升遷',
      '結婚快樂', '喬遷', '考試加油', '面試成功', '發大財', '身體健康', '萬事如意', '心想事成'
    ]
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
    emoji: '💥',
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
  travel: {
    id: 'travel',
    name: '旅遊打卡',
    emoji: '✈️',
    description: '旅遊景點、護照印章、相機',
    decorationStyle: 'travel themed decorations, vacation vibe, landmark silhouettes',
    decorationElements: ['passport stamps', 'airplane icons', 'camera icons', 'landmark silhouettes', 'luggage tags', 'world map elements'],
    popTextStyle: 'postcard style text, travel journal font'
  },
  office: {
    id: 'office',
    name: '辦公室',
    emoji: '💼',
    description: '上班族、咖啡杯、電腦',
    decorationStyle: 'office themed decorations, business casual vibe',
    decorationElements: ['coffee cup icons', 'laptop icons', 'document papers', 'clock icons', 'email icons', 'sticky notes'],
    popTextStyle: 'professional clean text, business font'
  },
  park: {
    id: 'park',
    name: '公園野餐',
    emoji: '🌳',
    description: '綠地草皮、野餐、戶外休閒',
    decorationStyle: 'outdoor park themed, nature elements, picnic vibe',
    decorationElements: ['green leaves', 'flowers', 'butterflies', 'sun rays', 'picnic basket', 'trees silhouettes'],
    popTextStyle: 'natural organic text, friendly rounded font'
  },
  colorful: {
    id: 'colorful',
    name: '繽紛彩色',
    emoji: '🌈',
    description: '彩色潑墨、七彩裝飾',
    decorationStyle: 'colorful splash style, rainbow palette, artistic paint effects',
    decorationElements: ['color splashes', 'paint splatters', 'rainbow confetti', 'watercolor spots', 'geometric shapes'],
    popTextStyle: 'colorful gradient text, artistic typography'
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
 *
 * ⚠️ LINE 貼圖規格：370px × 320px，需留邊 10px
 * 目標：角色佔有效區域 85-90%
 */
function generateStickerPrompt(style, characterDescription, expression) {
  const styleConfig = StickerStyles[style] || StickerStyles.cute;

  return {
    prompt: `${styleConfig.promptBase}, ${characterDescription}, showing expression: ${expression}, sticker design, transparent background, PNG format, 370x320px LINE sticker, character MUST FILL 85-90% of frame, LARGE dominant figure with minimal margins, high quality illustration`,
    negativePrompt: `${styleConfig.negativePrompt}, text, watermark, signature, border, frame, background scenery, multiple characters, tiny character, small figure, excessive whitespace, too much empty space`
  };
}

/**
 * 🎯 生成完整的 AI 提示詞 V2（增強版）
 * 包含：角色一致性、風格強化、表情增強
 *
 * ⚠️ LINE 貼圖規格：370px × 320px，需留邊 10px
 * 有效繪製區域：350px × 300px
 * 目標：角色佔有效區域 85-90%
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

    === SIZE & FILL (CRITICAL) ===
    LINE STICKER: 370px × 320px with 10px safe margin,
    CHARACTER MUST FILL 85-90% of the frame,
    LARGE dominant figure with minimal empty space,
    Character should nearly touch the safe margins,
    NO tiny character - must be IMPACTFUL at small display size,

    high-charm factor, expressive pose,
    LINE-sticker optimized clarity,
    transparent background,
    sticker illustration, high readability,
    thick clean outline, vector-friendly quality,
    visually iconic mascot design,
    single character only
  `.replace(/\s+/g, ' ').trim();

  const negativePrompt = `
    ${styleConfig.negativePrompt},
    clutter, dull colors, text, watermark, signature,
    realistic anatomy, ultra-realism, photorealistic,
    multiple characters, messy background, complex background,
    inconsistent character features, deformed, bad anatomy,
    low-resolution, blurry, pixelated, jpeg artifacts,
    border, frame, logo, words, letters, caption,
    tiny character, small figure, excessive whitespace, too much empty space,
    character too small, miniature figure, distant shot
  `.replace(/\s+/g, ' ').trim();

  return {
    prompt,
    negativePrompt,
    characterID
  };
}

/**
 * 🎯 生成照片貼圖的增強 Prompt V5.0
 * - 透明背景
 * - 風格差異化（StyleEnhancer）
 * - 角色一致性
 * - POP文字 + 裝飾元素支援
 * - 人物構圖選擇（全身/半身/大頭/特寫）
 */
function generatePhotoStickerPromptV2(style, expression, characterID = null, sceneConfig = null, framingConfig = null) {
  const styleConfig = StickerStyles[style] || StickerStyles.cute;
  const styleEnhance = StyleEnhancer[style] || StyleEnhancer.cute;
  const framing = framingConfig || FramingTemplates.halfbody;

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

=== 🎨 PRIORITY 0: CORE ART STYLE (MOST IMPORTANT) ===
${styleEnhance.coreStyle}

STYLE IDENTITY:
${styleConfig.promptBase}

STYLE EXECUTION:
- Lighting: ${styleEnhance.lighting}
- Composition: ${styleEnhance.composition}
- Brushwork: ${styleEnhance.brushwork}
- Mood: ${styleEnhance.mood}
- Color Palette: ${styleEnhance.colorPalette}
- Reference: ${styleEnhance.reference}

⚠️ ABSOLUTELY FORBIDDEN FOR THIS STYLE:
${styleEnhance.forbidden}

=== 😊 EXPRESSION & ACTION: ${expression} ===
ACTION: ${actionDesc}
- Show emotion through CLEAR BODY POSE and HAND GESTURE
- Expression must be dramatic and readable at small size
- Hands and arms should be visible and expressive${decorationPrompt}${elementsPrompt}${textStylePrompt}${popTextPrompt}

=== 🎀 DECORATIONS (DYNAMIC LAYOUT) ===
Add floating decorative elements with VARIED placement and sizes:
- ${decorations || 'sparkles, hearts, stars'}
- ${decoration.decorationElements?.slice(0, 3).join(', ') || 'colorful accents'}
- DECORATION SIZES: Mix of large, medium, and small decorations for visual interest
- PLACEMENT RULES (vary based on character's gaze direction):
  * If character looks LEFT: place more decorations on the RIGHT side
  * If character looks RIGHT: place more decorations on the LEFT side
  * If character looks UP: decorations float ABOVE
  * If character looks DOWN or CENTER: decorations scattered asymmetrically around
- CHARACTER POSITION: Does NOT need to be centered!
  * Can be slightly LEFT, RIGHT, or use rule-of-thirds composition
  * Leave breathing room in the direction character is looking
- Create visual FLOW and BALANCE, not rigid symmetry
- Some decorations can OVERLAP edges of frame for dynamic feel
- Layer decorations: some in front, some behind character

=== 👤 CHARACTER (MUST BE CONSISTENT) ===
Character ID: ${characterID || 'default'}
- Copy EXACT face from photo: same face shape, eyes, nose, mouth
- Copy EXACT hairstyle and hair color from photo
- CLOTHING: Colorful casual outfit (can vary per sticker)
- GAZE DIRECTION: Natural eye direction matching expression

=== 🖼️ PRIORITY 1: FRAMING / COMPOSITION (CRITICAL) ===
FRAMING TYPE: ${framing.name} (${framing.id.toUpperCase()})

${framing.promptAddition}

CHARACTER FOCUS REQUIREMENT:
${framing.characterFocus}

⚠️ THIS FRAMING STYLE IS ABSOLUTELY CRITICAL:
- Follow the measurements EXACTLY as specified
- Do NOT mix with other framing styles
- The head size percentage is NON-NEGOTIABLE
- Forbidden items for this framing MUST be avoided

=== 📐 PRIORITY 2: SIZE & FILL REQUIREMENTS ===
LINE STICKER SPECS: 370px width × 320px height
SAFE MARGIN: 10px on all sides (required by LINE)
EFFECTIVE DRAWING AREA: 350px × 300px

CHARACTER FILL REQUIREMENTS:
- Character MUST fill 85-90% of effective area
- Character should be LARGE and DOMINANT
- MINIMAL empty space around character
- Only ~10px padding from edges
- Character nearly touches safe margins
- NO tiny character with excessive whitespace
- Sticker must look FULL and IMPACTFUL at small size

=== ⚠️ TECHNICAL REQUIREMENTS (STRICT) ===
1. BACKGROUND: 100% TRANSPARENT (alpha=0) - NO white, NO gray
2. OUTLINES: Thick clean lines for visibility at small size
3. COMPOSITION: Character FILLS 85-90% of frame, dynamic layout
4. IMAGE SIZE: 370px width × 320px height
5. FILL RATIO: Character + decorations should occupy most of the canvas

=== 🚫 ABSOLUTELY FORBIDDEN ===
- NO circular frame, NO round border, NO circle crop
- NO avatar style, NO profile picture frame
- NO tiny character with excessive empty space
- NO character smaller than 80% of frame
- Character must be FREE-FLOATING on transparent background

=== 🎨 COLOR & CONSISTENCY ===
- SKIN TONE: Warm healthy tone, consistent across ALL stickers
- HAIR COLOR: Same exact color in ALL stickers
- HIGH SATURATION: Vivid, vibrant colors
- HIGH CONTRAST: Strong visual impact

OUTPUT: ${styleConfig.name} LINE sticker with ${popText ? `"${popText}" text and ` : ''}decorations, 370x320px, character FILLING 85-90% of frame, TRANSPARENT background.`;

  const negativePrompt = `
    === STYLE-SPECIFIC FORBIDDEN (CRITICAL) ===
    ${styleEnhance.forbidden},

    === GENERAL FORBIDDEN ===
    white background, gray background, colored background, solid background,
    circular frame, round border, circle crop, avatar style, profile picture frame,
    different face, inconsistent character, pale skin, gray skin,
    realistic photo, 3D render, blurry, low quality,
    tiny character, small figure, excessive whitespace, too much empty space,
    character too small, miniature figure, distant shot, far away,

    === FRAMING-SPECIFIC FORBIDDEN ===
    ${framing.promptAddition.includes('FORBIDDEN') ?
      framing.promptAddition.split('ABSOLUTELY FORBIDDEN:')[1]?.split('`,')[0] || '' :
      'wrong framing, incorrect composition'}
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

  // 可選數量（6, 12, 18 張 - 6宮格批次生成優化）
  // 每 6 張 = 1 次 API = 3 代幣
  validCounts: [6, 12, 18],

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

/**
 * 取得所有構圖選項
 */
function getAllFramingTemplates() {
  return Object.values(FramingTemplates);
}

/**
 * 取得指定構圖配置
 */
function getFramingConfig(framingId) {
  return FramingTemplates[framingId] || FramingTemplates.halfbody;
}

module.exports = {
  StickerStyles,
  StyleEnhancer,
  ExpressionEnhancer,
  DefaultExpressions,
  SceneTemplates,
  FramingTemplates,
  generateCharacterID,
  generateStickerPrompt,
  generateStickerPromptV2,
  generatePhotoStickerPromptV2,
  getAllStyles,
  getAllExpressionTemplates,
  getAllSceneTemplates,
  getAllFramingTemplates,
  getSceneConfig,
  getFramingConfig,
  getExpressionEnhancement,
  getStyleEnhancement,
  LineStickerSpecs
};

