/**
 * Creation Flow Manager
 * 管理創建流程：超時檢查、取消按鈕、代幣延遲扣除
 */

const { updateConversationState, ConversationStage } = require('./conversation-state');
const { getLineClient } = require('./line-client');

// 創建流程超時時間（10 分鐘）
const CREATION_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * 檢查創建流程是否超時
 * @param {object} state - 用戶對話狀態
 * @returns {boolean} 是否超時
 */
function isCreationFlowTimeout(state) {
  if (!state || !state.updated_at) return false;
  
  const stages = [
    ConversationStage.NAMING,
    ConversationStage.UPLOAD_PHOTO,
    ConversationStage.STYLING,
    ConversationStage.FRAMING,
    ConversationStage.CHARACTER,
    ConversationStage.EXPRESSIONS,
    ConversationStage.SCENE_SELECT,
    ConversationStage.CUSTOM_SCENE,
    ConversationStage.COUNT_SELECT,
    ConversationStage.CONFIRMING
  ];
  
  if (!stages.includes(state.current_stage)) return false;
  
  const updatedAt = new Date(state.updated_at);
  const now = new Date();
  const elapsed = now - updatedAt;
  
  return elapsed > CREATION_TIMEOUT_MS;
}

/**
 * 取消創建流程
 * @param {string} userId - 用戶 ID
 * @returns {object} LINE 訊息物件
 */
async function cancelCreationFlow(userId) {
  await updateConversationState(userId, ConversationStage.IDLE, {});
  
  return {
    type: 'text',
    text: '❌ 已取消創建流程\n\n' +
          '💡 想重新開始，請輸入「創建貼圖」'
  };
}

/**
 * 為創建流程的訊息加上「取消」按鈕
 * @param {object} message - LINE 訊息物件
 * @returns {object} 加上 QuickReply 的訊息物件
 */
function addCancelButton(message) {
  if (!message || message.type !== 'text') return message;
  
  return {
    ...message,
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '❌ 取消',
            text: '取消'
          }
        }
      ]
    }
  };
}

/**
 * 為創建流程的 Flex Message 加上「取消」按鈕
 * @param {object} message - LINE Flex Message
 * @returns {object} 加上 QuickReply 的訊息物件
 */
function addCancelButtonToFlex(message) {
  if (!message) return message;
  
  return {
    ...message,
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '❌ 取消',
            text: '取消'
          }
        }
      ]
    }
  };
}

/**
 * 檢查並處理超時流程
 * @param {object} state - 用戶對話狀態
 * @param {string} userId - 用戶 ID
 * @returns {object|null} 如果超時返回訊息物件，否則返回 null
 */
async function checkAndHandleTimeout(state, userId) {
  if (isCreationFlowTimeout(state)) {
    console.log(`⏰ 創建流程超時: userId=${userId}`);
    await updateConversationState(userId, ConversationStage.IDLE, {});
    
    return {
      type: 'text',
      text: '⏰ 創建流程已超時（10分鐘無操作）\n\n' +
            '為避免佔用資源，已自動取消流程。\n\n' +
            '💡 想重新開始，請輸入「創建貼圖」'
    };
  }
  
  return null;
}

/**
 * 處理用戶輸入「取消」
 * @param {string} userId - 用戶 ID
 * @param {object} state - 用戶對話狀態
 * @returns {boolean} 是否成功取消
 */
async function handleCancelCommand(userId, state) {
  const creationStages = [
    ConversationStage.NAMING,
    ConversationStage.UPLOAD_PHOTO,
    ConversationStage.STYLING,
    ConversationStage.FRAMING,
    ConversationStage.CHARACTER,
    ConversationStage.EXPRESSIONS,
    ConversationStage.SCENE_SELECT,
    ConversationStage.CUSTOM_SCENE,
    ConversationStage.COUNT_SELECT,
    ConversationStage.CONFIRMING
  ];
  
  if (!creationStages.includes(state.current_stage)) {
    return false;
  }
  
  await updateConversationState(userId, ConversationStage.IDLE, {});
  return true;
}

module.exports = {
  CREATION_TIMEOUT_MS,
  isCreationFlowTimeout,
  cancelCreationFlow,
  addCancelButton,
  addCancelButtonToFlex,
  checkAndHandleTimeout,
  handleCancelCommand
};

