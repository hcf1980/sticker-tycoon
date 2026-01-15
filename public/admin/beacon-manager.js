/**
 * LINE Beacon 管理頁面
 */

// 頁面載入時檢查
if (!checkAdminAuth()) {
  document.body.innerHTML = `
    <div class="tech-bg min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="loader-tech mx-auto mb-4"></div>
        <p class="text-gray-400">正在跳轉到登入頁面...</p>
      </div>
    </div>
  `;
}

// 登出按鈕
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  handleAdminLogout();
});

// 全域變數
let beaconDevices = [];
let beaconEvents = [];
let beaconStatistics = {};

/**
 * 初始化頁面
 */
async function initPage() {
  try {
    await Promise.all([
      loadBeaconDevices(),
      loadStatistics(),
      loadRecentEvents()
    ]);
  } catch (error) {
    console.error('初始化失敗:', error);
    showNotification('載入資料失敗', 'error');
  }
}

/**
 * 載入 Beacon 設備列表
 */
async function loadBeaconDevices() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('beacon_devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    beaconDevices = data || [];
    renderBeaconList();
  } catch (error) {
    console.error('載入設備失敗:', error);
    document.getElementById('beaconList').innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-400">❌ 載入失敗: ${error.message}</p>
      </div>
    `;
  }
}

/**
 * 載入統計資料
 */
async function loadStatistics() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 總設備數
    const { count: totalDevices } = await getSupabaseClient()
      .from('beacon_devices')
      .select('*', { count: 'exact', head: true });

    // 啟用中設備數
    const { count: activeDevices } = await getSupabaseClient()
      .from('beacon_devices')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 今日統計
    const { data: todayStats } = await getSupabaseClient()
      .from('beacon_statistics')
      .select('enter_count, leave_count, unique_users')
      .eq('date', today);

    let todayEvents = 0;
    let todayUsers = 0;

    if (todayStats && todayStats.length > 0) {
      todayEvents = todayStats.reduce((sum, stat) => sum + stat.enter_count + stat.leave_count, 0);
      todayUsers = todayStats.reduce((sum, stat) => sum + stat.unique_users, 0);
    }

    // 更新顯示
    document.getElementById('stat-total-devices').textContent = totalDevices || 0;
    document.getElementById('stat-active-devices').textContent = activeDevices || 0;
    document.getElementById('stat-today-events').textContent = todayEvents;
    document.getElementById('stat-today-users').textContent = todayUsers;

  } catch (error) {
    console.error('載入統計失敗:', error);
  }
}

/**
 * 載入最近觸發記錄
 */
async function loadRecentEvents() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('beacon_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    beaconEvents = data || [];
    renderRecentEvents();
  } catch (error) {
    console.error('載入事件失敗:', error);
    document.getElementById('recentEvents').innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-400">❌ 載入失敗: ${error.message}</p>
      </div>
    `;
  }
}

/**
 * 渲染 Beacon 設備列表
 */
function renderBeaconList() {
  const container = document.getElementById('beaconList');

  if (beaconDevices.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <p class="text-gray-400">尚無 Beacon 設備</p>
        <button onclick="showAddBeaconModal()" class="btn-neon-outline mt-4 px-6 py-2">
          ➕ 新增第一個設備
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = beaconDevices.map(device => `
    <div class="beacon-card">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <h4 class="text-lg font-bold text-white">${escapeHtml(device.device_name || '未命名設備')}</h4>
            ${device.is_active
              ? '<span class="tag-green text-xs">✅ 啟用中</span>'
              : '<span class="tag-gray text-xs">⏸️ 已停用</span>'}
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div>
              <span class="text-gray-400">HWID:</span>
              <span class="text-cyan-400 font-mono">${device.hwid}</span>
            </div>
            ${device.vendor_key ? `
              <div>
                <span class="text-gray-400">Vendor Key:</span>
                <span class="text-purple-400 font-mono">${device.vendor_key}</span>
              </div>
            ` : ''}
            ${device.lot_key ? `
              <div>
                <span class="text-gray-400">Lot Key:</span>
                <span class="text-purple-400 font-mono">${device.lot_key}</span>
              </div>
            ` : ''}
          </div>
          ${device.location ? `
            <div class="mt-2 text-sm">
              <span class="text-gray-400">📍 位置:</span>
              <span class="text-white">${escapeHtml(device.location)}</span>
            </div>
          ` : ''}
          ${device.description ? `
            <div class="mt-1 text-sm text-gray-400">
              ${escapeHtml(device.description)}
            </div>
          ` : ''}
        </div>
        <div class="flex flex-col gap-2">
          <button onclick="viewBeaconActions('${device.hwid}')" class="btn-neon-outline px-4 py-2 text-sm">
            ⚙️ 動作設定
          </button>
          <button onclick="viewBeaconStats('${device.hwid}')" class="btn-neon-outline px-4 py-2 text-sm">
            📊 查看統計
          </button>
          <button onclick="editBeacon('${device.id}')" class="btn-neon-outline px-4 py-2 text-sm">
            ✏️ 編輯
          </button>
          <button onclick="toggleBeaconStatus('${device.id}', ${!device.is_active})"
                  class="btn-neon-outline px-4 py-2 text-sm ${device.is_active ? 'text-yellow-400' : 'text-green-400'}">
            ${device.is_active ? '⏸️ 停用' : '▶️ 啟用'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * 渲染最近觸發記錄
 */
function renderRecentEvents() {
  const container = document.getElementById('recentEvents');

  if (beaconEvents.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <p class="text-gray-400">尚無觸發記錄</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-white/10">
            <th class="text-left py-2 px-3 text-gray-400">時間</th>
            <th class="text-left py-2 px-3 text-gray-400">HWID</th>
            <th class="text-left py-2 px-3 text-gray-400">用戶</th>
            <th class="text-left py-2 px-3 text-gray-400">事件類型</th>
            <th class="text-left py-2 px-3 text-gray-400">Device Message</th>
          </tr>
        </thead>
        <tbody>
          ${beaconEvents.map(event => `
            <tr class="border-b border-white/5 hover:bg-white/5">
              <td class="py-2 px-3 text-gray-300">${formatDateTime(event.created_at)}</td>
              <td class="py-2 px-3 text-cyan-400 font-mono">${event.hwid}</td>
              <td class="py-2 px-3 text-purple-400 font-mono text-xs">${event.user_id.substring(0, 8)}...</td>
              <td class="py-2 px-3">
                ${event.event_type === 'enter'
                  ? '<span class="tag-green text-xs">🚪 進入</span>'
                  : '<span class="tag-yellow text-xs">🚶 離開</span>'}
              </td>
              <td class="py-2 px-3 text-gray-400 font-mono text-xs">${event.device_message || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * 顯示新增 Beacon 設備對話框
 */
function showAddBeaconModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-bold text-white mb-4">➕ 新增 Beacon 設備</h3>
      <form id="addBeaconForm" class="space-y-4">
        <div>
          <label class="block text-gray-400 text-sm mb-2">設備名稱 *</label>
          <input type="text" name="device_name" required
                 class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white"
                 placeholder="例如：辦公室入口 Beacon">
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">HWID (Hardware ID) * <span class="text-xs">(10位16進制字元)</span></label>
          <input type="text" name="hwid" required pattern="[0-9a-fA-F]{10}" maxlength="10"
                 class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white font-mono"
                 placeholder="0000000019">
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">Vendor Key <span class="text-xs">(選填，8位16進制字元)</span></label>
          <input type="text" name="vendor_key" pattern="[0-9a-fA-F]{8}" maxlength="8"
                 class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white font-mono"
                 placeholder="00000019">
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">Lot Key <span class="text-xs">(選填，16位16進制字元)</span></label>
          <input type="text" name="lot_key" pattern="[0-9a-fA-F]{16}" maxlength="16"
                 class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white font-mono"
                 placeholder="0011223344556603">
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">位置</label>
          <input type="text" name="location"
                 class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white"
                 placeholder="例如：辦公室入口、店面門口">
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">說明</label>
          <textarea name="description" rows="3"
                    class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white"
                    placeholder="設備用途說明..."></textarea>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" name="is_active" id="is_active" checked
                 class="w-4 h-4 text-cyan-500 bg-black/30 border-cyan-500/30 rounded">
          <label for="is_active" class="text-gray-300 text-sm">啟用此設備</label>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="submit" class="btn-neon-solid px-6 py-2 flex-1">
            ✅ 新增設備
          </button>
          <button type="button" onclick="this.closest('.fixed').remove()"
                  class="btn-neon-outline px-6 py-2">
            ❌ 取消
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // 處理表單提交
  document.getElementById('addBeaconForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      device_name: formData.get('device_name'),
      hwid: formData.get('hwid').toLowerCase(),
      vendor_key: formData.get('vendor_key')?.toLowerCase() || null,
      lot_key: formData.get('lot_key')?.toLowerCase() || null,
      location: formData.get('location') || null,
      description: formData.get('description') || null,
      is_active: formData.get('is_active') === 'on'
    };

    try {
      const { error } = await getSupabaseClient()
        .from('beacon_devices')
        .insert(data);

      if (error) throw error;

      showNotification('✅ Beacon 設備新增成功', 'success');
      modal.remove();
      await loadBeaconDevices();
      await loadStatistics();
    } catch (error) {
      console.error('新增失敗:', error);
      showNotification(`❌ 新增失敗: ${error.message}`, 'error');
    }
  });
}

/**
 * 編輯 Beacon 設備
 */
async function editBeacon(deviceId) {
  const device = beaconDevices.find(d => d.id === deviceId);
  if (!device) return;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-bold text-white mb-4">✏️ 編輯 Beacon 設備</h3>
      <form id="editBeaconForm" class="space-y-4">
        <div>
          <label class="block text-gray-400 text-sm mb-2">設備名稱 *</label>
          <input type="text" name="device_name" required value="${escapeHtml(device.device_name || '')}"
                 class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white">
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">HWID (Hardware ID) *</label>
          <input type="text" name="hwid" required pattern="[0-9a-fA-F]{10}" maxlength="10"
                 value="${device.hwid}" readonly
                 class="w-full bg-black/50 border border-gray-500/30 rounded-lg px-4 py-2 text-gray-400 font-mono cursor-not-allowed">
          <p class="text-xs text-gray-500 mt-1">HWID 不可修改</p>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">Vendor Key</label>
          <input type="text" name="vendor_key" pattern="[0-9a-fA-F]{8}" maxlength="8"
                 value="${device.vendor_key || ''}"
                 class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white font-mono">
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">Lot Key</label>
          <input type="text" name="lot_key" pattern="[0-9a-fA-F]{16}" maxlength="16"
                 value="${device.lot_key || ''}"
                 class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white font-mono">
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">位置</label>
          <input type="text" name="location" value="${escapeHtml(device.location || '')}"
                 class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white">
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">說明</label>
          <textarea name="description" rows="3"
                    class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white">${escapeHtml(device.description || '')}</textarea>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="submit" class="btn-neon-solid px-6 py-2 flex-1">
            ✅ 儲存變更
          </button>
          <button type="button" onclick="this.closest('.fixed').remove()"
                  class="btn-neon-outline px-6 py-2">
            ❌ 取消
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // 處理表單提交
  document.getElementById('editBeaconForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      device_name: formData.get('device_name'),
      vendor_key: formData.get('vendor_key')?.toLowerCase() || null,
      lot_key: formData.get('lot_key')?.toLowerCase() || null,
      location: formData.get('location') || null,
      description: formData.get('description') || null
    };

    try {
      const { error } = await getSupabaseClient()
        .from('beacon_devices')
        .update(data)
        .eq('id', deviceId);

      if (error) throw error;

      showNotification('✅ 設備資料已更新', 'success');
      modal.remove();
      await loadBeaconDevices();
    } catch (error) {
      console.error('更新失敗:', error);
      showNotification(`❌ 更新失敗: ${error.message}`, 'error');
    }
  });
}


/**
 * 切換 Beacon 設備啟用狀態
 */
async function toggleBeaconStatus(deviceId, newStatus) {
  try {
    const { error } = await getSupabaseClient()
      .from('beacon_devices')
      .update({ is_active: newStatus })
      .eq('id', deviceId);

    if (error) throw error;

    showNotification(`✅ 設備已${newStatus ? '啟用' : '停用'}`, 'success');
    await loadBeaconDevices();
    await loadStatistics();
  } catch (error) {
    console.error('更新狀態失敗:', error);
    showNotification(`❌ 更新失敗: ${error.message}`, 'error');
  }
}

/**
 * 查看 Beacon 動作設定
 */
async function viewBeaconActions(hwid) {
  try {
    const { data: actions, error } = await getSupabaseClient()
      .from('beacon_actions')
      .select('*')
      .eq('hwid', hwid)
      .order('priority', { ascending: false });

    if (error) throw error;

    const device = beaconDevices.find(d => d.hwid === hwid);
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="glass-card p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-white">⚙️ ${escapeHtml(device?.device_name || hwid)} - 動作設定</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">✕</button>
        </div>

        <div class="mb-4">
          <button onclick="addBeaconAction('${hwid}')" class="btn-neon-solid px-4 py-2">
            ➕ 新增動作
          </button>
        </div>

        <div class="space-y-3">
          ${actions.length === 0 ? `
            <div class="text-center py-8 text-gray-400">
              尚未設定任何動作
            </div>
          ` : actions.map(action => `
            <div class="beacon-card">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-lg">
                      ${action.event_type === 'enter' ? '🚪 進入' : '🚶 離開'}
                    </span>
                    <span class="tag-tech text-xs">${getActionTypeLabel(action.action_type)}</span>
                    ${action.is_active
                      ? '<span class="tag-green text-xs">✅ 啟用</span>'
                      : '<span class="tag-gray text-xs">⏸️ 停用</span>'}
                    <span class="text-gray-400 text-xs">優先級: ${action.priority}</span>
                  </div>
                  <div class="text-sm text-gray-300 bg-black/30 rounded p-3 font-mono overflow-x-auto">
                    ${formatActionData(action.action_data)}
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <button onclick="editBeaconAction('${action.id}')" class="btn-neon-outline px-3 py-1 text-xs">
                    ✏️ 編輯
                  </button>
                  <button onclick="toggleActionStatus('${action.id}', ${!action.is_active})"
                          class="btn-neon-outline px-3 py-1 text-xs">
                    ${action.is_active ? '⏸️ 停用' : '▶️ 啟用'}
                  </button>
                  <button onclick="deleteBeaconAction('${action.id}')" class="btn-neon-outline px-3 py-1 text-xs text-red-400">
                    🗑️ 刪除
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('載入動作失敗:', error);
    showNotification(`❌ 載入失敗: ${error.message}`, 'error');
  }
}

/**
 * 新增 Beacon 動作
 */
function addBeaconAction(hwid) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-bold text-white mb-4">➕ 新增觸發動作</h3>
      <form id="addActionForm" class="space-y-4">
        <div>
          <label class="block text-gray-400 text-sm mb-2">觸發事件 *</label>
          <select name="event_type" required
                  class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white">
            <option value="enter">🚪 進入 Beacon 範圍</option>
            <option value="leave">🚶 離開 Beacon 範圍</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">動作類型 *</label>
          <select name="action_type" id="actionType" required
                  class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white">
            <option value="message">💬 發送訊息</option>
            <option value="coupon">🎫 發送優惠券</option>
            <option value="sticker_promo">🎨 貼圖推廣</option>
            <option value="custom">⚙️ 自訂動作</option>
          </select>
        </div>
        <div id="actionDataContainer">
          <label class="block text-gray-400 text-sm mb-2">訊息內容 *</label>
          <textarea name="message_text" rows="5" required
                    class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white font-mono"
                    placeholder="輸入要發送的訊息內容...">👋 歡迎光臨！

您已進入貼圖大亨服務範圍，現在可以使用所有功能創建專屬貼圖！

輸入「創建貼圖」開始製作 🎨</textarea>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">優先級 (數字越大越優先)</label>
          <input type="number" name="priority" value="10" min="0" max="100"
                 class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white">
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" name="is_active" id="action_is_active" checked
                 class="w-4 h-4 text-cyan-500 bg-black/30 border-cyan-500/30 rounded">
          <label for="action_is_active" class="text-gray-300 text-sm">啟用此動作</label>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="submit" class="btn-neon-solid px-6 py-2 flex-1">
            ✅ 新增動作
          </button>
          <button type="button" onclick="this.closest('.fixed').remove()"
                  class="btn-neon-outline px-6 py-2">
            ❌ 取消
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // 動作類型切換
  document.getElementById('actionType').addEventListener('change', (e) => {
    const container = document.getElementById('actionDataContainer');
    const actionType = e.target.value;

    if (actionType === 'message') {
      container.innerHTML = `
        <label class="block text-gray-400 text-sm mb-2">訊息內容 *</label>
        <textarea name="message_text" rows="5" required
                  class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white font-mono"
                  placeholder="輸入要發送的訊息內容..."></textarea>
      `;
    } else if (actionType === 'custom') {
      container.innerHTML = `
        <label class="block text-gray-400 text-sm mb-2">動作資料 (JSON) *</label>
        <textarea name="action_data_json" rows="8" required
                  class="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-4 py-2 text-white font-mono"
                  placeholder='{"type": "text", "text": "自訂訊息"}'></textarea>
        <p class="text-xs text-gray-500 mt-1">請輸入有效的 JSON 格式</p>
      `;
    } else {
      container.innerHTML = `
        <label class="block text-gray-400 text-sm mb-2">此功能尚未實作</label>
        <p class="text-gray-400 text-sm">請選擇「發送訊息」或「自訂動作」</p>
      `;
    }
  });

  // 處理表單提交
  document.getElementById('addActionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const actionType = formData.get('action_type');

    let actionData;

    try {
      if (actionType === 'message') {
        const messageText = formData.get('message_text');
        actionData = {
          type: 'text',
          text: messageText
        };
      } else if (actionType === 'custom') {
        const jsonStr = formData.get('action_data_json');
        actionData = JSON.parse(jsonStr);
      } else {
        showNotification('此動作類型尚未實作', 'error');
        return;
      }

      const data = {
        hwid: hwid,
        event_type: formData.get('event_type'),
        action_type: actionType,
        action_data: actionData,
        priority: parseInt(formData.get('priority')),
        is_active: formData.get('is_active') === 'on'
      };

      const { error } = await getSupabaseClient()
        .from('beacon_actions')
        .insert(data);

      if (error) throw error;

      showNotification('✅ 動作新增成功', 'success');
      modal.remove();

      // 重新開啟動作列表
      await viewBeaconActions(hwid);
    } catch (error) {
      console.error('新增動作失敗:', error);
      showNotification(`❌ 新增失敗: ${error.message}`, 'error');
    }
  });
}

/**
 * 切換動作啟用狀態
 */
async function toggleActionStatus(actionId, newStatus) {
  try {
    const { error } = await getSupabaseClient()
      .from('beacon_actions')
      .update({ is_active: newStatus })
      .eq('id', actionId);

    if (error) throw error;

    showNotification(`✅ 動作已${newStatus ? '啟用' : '停用'}`, 'success');

    // 找到對應的 hwid 並重新載入
    const { data } = await getSupabaseClient()
      .from('beacon_actions')
      .select('hwid')
      .eq('id', actionId)
      .single();

    if (data) {
      // 關閉當前 modal
      document.querySelectorAll('.fixed').forEach(el => el.remove());
      // 重新開啟
      await viewBeaconActions(data.hwid);
    }
  } catch (error) {
    console.error('更新狀態失敗:', error);
    showNotification(`❌ 更新失敗: ${error.message}`, 'error');
  }
}

/**
 * 刪除 Beacon 動作
 */
async function deleteBeaconAction(actionId) {
  if (!confirm('確定要刪除此動作嗎？')) return;

  try {
    // 先取得 hwid
    const { data: action } = await getSupabaseClient()
      .from('beacon_actions')
      .select('hwid')
      .eq('id', actionId)
      .single();

    const { error } = await getSupabaseClient()
      .from('beacon_actions')
      .delete()
      .eq('id', actionId);

    if (error) throw error;

    showNotification('✅ 動作已刪除', 'success');

    if (action) {
      // 關閉當前 modal
      document.querySelectorAll('.fixed').forEach(el => el.remove());
      // 重新開啟
      await viewBeaconActions(action.hwid);
    }
  } catch (error) {
    console.error('刪除失敗:', error);
    showNotification(`❌ 刪除失敗: ${error.message}`, 'error');
  }
}

/**
 * 查看 Beacon 統計
 */
async function viewBeaconStats(hwid) {
  try {
    const { data: stats, error } = await getSupabaseClient()
      .from('beacon_statistics')
      .select('*')
      .eq('hwid', hwid)
      .order('date', { ascending: false })
      .limit(30);

    if (error) throw error;

    const device = beaconDevices.find(d => d.hwid === hwid);
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="glass-card p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-white">📊 ${escapeHtml(device?.device_name || hwid)} - 統計資料</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">✕</button>
        </div>

        ${stats.length === 0 ? `
          <div class="text-center py-8 text-gray-400">
            尚無統計資料
          </div>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-white/10">
                  <th class="text-left py-2 px-3 text-gray-400">日期</th>
                  <th class="text-right py-2 px-3 text-gray-400">進入次數</th>
                  <th class="text-right py-2 px-3 text-gray-400">離開次數</th>
                  <th class="text-right py-2 px-3 text-gray-400">總觸發</th>
                  <th class="text-right py-2 px-3 text-gray-400">不重複用戶</th>
                </tr>
              </thead>
              <tbody>
                ${stats.map(stat => `
                  <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="py-2 px-3 text-gray-300">${stat.date}</td>
                    <td class="py-2 px-3 text-right text-green-400">${stat.enter_count}</td>
                    <td class="py-2 px-3 text-right text-yellow-400">${stat.leave_count}</td>
                    <td class="py-2 px-3 text-right text-cyan-400 font-bold">${stat.enter_count + stat.leave_count}</td>
                    <td class="py-2 px-3 text-right text-purple-400">${stat.unique_users}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('載入統計失敗:', error);
    showNotification(`❌ 載入失敗: ${error.message}`, 'error');
  }
}

/**
 * 工具函數：取得動作類型標籤
 */
function getActionTypeLabel(actionType) {
  const labels = {
    'message': '💬 發送訊息',
    'coupon': '🎫 優惠券',
    'sticker_promo': '🎨 貼圖推廣',
    'custom': '⚙️ 自訂動作'
  };
  return labels[actionType] || actionType;
}

/**
 * 工具函數：格式化動作資料
 */
function formatActionData(actionData) {
  if (typeof actionData === 'string') {
    try {
      actionData = JSON.parse(actionData);
    } catch (e) {
      return actionData;
    }
  }

  if (actionData.type === 'text') {
    return escapeHtml(actionData.text);
  }

  return JSON.stringify(actionData, null, 2);
}

/**
 * 工具函數：格式化日期時間
 */
function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  // 如果是今天
  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  }

  // 如果是昨天
  if (diff < 172800000 && date.getDate() === now.getDate() - 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  }

  // 其他日期
  return date.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 工具函數：HTML 轉義
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 顯示通知
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
    type === 'success' ? 'bg-green-500/90' :
    type === 'error' ? 'bg-red-500/90' :
    'bg-cyan-500/90'
  } text-white`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 綁定新增按鈕
document.getElementById('addBeaconBtn')?.addEventListener('click', showAddBeaconModal);

// 頁面載入時初始化
initPage();

