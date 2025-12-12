/**
 * 風格設定管理 JavaScript
 */

let currentEditingStyle = null;
let currentEditingType = null; // 'style', 'framing', 'scene'

// 登出功能
function logout() {
  clearAdminAuthStatus();
  window.location.href = '/admin/login.html';
}

// 頁籤切換
function switchTab(tab) {
  // 更新頁籤樣式
  document.querySelectorAll('[id^="tab-"]').forEach(btn => {
    btn.classList.remove('border-b-2', 'border-pink-500', 'text-pink-500');
    btn.classList.add('text-gray-500');
  });
  document.getElementById(`tab-${tab}`).classList.add('border-b-2', 'border-pink-500', 'text-pink-500');
  document.getElementById(`tab-${tab}`).classList.remove('text-gray-500');

  // 切換內容
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  document.getElementById(`content-${tab}`).classList.remove('hidden');

  // 載入對應資料
  if (tab === 'styles') loadStyles();
  else if (tab === 'framing') loadFraming();
  else if (tab === 'scenes') loadScenes();
  else if (tab === 'expressions') loadExpressions();
}

// 載入風格設定
async function loadStyles() {
  const container = document.getElementById('styles-list');
  container.innerHTML = '<div class="text-center text-gray-500 py-8">載入中...</div>';

  try {
    const { data, error } = await supabase
      .from('style_settings')
      .select('*')
      .order('style_id');

    if (error) throw error;

    if (!data || data.length === 0) {
      // 如果沒有資料，顯示初始化按鈕
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">尚未初始化風格設定</p>
          <button onclick="initializeStyles()" class="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600">
            🎨 初始化風格設定
          </button>
        </div>
      `;
      return;
    }

    // 顯示風格列表
    container.innerHTML = data.map(style => `
      <div class="border rounded-lg p-4 hover:shadow-md transition">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">${style.emoji || '🎨'}</span>
              <h3 class="text-lg font-bold">${style.name}</h3>
              <span class="text-xs bg-gray-200 px-2 py-1 rounded">${style.style_id}</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">${style.description || ''}</p>
            <div class="text-xs text-gray-500">
              <div>核心風格: ${(style.core_style || '').substring(0, 80)}...</div>
              <div>色彩方案: ${style.color_palette || ''}</div>
            </div>
          </div>
          <button onclick="editStyle('${style.style_id}')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ml-4">
            ✏️ 編輯
          </button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('載入風格失敗:', error);
    container.innerHTML = `
      <div class="text-center text-red-500 py-8">
        載入失敗: ${error.message}
      </div>
    `;
  }
}

// 載入構圖設定
async function loadFraming() {
  const container = document.getElementById('framing-list');
  container.innerHTML = '<div class="text-center text-gray-500 py-8">載入中...</div>';

  try {
    const { data, error } = await supabase
      .from('framing_settings')
      .select('*')
      .order('framing_id');

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">尚未初始化構圖設定</p>
          <button onclick="initializeFraming()" class="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600">
            🖼️ 初始化構圖設定
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(framing => `
      <div class="border rounded-lg p-4 hover:shadow-md transition">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">${framing.emoji || '🖼️'}</span>
              <h3 class="text-lg font-bold">${framing.name}</h3>
              <span class="text-xs bg-gray-200 px-2 py-1 rounded">${framing.framing_id}</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">${framing.description || ''}</p>
            <div class="text-xs text-gray-500">
              <div>頭部大小: ${framing.head_size_percentage || 'N/A'}%</div>
              <div>焦點: ${(framing.character_focus || '').substring(0, 60)}...</div>
            </div>
          </div>
          <button onclick="editFraming('${framing.framing_id}')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ml-4">
            ✏️ 編輯
          </button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('載入構圖失敗:', error);
    container.innerHTML = `<div class="text-center text-red-500 py-8">載入失敗: ${error.message}</div>`;
  }
}

// 載入裝飾風格設定
async function loadScenes() {
  const container = document.getElementById('scenes-list');
  container.innerHTML = '<div class="text-center text-gray-500 py-8">載入中...</div>';

  try {
    const { data, error } = await supabase
      .from('scene_settings')
      .select('*')
      .order('scene_id');

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">尚未初始化裝飾風格設定</p>
          <button onclick="initializeScenes()" class="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600">
            🎀 初始化裝飾風格設定
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(scene => `
      <div class="border rounded-lg p-4 hover:shadow-md transition">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">${scene.emoji || '🎀'}</span>
              <h3 class="text-lg font-bold">${scene.name}</h3>
              <span class="text-xs bg-gray-200 px-2 py-1 rounded">${scene.scene_id}</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">${scene.description || ''}</p>
          </div>
          <button onclick="editScene('${scene.scene_id}')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ml-4">
            ✏️ 編輯
          </button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('載入裝飾風格失敗:', error);
    container.innerHTML = `<div class="text-center text-red-500 py-8">載入失敗: ${error.message}</div>`;
  }
}

// 編輯風格
async function editStyle(styleId) {
  try {
    const { data, error } = await supabase
      .from('style_settings')
      .select('*')
      .eq('style_id', styleId)
      .single();

    if (error) throw error;

    currentEditingStyle = data;
    currentEditingType = 'style';

    document.getElementById('modal-title').textContent = `編輯風格: ${data.name}`;
    document.getElementById('modal-content').innerHTML = generateStyleEditForm(data);
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-modal').classList.add('flex');
  } catch (error) {
    alert('載入風格失敗: ' + error.message);
  }
}

// 生成風格編輯表單
function generateStyleEditForm(style) {
  return `
    <div class="space-y-4">
      <!-- AI 圖片分析區塊 -->
      <div class="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🎨</span>
            <div>
              <h4 class="font-bold text-purple-900">AI 風格提取器</h4>
              <p class="text-xs text-purple-600">上傳圖片，AI 自動分析並填入風格參數</p>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <input type="file" id="style-image-input" accept="image/*" class="hidden">
          <button onclick="document.getElementById('style-image-input').click()"
                  class="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            📸 選擇參考圖片
          </button>
          <button onclick="analyzeStyleImage()" id="analyze-btn"
                  class="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled>
            ✨ 分析風格
          </button>
        </div>
        <div id="image-preview" class="mt-3 hidden">
          <img id="preview-img" class="w-full h-32 object-cover rounded border-2 border-purple-200">
          <p class="text-xs text-gray-500 mt-1 text-center">圖片已選擇，點擊「分析風格」開始</p>
        </div>
        <div id="analysis-status" class="mt-2 text-sm hidden"></div>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">風格 ID</label>
        <input type="text" value="${style.style_id}" disabled class="w-full p-2 border rounded bg-gray-100">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">名稱</label>
        <input type="text" id="edit-name" value="${style.name}" class="w-full p-2 border rounded">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Emoji</label>
        <input type="text" id="edit-emoji" value="${style.emoji || ''}" class="w-full p-2 border rounded" maxlength="2">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">描述</label>
        <textarea id="edit-description" class="w-full p-2 border rounded" rows="2">${style.description || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">核心風格 (Core Style)</label>
        <textarea id="edit-core-style" class="w-full p-2 border rounded font-mono text-sm" rows="3">${style.core_style || ''}</textarea>
        <p class="text-xs text-gray-500 mt-1">使用 (((三層括號))) 強調重點</p>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">光線 (Lighting)</label>
        <textarea id="edit-lighting" class="w-full p-2 border rounded font-mono text-sm" rows="2">${style.lighting || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">構圖 (Composition)</label>
        <textarea id="edit-composition" class="w-full p-2 border rounded font-mono text-sm" rows="2">${style.composition || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">筆觸 (Brushwork)</label>
        <textarea id="edit-brushwork" class="w-full p-2 border rounded font-mono text-sm" rows="2">${style.brushwork || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">氛圍 (Mood)</label>
        <textarea id="edit-mood" class="w-full p-2 border rounded font-mono text-sm" rows="2">${style.mood || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">色彩方案 (Color Palette)</label>
        <input type="text" id="edit-color-palette" value="${style.color_palette || ''}" class="w-full p-2 border rounded">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">禁止項目 (Forbidden)</label>
        <textarea id="edit-forbidden" class="w-full p-2 border rounded font-mono text-sm" rows="2">${style.forbidden || ''}</textarea>
        <p class="text-xs text-gray-500 mt-1">用逗號分隔，例如: cartoon, anime, 3D render</p>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">參考風格 (Reference)</label>
        <input type="text" id="edit-reference" value="${style.reference || ''}" class="w-full p-2 border rounded">
      </div>
    </div>
  `;
}

// 編輯構圖
async function editFraming(framingId) {
  try {
    const { data, error } = await supabase
      .from('framing_settings')
      .select('*')
      .eq('framing_id', framingId)
      .single();

    if (error) throw error;

    currentEditingStyle = data;
    currentEditingType = 'framing';

    document.getElementById('modal-title').textContent = `編輯構圖: ${data.name}`;
    document.getElementById('modal-content').innerHTML = generateFramingEditForm(data);
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-modal').classList.add('flex');
  } catch (error) {
    alert('載入構圖失敗: ' + error.message);
  }
}

// 生成構圖編輯表單
function generateFramingEditForm(framing) {
  return `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-bold mb-2">構圖 ID</label>
        <input type="text" value="${framing.framing_id}" disabled class="w-full p-2 border rounded bg-gray-100">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">名稱</label>
        <input type="text" id="edit-name" value="${framing.name}" class="w-full p-2 border rounded">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Emoji</label>
        <input type="text" id="edit-emoji" value="${framing.emoji || ''}" class="w-full p-2 border rounded" maxlength="2">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">描述</label>
        <textarea id="edit-description" class="w-full p-2 border rounded" rows="2">${framing.description || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">頭部大小百分比 (%)</label>
        <input type="number" id="edit-head-size" value="${framing.head_size_percentage || 25}" class="w-full p-2 border rounded" min="10" max="90">
        <p class="text-xs text-gray-500 mt-1">全身: 15%, 半身: 25%, 大頭: 60%, 特寫: 85%</p>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Prompt 附加內容</label>
        <textarea id="edit-prompt-addition" class="w-full p-2 border rounded font-mono text-sm" rows="8">${framing.prompt_addition || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">角色焦點描述</label>
        <textarea id="edit-character-focus" class="w-full p-2 border rounded" rows="2">${framing.character_focus || ''}</textarea>
      </div>
    </div>
  `;
}

// 編輯裝飾風格
async function editScene(sceneId) {
  try {
    const { data, error } = await supabase
      .from('scene_settings')
      .select('*')
      .eq('scene_id', sceneId)
      .single();

    if (error) throw error;

    currentEditingStyle = data;
    currentEditingType = 'scene';

    document.getElementById('modal-title').textContent = `編輯裝飾風格: ${data.name}`;
    document.getElementById('modal-content').innerHTML = generateSceneEditForm(data);
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-modal').classList.add('flex');
  } catch (error) {
    alert('載入裝飾風格失敗: ' + error.message);
  }
}

// 生成裝飾風格編輯表單
function generateSceneEditForm(scene) {
  return `
    <div class="space-y-4">
      <!-- AI 圖片分析區塊 -->
      <div class="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🎨</span>
            <div>
              <h4 class="font-bold text-purple-900">AI 裝飾風格提取器</h4>
              <p class="text-xs text-purple-600">上傳圖片，AI 自動分析並填入裝飾風格參數</p>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <input type="file" id="scene-image-input" accept="image/*" class="hidden">
          <button onclick="document.getElementById('scene-image-input').click()"
                  class="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            📸 選擇參考圖片
          </button>
          <button onclick="analyzeSceneImage()" id="analyze-scene-btn"
                  class="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled>
            ✨ 分析風格
          </button>
        </div>
        <div id="scene-image-preview" class="mt-3 hidden">
          <img id="scene-preview-img" class="w-full h-32 object-cover rounded border-2 border-purple-200">
          <p class="text-xs text-gray-500 mt-1 text-center">圖片已選擇，點擊「分析風格」開始</p>
        </div>
        <div id="scene-analysis-status" class="mt-2 text-sm hidden"></div>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">裝飾風格 ID</label>
        <input type="text" value="${scene.scene_id}" disabled class="w-full p-2 border rounded bg-gray-100">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">名稱</label>
        <input type="text" id="edit-name" value="${scene.name}" class="w-full p-2 border rounded">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Emoji</label>
        <input type="text" id="edit-emoji" value="${scene.emoji || ''}" class="w-full p-2 border rounded" maxlength="2">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">描述</label>
        <textarea id="edit-description" class="w-full p-2 border rounded" rows="2">${scene.description || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">裝飾風格描述</label>
        <textarea id="edit-decoration-style" class="w-full p-2 border rounded font-mono text-sm" rows="2">${scene.decoration_style || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">裝飾元素 (JSON 陣列)</label>
        <textarea id="edit-decoration-elements" class="w-full p-2 border rounded font-mono text-sm" rows="3">${JSON.stringify(scene.decoration_elements || [], null, 2)}</textarea>
        <p class="text-xs text-gray-500 mt-1">例如: ["hearts", "stars", "sparkles"]</p>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">POP 文字風格</label>
        <textarea id="edit-pop-text-style" class="w-full p-2 border rounded" rows="2">${scene.pop_text_style || ''}</textarea>
      </div>
    </div>
  `;
}

// 關閉 Modal
function closeModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  document.getElementById('edit-modal').classList.remove('flex');
  currentEditingStyle = null;
  currentEditingType = null;
}

// 儲存變更
async function saveChanges() {
  if (!currentEditingStyle || !currentEditingType) return;

  try {
    let updateData = {};

    if (currentEditingType === 'style') {
      updateData = {
        name: document.getElementById('edit-name').value,
        emoji: document.getElementById('edit-emoji').value,
        description: document.getElementById('edit-description').value,
        core_style: document.getElementById('edit-core-style').value,
        lighting: document.getElementById('edit-lighting').value,
        composition: document.getElementById('edit-composition').value,
        brushwork: document.getElementById('edit-brushwork').value,
        mood: document.getElementById('edit-mood').value,
        color_palette: document.getElementById('edit-color-palette').value,
        forbidden: document.getElementById('edit-forbidden').value,
        reference: document.getElementById('edit-reference').value,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('style_settings')
        .update(updateData)
        .eq('style_id', currentEditingStyle.style_id);

      if (error) throw error;

    } else if (currentEditingType === 'framing') {
      updateData = {
        name: document.getElementById('edit-name').value,
        emoji: document.getElementById('edit-emoji').value,
        description: document.getElementById('edit-description').value,
        head_size_percentage: parseInt(document.getElementById('edit-head-size').value),
        prompt_addition: document.getElementById('edit-prompt-addition').value,
        character_focus: document.getElementById('edit-character-focus').value,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('framing_settings')
        .update(updateData)
        .eq('framing_id', currentEditingStyle.framing_id);

      if (error) throw error;

    } else if (currentEditingType === 'scene') {
      const elementsText = document.getElementById('edit-decoration-elements').value;
      let elements = [];
      try {
        elements = JSON.parse(elementsText);
      } catch (e) {
        alert('裝飾元素 JSON 格式錯誤');
        return;
      }

      updateData = {
        name: document.getElementById('edit-name').value,
        emoji: document.getElementById('edit-emoji').value,
        description: document.getElementById('edit-description').value,
        decoration_style: document.getElementById('edit-decoration-style').value,
        decoration_elements: elements,
        pop_text_style: document.getElementById('edit-pop-text-style').value,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('scene_settings')
        .update(updateData)
        .eq('scene_id', currentEditingStyle.scene_id);

      if (error) throw error;

    } else if (currentEditingType === 'expression') {
      const expressionsText = document.getElementById('edit-expressions').value;
      const expressionsArray = expressionsText
        .split('\n')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      if (expressionsArray.length === 0) {
        alert('請至少輸入一個表情');
        return;
      }

      updateData = {
        name: document.getElementById('edit-name').value,
        emoji: document.getElementById('edit-emoji').value,
        description: document.getElementById('edit-description').value,
        expressions: expressionsArray,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('expression_template_settings')
        .update(updateData)
        .eq('template_id', currentEditingStyle.template_id);

      if (error) throw error;
    }

    alert('✅ 儲存成功！');
    closeModal();

    // 重新載入列表
    if (currentEditingType === 'style') loadStyles();
    else if (currentEditingType === 'framing') loadFraming();
    else if (currentEditingType === 'scene') loadScenes();
    else if (currentEditingType === 'expression') loadExpressions();

  } catch (error) {
    alert('儲存失敗: ' + error.message);
  }
}

// 頁面載入時
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadStyles();
});

// 檢查登入狀態
function checkAuth() {
  const auth = JSON.parse(localStorage.getItem('adminAuth') || '{}');
  if (!auth.loggedIn || auth.expiry < Date.now()) {
    localStorage.removeItem('adminAuth');
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}

// 登出
function logout() {
  localStorage.removeItem('adminAuth');
  window.location.href = '/admin/login.html';
}

// 初始化風格設定
async function initializeStyles() {
  if (!confirm('確定要初始化風格設定嗎？這將從程式碼中讀取預設值並寫入資料庫。')) return;

  const defaultStyles = [
    {
      style_id: 'realistic',
      name: '美顏真實',
      emoji: '📸',
      description: '美顏相機風、細緻柔膚、自然美感',
      core_style: '(((PHOTOREALISTIC BEAUTY FILTER STYLE))) - Instagram beauty filter aesthetic, professional beauty photography',
      lighting: 'soft diffused beauty lighting with gentle fill light, flattering glow on face, professional studio quality',
      composition: 'beauty portrait framing, flawless skin focus, elegant proportions, magazine cover quality',
      brushwork: 'smooth airbrushed skin with subtle pore texture, refined soft details, high-end retouching',
      mood: 'beauty camera aesthetic, youthful radiant glow, naturally enhanced look',
      color_palette: 'natural skin tones, soft warm colors, subtle pastels',
      forbidden: 'cartoon, anime, chibi, illustration, painting, sketch, flat colors, cel shading',
      reference: 'beauty influencer selfie, professional portrait photography, high-end beauty ads'
    },
    {
      style_id: 'cute',
      name: '可愛風',
      emoji: '🥰',
      description: '圓潤可愛、大眼睛、療癒系',
      core_style: '(((KAWAII CHIBI ILLUSTRATION STYLE))) - Sanrio/Line Friends character design, super deformed proportions',
      lighting: 'soft ambient lighting, gentle bounce light, warm glow, no harsh shadows',
      composition: 'round composition, oversized head (head:body = 1:1 ratio), huge sparkling eyes (40% of face), centered, thick outline',
      brushwork: 'smooth soft shading, glossy highlights, clean edges, rounded everything',
      mood: 'warm cozy atmosphere, heartwarming feeling, adorable charm',
      color_palette: 'pastel pink, baby blue, mint green, lavender, soft yellows',
      forbidden: 'realistic, detailed anatomy, sharp edges, dark colors, gritty textures',
      reference: 'Pusheen, Molang, Rilakkuma, Line Friends, Sanrio characters'
    },
    {
      style_id: 'cool',
      name: '酷炫風',
      emoji: '😎',
      description: '帥氣、動感、潮流感',
      core_style: '(((URBAN STREET STYLE ILLUSTRATION))) - Cyberpunk neon aesthetic, edgy modern design',
      lighting: 'strong rim light with neon glowing edges (cyan/pink), dramatic shadows, high contrast black shadows',
      composition: 'dynamic diagonal composition, sharp angular features, energetic silhouette, bold framing, confident pose',
      brushwork: 'bold sharp strokes, high contrast shading, defined edges, graffiti art influence',
      mood: 'powerful confident atmosphere, street style energy, rebellious attitude',
      color_palette: 'neon cyan, hot pink, electric purple, black, white accents',
      forbidden: 'cute, soft, pastel, rounded, gentle, sweet, kawaii',
      reference: 'street art, hip-hop album covers, cyberpunk aesthetics, urban fashion'
    },
    {
      style_id: 'funny',
      name: '搞笑風',
      emoji: '🤣',
      description: '誇張表情、幽默感、搞怪',
      core_style: '(((COMEDY CARTOON STYLE))) - Exaggerated expressions, meme-worthy humor',
      lighting: 'bright cheerful lighting, simple shadows, playful glow, high visibility',
      composition: 'centered composition, exaggerated expressions (not distorted face), playful framing, comedic timing',
      brushwork: 'cartoon bold strokes, expressive lines, clean outlines, dynamic action lines',
      mood: 'humorous, playful vibes, fun energy, laugh-out-loud funny',
      color_palette: 'bright primary colors, bold contrasts, vibrant saturated tones',
      forbidden: 'serious, elegant, subtle, realistic, sophisticated',
      reference: 'classic cartoons, comic strips, meme illustrations, funny stickers'
    },
    {
      style_id: 'simple',
      name: '簡約風',
      emoji: '✨',
      description: '線條簡潔、極簡設計、清新',
      core_style: '(((MINIMALIST FLAT DESIGN))) - Clean geometric shapes, modern simplicity',
      lighting: 'minimal soft lighting, flat illumination, no dramatic shadows',
      composition: 'clean centered flat layout, geometric balance, negative space emphasis',
      brushwork: 'thin vector-like lines (1-2px), minimal shading, crisp edges, flat colors',
      mood: 'clean modern neutral tone, sophisticated simplicity, zen aesthetic',
      color_palette: 'limited palette (2-4 colors), muted tones, black and white accents',
      forbidden: 'detailed, textured, gradient-heavy, complex shading, busy patterns',
      reference: 'flat design icons, minimalist logos, modern UI design, Scandinavian design'
    },
    {
      style_id: 'anime',
      name: '動漫風',
      emoji: '🎌',
      description: '日系動漫、漫畫風格',
      core_style: '(((JAPANESE ANIME STYLE))) - Manga/anime illustration, cel-shaded aesthetic',
      lighting: 'vivid anime highlight, cel shading, dramatic rim light, high contrast',
      composition: 'strong silhouette, clean framing, dynamic angles, action-ready pose',
      brushwork: 'cel-shaded edges, gradient hair highlights, smooth color blocks, sharp outlines',
      mood: 'energetic dramatic anime style, Japanese illustration feel, dynamic action',
      color_palette: 'vibrant saturated colors, anime skin tones, gradient hair colors',
      forbidden: 'realistic shading, western cartoon, 3D render, photorealistic',
      reference: 'popular anime series, manga illustrations, Japanese mobile game art'
    },
    {
      style_id: 'pixel',
      name: '像素風',
      emoji: '👾',
      description: '復古像素、8-bit 風格',
      core_style: '(((8-BIT PIXEL ART STYLE))) - Retro gaming aesthetic, grid-based design',
      lighting: 'pixel shading blocks, dithering effects, limited color gradients',
      composition: '8-bit center framing, grid-aligned positioning (pixel-perfect)',
      brushwork: 'pixel clusters, clean grid alignment, limited color dithering, no anti-aliasing',
      mood: 'retro gaming charm, nostalgic 8-bit aesthetic, arcade game feel',
      color_palette: 'limited 16-color palette, retro game colors, high contrast',
      forbidden: 'smooth gradients, anti-aliasing, high resolution, detailed shading',
      reference: 'NES/SNES games, Game Boy graphics, retro arcade games'
    },
    {
      style_id: 'sketch',
      name: '素描風',
      emoji: '✏️',
      description: '逼真鉛筆素描、藝術質感',
      core_style: '(((HYPERREALISTIC PENCIL SKETCH))) - Fine art graphite drawing, museum quality',
      lighting: 'single directional light source, strong tonal contrast, dramatic shadow mapping',
      composition: 'portrait-focused framing, classical fine art composition, balanced negative space',
      brushwork: 'precise graphite pencil strokes, cross-hatching for shadows, smooth gradient tones, visible pencil texture',
      mood: 'fine art aesthetic, museum-quality portrait, timeless elegance, artistic mastery',
      color_palette: 'monochromatic grayscale, deep blacks to subtle grays, paper white',
      forbidden: 'colored, vibrant colors, digital art, cartoon, anime, flat shading',
      reference: 'classical portrait drawings, fine art sketches, Renaissance drawings'
    }
  ];

  try {
    const { error } = await supabase
      .from('style_settings')
      .upsert(defaultStyles, { onConflict: 'style_id' });

    if (error) throw error;

    alert('✅ 風格設定初始化成功！已載入全部 9 種風格');
    loadStyles();
  } catch (error) {
    alert('初始化失敗: ' + error.message);
  }
}

// 初始化構圖設定
async function initializeFraming() {
  if (!confirm('確定要初始化構圖設定嗎？')) return;

  const defaultFraming = [
    {
      framing_id: 'fullbody',
      name: '全身',
      emoji: '🧍',
      description: '完整全身，適合動作表情',
      head_size_percentage: 15,
      prompt_addition: `(((FULL BODY SHOT - HEAD TO TOE)))

CRITICAL MEASUREMENTS:
- Head size: 15% of frame height (SMALL head relative to body)
- Body length: 80% of frame height
- Feet MUST be visible at bottom edge
- Top margin: 5%, Bottom margin: 5%
- Character fills 90% of vertical space

COMPOSITION RULES:
- Standing, walking, jumping, or full-body action pose
- Entire body from head to feet visible
- Legs fully extended and visible
- Feet touching or near bottom edge
- Camera angle: Eye-level or slightly below

ABSOLUTELY FORBIDDEN:
- Cropped legs or cut-off feet
- Close-up shots
- Large head proportions
- Character smaller than 80% of frame
- Excessive empty space above or below`,
      character_focus: 'FULL BODY visible head to toe, character fills 90% of frame height, SMALL head (15%), legs and feet visible'
    },
    {
      framing_id: 'halfbody',
      name: '半身',
      emoji: '👤',
      description: '上半身，表情手勢兼顧',
      head_size_percentage: 25,
      prompt_addition: `(((HALF BODY SHOT - WAIST UP)))

CRITICAL MEASUREMENTS:
- Head size: 25% of frame height (MEDIUM head)
- Torso: 60% of frame height
- Cut at waist level (belly button visible)
- Hands and arms MUST be in frame
- Character fills 85% of vertical space

COMPOSITION RULES:
- Upper body from waist up
- Both arms visible and expressive
- Hands doing gestures (waving, pointing, etc.)
- Torso and chest clearly visible
- Camera angle: Slightly below eye-level

ABSOLUTELY FORBIDDEN:
- Full body with legs visible
- Head-only shots
- Cut at chest level
- Arms cropped out of frame
- Character smaller than 80% of frame`,
      character_focus: 'UPPER BODY waist up, character fills 85% of frame, MEDIUM head (25%), hands visible and gesturing'
    },
    {
      framing_id: 'portrait',
      name: '大頭',
      emoji: '😊',
      description: '頭部特寫，表情清晰',
      head_size_percentage: 60,
      prompt_addition: `(((HEAD AND SHOULDERS PORTRAIT)))

CRITICAL MEASUREMENTS:
- Head size: 60% of frame height (LARGE head)
- Face fills 50% of total frame area
- Shoulders visible (cut at mid-chest)
- Neck fully visible
- Character fills 85% of vertical space

COMPOSITION RULES:
- Head and shoulders only
- Face is the main focus
- Facial expression clearly readable
- Shoulders provide context
- Camera angle: Eye-level, straight on

ABSOLUTELY FORBIDDEN:
- Full body or half body visible
- Extreme close-up (face only)
- Profile or side view
- Small head with too much space
- Character smaller than 80% of frame`,
      character_focus: 'HEAD AND SHOULDERS, character fills 85% of frame, LARGE head (60%), face is main focus'
    },
    {
      framing_id: 'closeup',
      name: '特寫',
      emoji: '👁️',
      description: '臉部特寫，表情超大',
      head_size_percentage: 85,
      prompt_addition: `(((EXTREME FACE CLOSE-UP)))

CRITICAL MEASUREMENTS:
- Face fills 85% of frame (HUGE face)
- Eyes at center of frame
- Forehead may be slightly cropped
- Chin visible at bottom
- Face nearly touches all edges

COMPOSITION RULES:
- Face only, no shoulders
- Eyes are the focal point
- Every facial detail visible
- Intimate emotional connection
- Camera angle: Straight on, direct eye contact

ABSOLUTELY FORBIDDEN:
- Shoulders or body visible
- Full head with space around
- Distant shot
- Small face with empty space
- Face smaller than 80% of frame`,
      character_focus: 'EXTREME FACE CLOSE-UP, face fills 85% of frame, HUGE face nearly touching edges, eyes at center'
    }
  ];

  try {
    const { error } = await supabase
      .from('framing_settings')
      .upsert(defaultFraming, { onConflict: 'framing_id' });

    if (error) throw error;

    alert('✅ 構圖設定初始化成功！已載入全部 4 種構圖');
    loadFraming();
  } catch (error) {
    alert('初始化失敗: ' + error.message);
  }
}

// 初始化裝飾風格設定
async function initializeScenes() {
  if (!confirm('確定要初始化裝飾風格設定嗎？')) return;

  const defaultScenes = [
    {
      scene_id: 'none',
      name: '簡約風',
      emoji: '✨',
      description: '乾淨簡約，少量裝飾',
      decoration_style: 'minimal decorations, clean design',
      decoration_elements: ['small sparkles', 'subtle glow'],
      pop_text_style: 'simple clean text, small font'
    },
    {
      scene_id: 'pop',
      name: 'POP風格',
      emoji: '💥',
      description: '活潑POP文字、大膽配色',
      decoration_style: 'bold POP art style, vibrant colors, dynamic layout',
      decoration_elements: ['bold text bubbles', 'comic style effects', 'exclamation marks', 'star bursts'],
      pop_text_style: 'large bold POP text, colorful outline, comic book style, impactful typography'
    },
    {
      scene_id: 'kawaii',
      name: '夢幻可愛',
      emoji: '💖',
      description: '粉嫩夢幻、愛心星星',
      decoration_style: 'kawaii pastel style, dreamy soft colors',
      decoration_elements: ['floating hearts', 'sparkling stars', 'cute flowers', 'rainbow sparkles', 'blush marks'],
      pop_text_style: 'cute rounded text, pastel colors, soft bubble font'
    },
    {
      scene_id: 'travel',
      name: '旅遊打卡',
      emoji: '✈️',
      description: '旅遊景點、護照印章、相機',
      decoration_style: 'travel themed decorations, vacation vibe, landmark silhouettes',
      decoration_elements: ['passport stamps', 'airplane icons', 'camera icons', 'landmark silhouettes', 'luggage tags', 'world map elements'],
      pop_text_style: 'postcard style text, travel journal font'
    },
    {
      scene_id: 'office',
      name: '辦公室',
      emoji: '💼',
      description: '上班族、咖啡杯、電腦',
      decoration_style: 'office themed decorations, business casual vibe',
      decoration_elements: ['coffee cup icons', 'laptop icons', 'document papers', 'clock icons', 'email icons', 'sticky notes'],
      pop_text_style: 'professional clean text, business font'
    },
    {
      scene_id: 'park',
      name: '公園野餐',
      emoji: '🌳',
      description: '綠地草皮、野餐、戶外休閒',
      decoration_style: 'outdoor park themed, nature elements, picnic vibe',
      decoration_elements: ['green leaves', 'flowers', 'butterflies', 'sun rays', 'picnic basket', 'trees silhouettes'],
      pop_text_style: 'natural organic text, friendly rounded font'
    },
    {
      scene_id: 'colorful',
      name: '繽紛彩色',
      emoji: '🌈',
      description: '彩色潑墨、七彩裝飾',
      decoration_style: 'colorful splash style, rainbow palette, artistic paint effects',
      decoration_elements: ['color splashes', 'paint splatters', 'rainbow confetti', 'watercolor spots', 'geometric shapes'],
      pop_text_style: 'colorful gradient text, artistic typography'
    },
    {
      scene_id: 'custom',
      name: '自訂風格',
      emoji: '✏️',
      description: '自己描述想要的裝飾風格',
      decoration_style: '',
      decoration_elements: [],
      pop_text_style: ''
    }
  ];

  try {
    const { error } = await supabase
      .from('scene_settings')
      .upsert(defaultScenes, { onConflict: 'scene_id' });

    if (error) throw error;

    alert('✅ 裝飾風格設定初始化成功！已載入全部 8 種裝飾風格');
    loadScenes();
  } catch (error) {
    alert('初始化失敗: ' + error.message);
  }
}

// 匯出風格設定
async function exportStyles() {
  try {
    const { data, error } = await supabase
      .from('style_settings')
      .select('*')
      .order('style_id');

    if (error) throw error;

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `style-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert('✅ 風格設定已匯出！');
  } catch (error) {
    alert('匯出失敗: ' + error.message);
  }
}

// 等待 Supabase 初始化後再載入資料
window.addEventListener('DOMContentLoaded', async () => {
  // 等待 supabase 客戶端初始化
  let retries = 0;
  const maxRetries = 50; // 最多等待 5 秒

  const waitForSupabase = setInterval(() => {
    if (typeof supabase !== 'undefined' && supabase !== null) {
      clearInterval(waitForSupabase);
      console.log('✅ Supabase ready, loading styles...');
      loadStyles(); // 載入預設頁籤的資料
    } else {
      retries++;
      if (retries >= maxRetries) {
        clearInterval(waitForSupabase);
        console.error('❌ Supabase initialization timeout');
        document.getElementById('styles-list').innerHTML =
          '<div class="text-center text-red-500 py-8">載入失敗: supabase.from is not a function<br>請重新整理頁面</div>';
      }
    }
  }, 100);
});

// ==================== AI 風格提取功能 ====================

// 當選擇圖片時顯示預覽
document.addEventListener('DOMContentLoaded', () => {
  const checkInterval = setInterval(() => {
    const input = document.getElementById('style-image-input');
    if (input) {
      clearInterval(checkInterval);
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('image-preview').classList.remove('hidden');
            document.getElementById('analyze-btn').disabled = false;
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }, 100);
});

// 分析圖片風格（同步模式 - 直接等待結果）
async function analyzeStyleImage() {
  const input = document.getElementById('style-image-input');
  const file = input.files[0];

  if (!file) {
    alert('請先選擇圖片');
    return;
  }

  const statusDiv = document.getElementById('analysis-status');
  const analyzeBtn = document.getElementById('analyze-btn');

  try {
    // 顯示載入狀態
    statusDiv.className = 'mt-2 text-sm text-blue-600 font-medium';
    statusDiv.textContent = '🔄 AI 分析中，請稍候（約 10-20 秒）...';
    statusDiv.classList.remove('hidden');
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '⏳ 分析中...';

    // 壓縮圖片（降低大小，加速上傳和分析）
    const compressedBase64 = await compressImage(file, 800, 0.7);
    console.log('📸 圖片已壓縮，大小:', Math.round(compressedBase64.length / 1024), 'KB');

    // 呼叫 API 分析圖片
    const response = await fetch('/.netlify/functions/analyze-style-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: compressedBase64 })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '分析失敗');
    }

    // 填入分析結果
    const analysis = result.analysis;
    console.log('✅ 分析結果:', analysis);

    if (analysis.coreStyle) {
      document.getElementById('edit-core-style').value = analysis.coreStyle;
    }
    if (analysis.lighting) {
      document.getElementById('edit-lighting').value = analysis.lighting;
    }
    if (analysis.composition) {
      document.getElementById('edit-composition').value = analysis.composition;
    }
    if (analysis.brushwork) {
      document.getElementById('edit-brushwork').value = analysis.brushwork;
    }
    if (analysis.mood) {
      document.getElementById('edit-mood').value = analysis.mood;
    }
    if (analysis.colorPalette) {
      document.getElementById('edit-color-palette').value = analysis.colorPalette;
    }
    if (analysis.description) {
      document.getElementById('edit-description').value = analysis.description;
    }

    // 顯示成功訊息
    statusDiv.className = 'mt-2 text-sm text-green-600 font-medium';
    statusDiv.textContent = '✅ 分析完成！風格參數已自動填入，請檢查並調整';

    // 5秒後隱藏訊息
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 5000);

  } catch (error) {
    console.error('分析錯誤:', error);
    statusDiv.className = 'mt-2 text-sm text-red-600 font-medium';
    statusDiv.textContent = `❌ 分析失敗: ${error.message}`;
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '✨ 分析風格';
  }
}

/**
 * 壓縮圖片
 * @param {File} file - 圖片文件
 * @param {number} maxWidth - 最大寬度
 * @param {number} quality - 品質 (0-1)
 * @returns {Promise<string>} Base64 字串
 */
async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 如果寬度超過最大值，等比例縮小
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // 轉換為 base64
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 將檔案轉換為 base64（保留給其他功能使用）
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================
// 🎨 裝飾風格圖片分析功能
// ============================================

let sceneImageFile = null;

// 監聽裝飾風格圖片選擇
document.addEventListener('DOMContentLoaded', () => {
  // 延遲綁定，因為這個元素在 Modal 打開後才存在
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'scene-image-input') {
      handleSceneImageSelect(e);
    }
  });
});

/**
 * 處理裝飾風格圖片選擇
 */
function handleSceneImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  sceneImageFile = file;

  // 顯示預覽
  const preview = document.getElementById('scene-image-preview');
  const img = document.getElementById('scene-preview-img');
  const analyzeBtn = document.getElementById('analyze-scene-btn');

  const reader = new FileReader();
  reader.onload = (e) => {
    img.src = e.target.result;
    preview.classList.remove('hidden');
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

/**
 * 分析裝飾風格圖片
 */
async function analyzeSceneImage() {
  if (!sceneImageFile) {
    alert('請先選擇圖片');
    return;
  }

  const analyzeBtn = document.getElementById('analyze-scene-btn');
  const statusDiv = document.getElementById('scene-analysis-status');

  try {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '🔄 分析中...';
    statusDiv.classList.remove('hidden');
    statusDiv.className = 'mt-2 text-sm text-blue-600 font-medium';
    statusDiv.textContent = '🤖 AI 正在分析裝飾風格...';

    // 壓縮圖片（降低 API 成本）
    const compressedBase64 = await compressImage(sceneImageFile, 800, 0.7);
    console.log('📸 圖片已壓縮，大小:', (compressedBase64.length / 1024).toFixed(0), 'KB');

    // 呼叫 Netlify Function
    const response = await fetch('/.netlify/functions/analyze-decoration-style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: compressedBase64 })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('✅ 分析結果:', result);

    if (!result.success) {
      throw new Error(result.error || '分析失敗');
    }

    const analysis = result.data;

    // 自動填入表單
    if (analysis.decorationStyle) {
      document.getElementById('edit-decoration-style').value = analysis.decorationStyle;
    }
    if (analysis.decorationElements && Array.isArray(analysis.decorationElements)) {
      document.getElementById('edit-decoration-elements').value = JSON.stringify(analysis.decorationElements, null, 2);
    }
    if (analysis.popTextStyle) {
      document.getElementById('edit-pop-text-style').value = analysis.popTextStyle;
    }
    if (analysis.description) {
      document.getElementById('edit-description').value = analysis.description;
    }

    // 顯示成功訊息
    statusDiv.className = 'mt-2 text-sm text-green-600 font-medium';
    statusDiv.textContent = '✅ 分析完成！裝飾風格參數已自動填入，請檢查並調整';

    // 5秒後隱藏訊息
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 5000);

  } catch (error) {
    console.error('分析錯誤:', error);
    statusDiv.className = 'mt-2 text-sm text-red-600 font-medium';
    statusDiv.textContent = `❌ 分析失敗: ${error.message}`;
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '✨ 分析風格';
  }
}

// ============================================
// 😊 表情模板管理功能
// ============================================

// 載入表情模板設定
async function loadExpressions() {
  const container = document.getElementById('expressions-list');
  container.innerHTML = '<div class="text-center text-gray-500 py-8">載入中...</div>';

  try {
    const { data, error } = await supabase
      .from('expression_template_settings')
      .select('*')
      .order('template_id');

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">尚未初始化表情模板設定</p>
          <button onclick="initializeExpressions()" class="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600">
            😊 初始化表情模板設定
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(template => {
      const expressionCount = Array.isArray(template.expressions) ? template.expressions.length : 0;
      const expressionPreview = Array.isArray(template.expressions)
        ? template.expressions.slice(0, 8).join('、') + (expressionCount > 8 ? '...' : '')
        : '';

      return `
      <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-3xl">${template.emoji || '😊'}</span>
              <div>
                <h3 class="font-bold text-lg">${template.name}</h3>
                <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">${template.template_id}</span>
              </div>
            </div>
            <p class="text-gray-600 text-sm mb-2">${template.description || ''}</p>
            <div class="bg-gray-50 p-2 rounded text-sm">
              <span class="font-bold text-gray-700">表情數量：</span>
              <span class="text-pink-600 font-bold">${expressionCount} 個</span>
            </div>
            <div class="mt-2 text-xs text-gray-600">
              <span class="font-bold">預覽：</span>${expressionPreview}
            </div>
          </div>
          <button onclick="editExpression('${template.template_id}')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ml-4">
            ✏️ 編輯
          </button>
        </div>
      </div>
    `}).join('');

  } catch (error) {
    console.error('載入表情模板失敗:', error);
    container.innerHTML = `<div class="text-center text-red-500 py-8">載入失敗: ${error.message}</div>`;
  }
}

// 編輯表情模板
async function editExpression(templateId) {
  try {
    const { data, error } = await supabase
      .from('expression_template_settings')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (error) throw error;

    currentEditingStyle = data;
    currentEditingType = 'expression';

    document.getElementById('modal-title').textContent = `編輯表情模板: ${data.name}`;
    document.getElementById('modal-content').innerHTML = generateExpressionEditForm(data);
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-modal').classList.add('flex');
  } catch (error) {
    alert('載入表情模板失敗: ' + error.message);
  }
}

// 生成表情模板編輯表單
function generateExpressionEditForm(template) {
  const expressionsText = Array.isArray(template.expressions)
    ? template.expressions.join('\n')
    : '';

  return `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-bold mb-2">模板 ID</label>
        <input type="text" value="${template.template_id}" disabled class="w-full p-2 border rounded bg-gray-100">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">名稱</label>
        <input type="text" id="edit-name" value="${template.name}" class="w-full p-2 border rounded">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Emoji</label>
        <input type="text" id="edit-emoji" value="${template.emoji || ''}" class="w-full p-2 border rounded" maxlength="2">
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">描述</label>
        <textarea id="edit-description" class="w-full p-2 border rounded" rows="2">${template.description || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">表情列表（每行一個，共 24 個）</label>
        <textarea id="edit-expressions" class="w-full p-2 border rounded font-mono text-sm" rows="12">${expressionsText}</textarea>
        <p class="text-xs text-gray-500 mt-1">每行輸入一個表情，建議 24 個（系統會隨機選用）</p>
        <p class="text-xs text-gray-400">範例：早安、Hi、OK、讚讚...</p>
      </div>
    </div>
  `;
}

// 初始化表情模板設定
async function initializeExpressions() {
  if (!confirm('確定要初始化表情模板設定嗎？')) return;

  const defaultExpressions = [
    {
      template_id: 'basic',
      name: '基本日常',
      emoji: '😊',
      description: '日常打招呼、常用表情',
      expressions: [
        '早安', 'Hi', 'OK', '讚讚', '加油', '謝謝', '晚安', 'Yes',
        '你好', '掰掰', '了解', '收到', '沒問題', '辛苦了', '午安', '好的',
        '好棒', '太好了', '明天見', '晚點說', '我來了', '等我', '出發', '到了'
      ]
    },
    {
      template_id: 'cute',
      name: '可愛撒嬌',
      emoji: '🥺',
      description: '撒嬌賣萌、可愛互動',
      expressions: [
        '撒嬌', '害羞', '噓', '啾啾', '嘿嘿嘿', '抱抱', '好想吃', '哭哭',
        '求求你', '人家', '討厭啦', '好可愛', '委屈', '賣萌', '心心', '愛你',
        '羞羞', '嘟嘴', '眨眼', '偷笑', '飛吻', '撒花', '轉圈', '比心'
      ]
    },
    {
      template_id: 'office',
      name: '辦公室',
      emoji: '💼',
      description: '工作日常、職場對話',
      expressions: [
        'OK', '讚讚', '加班中', '累累', '我想想', 'Sorry', '等等', '放假',
        '開會中', '忙碌', '下班', '收到', '處理中', '已完成', '請假', '補班',
        '喝咖啡', '趕報告', '老闆叫', '午休', '打卡', '週五了', '禮拜一', '衝業績'
      ]
    },
    {
      template_id: 'social',
      name: '社交常用',
      emoji: '💬',
      description: '社交對話、常用回覆',
      expressions: [
        'Hi', '謝謝', 'Sorry', 'OK', 'Yes', 'No', '再見', '等等',
        '好久不見', '恭喜', '沒關係', '不客氣', '隨時', '改天', '下次', '約嗎',
        '在哪', '出來玩', '聚一下', '回覆晚', '剛看到', '好喔', '看你', '都可以'
      ]
    },
    {
      template_id: 'emotion',
      name: '情緒表達',
      emoji: '🎭',
      description: '豐富情緒、心情寫照',
      expressions: [
        '開心', '大笑', '哭哭', '生氣', '驚訝', '傻眼', '害羞', '累累',
        '超爽', '崩潰', '無奈', '感動', '緊張', '期待', '難過', '煩躁',
        '興奮', '困惑', '心碎', '陶醉', '不爽', '爆炸', '放空', '翻白眼'
      ]
    },
    {
      template_id: 'special',
      name: '特殊場合',
      emoji: '🎉',
      description: '節日祝賀、特別活動',
      expressions: [
        '生日快樂', '恭喜', '感謝', '加油', 'Yes', '開心', '啾啾', '抱抱',
        '新年快樂', '聖誕快樂', '情人節', '中秋快樂', '母親節', '父親節', '畢業', '升遷',
        '結婚快樂', '喬遷', '考試加油', '面試成功', '發大財', '身體健康', '萬事如意', '心想事成'
      ]
    }
  ];

  try {
    const { error } = await supabase
      .from('expression_template_settings')
      .upsert(defaultExpressions, { onConflict: 'template_id' });

    if (error) throw error;

    alert('✅ 表情模板設定初始化成功！已載入全部 6 種模板');
    loadExpressions();
  } catch (error) {
    alert('初始化失敗: ' + error.message);
  }
}
