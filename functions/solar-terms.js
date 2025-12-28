/**
 * 24 節氣配置文件
 * 用於早安圖生成，包含情緒與場景對照表
 */

// 24 節氣資料（按照公曆日期排序）
const SOLAR_TERMS = [
  // 🌱 春季
  { name: '立春', nameEn: 'Beginning of Spring', month: 2, startDay: 3, endDay: 17, emotion: '期待、甦醒', scene: '清晨微光、發芽盆栽、開窗的風', season: 'spring' },
  { name: '雨水', nameEn: 'Rain Water', month: 2, startDay: 18, endDay: 28, emotion: '滋養、柔軟', scene: '細雨街道、雨後市場、濕潤土地', season: 'spring' },
  { name: '驚蟄', nameEn: 'Awakening of Insects', month: 3, startDay: 5, endDay: 19, emotion: '動起來', scene: '雷後空氣、農田、忙碌準備', season: 'spring' },
  { name: '春分', nameEn: 'Spring Equinox', month: 3, startDay: 20, endDay: 31, emotion: '平衡、剛好', scene: '日光均勻、書桌、窗邊閱讀', season: 'spring' },
  { name: '清明', nameEn: 'Clear and Bright', month: 4, startDay: 4, endDay: 19, emotion: '思念、整理', scene: '掃墓路、春草、慢步', season: 'spring' },
  { name: '穀雨', nameEn: 'Grain Rain', month: 4, startDay: 20, endDay: 30, emotion: '耕耘、耐心', scene: '播種、農具、清晨霧氣', season: 'spring' },
  
  // ☀️ 夏季
  { name: '立夏', nameEn: 'Beginning of Summer', month: 5, startDay: 5, endDay: 20, emotion: '展開、活力', scene: '陽光街道、短袖、冰飲', season: 'summer' },
  { name: '小滿', nameEn: 'Grain Buds', month: 5, startDay: 21, endDay: 31, emotion: '剛剛好', scene: '半熟果實、遮陽帽', season: 'summer' },
  { name: '芒種', nameEn: 'Grain in Ear', month: 6, startDay: 5, endDay: 20, emotion: '忙碌、有目標', scene: '田間、汗水、早出晚歸', season: 'summer' },
  { name: '夏至', nameEn: 'Summer Solstice', month: 6, startDay: 21, endDay: 30, emotion: '極盛、提醒放慢', scene: '正午光、樹蔭、靜坐', season: 'summer' },
  { name: '小暑', nameEn: 'Minor Heat', month: 7, startDay: 6, endDay: 21, emotion: '開始吃力', scene: '電風扇、涼茶、午後', season: 'summer' },
  { name: '大暑', nameEn: 'Major Heat', month: 7, startDay: 22, endDay: 31, emotion: '撐住、照顧自己', scene: '午睡、陰影、慢動作', season: 'summer' },
  
  // 🍂 秋季
  { name: '立秋', nameEn: 'Beginning of Autumn', month: 8, startDay: 7, endDay: 22, emotion: '轉換、鬆一口氣', scene: '夕陽、微風', season: 'autumn' },
  { name: '處暑', nameEn: 'End of Heat', month: 8, startDay: 23, endDay: 31, emotion: '放下、退熱', scene: '傍晚、收納', season: 'autumn' },
  { name: '白露', nameEn: 'White Dew', month: 9, startDay: 7, endDay: 22, emotion: '清醒、微涼', scene: '清晨露水、薄外套', season: 'autumn' },
  { name: '秋分', nameEn: 'Autumn Equinox', month: 9, startDay: 23, endDay: 30, emotion: '均衡、內斂', scene: '書桌、咖啡、靜光', season: 'autumn' },
  { name: '寒露', nameEn: 'Cold Dew', month: 10, startDay: 8, endDay: 22, emotion: '收心、保暖', scene: '熱飲、窗內', season: 'autumn' },
  { name: '霜降', nameEn: 'Frost Descent', month: 10, startDay: 23, endDay: 31, emotion: '準備過冬', scene: '厚衣、慢火', season: 'autumn' },
  
  // ❄️ 冬季
  { name: '立冬', nameEn: 'Beginning of Winter', month: 11, startDay: 7, endDay: 21, emotion: '收起來', scene: '暖燈、湯', season: 'winter' },
  { name: '小雪', nameEn: 'Minor Snow', month: 11, startDay: 22, endDay: 30, emotion: '靜靜的', scene: '灰天、慢步', season: 'winter' },
  { name: '大雪', nameEn: 'Major Snow', month: 12, startDay: 6, endDay: 20, emotion: '厚實、守護', scene: '棉被、熱食', season: 'winter' },
  { name: '冬至', nameEn: 'Winter Solstice', month: 12, startDay: 21, endDay: 31, emotion: '最暗但有希望', scene: '湯圓、團圓', season: 'winter' },
  { name: '小寒', nameEn: 'Minor Cold', month: 1, startDay: 5, endDay: 19, emotion: '撐一下', scene: '清晨冷空氣', season: 'winter' },
  { name: '大寒', nameEn: 'Major Cold', month: 1, startDay: 20, endDay: 31, emotion: '等待回暖', scene: '爐火、靜夜', season: 'winter' }
];

// 季節顏色主題
const SEASON_THEMES = {
  spring: { colors: ['#E8F5E9', '#C8E6C9', '#A5D6A7'], mood: '回暖、啟動、人心打開' },
  summer: { colors: ['#FFF3E0', '#FFE0B2', '#FFCC80'], mood: '盛、熱、外放，但要顧身心' },
  autumn: { colors: ['#FBE9E7', '#FFCCBC', '#FFAB91'], mood: '收、靜、回到自己' },
  winter: { colors: ['#ECEFF1', '#CFD8DC', '#B0BEC5'], mood: '藏、守、陪伴' }
};

/**
 * 根據日期獲取當前節氣
 * @param {Date} date - 日期對象
 * @returns {object} 節氣資訊
 */
function getCurrentSolarTerm(date = new Date()) {
  const month = date.getMonth() + 1; // JavaScript 月份從 0 開始
  const day = date.getDate();
  
  // 查找匹配的節氣
  for (const term of SOLAR_TERMS) {
    if (term.month === month && day >= term.startDay && day <= term.endDay) {
      return {
        ...term,
        theme: SEASON_THEMES[term.season]
      };
    }
  }
  
  // 處理跨月的情況（如 1 月初屬於小寒）
  // 如果沒找到，返回最接近的節氣
  const prevMonth = month === 1 ? 12 : month - 1;
  for (const term of SOLAR_TERMS) {
    if (term.month === prevMonth && term.endDay >= 28) {
      return {
        ...term,
        theme: SEASON_THEMES[term.season]
      };
    }
  }
  
  // 預設返回立春
  return {
    ...SOLAR_TERMS[0],
    theme: SEASON_THEMES.spring
  };
}

/**
 * 生成早安圖的 AI Prompt
 * @param {object} solarTerm - 節氣資訊
 * @returns {object} { imagePrompt, textPrompt }
 */
function generateMorningPrompts(solarTerm) {
  const imagePrompt = `Create a warm, realistic lifestyle photograph inspired by the solar term "${solarTerm.name}" (${solarTerm.nameEn}).
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
The text should be warm, encouraging, and relate to the ${solarTerm.name} solar term.
Use a clean, readable font with good contrast against the background.
Text should be 2-4 short lines, positioned elegantly (bottom or side).
Example style: "${solarTerm.name}早安\n${solarTerm.emotion.split('、')[0]}的一天\n願你平安喜樂"

Emotion goal:
the image should feel shareable, soothing, and emotionally relatable, perfect for sharing with family or friends in the morning`;

  const textPrompt = `Write a short, gentle morning message inspired by "${solarTerm.name}" (${solarTerm.nameEn}).
Do not explain the solar term.
Do not mention calendars or almanacs.
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
  getCurrentSolarTerm,
  generateMorningPrompts,
  getDateString
};

