/**
 * 24 節氣配置文件
 * 用於早安圖生成，包含情緒與場景對照表
 */

// 24 節氣資料（只記錄節氣當天的日期）
// 注意：節氣日期每年略有不同，這裡使用 2025 年的日期
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

// 一般日子的季節主題（非節氣當天使用）
const GENERAL_THEMES = {
  spring: { emotion: '溫暖、希望', scene: '春日陽光、花開、微風', greeting: '春天的早晨，充滿希望！' },
  summer: { emotion: '活力、清爽', scene: '夏日清晨、綠蔭、涼風', greeting: '夏日早安，保持清爽！' },
  autumn: { emotion: '寧靜、舒適', scene: '秋日暖陽、落葉、咖啡', greeting: '秋天的早晨，寧靜美好！' },
  winter: { emotion: '溫馨、安穩', scene: '冬日暖陽、熱飲、窗邊', greeting: '冬日早安，溫暖相伴！' }
};

// 季節顏色主題
const SEASON_THEMES = {
  spring: { colors: ['#E8F5E9', '#C8E6C9', '#A5D6A7'], mood: '回暖、啟動、人心打開' },
  summer: { colors: ['#FFF3E0', '#FFE0B2', '#FFCC80'], mood: '盛、熱、外放，但要顧身心' },
  autumn: { colors: ['#FBE9E7', '#FFCCBC', '#FFAB91'], mood: '收、靜、回到自己' },
  winter: { colors: ['#ECEFF1', '#CFD8DC', '#B0BEC5'], mood: '藏、守、陪伴' }
};

/**
 * 根據月份判斷季節
 * @param {number} month - 月份 (1-12)
 * @returns {string} 季節名稱
 */
function getSeason(month) {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter'; // 12, 1, 2
}

/**
 * 根據日期獲取當前節氣或一般主題
 * @param {Date} date - 日期對象
 * @returns {object} 節氣資訊或一般主題
 */
function getCurrentSolarTerm(date = new Date()) {
  const month = date.getMonth() + 1; // JavaScript 月份從 0 開始
  const day = date.getDate();
  const season = getSeason(month);

  // 檢查今天是否為節氣當天（允許前後 1 天的誤差）
  for (const term of SOLAR_TERMS) {
    if (term.month === month && Math.abs(day - term.day) <= 1) {
      return {
        ...term,
        theme: SEASON_THEMES[term.season],
        isSolarTermDay: true  // 標記為節氣當天
      };
    }
  }

  // 非節氣當天，返回一般季節主題
  const generalTheme = GENERAL_THEMES[season];
  return {
    name: '美好的一天',
    nameEn: 'A Beautiful Day',
    emotion: generalTheme.emotion,
    scene: generalTheme.scene,
    season: season,
    theme: SEASON_THEMES[season],
    greeting: generalTheme.greeting,
    isSolarTermDay: false  // 標記為非節氣當天
  };
}

/**
 * 生成早安圖的 AI Prompt
 * @param {object} solarTerm - 節氣資訊
 * @returns {object} { imagePrompt, textPrompt }
 */
function generateMorningPrompts(solarTerm) {
  // 根據是否為節氣當天，生成不同的 prompt
  const isSolarTermDay = solarTerm.isSolarTermDay;

  const greetingText = isSolarTermDay
    ? `${solarTerm.name}早安\n${solarTerm.emotion.split('、')[0]}的一天\n願你平安喜樂`
    : `早安\n${solarTerm.emotion.split('、')[0]}\n願你有美好的一天`;

  const themeDescription = isSolarTermDay
    ? `inspired by the solar term "${solarTerm.name}" (${solarTerm.nameEn})`
    : `capturing a peaceful ${solarTerm.season} morning`;

  const imagePrompt = `Create a warm, realistic lifestyle photograph ${themeDescription}.
The atmosphere reflects "${solarTerm.emotion}", without any instructional or symbolic elements.

Scene:
${solarTerm.scene}, a quiet Taiwanese daily life scene in the early morning, warm light, soft natural atmosphere

Mood & Lighting:
soft natural light, gentle contrast, calm and comforting tone, human warmth

Style:
photorealistic, cinematic depth of field, East Asian daily life, no fantasy, no symbols

Composition:
focus on everyday objects and subtle human presence

Text overlay (IMPORTANT):
Add a short, gentle Chinese morning greeting text overlay on the image.
The text should be warm, encouraging, and suitable for sharing.
Use a clean, readable font with good contrast against the background.
Text should be 2-4 short lines, positioned elegantly (bottom or side).
Example style: "${greetingText}"

Emotion goal:
the image should feel shareable, soothing, and emotionally relatable, perfect for sharing with family or friends in the morning`;

  const textPrompt = isSolarTermDay
    ? `Write a short, gentle morning message inspired by "${solarTerm.name}" (${solarTerm.nameEn}).
Do not explain the solar term.
Do not mention calendars or almanacs.
Use everyday language and emotional warmth.
The message should feel natural to share with family or friends.
Length: 2-4 short lines.
Emotion: ${solarTerm.emotion}`
    : `Write a short, gentle morning message for a ${solarTerm.season} day.
Use everyday language and emotional warmth.
The message should feel natural to share with family or friends.
Length: 2-4 short lines.
Emotion: ${solarTerm.emotion}`;

  return { imagePrompt, textPrompt };
}

/**
 * 獲取今天的日期字串（用於緩存 key）
 * @param {Date} date
 * @returns {string} YYYY-MM-DD 格式
 */
function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

module.exports = {
  SOLAR_TERMS,
  SEASON_THEMES,
  GENERAL_THEMES,
  getCurrentSolarTerm,
  getSeason,
  generateMorningPrompts,
  getDateString
};

