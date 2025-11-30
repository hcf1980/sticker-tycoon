/**
 * LINE Client 服務
 * 管理 LINE Bot SDK Client 實例
 */

const line = require('@line/bot-sdk');
const { getEnv } = require('../utils/env-validator');
const logger = require('../utils/logger');

// Client 單例
let client = null;
let channelSecret = null;

/**
 * 初始化 LINE Client
 * @returns {Object} LINE Client 實例
 */
function initializeLineClient() {
  if (client) {
    return client;
  }

  try {
    const env = getEnv();
    
    const config = {
      channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
      channelSecret: env.LINE_CHANNEL_SECRET,
    };

    channelSecret = env.LINE_CHANNEL_SECRET;
    client = new line.Client(config);
    
    logger.success('LINE Client 初始化成功');
    return client;
  } catch (error) {
    logger.error('LINE Client 初始化失敗', { error: error.message });
    throw error;
  }
}

/**
 * 取得 LINE Client
 * @returns {Object} LINE Client 實例
 */
function getLineClient() {
  if (!client) {
    return initializeLineClient();
  }
  return client;
}

/**
 * 取得 Channel Secret
 * @returns {string} Channel Secret
 */
function getChannelSecret() {
  if (!channelSecret) {
    const env = getEnv();
    channelSecret = env.LINE_CHANNEL_SECRET;
  }
  return channelSecret;
}

/**
 * 驗證 Webhook 簽名
 * @param {string} body - 請求 body (字串)
 * @param {string} signature - X-Line-Signature header
 * @returns {boolean} 驗證結果
 */
function validateSignature(body, signature) {
  try {
    const secret = getChannelSecret();
    return line.validateSignature(body, secret, signature);
  } catch (error) {
    logger.error('驗證 Webhook 簽名失敗', { error: error.message });
    return false;
  }
}

/**
 * 取得用戶個人資料
 * @param {string} userId - LINE User ID
 * @returns {Promise<Object>} 用戶資料
 */
async function getUserProfile(userId) {
  try {
    const client = getLineClient();
    const profile = await client.getProfile(userId);
    logger.debug('取得用戶個人資料成功', { userId });
    return profile;
  } catch (error) {
    logger.error('取得用戶個人資料失敗', { userId, error: error.message });
    throw error;
  }
}

/**
 * 取得訊息內容
 * @param {string} messageId - Message ID
 * @returns {Promise<Buffer>} 訊息內容
 */
async function getMessageContent(messageId) {
  try {
    const client = getLineClient();
    const stream = await client.getMessageContent(messageId);
    
    // 將 stream 轉換為 Buffer
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    logger.debug('取得訊息內容成功', { messageId, size: buffer.length });
    return buffer;
  } catch (error) {
    logger.error('取得訊息內容失敗', { messageId, error: error.message });
    throw error;
  }
}

module.exports = {
  initializeLineClient,
  getLineClient,
  getChannelSecret,
  validateSignature,
  getUserProfile,
  getMessageContent,
};

