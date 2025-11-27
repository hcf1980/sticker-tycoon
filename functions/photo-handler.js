/**
 * Photo Handler Module
 * 處理用戶上傳的照片（下載、存儲、轉換）
 */

const axios = require('axios');
const { getSupabaseClient } = require('./supabase-client');
const { v4: uuidv4 } = require('uuid');

/**
 * 從 LINE 伺服器下載圖片
 */
async function downloadLineImage(messageId) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN 未設定');
  }

  console.log(`📥 下載 LINE 圖片: ${messageId}`);

  const response = await axios.get(
    `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    {
      headers: {
        'Authorization': `Bearer ${channelAccessToken}`
      },
      responseType: 'arraybuffer',
      timeout: 30000
    }
  );

  return Buffer.from(response.data);
}

/**
 * 將圖片上傳到 Supabase Storage
 */
async function uploadToSupabase(imageBuffer, userId) {
  const supabase = getSupabaseClient();
  const fileName = `${userId}/${uuidv4()}.jpg`;
  
  console.log(`📤 上傳圖片到 Supabase: ${fileName}`);

  const { data, error } = await supabase.storage
    .from('user-photos')
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: false
    });

  if (error) {
    console.error('上傳失敗:', error);
    throw error;
  }

  // 取得公開 URL
  const { data: urlData } = supabase.storage
    .from('user-photos')
    .getPublicUrl(fileName);

  console.log(`✅ 圖片上傳成功: ${urlData.publicUrl}`);
  
  return {
    path: fileName,
    publicUrl: urlData.publicUrl
  };
}

/**
 * 將圖片轉為 Base64
 */
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

/**
 * 處理用戶上傳的照片（完整流程）
 */
async function handleUserPhoto(messageId, userId) {
  try {
    // 1. 從 LINE 下載圖片
    const imageBuffer = await downloadLineImage(messageId);
    console.log(`📦 圖片大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

    // 2. 上傳到 Supabase Storage
    const uploadResult = await uploadToSupabase(imageBuffer, userId);

    // 3. 同時返回 base64 供 AI 分析用
    const base64Image = bufferToBase64(imageBuffer);

    return {
      success: true,
      storagePath: uploadResult.path,
      publicUrl: uploadResult.publicUrl,
      base64: base64Image,
      size: imageBuffer.length
    };

  } catch (error) {
    console.error('❌ 處理照片失敗:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  downloadLineImage,
  uploadToSupabase,
  bufferToBase64,
  handleUserPhoto
};

