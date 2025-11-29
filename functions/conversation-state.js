/**
 * Conversation State Module
 * 管理用戶的對話狀態（貼圖創建流程）
 */

const { getSupabaseClient } = require('./supabase-client');

// 對話階段定義
const ConversationStage = {
  IDLE: 'idle',                    // 閒置
  NAMING: 'naming',                // 輸入貼圖組名稱
  UPLOAD_PHOTO: 'upload_photo',    // 上傳照片
  STYLING: 'styling',              // 選擇風格
  CHARACTER: 'character',          // 描述角色（舊流程保留）
  EXPRESSIONS: 'expressions',      // 選擇/輸入表情
  SCENE_SELECT: 'scene_select',    // 選擇場景/配件（新增）
  CUSTOM_SCENE: 'custom_scene',    // 自訂場景描述（新增）
  COUNT_SELECT: 'count_select',    // 選擇貼圖數量
  CONFIRMING: 'confirming',        // 確認生成
  GENERATING: 'generating',        // 生成中
  EDITING: 'editing'               // 編輯模式
};

/**
 * 取得用戶對話狀態
 */
async function getConversationState(userId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('conversation_states')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    return data || {
      user_id: userId,
      current_stage: ConversationStage.IDLE,
      current_set_id: null,
      temp_data: {}
    };
  } catch (error) {
    console.error('取得對話狀態失敗:', error);
    return {
      user_id: userId,
      current_stage: ConversationStage.IDLE,
      current_set_id: null,
      temp_data: {}
    };
  }
}

/**
 * 更新用戶對話狀態
 */
async function updateConversationState(userId, stage, tempData = {}, setId = null) {
  try {
    console.log(`📝 更新對話狀態: userId=${userId}, stage=${stage}`);

    const { data, error } = await getSupabaseClient()
      .from('conversation_states')
      .upsert({
        user_id: userId,
        current_stage: stage,
        current_set_id: setId,
        temp_data: tempData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (error) {
      console.error('❌ Supabase upsert 錯誤:', error);
      throw error;
    }

    console.log(`✅ 對話狀態更新成功:`, data);
    return true;
  } catch (error) {
    console.error('❌ 更新對話狀態失敗:', error);
    return false;
  }
}

/**
 * 重置用戶對話狀態
 */
async function resetConversationState(userId) {
  return updateConversationState(userId, ConversationStage.IDLE, {}, null);
}

/**
 * 檢查用戶是否在創建流程中
 */
function isInCreationFlow(stage) {
  return [
    ConversationStage.NAMING,
    ConversationStage.UPLOAD_PHOTO,
    ConversationStage.STYLING,
    ConversationStage.CHARACTER,
    ConversationStage.EXPRESSIONS,
    ConversationStage.COUNT_SELECT,
    ConversationStage.CONFIRMING
  ].includes(stage);
}

/**
 * 取得表情模板
 */
async function getExpressionTemplates() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('expression_templates')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('取得表情模板失敗:', error);
    return [];
  }
}

module.exports = {
  ConversationStage,
  getConversationState,
  updateConversationState,
  resetConversationState,
  isInCreationFlow,
  getExpressionTemplates
};

