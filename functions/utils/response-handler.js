/**
 * LINE Bot 回應處理工具
 * 統一處理 LINE Bot 的各種回應
 */

const { AppError } = require('../errors');
const logger = require('./logger');

/**
 * 創建 LINE 客戶端包裝器
 * @param {Object} lineClient - LINE Bot SDK Client
 */
function createResponseHandler(lineClient) {
  /**
   * 回應文字訊息
   * @param {string} replyToken - Reply token
   * @param {string} text - 文字內容
   */
  async function replyText(replyToken, text) {
    try {
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text,
      });
      logger.debug('回應文字訊息成功', { textLength: text.length });
    } catch (error) {
      logger.error('回應文字訊息失敗', { error: error.message });
      throw new AppError('回應訊息失敗', 'REPLY_ERROR', 500, { originalError: error });
    }
  }

  /**
   * 回應 Flex Message
   * @param {string} replyToken - Reply token
   * @param {Object} flexMessage - Flex Message 物件
   */
  async function replyFlex(replyToken, flexMessage) {
    try {
      await lineClient.replyMessage(replyToken, flexMessage);
      logger.debug('回應 Flex Message 成功');
    } catch (error) {
      logger.error('回應 Flex Message 失敗', { error: error.message });
      throw new AppError('回應訊息失敗', 'REPLY_ERROR', 500, { originalError: error });
    }
  }

  /**
   * 回應多則訊息
   * @param {string} replyToken - Reply token
   * @param {Array} messages - 訊息陣列
   */
  async function replyMultiple(replyToken, messages) {
    try {
      await lineClient.replyMessage(replyToken, messages);
      logger.debug('回應多則訊息成功', { count: messages.length });
    } catch (error) {
      logger.error('回應多則訊息失敗', { error: error.message });
      throw new AppError('回應訊息失敗', 'REPLY_ERROR', 500, { originalError: error });
    }
  }

  /**
   * 推送文字訊息
   * @param {string} userId - 用戶 ID
   * @param {string} text - 文字內容
   */
  async function pushText(userId, text) {
    try {
      await lineClient.pushMessage(userId, {
        type: 'text',
        text,
      });
      logger.debug('推送文字訊息成功', { userId });
    } catch (error) {
      logger.error('推送文字訊息失敗', { userId, error: error.message });
      throw new AppError('推送訊息失敗', 'PUSH_ERROR', 500, { originalError: error });
    }
  }

  /**
   * 推送 Flex Message
   * @param {string} userId - 用戶 ID
   * @param {Object} flexMessage - Flex Message 物件
   */
  async function pushFlex(userId, flexMessage) {
    try {
      await lineClient.pushMessage(userId, flexMessage);
      logger.debug('推送 Flex Message 成功', { userId });
    } catch (error) {
      logger.error('推送 Flex Message 失敗', { userId, error: error.message });
      throw new AppError('推送訊息失敗', 'PUSH_ERROR', 500, { originalError: error });
    }
  }

  /**
   * 回應錯誤訊息
   * @param {string} replyToken - Reply token
   * @param {Error} error - 錯誤物件
   */
  async function replyError(replyToken, error) {
    let errorMessage = '❌ 發生錯誤，請稍後再試';

    if (error instanceof AppError) {
      // 自定義錯誤，使用友善的錯誤訊息
      switch (error.code) {
        case 'TOKEN_INSUFFICIENT':
          errorMessage = `❌ 代幣不足\n\n您目前有 ${error.details.current} 代幣\n需要 ${error.details.required} 代幣\n\n輸入「購買代幣」進行儲值`;
          break;
        case 'VALIDATION_ERROR':
          errorMessage = `❌ 輸入格式錯誤\n\n${error.message}`;
          break;
        case 'NOT_FOUND':
          errorMessage = `❌ ${error.message}`;
          break;
        default:
          errorMessage = `❌ ${error.message}`;
      }
    } else {
      // 一般錯誤
      errorMessage = `❌ ${error.message || '發生未知錯誤'}`;
    }

    await replyText(replyToken, errorMessage);
  }

  return {
    replyText,
    replyFlex,
    replyMultiple,
    pushText,
    pushFlex,
    replyError,
  };
}

module.exports = {
  createResponseHandler,
};

