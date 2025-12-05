/**
 * Conversation State Module
 * 管理用戶的對話狀態（貼圖創建流程）
 */

const { getSupabaseClient } = require('./supabase-client');
const { globalCache } = require('./utils/cache-manager');

// 對話階段定義
const ConversationStage = {
  IDLE: 'idle',                    // 閒置
  NAMING: 'naming',                // 輸入貼圖組名稱
  UPLOAD_PHOTO: 'upload_photo',    // 上傳照片
  STYLING: 'styling',              // 選擇風格
  CHARACTER: 'character',          // 描述角色（舊流程保留）
  FRAMING: 'framing',              // 選擇構圖（全身/半身/大頭/特寫）
  EXPRESSIONS: 'expressions',      // 選擇/輸入表情
  SCENE_SELECT: 'scene_select',    // 選擇場景/配件
  CUSTOM_SCENE: 'custom_scene',    // 自訂場景描述
  COUNT_SELECT: 'count_select',    // 選擇貼圖數量
  CONFIRMING: 'confirming',        // 確認生成
  GENERATING: 'generating',        // 生成中
  EDITING: 'editing'               // 編輯模式
};

/**
 * 取得用戶對話狀態（優化版：加入快取）
 */
async function getConversationState(userId) {
  try {
    const cacheKey = globalCache.generateKey('conv_state', userId);

    // 先嘗試從快取取得
    const cached = globalCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await getSupabaseClient()
      .from('conversation_states')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const state = data || {
      user_id: userId,
      current_stage: ConversationStage.IDLE,
      current_set_id: null,
      temp_data: {}
    };

    // 快取狀態（較短的 TTL，因為狀態變化較頻繁）
    globalCache.set(cacheKey, state, 60000); // 快取 1 分鐘

    return state;
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
 * 更新用戶對話狀態（優化版：更新快取）
 */
async function updateConversationState(userId, stage, tempData = {}, setId = null) {
  try {
    console.log(`📝 更新對話狀態: userId=${userId}, stage=${stage}`);

    const newState = {
      user_id: userId,
      current_stage: stage,
      current_set_id: setId,
      temp_data: tempData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await getSupabaseClient()
      .from('conversation_states')
      .upsert(newState, {
        onConflict: 'user_id'
      })
      .select();

    if (error) {
      console.error('❌ Supabase upsert 錯誤:', error);
      throw error;
    }

    // 更新快取
    const cacheKey = globalCache.generateKey('conv_state', userId);
    globalCache.set(cacheKey, newState, 60000); // 快取 1 分鐘

    console.log(`✅ 對話狀態更新成功:`, data);
    return true;
  } catch (error) {
    console.error('❌ 更新對話狀態失敗:', error);
    return false;
  }
}

/**
 * 重置用戶對話狀態（優化版：清除快取）
 */
async function resetConversationState(userId) {
  const cacheKey = globalCache.generateKey('conv_state', userId);
  globalCache.delete(cacheKey);
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
    ConversationStage.FRAMING,         // 構圖選擇
    ConversationStage.CHARACTER,
    ConversationStage.EXPRESSIONS,
    ConversationStage.SCENE_SELECT,    // 場景選擇
    ConversationStage.CUSTOM_SCENE,    // 自訂場景
    ConversationStage.COUNT_SELECT,
    ConversationStage.CONFIRMING
  ].includes(stage);
}

/**
 * 取得表情模板（優化版：加入快取）
 */
async function getExpressionTemplates() {
  try {
    const cacheKey = 'expression_templates:all';

    // 表情模板變化不頻繁，可以長時間快取
    return await globalCache.getOrSet(
      cacheKey,
      async () => {
        const { data, error } = await getSupabaseClient()
          .from('expression_templates')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;
        return data || [];
      },
      1800000 // 快取 30 分鐘
    );
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

