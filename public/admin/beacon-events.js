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
let allEvents = [];
let allDevices = [];
let currentPage = 0;
const pageSize = 50;

// 登出按鈕
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (typeof netlifyIdentity !== 'undefined') {
    netlifyIdentity.logout();
  }
  window.location.href = '/admin/login.html';
});

// 頁面載入
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Beacon Events 載入完成');
  loadAllData();
  
  // 自動刷新（每 30 秒）
  setInterval(loadAllData, 30000);
});

// 重新整理按鈕
document.getElementById('refreshBtn')?.addEventListener('click', () => {
  loadAllData();
});

// 篩選器變更
document.getElementById('filterDevice')?.addEventListener('change', filterEvents);
document.getElementById('filterEventType')?.addEventListener('change', filterEvents);
document.getElementById('filterFriend')?.addEventListener('change', filterEvents);

// 分頁按鈕
document.getElementById('prevBtn')?.addEventListener('click', () => {
  if (currentPage > 0) {
    currentPage--;
    renderEvents();
  }
});

document.getElementById('nextBtn')?.addEventListener('click', () => {
  const maxPage = Math.ceil(allEvents.length / pageSize) - 1;
  if (currentPage < maxPage) {
    currentPage++;
    renderEvents();
  }
});

// 載入所有資料
async function loadAllData() {
  await Promise.all([
    loadDevices(),
    loadStatistics(),
    loadEvents()
  ]);
}

// 載入設備列表（用於篩選器）
async function loadDevices() {
  try {
    const { data, error } = await db
      .from('beacon_devices')
      .select('*')
      .order('device_name');

    if (error) throw error;

    allDevices = data || [];
    
    // 更新篩選器
    const select = document.getElementById('filterDevice');
    select.innerHTML = '<option value="">全部設備</option>';
    
    allDevices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.hwid;
      option.textContent = `${device.device_name} (${device.hwid})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('載入設備失敗:', error);
  }
}

// 載入統計資料
async function loadStatistics() {
  try {
    // 總觸發次數
    const { count: totalEvents } = await db
      .from('beacon_events')
      .select('*', { count: 'exact', head: true });

    // 今日觸發
    const today = new Date().toISOString().split('T')[0];
    const { count: todayEvents } = await db
      .from('beacon_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // 好友觸發
    const { count: friendEvents } = await db
      .from('beacon_events')
      .select('*', { count: 'exact', head: true })
      .eq('is_friend', true);

    // 非好友觸發
    const { count: nonFriendEvents } = await db
      .from('beacon_events')
      .select('*', { count: 'exact', head: true })
      .eq('is_friend', false);

    // 更新顯示
    document.getElementById('totalEvents').textContent = totalEvents || 0;
    document.getElementById('todayEvents').textContent = todayEvents || 0;
    document.getElementById('friendEvents').textContent = friendEvents || 0;
    document.getElementById('nonFriendEvents').textContent = nonFriendEvents || 0;

  } catch (error) {
    console.error('載入統計失敗:', error);
  }
}

// 載入事件記錄
async function loadEvents() {
  try {
    const { data, error } = await db
      .from('beacon_events')
      .select(`
        *,
        beacon_devices!inner(device_name, hwid)
      `)
      .order('created_at', { ascending: false })
      .limit(500); // 最多載入 500 筆

    if (error) throw error;

    allEvents = data || [];
    currentPage = 0;
    renderEvents();

  } catch (error) {
    console.error('載入事件失敗:', error);
    document.getElementById('eventsTableBody').innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-red-400">
          ❌ 載入失敗: ${error.message}
        </td>
      </tr>
    `;
  }
}

// 篩選事件
function filterEvents() {
  const deviceFilter = document.getElementById('filterDevice').value;
  const eventTypeFilter = document.getElementById('filterEventType').value;
  const friendFilter = document.getElementById('filterFriend').value;

  currentPage = 0;
  renderEvents();
}

// 渲染事件列表
function renderEvents() {
  const deviceFilter = document.getElementById('filterDevice').value;
  const eventTypeFilter = document.getElementById('filterEventType').value;
  const friendFilter = document.getElementById('filterFriend').value;

  // 篩選資料
  let filteredEvents = allEvents;

  if (deviceFilter) {
    filteredEvents = filteredEvents.filter(e => e.hwid === deviceFilter);
  }

  if (eventTypeFilter) {
    filteredEvents = filteredEvents.filter(e => e.event_type === eventTypeFilter);
  }

  if (friendFilter !== '') {
    const isFriend = friendFilter === 'true';
    filteredEvents = filteredEvents.filter(e => e.is_friend === isFriend);
  }

  // 分頁
  const start = currentPage * pageSize;
  const end = start + pageSize;
  const pageEvents = filteredEvents.slice(start, end);

  // 更新顯示數量
  document.getElementById('showingCount').textContent = filteredEvents.length;

  // 更新分頁按鈕
  document.getElementById('prevBtn').disabled = currentPage === 0;
  document.getElementById('nextBtn').disabled = end >= filteredEvents.length;

  // 渲染表格
  const tbody = document.getElementById('eventsTableBody');

  if (pageEvents.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-gray-400">
          ${filteredEvents.length === 0 ? '尚無事件記錄' : '沒有符合條件的記錄'}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pageEvents.map(event => `
    <tr class="event-row">
      <td class="px-4 py-3 text-sm">
        <div class="text-white">${formatDateTime(event.created_at)}</div>
        <div class="text-xs text-gray-400">${formatTime(event.created_at)}</div>
      </td>
      <td class="px-4 py-3 text-sm">
        <div class="text-white">${escapeHtml(event.beacon_devices.device_name)}</div>
        <div class="text-xs text-gray-400 font-mono">${event.hwid}</div>
      </td>
      <td class="px-4 py-3 text-sm">
        <span class="px-2 py-1 rounded text-xs ${getEventTypeClass(event.event_type)}">
          ${getEventTypeText(event.event_type)}
        </span>
      </td>
      <td class="px-4 py-3 text-sm">
        <div class="text-white font-mono text-xs">${event.user_id ? event.user_id.substring(0, 12) + '...' : 'N/A'}</div>
      </td>
      <td class="px-4 py-3 text-sm">
        <span class="px-2 py-1 rounded text-xs ${event.is_friend ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
          ${event.is_friend ? '👫 已加入' : '👤 未加入'}
        </span>
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        ${event.message_sent ? '✅ 已推送' : '⏸️ 未推送'}
      </td>
    </tr>
  `).join('');
}

// 格式化日期時間
function formatDateTime(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(dateString) {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// 取得事件類型文字
function getEventTypeText(type) {
  const types = {
    'enter': '🚪 進入',
    'leave': '👋 離開',
    'stay': '⏱️ 停留'
  };
  return types[type] || type;
}

// 取得事件類型樣式
function getEventTypeClass(type) {
  const classes = {
    'enter': 'bg-green-500/20 text-green-400',
    'leave': 'bg-red-500/20 text-red-400',
    'stay': 'bg-blue-500/20 text-blue-400'
  };
  return classes[type] || 'bg-gray-500/20 text-gray-400';
}

// HTML 轉義
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

