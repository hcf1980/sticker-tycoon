/**
 * Admin Cleanup API - 貼圖大亨
 * 提供 Supabase 資料清理和統計功能
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 客戶端
let supabase = null;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const action = event.queryStringParameters?.action;
  const supabase = getSupabase();

  try {
    switch (action) {
      case 'stats':
        // 取得統計資料
        return await getStats(supabase, headers);

      case 'orphaned':
        // 取得孤立資料
        return await getOrphanedData(supabase, headers);

      case 'list':
        // 取得貼圖組列表
        return await getStickerSetsList(supabase, headers);

      case 'detail':
        // 取得單一貼圖組詳細資料
        const setId = event.queryStringParameters?.setId;
        if (!setId) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'setId required' }) };
        }
        return await getStickerSetDetail(supabase, headers, setId);

      case 'cleanup':
        // 執行清理（需 POST 請求）
        if (event.httpMethod !== 'POST') {
          return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
        }
        return await performCleanup(supabase, headers, event);

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }
  } catch (error) {
    console.error('Admin Cleanup Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

/**
 * 取得統計資料
 */
async function getStats(supabase, headers) {
  // 貼圖組統計
  const { data: stickerSets, error: setError } = await supabase
    .from('sticker_sets')
    .select('id, status, created_at');

  // 使用者統計
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Storage 使用量（sticker-images bucket）
  const { data: storageFiles } = await supabase.storage
    .from('sticker-images')
    .list('', { limit: 1000 });

  // 計算各狀態數量
  const stats = {
    total: stickerSets?.length || 0,
    completed: stickerSets?.filter(s => s.status === 'completed').length || 0,
    generating: stickerSets?.filter(s => s.status === 'generating').length || 0,
    failed: stickerSets?.filter(s => s.status === 'failed').length || 0,
    draft: stickerSets?.filter(s => s.status === 'draft').length || 0,
    users: userCount || 0,
    storageFolders: storageFiles?.length || 0
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, stats })
  };
}

/**
 * 取得單一貼圖組詳細資料
 */
async function getStickerSetDetail(supabase, headers, setId) {
  const { data: set, error: setError } = await supabase
    .from('sticker_sets')
    .select('*')
    .eq('set_id', setId)
    .single();

  if (setError) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Not found' })
    };
  }

  // 列出 Storage 中的貼圖檔案
  const { data: files, error: filesError } = await supabase.storage
    .from('sticker-images')
    .list(setId, { limit: 50 });

  // 調試日誌
  console.log(`[getStickerSetDetail] setId: ${setId}, files found: ${files?.length || 0}`, files);

  // 篩選 PNG 檔案（不限制檔案名稱格式）
  const stickers = (files || [])
    .filter(f => {
      // 排除資料夾（資料夾沒有副檔名）
      if (f.id && !f.name.includes('.')) return false;
      // 只接受 PNG 檔案
      return f.name.toLowerCase().endsWith('.png');
    })
    .map(f => ({
      name: f.name,
      url: `${process.env.SUPABASE_URL}/storage/v1/object/public/sticker-images/${setId}/${f.name}`
    }));

  console.log(`[getStickerSetDetail] filtered stickers: ${stickers.length}`, stickers);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      set,
      stickers,
      supabaseUrl: process.env.SUPABASE_URL
    })
  };
}

/**
 * 取得貼圖組列表
 */
async function getStickerSetsList(supabase, headers) {
  const { data: sets, error } = await supabase
    .from('sticker_sets')
    .select('set_id, name, status, sticker_count, main_image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }

  // 加入 Supabase URL 供前端使用
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      sets: sets || [],
      supabaseUrl: process.env.SUPABASE_URL
    })
  };
}

/**
 * 取得孤立資料（有 Storage 但無 DB 記錄，或有 DB 但無 Storage）
 */
async function getOrphanedData(supabase, headers) {
  // 1. 取得 DB 中的所有 set_id
  const { data: dbSets } = await supabase
    .from('sticker_sets')
    .select('set_id, name, status, created_at');

  const dbSetIds = new Set((dbSets || []).map(s => s.set_id));

  // 2. 取得 Storage 中的所有資料夾
  const { data: storageFolders } = await supabase.storage
    .from('sticker-images')
    .list('', { limit: 1000 });

  const storageSetIds = new Set((storageFolders || [])
    .filter(f => f.id && !f.name.includes('.'))
    .map(f => f.name));

  // 3. 找出孤立資料
  const orphanedStorage = []; // 有 Storage 但無 DB
  const orphanedDb = [];      // 有 DB 但無 Storage

  for (const setId of storageSetIds) {
    if (!dbSetIds.has(setId)) {
      orphanedStorage.push({ setId, type: 'storage_only' });
    }
  }

  for (const set of (dbSets || [])) {
    if (set.status === 'completed' && !storageSetIds.has(set.set_id)) {
      orphanedDb.push({ setId: set.set_id, name: set.name, type: 'db_only' });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      orphanedStorage: orphanedStorage.length,
      orphanedDb: orphanedDb.length,
      details: { storage: orphanedStorage, db: orphanedDb }
    })
  };
}

/**
 * 執行清理
 */
async function performCleanup(supabase, headers, event) {
  const body = JSON.parse(event.body || '{}');
  const { type, setIds } = body;

  let cleaned = 0;
  const errors = [];

  if (type === 'storage') {
    // 清理孤立的 Storage 資料夾
    for (const setId of (setIds || [])) {
      try {
        // 列出資料夾內的檔案
        const { data: files } = await supabase.storage
          .from('sticker-images')
          .list(setId);

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${setId}/${f.name}`);
          const { error } = await supabase.storage
            .from('sticker-images')
            .remove(filePaths);

          if (error) throw error;
        }
        cleaned++;
      } catch (err) {
        errors.push({ setId, error: err.message });
      }
    }
  } else if (type === 'db') {
    // 清理孤立的 DB 記錄
    for (const setId of (setIds || [])) {
      try {
        const { error } = await supabase
          .from('sticker_sets')
          .delete()
          .eq('set_id', setId);

        if (error) throw error;
        cleaned++;
      } catch (err) {
        errors.push({ setId, error: err.message });
      }
    }
  } else if (type === 'old_failed') {
    // 清理 30 天前的失敗記錄
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: oldFailed } = await supabase
      .from('sticker_sets')
      .select('set_id')
      .eq('status', 'failed')
      .lt('created_at', thirtyDaysAgo.toISOString());

    for (const set of (oldFailed || [])) {
      try {
        // 刪除 Storage
        const { data: files } = await supabase.storage
          .from('sticker-images')
          .list(set.set_id);

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${set.set_id}/${f.name}`);
          await supabase.storage.from('sticker-images').remove(filePaths);
        }

        // 刪除 DB
        await supabase.from('sticker_sets').delete().eq('set_id', set.set_id);
        cleaned++;
      } catch (err) {
        errors.push({ setId: set.set_id, error: err.message });
      }
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      cleaned,
      errors: errors.length > 0 ? errors : undefined
    })
  };
}

