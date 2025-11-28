/**
 * Supabase Client Module
 * 提供 Supabase 連線與操作
 */

const { createClient } = require('@supabase/supabase-js');

// 延遲初始化 Supabase client
let supabase = null;

function getSupabaseClient() {
  if (supabase) return supabase;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase 環境變數未設定：需要 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
    throw new Error('Supabase 環境變數未設定');
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabase;
}

/**
 * 檢查 reply token 是否已使用（去重機制）
 */
async function isReplyTokenUsed(replyToken) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('line_events')
      .select('reply_token')
      .eq('reply_token', replyToken)
      .limit(1);
    
    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error('檢查 reply token 失敗:', error);
    return false;
  }
}

/**
 * 記錄 reply token
 */
async function recordReplyToken(replyToken) {
  try {
    const { error } = await getSupabaseClient()
      .from('line_events')
      .insert([{ reply_token: replyToken, created_at: new Date().toISOString() }]);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('記錄 reply token 失敗:', error);
    return false;
  }
}

/**
 * 取得或建立用戶
 */
async function getOrCreateUser(lineUserId, displayName = null, pictureUrl = null) {
  try {
    // 先查詢是否存在
    const { data: existing, error: selectError } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('line_user_id', lineUserId)
      .limit(1);

    if (selectError) throw selectError;

    if (existing && existing.length > 0) {
      return existing[0];
    }

    // 建立新用戶
    const { data: newUser, error: insertError } = await getSupabaseClient()
      .from('users')
      .insert([{
        line_user_id: lineUserId,
        display_name: displayName,
        picture_url: pictureUrl,
        sticker_credits: 10
      }])
      .select()
      .single();

    if (insertError) throw insertError;
    return newUser;
  } catch (error) {
    console.error('取得/建立用戶失敗:', error);
    return null;
  }
}

/**
 * 取得用戶的貼圖組列表
 */
async function getUserStickerSets(userId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('sticker_sets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('取得貼圖組失敗:', error);
    return [];
  }
}

/**
 * 建立新的貼圖組
 */
async function createStickerSet(setData) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('sticker_sets')
      .insert([setData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('建立貼圖組失敗:', error);
    return null;
  }
}

/**
 * 更新貼圖組狀態
 */
async function updateStickerSetStatus(setId, status, additionalData = {}) {
  try {
    const { error } = await getSupabaseClient()
      .from('sticker_sets')
      .update({ status, ...additionalData, updated_at: new Date().toISOString() })
      .eq('set_id', setId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('更新貼圖組狀態失敗:', error);
    return false;
  }
}

/**
 * 取得貼圖組詳情
 */
async function getStickerSet(setId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('sticker_sets')
      .select('*')
      .eq('set_id', setId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('取得貼圖組詳情失敗:', error);
    return null;
  }
}

/**
 * 取得用戶最新的生成任務（含貼圖組資訊）
 */
async function getUserLatestTask(userId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('generation_tasks')
      .select(`
        task_id,
        status,
        progress,
        created_at,
        sticker_sets (
          set_id,
          name,
          status,
          sticker_count
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // 沒有記錄
      throw error;
    }
    return data;
  } catch (error) {
    console.error('取得最新任務失敗:', error);
    return null;
  }
}

/**
 * 取得用戶所有進行中的任務
 */
async function getUserPendingTasks(userId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('generation_tasks')
      .select(`
        task_id,
        status,
        progress,
        created_at,
        sticker_sets (
          set_id,
          name,
          status
        )
      `)
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('取得進行中任務失敗:', error);
    return [];
  }
}

module.exports = {
  getSupabaseClient,
  isReplyTokenUsed,
  recordReplyToken,
  getOrCreateUser,
  getUserStickerSets,
  createStickerSet,
  updateStickerSetStatus,
  getStickerSet,
  getUserLatestTask,
  getUserPendingTasks
};

