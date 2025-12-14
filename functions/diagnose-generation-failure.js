/**
 * 診斷生成失敗 - 提供詳細的失敗原因和建議
 * 
 * 用途：
 * - 查詢任何貼圖組的生成失敗原因
 * - 提供故障排除建議
 * - 記錄詳細的錯誤信息
 */

const { getSupabaseClient } = require('./supabase-client');

/**
 * 診斷單個貼圖組的生成失敗
 */
async function diagnoseStickerSetFailure(setId) {
  try {
    const supabase = getSupabaseClient();

    // 1. 取得貼圖組信息
    const { data: stickerSet, error: setError } = await supabase
      .from('sticker_sets')
      .select('*')
      .eq('set_id', setId)
      .single();

    if (setError) {
      throw new Error(`找不到貼圖組: ${setId}`);
    }

    // 2. 取得關聯的生成任務
    const { data: tasks } = await supabase
      .from('generation_tasks')
      .select('*')
      .eq('set_id', setId)
      .order('created_at', { ascending: false });

    // 3. 分析失敗原因
    const diagnosis = {
      setId,
      setName: stickerSet.name,
      status: stickerSet.status,
      createdAt: stickerSet.created_at,
      tasks: tasks || [],
      failures: [],
      suggestions: []
    };

    // 4. 逐一分析每個失敗的任務
    for (const task of (tasks || []).filter(t => t.status === 'failed')) {
      const failure = {
        taskId: task.task_id,
        errorMessage: task.error_message,
        timestamp: task.updated_at
      };

      diagnosis.failures.push(failure);

      // 5. 根據錯誤信息提供建議
      const error = task.error_message || '';

      if (error.includes('API Key') || error.includes('認證')) {
        diagnosis.suggestions.push('❌ API 認證失敗 - 檢查 AI_IMAGE_API_KEY 環境變數');
      } else if (error.includes('429') || error.includes('頻繁')) {
        diagnosis.suggestions.push('⚠️ 請求過於頻繁 - 等待 5-10 分鐘後重試');
      } else if (error.includes('500') || error.includes('502') || error.includes('503')) {
        diagnosis.suggestions.push('⚠️ AI 服務器故障 - 請稍後再試');
      } else if (error.includes('timeout')) {
        diagnosis.suggestions.push('⏳ 生成超時 - 嘗試減少貼圖數量或簡化提示詞');
      } else if (error.includes('格式錯誤')) {
        diagnosis.suggestions.push('📋 API 回應格式異常 - 聯繫技術支援');
      } else if (error.includes('無法連接')) {
        diagnosis.suggestions.push('🌐 網絡連接問題 - 檢查網絡或 API 端點');
      }
    }

    return diagnosis;

  } catch (error) {
    console.error('診斷失敗:', error);
    return {
      error: error.message,
      suggestions: [
        '📞 無法診斷此貼圖組',
        '💡 請聯繫技術支援並提供貼圖組 ID'
      ]
    };
  }
}

/**
 * 診斷用戶的最近失敗
 */
async function diagnoseUserFailures(userId, limit = 5) {
  try {
    const supabase = getSupabaseClient();

    // 取得用戶最近的失敗任務
    const { data: failedTasks } = await supabase
      .from('generation_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit);

    const diagnosis = {
      userId,
      failureCount: failedTasks?.length || 0,
      failures: [],
      commonIssues: {}
    };

    // 統計常見的失敗原因
    for (const task of (failedTasks || [])) {
      const error = task.error_message || '未知原因';
      
      diagnosis.failures.push({
        taskId: task.task_id,
        setId: task.set_id,
        error,
        timestamp: task.updated_at
      });

      // 計算失敗原因頻率
      diagnosis.commonIssues[error] = (diagnosis.commonIssues[error] || 0) + 1;
    }

    return diagnosis;

  } catch (error) {
    console.error('診斷用戶失敗:', error);
    return { error: error.message };
  }
}

module.exports = {
  diagnoseStickerSetFailure,
  diagnoseUserFailures
};

