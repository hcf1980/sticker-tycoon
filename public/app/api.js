/**
 * 網頁版 API 模組
 * 封裝所有 API 呼叫
 */

const API_BASE = '/.netlify/functions/web-api';

/**
 * 取得用戶資料
 */
async function getUserProfile() {
  const response = await window.StickerAuth.authFetch(`${API_BASE}/user-profile`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '取得用戶資料失敗');
  }
  
  return data;
}

/**
 * 更新用戶資料
 */
async function updateUserProfile(updates) {
  const response = await window.StickerAuth.authFetch(`${API_BASE}/user-profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '更新失敗');
  }
  
  return data;
}

/**
 * 取得貼圖組列表
 */
async function getStickerSets(page = 1, limit = 10) {
  const response = await window.StickerAuth.authFetch(
    `${API_BASE}/sticker-list?page=${page}&limit=${limit}`
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '取得貼圖組列表失敗');
  }
  
  return data;
}

/**
 * 取得貼圖組詳情
 */
async function getStickerSetDetail(setId) {
  const response = await window.StickerAuth.authFetch(
    `${API_BASE}/sticker-detail?setId=${setId}`
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '取得貼圖組詳情失敗');
  }
  
  return data;
}

/**
 * 刪除貼圖組
 */
async function deleteStickerSet(setId) {
  const response = await window.StickerAuth.authFetch(
    `${API_BASE}/sticker-detail?setId=${setId}`,
    { method: 'DELETE' }
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '刪除失敗');
  }
  
  return data;
}

/**
 * 創建貼圖組
 */
async function createStickerSet(params) {
  const response = await window.StickerAuth.authFetch(`${API_BASE}/sticker-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '創建失敗');
  }
  
  return data;
}

/**
 * 開始生成貼圖
 */
async function startGeneration(taskId) {
  const response = await window.StickerAuth.authFetch(`${API_BASE}/sticker-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '啟動生成失敗');
  }
  
  return data;
}

/**
 * 查詢生成狀態
 */
async function getGenerationStatus(taskId) {
  const response = await window.StickerAuth.authFetch(
    `${API_BASE}/sticker-status?taskId=${taskId}`
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '查詢狀態失敗');
  }
  
  return data;
}

/**
 * 輪詢生成狀態
 */
function pollGenerationStatus(taskId, onUpdate, interval = 3000) {
  let polling = true;
  
  const poll = async () => {
    if (!polling) return;
    
    try {
      const status = await getGenerationStatus(taskId);
      onUpdate(status);
      
      // 如果還在處理中，繼續輪詢
      if (status.task.status === 'processing' || status.task.status === 'pending') {
        setTimeout(poll, interval);
      }
    } catch (error) {
      console.error('輪詢失敗:', error);
      onUpdate({ error: error.message });
    }
  };
  
  poll();
  
  // 返回停止函數
  return () => { polling = false; };
}

/**
 * 取得風格列表
 */
async function getStyleList() {
  // 這些是前端定義的，不需要 API
  return [
    { id: 'cute', name: '可愛風', description: '軟萌療癒，適合日常使用', icon: '🎀' },
    { id: 'realistic', name: '寫實風', description: '細膩寫實，保留人物特徵', icon: '📸' },
    { id: 'handdrawn', name: '手繪風', description: '溫暖手感，獨特藝術風格', icon: '✏️' },
    { id: 'anime', name: '動漫風', description: '日系動漫風格，活潑生動', icon: '🎌' },
    { id: 'chibi', name: 'Q版風', description: '大頭小身，超級可愛', icon: '👶' },
    { id: 'watercolor', name: '水彩風', description: '柔和唯美，藝術氣息', icon: '🎨' }
  ];
}

/**
 * 取得表情模板
 */
async function getExpressionTemplates() {
  return {
    daily: {
      name: '日常必備',
      expressions: ['開心', '難過', '生氣', '驚訝', '無奈', '撒嬌']
    },
    work: {
      name: '職場必備',
      expressions: ['OK', '加油', '辛苦了', '收到', '感謝', '拜託']
    },
    cute: {
      name: '賣萌系列',
      expressions: ['嘻嘻', '嗚嗚', '哼', '啾', '耶', '愛心眼']
    },
    emotion: {
      name: '情緒表達',
      expressions: ['大笑', '流淚', '暴怒', '崩潰', '放空', '興奮']
    }
  };
}

/**
 * 取得場景/裝飾選項
 */
async function getSceneOptions() {
  return [
    { id: 'kawaii', name: '夢幻可愛', description: '愛心、星星、蝴蝶結' },
    { id: 'nature', name: '自然清新', description: '花朵、葉子、蝴蝶' },
    { id: 'sparkle', name: '閃亮發光', description: '閃光、光暈、星塵' },
    { id: 'minimal', name: '簡約乾淨', description: '極簡裝飾，突出角色' },
    { id: 'pop', name: '流行活潑', description: '漫畫風、爆炸框、音符' },
    { id: 'cozy', name: '溫馨居家', description: '食物、飲料、小物品' }
  ];
}

/**
 * 取得構圖選項
 */
async function getFramingOptions() {
  return [
    { id: 'halfbody', name: '半身', description: '上半身，最常用' },
    { id: 'fullbody', name: '全身', description: '完整身體，適合動作' },
    { id: 'portrait', name: '大頭', description: '臉部特寫，表情明顯' },
    { id: 'closeup', name: '特寫', description: '超近距離，情緒強烈' }
  ];
}

// 導出到全域
window.StickerAPI = {
  getUserProfile,
  updateUserProfile,
  getStickerSets,
  getStickerSetDetail,
  deleteStickerSet,
  createStickerSet,
  startGeneration,
  getGenerationStatus,
  pollGenerationStatus,
  getStyleList,
  getExpressionTemplates,
  getSceneOptions,
  getFramingOptions
};

