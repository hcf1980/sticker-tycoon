/**
 * 風格設定管理 JavaScript
 */

let currentEditingStyle = null;
let currentEditingType = null; // 'style', 'framing', 'scene'

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
    }

    alert('✅ 儲存成功！');
    closeModal();

    // 重新載入列表
    if (currentEditingType === 'style') loadStyles();
    else if (currentEditingType === 'framing') loadFraming();
    else if (currentEditingType === 'scene') loadScenes();

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
  const isLoggedIn = localStorage.getItem('admin_logged_in');
  if (!isLoggedIn) {
    window.location.href = '/admin/login.html';
  }
}

// 登出
function logout() {
  localStorage.removeItem('admin_logged_in');
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
    // 其他風格...
  ];

  try {
    const { error } = await supabase
      .from('style_settings')
      .upsert(defaultStyles, { onConflict: 'style_id' });

    if (error) throw error;

    alert('✅ 風格設定初始化成功！');
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
    // 其他構圖...
  ];

  try {
    const { error } = await supabase
      .from('framing_settings')
      .upsert(defaultFraming, { onConflict: 'framing_id' });

    if (error) throw error;

    alert('✅ 構圖設定初始化成功！');
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
    // 其他裝飾風格...
  ];

  try {
    const { error } = await supabase
      .from('scene_settings')
      .upsert(defaultScenes, { onConflict: 'scene_id' });

    if (error) throw error;

    alert('✅ 裝飾風格設定初始化成功！');
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

