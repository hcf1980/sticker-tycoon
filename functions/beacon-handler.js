/**
 * LINE Beacon 事件處理器
 * 處理用戶進入/離開 Beacon 範圍的事件
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 客戶端
let supabaseClient = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('缺少 Supabase 環境變數');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

/**
 * 處理 Beacon 事件
 * @param {string} userId - LINE User ID
 * @param {object} beaconData - Beacon 事件資料
 * @param {string} beaconData.hwid - Hardware ID
 * @param {string} beaconData.type - 'enter' or 'leave'
 * @param {string} beaconData.dm - Device Message (optional)
 * @returns {Promise<object>} 處理結果
 */
async function handleBeaconEvent(userId, beaconData) {
  const supabase = getSupabaseClient();
  const { hwid, type, dm } = beaconData;

  console.log(`📡 Beacon 事件: userId=${userId}, hwid=${hwid}, type=${type}`);

  try {
    // 1. 檢查 Beacon 設備是否已註冊且啟用
    const { data: device, error: deviceError } = await supabase
      .from('beacon_devices')
      .select('*')
      .eq('hwid', hwid)
      .eq('is_active', true)
      .single();

    if (deviceError || !device) {
      console.log(`⚠️ Beacon 設備未註冊或未啟用: ${hwid}`);
      return {
        success: false,
        message: 'Beacon 設備未註冊或未啟用'
      };
    }

    // 2. 記錄事件
    const { error: eventError } = await supabase
      .from('beacon_events')
      .insert({
        user_id: userId,
        hwid: hwid,
        event_type: type,
        device_message: dm || null,
        timestamp: Date.now()
      });

    if (eventError) {
      console.error('❌ 記錄 Beacon 事件失敗:', eventError);
    }

    // 3. 更新統計資料
    await updateBeaconStatistics(hwid, type, userId);

    // 4. 取得對應的動作設定
    const { data: actions, error: actionsError } = await supabase
      .from('beacon_actions')
      .select('*')
      .eq('hwid', hwid)
      .eq('event_type', type)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (actionsError) {
      console.error('❌ 取得 Beacon 動作失敗:', actionsError);
      return { success: false, message: '取得動作設定失敗' };
    }

    // 5. 執行動作（返回最高優先級的動作）
    if (actions && actions.length > 0) {
      const action = actions[0]; // 取最高優先級
      return {
        success: true,
        action: action.action_type,
        data: action.action_data,
        device: device
      };
    }

    return {
      success: true,
      action: 'none',
      message: '無設定動作'
    };

  } catch (error) {
    console.error('❌ 處理 Beacon 事件失敗:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 更新 Beacon 統計資料
 */
async function updateBeaconStatistics(hwid, eventType, userId) {
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    // 使用 upsert 更新或插入統計資料
    const updateField = eventType === 'enter' ? 'enter_count' : 'leave_count';
    
    const { data: existing } = await supabase
      .from('beacon_statistics')
      .select('*')
      .eq('hwid', hwid)
      .eq('date', today)
      .single();

    if (existing) {
      // 更新現有記錄
      await supabase
        .from('beacon_statistics')
        .update({
          [updateField]: existing[updateField] + 1
        })
        .eq('id', existing.id);
    } else {
      // 插入新記錄
      await supabase
        .from('beacon_statistics')
        .insert({
          hwid: hwid,
          date: today,
          [updateField]: 1,
          unique_users: 1
        });
    }
  } catch (error) {
    console.error('❌ 更新統計失敗:', error);
  }
}

module.exports = {
  handleBeaconEvent
};

