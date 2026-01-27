/**
 * 24 節氣配置文件
 * 用於早安圖生成，包含情緒與場景對照表
 */

const SOLAR_TERMS = [
  // 🌱 春季
  { name: '立春', nameEn: 'Beginning of Spring', month: 2, day: 3, emotion: '期待、甦醒', scene: '清晨微光、發芽盆栽、開窗的風', season: 'spring' },
  { name: '雨水', nameEn: 'Rain Water', month: 2, day: 18, emotion: '滋養、柔軟', scene: '細雨街道、雨後市場、濕潤土地', season: 'spring' },
  { name: '驚蟄', nameEn: 'Awakening of Insects', month: 3, day: 5, emotion: '動起來', scene: '雷後空氣、農田、忙碌準備', season: 'spring' },
  { name: '春分', nameEn: 'Spring Equinox', month: 3, day: 20, emotion: '平衡、剛好', scene: '日光均勻、書桌、窗邊閱讀', season: 'spring' },
  { name: '清明', nameEn: 'Clear and Bright', month: 4, day: 4, emotion: '思念、整理', scene: '掃墓路、春草、慢步', season: 'spring' },
  { name: '穀雨', nameEn: 'Grain Rain', month: 4, day: 19, emotion: '耕耘、耐心', scene: '播種、農具、清晨霧氣', season: 'spring' },

  // ☀️ 夏季
  { name: '立夏', nameEn: 'Beginning of Summer', month: 5, day: 5, emotion: '展開、活力', scene: '陽光街道、短袖、冰飲', season: 'summer' },
  { name: '小滿', nameEn: 'Grain Buds', month: 5, day: 20, emotion: '剛剛好', scene: '半熟果實、遮陽帽', season: 'summer' },
  { name: '芒種', nameEn: 'Grain in Ear', month: 6, day: 5, emotion: '忙碌、有目標', scene: '田間、汗水、早出晚歸', season: 'summer' },
  { name: '夏至', nameEn: 'Summer Solstice', month: 6, day: 21, emotion: '極盛、提醒放慢', scene: '正午光、樹蔭、靜坐', season: 'summer' },
  { name: '小暑', nameEn: 'Minor Heat', month: 7, day: 6, emotion: '開始吃力', scene: '電風扇、涼茶、午後', season: 'summer' },
  { name: '大暑', nameEn: 'Major Heat', month: 7, day: 22, emotion: '撐住、照顧自己', scene: '午睡、陰影、慢動作', season: 'summer' },

  // 🍂 秋季
  { name: '立秋', nameEn: 'Beginning of Autumn', month: 8, day: 7, emotion: '轉換、鬆一口氣', scene: '夕陽、微風', season: 'autumn' },
  { name: '處暑', nameEn: 'End of Heat', month: 8, day: 22, emotion: '放下、退熱', scene: '傍晚、收納', season: 'autumn' },
  { name: '白露', nameEn: 'White Dew', month: 9, day: 7, emotion: '清醒、微涼', scene: '清晨露水、薄外套', season: 'autumn' },
  { name: '秋分', nameEn: 'Autumn Equinox', month: 9, day: 22, emotion: '均衡、內斂', scene: '書桌、咖啡、靜光', season: 'autumn' },
  { name: '寒露', nameEn: 'Cold Dew', month: 10, day: 8, emotion: '收心、保暖', scene: '熱飲、窗內', season: 'autumn' },
  { name: '霜降', nameEn: 'Frost Descent', month: 10, day: 23, emotion: '準備過冬', scene: '厚衣、慢火', season: 'autumn' },

  // ❄️ 冬季
  { name: '立冬', nameEn: 'Beginning of Winter', month: 11, day: 7, emotion: '收起來', scene: '暖燈、湯', season: 'winter' },
  { name: '小雪', nameEn: 'Minor Snow', month: 11, day: 22, emotion: '靜靜的', scene: '灰天、慢步', season: 'winter' },
  { name: '大雪', nameEn: 'Major Snow', month: 12, day: 6, emotion: '厚實、守護', scene: '棉被、熱食', season: 'winter' },
  { name: '冬至', nameEn: 'Winter Solstice', month: 12, day: 21, emotion: '最暗但有希望', scene: '湯圓、團圓', season: 'winter' },
  { name: '小寒', nameEn: 'Minor Cold', month: 1, day: 5, emotion: '撐一下', scene: '清晨冷空氣', season: 'winter' },
  { name: '大寒', nameEn: 'Major Cold', month: 1, day: 20, emotion: '等待回暖', scene: '爐火、靜夜', season: 'winter' }
];

// ====================================================================
// 多樣性變體庫
// ====================================================================
const VARIATION_LIBRARY = {
  styles: [
    'realistic lifestyle photograph',
    'soft watercolor illustration',
    'cozy flat illustration',
    'minimalist line art with color wash',
    'warm pastel drawing'
  ],
  compositions: [
    'eye-level view, subject on the left, negative space on the right',
    'top-down view of a scene',
    'looking through a window frame',
    'close-up shot with a shallow depth of field',
    'wide shot of a quiet street corner'
  ],
  scenes: [
    'a quiet Taiwanese breakfast shop (豆漿店) in the early morning',
    'a traditional market (菜市場) with fresh produce',
    'a balcony overlooking a city alley',
    'a cozy corner of a living room with sunlight streaming in',
    'a park with people doing morning exercises',
    'a desk with a laptop, a cup of tea, and a notebook',
    'a cat napping on a windowsill',
    'a steaming bowl of noodles on a wooden table',
    'freshly brewed coffee being poured into a cup'
  ],
  lighting: [
    'soft, warm morning light',
    'bright, crisp sunlight',
    'gentle, diffused light through a window',
    'cinematic golden hour lighting'
  ]
};

function getDailySeed(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return (y * 10000 + m * 100 + d) % 31337; // Simple daily seed
}

function selectBySeed(array, seed) {
  if (!array || array.length === 0) return null;
  return array[seed % array.length];
}

function getDailyVariations(date = new Date()) {
  const seed = getDailySeed(date);
  return {
    style: selectBySeed(VARIATION_LIBRARY.styles, seed),
    composition: selectBySeed(VARIATION_LIBRARY.compositions, seed + 1),
    scene: selectBySeed(VARIATION_LIBRARY.scenes, seed + 2),
    lighting: selectBySeed(VARIATION_LIBRARY.lighting, seed + 3)
  };
}

// ====================================================================

const GENERAL_THEMES = {
  spring: { emotion: '溫暖、希望', greeting: '春天的早晨，充滿希望！' },
  summer: { emotion: '活力、清爽', greeting: '夏日早安，保持清爽！' },
  autumn: { emotion: '寧靜、舒適', greeting: '秋天的早晨，寧靜美好！' },
  winter: { emotion: '溫馨、安穩', greeting: '冬日早安，溫暖相伴！' }
};

function getSeason(month) {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter'; // 12, 1, 2
}

function getCurrentSolarTerm(date = new Date()) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const season = getSeason(month);

  for (const term of SOLAR_TERMS) {
    if (term.month === month && Math.abs(day - term.day) <= 1) {
      return {
        ...term,
        isSolarTermDay: true
      };
    }
  }

  const generalTheme = GENERAL_THEMES[season];
  return {
    name: '美好的一天',
    nameEn: 'A Beautiful Day',
    emotion: generalTheme.emotion,
    season: season,
    greeting: generalTheme.greeting,
    isSolarTermDay: false
  };
}

function generateMorningPrompts(solarTerm, date = new Date()) {
  const isSolarTermDay = solarTerm.isSolarTermDay;

  const greetingText = isSolarTermDay
    ? `${solarTerm.name}早安\n${solarTerm.emotion.split('、')[0]}的一天\n願你平安喜樂`
    : `早安\n${solarTerm.emotion.split('、')[0]}\n願你有美好的一天`;

  let sceneDescription;
  let styleDescription;
  let compositionDescription;
  let lightingDescription;

  const variations = getDailyVariations(date);

  if (isSolarTermDay) {
    sceneDescription = `${solarTerm.scene}, a quiet Taiwanese daily life scene.`;
    styleDescription = 'soft watercolor illustration';
    compositionDescription = 'eye-level view';
    lightingDescription = 'soft natural morning light';
  } else {
    sceneDescription = variations.scene;
    styleDescription = variations.style;
    compositionDescription = variations.composition;
    lightingDescription = variations.lighting;
  }

  const imagePrompt = `MUST CREATE a vertical portrait image, 1080x1920 aspect ratio (9:16).
This is a strict requirement.
The image MUST be full-frame without any borders, suitable as a phone wallpaper or for sharing on LINE.

Create an image in the style of a ${styleDescription}.
The atmosphere reflects "${solarTerm.emotion}".

Scene:
${sceneDescription}, capturing a quiet Taiwanese daily life moment in the early morning.

Mood & Lighting:
${lightingDescription}, gentle contrast, calm and comforting tone.

Composition:
${compositionDescription}.

Text overlay (IMPORTANT):
Add a short, gentle Chinese morning greeting text overlay on the image.
The text should be warm, encouraging, and suitable for sharing.
Use a clean, readable font with good contrast against the background.
Text should be 2-4 short lines, positioned elegantly (bottom or side).
Example style: "${greetingText}"

Subtle Branding (VERY IMPORTANT):
In one of the corners (bottom-left or bottom-right), add a very small, subtle, and unobtrusive text watermark: "Sticker Tycoon".
It should be in a light grey color, very small font size, and blend in with the background.
It must NOT be distracting.

STRICT prohibition:
- Do NOT draw any QR code / barcode / matrix code patterns anywhere on the poster.
- Do NOT use any QR-like square pixel patterns as decoration.

Other constraints:
- no watermark (other than the one specified)
- no characters, no faces
- focus on everyday objects and subtle human presence`;

  console.log('🌅 Daily Variations:', variations);

  return { imagePrompt, greetingText };
}

function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

module.exports = {
  getCurrentSolarTerm,
  generateMorningPrompts,
  getDateString
};
