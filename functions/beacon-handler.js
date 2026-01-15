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
 * @param {string} beaconData.type - 'enter' or 'leave' or 'stay'
 * @param {string} beaconData.dm - Device Message (optional)
 * @returns {Promise<object>} 處理結果
 */
async function handleBeaconEvent(userId, beaconData) {
  const supabase = getSupabaseClient();
  const { hwid, type, dm } = beaconData;

  console.log(`📡 Beacon 事件: userId=${userId}, hwid=${hwid}, type=${type}`);

  let eventId = null;
  let isFriend = false;

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

      // 仍然記錄事件（用於除錯）
      await supabase.from('beacon_events').insert({
        user_id: userId,
        hwid: hwid,
        event_type: type,
        device_message: dm || null,
        timestamp: Date.now(),
        is_friend: false,
        message_sent: false,
        error_message: 'Beacon 設備未註冊或未啟用'
      });

      return {
        success: false,
        message: 'Beacon 設備未註冊或未啟用'
      };
    }

    // 2. 檢查用戶是否為好友
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('is_friend')
        .eq('user_id', userId)
        .single();

      isFriend = userData?.is_friend || false;
      console.log(`👤 用戶好友狀態: ${isFriend ? '已加入' : '未加入'}`);
    } catch (error) {
      console.log('⚠️ 無法取得用戶好友狀態:', error.message);
    }

    // 3. 取得對應的動作設定（新版結構：使用 trigger_type 和 message_id）
    const { data: actions, error: actionsError } = await supabase
      .from('beacon_actions')
      .select(`
        *,
        beacon_messages (
          id,
          template_name,
          message_type,
          message_content,
          target_audience
        )
      `)
      .eq('hwid', hwid)
      .eq('trigger_type', type)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (actionsError) {
      console.error('❌ 取得 Beacon 動作失敗:', actionsError);
    }

    let selectedAction = null;
    let selectedMessage = null;
    let skipReason = null;

    // 4. 根據好友狀態和觸發限制篩選適合的動作
    if (actions && actions.length > 0) {
      for (const action of actions) {
        const message = action.beacon_messages;
        if (!message) continue;

        const targetAudience = message.target_audience || 'all';

        // 檢查目標對象是否符合
        const audienceMatch = targetAudience === 'all' ||
                             (targetAudience === 'friends' && isFriend) ||
                             (targetAudience === 'non_friends' && !isFriend);

        if (!audienceMatch) {
          console.log(`⏭️ 跳過動作 ${action.action_name}: 目標對象不符 (需要: ${targetAudience}, 用戶: ${isFriend ? 'friend' : 'non_friend'})`);
          continue;
        }

        // 檢查每日觸發次數限制
        const dailyLimit = action.daily_limit || 2;
        const { data: dailyCheck } = await supabase
          .rpc('check_beacon_daily_limit', {
            p_user_id: userId,
            p_hwid: hwid,
            p_action_id: action.id
          })
          .single();

        if (dailyCheck && !dailyCheck.can_trigger) {
          console.log(`⏭️ 跳過動作 ${action.action_name}: ${dailyCheck.message}`);
          skipReason = dailyCheck.message;
          continue;
        }

        // 檢查冷卻時間
        const cooldownMinutes = action.cooldown_minutes || 60;
        const { data: cooldownCheck } = await supabase
          .rpc('check_beacon_cooldown', {
            p_user_id: userId,
            p_hwid: hwid,
            p_action_id: action.id
          })
          .single();

        if (cooldownCheck && !cooldownCheck.can_trigger) {
          console.log(`⏭️ 跳過動作 ${action.action_name}: ${cooldownCheck.message}`);
          skipReason = cooldownCheck.message;
          continue;
        }

        // 所有檢查都通過，選擇此動作
        selectedAction = action;
        selectedMessage = message;
        console.log(`✅ 選擇動作: ${action.action_name} (每日限制: ${dailyLimit}次, 冷卻: ${cooldownMinutes}分鐘)`);
        break;
      }
    }

    // 5. 記錄事件
    const { data: eventData, error: eventError } = await supabase
      .from('beacon_events')
      .insert({
        user_id: userId,
        hwid: hwid,
        event_type: type,
        device_message: dm || null,
        timestamp: Date.now(),
        is_friend: isFriend,
        message_sent: !!selectedMessage,
        action_id: selectedAction?.id || null,
        message_id: selectedMessage?.id || null,
        error_message: skipReason || null
      })
      .select()
      .single();

    if (eventError) {
      console.error('❌ 記錄 Beacon 事件失敗:', eventError);
    } else {
      eventId = eventData?.id;
      console.log(`✅ Beacon 事件已記錄: eventId=${eventId}, message_sent=${!!selectedMessage}`);
      if (skipReason) {
        console.log(`ℹ️ 跳過原因: ${skipReason}`);
      }
    }

    // 6. 更新統計資料
    await updateBeaconStatistics(hwid, type, userId);

    // 7. 返回要發送的訊息
    if (selectedMessage) {
      console.log(`📤 準備發送訊息: ${selectedMessage.template_name} (${selectedMessage.message_type})`);

      let messageData;
      if (selectedMessage.message_type === 'text') {
        messageData = {
          type: 'text',
          text: selectedMessage.message_content
        };
      } else {
        // Flex Message 或其他類型
        try {
          messageData = JSON.parse(selectedMessage.message_content);
        } catch (e) {
          console.error('❌ 解析訊息內容失敗:', e);
          messageData = {
            type: 'text',
            text: selectedMessage.message_content
          };
        }
      }

      return {
        success: true,
        action: 'message',
        data: messageData,
        device: device,
        eventId: eventId
      };
    }

    const noActionMessage = skipReason || '無符合條件的動作設定';
    console.log(`📡 ${noActionMessage}`);
    return {
      success: true,
      action: 'none',
      message: noActionMessage,
      eventId: eventId
    };

  } catch (error) {
    console.error('❌ 處理 Beacon 事件失敗:', error);

    // 記錄錯誤
    if (eventId) {
      await supabase
        .from('beacon_events')
        .update({ error_message: error.message })
        .eq('id', eventId);
    }

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

