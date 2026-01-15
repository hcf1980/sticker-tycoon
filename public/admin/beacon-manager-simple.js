// Supabase 配置
const SUPABASE_URL = 'https://dpuxmetnpghlfgrmthnv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdXhtZXRucGdobGZncm10aG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDMwNzcsImV4cCI6MjA3OTgxOTA3N30._fleTY6Pw4myjEIjtAxkYYm6L8MfPeKq915zn68pM_8';

// 初始化 Supabase
let db = null;
try {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Supabase 初始化成功');
} catch (error) {
  console.error('❌ Supabase 初始化失敗:', error);
}

// 全域變數
let allDevices = [];
let allActions = [];
let allMessages = [];
let currentEditingDeviceId = null;
let currentEditingActionId = null;
let currentEditingMessageId = null;

// Tab 切換
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;

    // 更新按鈕狀態
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active', 'text-cyan-400', 'border-cyan-400');
      b.classList.add('text-gray-400');
    });
    btn.classList.add('active', 'text-cyan-400', 'border-cyan-400');
    btn.classList.remove('text-gray-400');

    // 切換內容
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    document.getElementById(tabName + 'Tab').classList.remove('hidden');
  });
});

// 登出按鈕
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (typeof netlifyIdentity !== 'undefined') {
    netlifyIdentity.logout();
  }
  window.location.href = '/admin/login.html';
});

// Modal 關閉按鈕
document.querySelectorAll('.close-modal').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[id$="Modal"]').forEach(modal => {
      modal.classList.add('hidden');
    });
  });
});

// 頁面載入後直接載入資料
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Beacon Manager 載入完成');
  loadAllData();

  // 每 30 秒自動刷新統計
  setInterval(loadStatistics, 30000);
});

// 載入所有資料
async function loadAllData() {
  await Promise.all([
    loadDevices(),
    loadActions(),
    loadMessages(),
    loadStatistics()
  ]);
}

// 載入統計資料
async function loadStatistics() {
  try {
    // 總設備數
    const { count: totalDevices } = await db
      .from('beacon_devices')
      .select('*', { count: 'exact', head: true });

    // 今日觸發次數
    const today = new Date().toISOString().split('T')[0];
    const { count: todayTriggers } = await db
      .from('beacon_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // 已加入好友推送數
    const { count: friendPushes } = await db
      .from('beacon_events')
      .select('*', { count: 'exact', head: true })
      .eq('is_friend', true)
      .gte('created_at', today);

    // 未加入好友推送數
    const { count: nonFriendPushes } = await db
      .from('beacon_events')
      .select('*', { count: 'exact', head: true })
      .eq('is_friend', false)
      .gte('created_at', today);

    // 更新顯示
    document.getElementById('totalDevices').textContent = totalDevices || 0;
    document.getElementById('todayTriggers').textContent = todayTriggers || 0;
    document.getElementById('friendPushes').textContent = friendPushes || 0;
    document.getElementById('nonFriendPushes').textContent = nonFriendPushes || 0;

  } catch (error) {
    console.error('載入統計失敗:', error);
  }
}

// 新增設備按鈕
document.getElementById('addBeaconBtn')?.addEventListener('click', () => {
  currentEditingDeviceId = null;
  document.getElementById('deviceModal').classList.remove('hidden');
  document.getElementById('deviceForm').reset();
  document.getElementById('modalTitle').textContent = '新增 Beacon 設備';
});

// 新增觸發動作按鈕
document.getElementById('addActionBtn')?.addEventListener('click', async () => {
  currentEditingActionId = null;
  // 載入設備列表到下拉選單
  await loadDeviceOptions();
  await loadMessageOptions();
  document.getElementById('actionModal').classList.remove('hidden');
  document.getElementById('actionForm').reset();
});

// 新增推送訊息按鈕
document.getElementById('addMessageBtn')?.addEventListener('click', () => {
  currentEditingMessageId = null;
  document.getElementById('messageModal').classList.remove('hidden');
  document.getElementById('messageForm').reset();
});

// 載入設備選項
async function loadDeviceOptions() {
  const select = document.getElementById('actionDeviceSelect');
  select.innerHTML = '<option value="">請選擇設備</option>';

  allDevices.forEach(device => {
    const option = document.createElement('option');
    option.value = device.hwid;
    option.textContent = `${device.device_name} (${device.hwid})`;
    select.appendChild(option);
  });
}

// 載入訊息選項
async function loadMessageOptions() {
  const select = document.getElementById('actionMessageSelect');
  select.innerHTML = '<option value="">請選擇訊息模板</option>';

  allMessages.forEach(msg => {
    const option = document.createElement('option');
    option.value = msg.id;
    option.textContent = msg.template_name;
    select.appendChild(option);
  });
}

// 關閉 Modal
document.getElementById('closeModal')?.addEventListener('click', () => {
  document.getElementById('deviceModal').classList.add('hidden');
});

// 提交設備表單
document.getElementById('deviceForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const deviceData = {
    device_name: formData.get('device_name'),
    hwid: formData.get('hwid'),
    vendor_key: formData.get('vendor_key') || null,
    lot_key: formData.get('lot_key') || null,
    location: formData.get('location') || null,
    description: formData.get('description') || null,
    is_active: formData.get('is_active') === 'on'
  };

  try {
    let result;
    if (currentEditingDeviceId) {
      // 更新現有設備
      result = await db
        .from('beacon_devices')
        .update(deviceData)
        .eq('id', currentEditingDeviceId)
        .select();

      if (result.error) throw result.error;
      alert('✅ 設備已更新！');
    } else {
      // 新增設備
      result = await db
        .from('beacon_devices')
        .insert([deviceData])
        .select();

      if (result.error) throw result.error;
      alert('✅ 設備已新增！');
    }

    document.getElementById('deviceModal').classList.add('hidden');
    currentEditingDeviceId = null;
    loadAllData();
  } catch (error) {
    console.error('Error:', error);
    alert('❌ 操作失敗: ' + error.message);
  }
});

// 提交觸發動作表單
document.getElementById('actionForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const actionData = {
    action_name: formData.get('action_name'),
    hwid: formData.get('hwid'),
    trigger_type: formData.get('trigger_type'),
    message_id: formData.get('message_id'),
    description: formData.get('description') || null,
    is_active: formData.get('is_active') === 'on'
  };

  try {
    let result;
    if (currentEditingActionId) {
      // 更新現有動作
      result = await db
        .from('beacon_actions')
        .update(actionData)
        .eq('id', currentEditingActionId)
        .select();

      if (result.error) throw result.error;
      alert('✅ 觸發動作已更新！');
    } else {
      // 新增動作
      result = await db
        .from('beacon_actions')
        .insert([actionData])
        .select();

      if (result.error) throw result.error;
      alert('✅ 觸發動作已新增！');
    }

    document.getElementById('actionModal').classList.add('hidden');
    currentEditingActionId = null;
    loadAllData();
  } catch (error) {
    console.error('Error:', error);
    alert('❌ 操作失敗: ' + error.message);
  }
});

// 提交推送訊息表單
document.getElementById('messageForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const messageData = {
    template_name: formData.get('template_name'),
    message_type: formData.get('message_type'),
    message_content: formData.get('message_content'),
    target_audience: formData.get('target_audience') || 'all',
    description: formData.get('description') || null,
    is_active: formData.get('is_active') === 'on'
  };

  try {
    let result;
    if (currentEditingMessageId) {
      // 更新現有訊息
      result = await db
        .from('beacon_messages')
        .update(messageData)
        .eq('id', currentEditingMessageId)
        .select();

      if (result.error) throw result.error;
      alert('✅ 推送訊息模板已更新！');
    } else {
      // 新增訊息
      result = await db
        .from('beacon_messages')
        .insert([messageData])
        .select();

      if (result.error) throw result.error;
      alert('✅ 推送訊息模板已新增！');
    }

    document.getElementById('messageModal').classList.add('hidden');
    currentEditingMessageId = null;
    loadAllData();
  } catch (error) {
    console.error('Error:', error);
    alert('❌ 操作失敗: ' + error.message);
  }
});

// 載入設備列表
async function loadDevices() {
  try {
    const { data, error } = await db
      .from('beacon_devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allDevices = data || [];
    const container = document.getElementById('devicesContainer');
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-gray-400 text-center py-8">尚無設備，點擊上方按鈕新增</p>';
      return;
    }

    container.innerHTML = data.map(device => `
      <div class="bg-gray-800/50 border border-cyan-500/30 rounded-lg p-6">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-bold text-white mb-2">${escapeHtml(device.device_name)}</h3>
            <div class="space-y-1 text-sm">
              <p><span class="text-gray-400">HWID:</span> <span class="text-cyan-400 font-mono">${device.hwid}</span></p>
              ${device.vendor_key ? `<p><span class="text-gray-400">Vendor Key:</span> <span class="font-mono">${device.vendor_key}</span></p>` : ''}
              ${device.location ? `<p><span class="text-gray-400">位置:</span> ${escapeHtml(device.location)}</p>` : ''}
              ${device.description ? `<p class="text-gray-400 mt-2">${escapeHtml(device.description)}</p>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 rounded text-sm ${device.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
              ${device.is_active ? '✅ 啟用中' : '⏸️ 已停用'}
            </span>
            <button onclick="editDevice('${device.id}')" class="text-blue-400 hover:text-blue-300 px-3 py-1 rounded border border-blue-500/30 hover:bg-blue-500/10">
              ✏️ 編輯
            </button>
            <button onclick="deleteDevice('${device.id}', '${escapeHtml(device.device_name)}')" class="text-red-400 hover:text-red-300 px-3 py-1 rounded border border-red-500/30 hover:bg-red-500/10">
              🗑️ 刪除
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('載入設備失敗:', error);
    document.getElementById('devicesContainer').innerHTML = `<p class="text-red-400 text-center py-8">❌ 載入失敗: ${error.message}</p>`;
  }
}

// 載入觸發動作列表
async function loadActions() {
  try {
    const { data, error } = await db
      .from('beacon_actions')
      .select(`
        *,
        beacon_devices!inner(device_name),
        beacon_messages!inner(template_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allActions = data || [];
    const container = document.getElementById('actionsContainer');
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-gray-400 text-center py-8">尚無觸發動作，點擊上方按鈕新增</p>';
      return;
    }

    container.innerHTML = data.map(action => `
      <div class="bg-gray-800/50 border border-purple-500/30 rounded-lg p-6">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-bold text-white mb-2">${escapeHtml(action.action_name)}</h3>
            <div class="space-y-1 text-sm">
              <p><span class="text-gray-400">設備:</span> ${escapeHtml(action.beacon_devices.device_name)}</p>
              <p><span class="text-gray-400">觸發類型:</span> <span class="text-purple-400">${getTriggerTypeText(action.trigger_type)}</span></p>
              <p><span class="text-gray-400">推送訊息:</span> ${escapeHtml(action.beacon_messages.template_name)}</p>
              ${action.description ? `<p class="text-gray-400 mt-2">${escapeHtml(action.description)}</p>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 rounded text-sm ${action.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
              ${action.is_active ? '✅ 啟用中' : '⏸️ 已停用'}
            </span>
            <button onclick="editAction('${action.id}')" class="text-blue-400 hover:text-blue-300 px-3 py-1 rounded border border-blue-500/30 hover:bg-blue-500/10">
              ✏️ 編輯
            </button>
            <button onclick="deleteAction('${action.id}', '${escapeHtml(action.action_name)}')" class="text-red-400 hover:text-red-300 px-3 py-1 rounded border border-red-500/30 hover:bg-red-500/10">
              🗑️ 刪除
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('載入觸發動作失敗:', error);
    document.getElementById('actionsContainer').innerHTML = `<p class="text-red-400 text-center py-8">❌ 載入失敗: ${error.message}</p>`;
  }
}

// 載入推送訊息列表
async function loadMessages() {
  try {
    const { data, error } = await db
      .from('beacon_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allMessages = data || [];
    const container = document.getElementById('messagesContainer');
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-gray-400 text-center py-8">尚無推送訊息模板，點擊上方按鈕新增</p>';
      return;
    }

    container.innerHTML = data.map(msg => `
      <div class="bg-gray-800/50 border border-green-500/30 rounded-lg p-6">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-bold text-white mb-2">${escapeHtml(msg.template_name)}</h3>
            <div class="space-y-1 text-sm">
              <p><span class="text-gray-400">訊息類型:</span> <span class="text-green-400">${getMessageTypeText(msg.message_type)}</span></p>
              <p><span class="text-gray-400">目標對象:</span> ${getTargetAudienceText(msg.target_audience)}</p>
              <div class="mt-2 p-3 bg-gray-900/50 rounded border border-gray-700">
                <p class="text-gray-300 text-xs whitespace-pre-wrap">${escapeHtml(msg.message_content.substring(0, 200))}${msg.message_content.length > 200 ? '...' : ''}</p>
              </div>
              ${msg.description ? `<p class="text-gray-400 mt-2">${escapeHtml(msg.description)}</p>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 rounded text-sm ${msg.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
              ${msg.is_active ? '✅ 啟用中' : '⏸️ 已停用'}
            </span>
            <button onclick="editMessage('${msg.id}')" class="text-blue-400 hover:text-blue-300 px-3 py-1 rounded border border-blue-500/30 hover:bg-blue-500/10">
              ✏️ 編輯
            </button>
            <button onclick="deleteMessage('${msg.id}', '${escapeHtml(msg.template_name)}')" class="text-red-400 hover:text-red-300 px-3 py-1 rounded border border-red-500/30 hover:bg-red-500/10">
              🗑️ 刪除
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('載入推送訊息失敗:', error);
    document.getElementById('messagesContainer').innerHTML = `<p class="text-red-400 text-center py-8">❌ 載入失敗: ${error.message}</p>`;
  }
}

// HTML 轉義
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 輔助函數：取得觸發類型文字
function getTriggerTypeText(type) {
  const types = {
    'enter': '🚪 進入範圍',
    'leave': '👋 離開範圍',
    'stay': '⏱️ 停留範圍'
  };
  return types[type] || type;
}

// 輔助函數：取得訊息類型文字
function getMessageTypeText(type) {
  const types = {
    'text': '📝 純文字',
    'flex': '🎴 Flex Message',
    'image': '🖼️ 圖片訊息'
  };
  return types[type] || type;
}

// 輔助函數：取得目標對象文字
function getTargetAudienceText(audience) {
  const audiences = {
    'all': '👥 所有用戶',
    'friends': '👫 已加入好友',
    'non_friends': '👤 未加入好友'
  };
  return audiences[audience] || audience;
}

// 編輯設備
window.editDevice = async function(deviceId) {
  const device = allDevices.find(d => d.id === deviceId);
  if (!device) {
    alert('找不到設備資料');
    return;
  }

  currentEditingDeviceId = deviceId;

  // 填充表單
  const form = document.getElementById('deviceForm');
  form.elements['device_name'].value = device.device_name;
  form.elements['hwid'].value = device.hwid;
  form.elements['vendor_key'].value = device.vendor_key || '';
  form.elements['lot_key'].value = device.lot_key || '';
  form.elements['location'].value = device.location || '';
  form.elements['description'].value = device.description || '';
  form.elements['is_active'].checked = device.is_active;

  document.getElementById('modalTitle').textContent = '編輯 Beacon 設備';
  document.getElementById('deviceModal').classList.remove('hidden');
}

// 刪除設備
window.deleteDevice = async function(deviceId, deviceName) {
  if (!confirm(`確定要刪除設備「${deviceName}」嗎？\n\n⚠️ 此操作無法復原！`)) {
    return;
  }

  try {
    const { error } = await db
      .from('beacon_devices')
      .delete()
      .eq('id', deviceId);

    if (error) throw error;

    alert('✅ 設備已刪除！');
    loadAllData();
  } catch (error) {
    console.error('Error:', error);
    alert('❌ 刪除失敗: ' + error.message);
  }
}

// 編輯觸發動作
window.editAction = async function(actionId) {
  const action = allActions.find(a => a.id === actionId);
  if (!action) {
    alert('找不到動作資料');
    return;
  }

  currentEditingActionId = actionId;

  // 載入選項
  await loadDeviceOptions();
  await loadMessageOptions();

  // 填充表單
  const form = document.getElementById('actionForm');
  form.elements['action_name'].value = action.action_name;
  form.elements['hwid'].value = action.hwid;
  form.elements['trigger_type'].value = action.trigger_type;
  form.elements['message_id'].value = action.message_id;
  form.elements['description'].value = action.description || '';
  form.elements['is_active'].checked = action.is_active;

  document.getElementById('actionModal').classList.remove('hidden');
}

// 刪除觸發動作
window.deleteAction = async function(actionId, actionName) {
  if (!confirm(`確定要刪除觸發動作「${actionName}」嗎？\n\n⚠️ 此操作無法復原！`)) {
    return;
  }

  try {
    const { error } = await db
      .from('beacon_actions')
      .delete()
      .eq('id', actionId);

    if (error) throw error;

    alert('✅ 觸發動作已刪除！');
    loadAllData();
  } catch (error) {
    console.error('Error:', error);
    alert('❌ 刪除失敗: ' + error.message);
  }
}

// 編輯推送訊息
window.editMessage = async function(messageId) {
  const message = allMessages.find(m => m.id === messageId);
  if (!message) {
    alert('找不到訊息資料');
    return;
  }

  currentEditingMessageId = messageId;

  // 填充表單
  const form = document.getElementById('messageForm');
  form.elements['template_name'].value = message.template_name;
  form.elements['message_type'].value = message.message_type;
  form.elements['message_content'].value = message.message_content;
  form.elements['target_audience'].value = message.target_audience;
  form.elements['description'].value = message.description || '';
  form.elements['is_active'].checked = message.is_active;

  document.getElementById('messageModal').classList.remove('hidden');
}

// 刪除推送訊息
window.deleteMessage = async function(messageId, templateName) {
  if (!confirm(`確定要刪除推送訊息模板「${templateName}」嗎？\n\n⚠️ 此操作無法復原！`)) {
    return;
  }

  try {
    const { error } = await db
      .from('beacon_messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;

    alert('✅ 推送訊息模板已刪除！');
    loadAllData();
  } catch (error) {
    console.error('Error:', error);
    alert('❌ 刪除失敗: ' + error.message);
  }
}
