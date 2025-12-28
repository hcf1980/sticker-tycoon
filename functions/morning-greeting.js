/**
 * 早安圖生成模組
 * 根據 24 節氣生成每日早安圖，支援緩存機制
 */

const axios = require('axios');
const { getSupabaseClient } = require('./supabase-client');
const { getCurrentSolarTerm, generateMorningPrompts, getDateString } = require('./solar-terms');

// AI API 設定
const AI_API_KEY = process.env.AI_IMAGE_API_KEY;
const AI_API_URL = process.env.AI_IMAGE_API_URL || 'https://newapi.pockgo.com';
const AI_MODEL_3 = process.env.AI_MODEL_3 || 'gemini-3-pro-image-preview-2k';

/**
 * 獲取或生成今日早安圖
 * @returns {object} { success, imageUrl, solarTerm, greeting, fromCache }
 */
async function getMorningGreeting() {
  const supabase = getSupabaseClient();
  const today = getDateString();
  const solarTerm = getCurrentSolarTerm();
  
  console.log(`🌅 早安圖請求 - 日期: ${today}, 節氣: ${solarTerm.name}`);
  
  try {
    // 1. 檢查今日是否已有緩存
    const { data: cached, error: cacheError } = await supabase
      .from('morning_greetings')
      .select('*')
      .eq('date', today)
      .single();
    
    if (cached && !cacheError) {
      console.log(`✅ 使用緩存的早安圖: ${cached.image_url}`);
      return {
        success: true,
        imageUrl: cached.image_url,
        solarTerm: cached.solar_term,
        greeting: cached.greeting_text,
        fromCache: true
      };
    }
    
    // 2. 沒有緩存，生成新圖片
    console.log(`🎨 生成新的早安圖...`);
    const result = await generateMorningImage(solarTerm);
    
    if (!result.success) {
      throw new Error(result.error || '圖片生成失敗');
    }
    
    // 3. 上傳到 Supabase Storage
    const uploadResult = await uploadMorningImage(result.imageData, today);
    
    // 4. 儲存到資料庫
    const { error: insertError } = await supabase
      .from('morning_greetings')
      .insert({
        date: today,
        solar_term: solarTerm.name,
        solar_term_en: solarTerm.nameEn,
        emotion: solarTerm.emotion,
        scene: solarTerm.scene,
        season: solarTerm.season,
        image_url: uploadResult.publicUrl,
        greeting_text: result.greeting || `${solarTerm.name}早安，${solarTerm.emotion.split('、')[0]}的一天！`,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('❌ 儲存早安圖記錄失敗:', insertError);
      // 即使儲存失敗，仍返回圖片
    }
    
    console.log(`✅ 早安圖生成完成: ${uploadResult.publicUrl}`);
    return {
      success: true,
      imageUrl: uploadResult.publicUrl,
      solarTerm: solarTerm.name,
      greeting: result.greeting || `${solarTerm.name}早安！`,
      fromCache: false
    };
    
  } catch (error) {
    console.error('❌ 早安圖生成失敗:', error.message);
    return {
      success: false,
      error: error.message,
      solarTerm: solarTerm.name
    };
  }
}

/**
 * 使用 AI 生成早安圖
 * @param {object} solarTerm - 節氣資訊
 * @returns {object} { success, imageData, greeting }
 */
async function generateMorningImage(solarTerm) {
  if (!AI_API_KEY) {
    throw new Error('AI_IMAGE_API_KEY 未設定');
  }
  
  const { imagePrompt } = generateMorningPrompts(solarTerm);
  
  console.log(`🤖 調用 AI API: ${AI_MODEL_3}`);
  console.log(`📝 Prompt 長度: ${imagePrompt.length} 字元`);
  
  try {
    const response = await axios.post(
      `${AI_API_URL}/v1/chat/completions`,
      {
        model: AI_MODEL_3,
        messages: [
          {
            role: 'user',
            content: imagePrompt
          }
        ],
        max_tokens: 4096
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 180000 // 3 分鐘
      }
    );
    
    // 從回應中提取圖片
    const imageData = extractImageFromResponse(response);
    
    return {
      success: true,
      imageData,
      greeting: `${solarTerm.name}早安，${solarTerm.emotion.split('、')[0]}的一天！`
    };
    
  } catch (error) {
    console.error('❌ AI 生成失敗:', error.message);
    throw error;
  }
}

/**
 * 從 AI 回應中提取圖片
 * @param {object} response - Axios 回應
 * @returns {string} base64 或 URL
 */
function extractImageFromResponse(response) {
  const data = response.data;

  if (!data.choices || !data.choices[0]) {
    throw new Error('AI 回應格式錯誤');
  }

  const message = data.choices[0].message;

  // 檢查是否有圖片內容
  if (message.content) {
    // 情況 1: content 是陣列（多模態回應）
    if (Array.isArray(message.content)) {
      for (const item of message.content) {
        if (item.type === 'image_url' && item.image_url?.url) {
          return item.image_url.url;
        }
        if (item.type === 'image' && item.image) {
          return item.image;
        }
      }
    }

    // 情況 2: content 是字串，可能包含 base64
    if (typeof message.content === 'string') {
      // 檢查是否是 base64 圖片
      const base64Match = message.content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
      if (base64Match) {
        return base64Match[0];
      }

      // 檢查是否是 URL
      const urlMatch = message.content.match(/https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp)/i);
      if (urlMatch) {
        return urlMatch[0];
      }
    }
  }

  // 情況 3: 檢查 image 欄位
  if (message.image) {
    return message.image;
  }

  throw new Error('無法從 AI 回應中提取圖片');
}

/**
 * 上傳早安圖到 Supabase Storage
 * @param {string} imageData - base64 或 URL
 * @param {string} dateStr - 日期字串
 * @returns {object} { path, publicUrl }
 */
async function uploadMorningImage(imageData, dateStr) {
  const supabase = getSupabaseClient();
  const bucket = 'morning-greetings';
  const fileName = `${dateStr}.png`;

  let imageBuffer;

  // 處理不同格式的圖片資料
  if (imageData.startsWith('data:image')) {
    // base64 格式
    const base64Data = imageData.split(',')[1];
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else if (imageData.startsWith('http')) {
    // URL 格式，需要下載
    const response = await axios.get(imageData, { responseType: 'arraybuffer' });
    imageBuffer = Buffer.from(response.data);
  } else {
    // 純 base64
    imageBuffer = Buffer.from(imageData, 'base64');
  }

  console.log(`📤 上傳早安圖: ${fileName}, 大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

  // 上傳到 Storage
  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (error) {
    console.error('❌ 上傳失敗:', error);
    throw error;
  }

  // 取得公開 URL
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return {
    path: fileName,
    publicUrl: data.publicUrl
  };
}

/**
 * 檢查今日是否已有早安圖（供外部快速檢查）
 * @returns {boolean}
 */
async function hasTodayGreeting() {
  const supabase = getSupabaseClient();
  const today = getDateString();

  const { data, error } = await supabase
    .from('morning_greetings')
    .select('id')
    .eq('date', today)
    .single();

  return !error && !!data;
}

module.exports = {
  getMorningGreeting,
  generateMorningImage,
  hasTodayGreeting,
  extractImageFromResponse,
  uploadMorningImage
};

