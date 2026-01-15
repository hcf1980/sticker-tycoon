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

// 檢查登入 - 使用 Netlify Identity
function checkAuth() {
  // 等待 Netlify Identity 載入
  if (typeof netlifyIdentity === 'undefined') {
    console.log('等待 Netlify Identity 載入...');
    setTimeout(checkAuth, 200);
    return;
  }

  netlifyIdentity.init();
  const user = netlifyIdentity.currentUser();

  if (!user) {
    console.log('未登入，跳轉到登入頁面');
    window.location.href = '/admin/login.html';
    return;
  }

  // 檢查 admin 角色
  const roles = user.app_metadata?.roles || [];
  if (!roles.includes('admin')) {
    alert('權限不足，需要 admin 角色');
    netlifyIdentity.logout();
    window.location.href = '/admin/login.html';
    return;
  }

  console.log('✅ 已登入:', user.email);
  // 開始載入資料
  loadDevices();
}

// 登出
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (typeof netlifyIdentity !== 'undefined') {
    netlifyIdentity.logout();
  }
  window.location.href = '/admin/login.html';
});

// 執行檢查
checkAuth();

// 新增設備按鈕
document.getElementById('addBeaconBtn')?.addEventListener('click', () => {
  document.getElementById('deviceModal').classList.remove('hidden');
  document.getElementById('deviceForm').reset();
  document.getElementById('modalTitle').textContent = '新增 Beacon 設備';
});

// 關閉 Modal
document.getElementById('closeModal')?.addEventListener('click', () => {
  document.getElementById('deviceModal').classList.add('hidden');
});

// 提交表單
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
    const { data, error } = await db
      .from('beacon_devices')
      .insert([deviceData])
      .select();

    if (error) throw error;

    alert('✅ 設備已新增！');
    document.getElementById('deviceModal').classList.add('hidden');
    loadDevices();
  } catch (error) {
    console.error('Error:', error);
    alert('❌ 新增失敗: ' + error.message);
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
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded text-sm ${device.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
              ${device.is_active ? '✅ 啟用中' : '⏸️ 已停用'}
            </span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('載入失敗:', error);
    document.getElementById('devicesContainer').innerHTML = `<p class="text-red-400 text-center py-8">❌ 載入失敗: ${error.message}</p>`;
  }
}

// HTML 轉義
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 注意：loadDevices() 會在 checkAuth() 成功後自動執行
