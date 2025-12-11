/**
 * Rich Menu 管理器 - 貼圖大亨
 * 負責創建、更新和管理 LINE Rich Menu
 */

const axios = require('axios');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

/**
 * 創建 Rich Menu
 * @returns {Promise<string>} - Rich Menu ID
 */
async function createRichMenu() {
  try {
    console.log('🎨 開始創建 Rich Menu...');

    const richMenu = {
      size: {
        width: 2500,
        height: 843
      },
      selected: true,
      name: '貼圖大亨主選單',
      chatBarText: '貼圖大亨',
      areas: [
        // 左：創建貼圖
        {
          bounds: { x: 0, y: 0, width: 833, height: 843 },
          action: { type: 'message', text: '創建貼圖' }
        },
        // 中：我的貼圖
        {
          bounds: { x: 833, y: 0, width: 834, height: 843 },
          action: { type: 'message', text: '我的貼圖' }
        },
        // 右：示範圖集
        {
          bounds: { x: 1667, y: 0, width: 833, height: 843 },
          action: { type: 'message', text: '示範圖集' }
        }
      ]
    };

    const response = await axios.post(
      'https://api.line.me/v2/bot/richmenu',
      richMenu,
      {
        headers: {
          'Authorization': `Bearer ${config.channelAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const richMenuId = response.data.richMenuId;
    console.log(`✅ Rich Menu 創建成功：${richMenuId}`);
    return richMenuId;

  } catch (error) {
    console.error('❌ 創建 Rich Menu 失敗:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 上傳 Rich Menu 圖片
 */
async function uploadRichMenuImage(richMenuId, imageBuffer) {
  try {
    console.log(`🖼️ 上傳 Rich Menu 圖片：${richMenuId}`);
    console.log(`📏 圖片大小: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    // LINE Rich Menu 支援 PNG 和 JPEG 格式
    // 根據圖片內容自動判斷格式
    const contentType = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8
      ? 'image/jpeg'
      : 'image/png';

    console.log(`📋 圖片格式: ${contentType}`);

    await axios.post(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${config.channelAccessToken}`,
          'Content-Type': contentType
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    console.log('✅ Rich Menu 圖片上傳成功');
  } catch (error) {
    console.error('❌ 上傳 Rich Menu 圖片失敗:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 設定為預設 Rich Menu
 */
async function setDefaultRichMenu(richMenuId) {
  try {
    console.log(`🎯 設定預設 Rich Menu：${richMenuId}`);

    await axios.post(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {},
      { headers: { 'Authorization': `Bearer ${config.channelAccessToken}` } }
    );

    console.log('✅ 預設 Rich Menu 設定成功');
  } catch (error) {
    console.error('❌ 設定預設 Rich Menu 失敗:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 刪除 Rich Menu
 */
async function deleteRichMenu(richMenuId) {
  try {
    console.log(`🗑️ 刪除 Rich Menu：${richMenuId}`);

    await axios.delete(
      `https://api.line.me/v2/bot/richmenu/${richMenuId}`,
      { headers: { 'Authorization': `Bearer ${config.channelAccessToken}` } }
    );

    console.log('✅ Rich Menu 已刪除');
  } catch (error) {
    console.error('❌ 刪除 Rich Menu 失敗:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 取得所有 Rich Menu
 */
async function listRichMenus() {
  try {
    const response = await axios.get(
      'https://api.line.me/v2/bot/richmenu/list',
      { headers: { 'Authorization': `Bearer ${config.channelAccessToken}` } }
    );
    return response.data.richmenus || [];
  } catch (error) {
    console.error('❌ 取得 Rich Menu 列表失敗:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu,
  deleteRichMenu,
  listRichMenus
};

