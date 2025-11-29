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
      const user = existing[0];
      // 如果有新的 displayName 或 pictureUrl，更新現有用戶
      if ((displayName && displayName !== user.display_name) ||
          (pictureUrl && pictureUrl !== user.picture_url)) {
        const updateData = {};
        if (displayName) updateData.display_name = displayName;
        if (pictureUrl) updateData.picture_url = pictureUrl;
        updateData.updated_at = new Date().toISOString();

        await getSupabaseClient()
          .from('users')
          .update(updateData)
          .eq('line_user_id', lineUserId);

        return { ...user, ...updateData };
      }
      return user;
    }

    // 建立新用戶
    const { data: newUser, error: insertError } = await getSupabaseClient()
      .from('users')
      .insert([{
        line_user_id: lineUserId,
        display_name: displayName,
        picture_url: pictureUrl,
        sticker_credits: 40  // 初始 40 代幣
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // 記錄初始代幣交易
    if (newUser) {
      await recordTokenTransaction(lineUserId, 40, 40, 'initial', '新用戶贈送 40 代幣');
    }

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
 * 取得貼圖組詳情（支援 set_id 或 id 查詢）
 */
async function getStickerSet(setId) {
  try {
    // 先嘗試用 set_id 查詢
    let { data, error } = await getSupabaseClient()
      .from('sticker_sets')
      .select('*')
      .eq('set_id', setId)
      .single();

    // 如果找不到，再嘗試用 id 查詢
    if (error || !data) {
      const result = await getSupabaseClient()
        .from('sticker_sets')
        .select('*')
        .eq('id', setId)
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('取得貼圖組詳情失敗:', error);
    return null;
  }
}

/**
 * 取得貼圖組的所有貼圖圖片
 * 如果 stickers 資料表沒有資料，會嘗試從 Storage 掃描並補寫
 */
async function getStickerImages(setId) {
  try {
    const supabase = getSupabaseClient();

    // 先從資料庫查詢
    const { data, error } = await supabase
      .from('stickers')
      .select('sticker_id, index_number, expression, image_url, status')
      .eq('set_id', setId)
      .order('index_number', { ascending: true });

    if (error) throw error;

    // 如果有資料，直接返回
    if (data && data.length > 0) {
      return data;
    }

    // 沒有資料，嘗試從 Storage 掃描
    console.log(`📂 stickers 資料表沒有記錄，嘗試從 Storage 掃描: ${setId}`);
    const scannedStickers = await scanAndCreateStickerRecords(setId);
    return scannedStickers;

  } catch (error) {
    console.error('取得貼圖圖片失敗:', error);
    return [];
  }
}

/**
 * 從 Storage 掃描貼圖並補寫到資料庫
 */
async function scanAndCreateStickerRecords(setId) {
  const supabase = getSupabaseClient();
  const bucket = 'sticker-images';
  const stickers = [];

  try {
    // 列出此 setId 資料夾下的所有檔案
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(setId, { limit: 50 });

    if (error || !files) {
      console.error('掃描 Storage 失敗:', error);
      return [];
    }

    // 篩選出貼圖檔案 (sticker_01.png, sticker_02.png, ...)
    const stickerFiles = files.filter(f => f.name.startsWith('sticker_') && f.name.endsWith('.png'));
    stickerFiles.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`🔍 找到 ${stickerFiles.length} 個貼圖檔案`);

    // 為每個檔案建立記錄
    const { v4: uuidv4 } = require('uuid');

    for (let i = 0; i < stickerFiles.length; i++) {
      const file = stickerFiles[i];
      const indexMatch = file.name.match(/sticker_(\d+)\.png/);
      const indexNumber = indexMatch ? parseInt(indexMatch[1]) : i + 1;

      // 取得公開 URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${setId}/${file.name}`);

      const stickerId = uuidv4();
      const stickerRecord = {
        sticker_id: stickerId,
        set_id: setId,
        index_number: indexNumber,
        expression: `表情 ${indexNumber}`,
        image_url: urlData.publicUrl,
        status: 'completed'
      };

      // 寫入資料庫
      const { error: insertError } = await supabase
        .from('stickers')
        .insert([stickerRecord]);

      if (insertError) {
        console.error(`❌ 補寫貼圖記錄失敗 (${indexNumber}):`, insertError);
      } else {
        stickers.push(stickerRecord);
      }
    }

    console.log(`✅ 已補寫 ${stickers.length} 筆貼圖記錄`);
    return stickers;

  } catch (error) {
    console.error('掃描並補寫貼圖記錄失敗:', error);
    return [];
  }
}

/**
 * 刪除貼圖組
 */
async function deleteStickerSet(setId, userId) {
  try {
    // 先確認是用戶自己的貼圖組
    const set = await getStickerSet(setId);
    if (!set) {
      return { success: false, error: '找不到此貼圖組' };
    }
    if (set.user_id !== userId) {
      return { success: false, error: '沒有權限刪除此貼圖組' };
    }

    // 取得實際的 set_id（UUID）和 id（整數）
    const actualSetId = set.set_id;
    const actualId = set.id;

    // 刪除相關的生成任務（使用 set_id）
    if (actualSetId) {
      await getSupabaseClient()
        .from('generation_tasks')
        .delete()
        .eq('sticker_set_id', actualSetId);
    }

    // 刪除貼圖組（使用整數 id）
    const { error } = await getSupabaseClient()
      .from('sticker_sets')
      .delete()
      .eq('id', actualId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('刪除貼圖組失敗:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 取得用戶最新的生成任務（含貼圖組資訊）
 */
async function getUserLatestTask(userId) {
  try {
    const supabase = getSupabaseClient();

    // 先查詢任務
    const { data: task, error: taskError } = await supabase
      .from('generation_tasks')
      .select('task_id, set_id, status, progress, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (taskError) {
      if (taskError.code === 'PGRST116') return null; // 沒有記錄
      throw taskError;
    }

    // 再查詢對應的貼圖組
    if (task && task.set_id) {
      const { data: stickerSet } = await supabase
        .from('sticker_sets')
        .select('set_id, name, status, sticker_count')
        .eq('set_id', task.set_id)
        .single();

      task.sticker_set = stickerSet;
    }

    return task;
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
    const supabase = getSupabaseClient();

    // 查詢進行中的任務
    const { data: tasks, error } = await supabase
      .from('generation_tasks')
      .select('task_id, set_id, status, progress, created_at')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!tasks || tasks.length === 0) return [];

    // 查詢對應的貼圖組
    const setIds = tasks.map(t => t.set_id).filter(Boolean);
    if (setIds.length > 0) {
      const { data: stickerSets } = await supabase
        .from('sticker_sets')
        .select('set_id, name, status')
        .in('set_id', setIds);

      // 合併資料
      const setMap = {};
      (stickerSets || []).forEach(s => setMap[s.set_id] = s);
      tasks.forEach(t => t.sticker_set = setMap[t.set_id] || null);
    }

    return tasks;
  } catch (error) {
    console.error('取得進行中任務失敗:', error);
    return [];
  }
}

// ============================================
// 上傳佇列相關函數
// ============================================

/**
 * 新增貼圖到上傳佇列
 */
async function addToUploadQueue(userId, stickerId, sourceSetId, imageUrl, expression) {
  try {
    const supabase = getSupabaseClient();

    // 先檢查佇列中已有多少張
    const { count } = await supabase
      .from('upload_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count >= 40) {
      return { success: false, error: '待上傳佇列已滿（最多 40 張）' };
    }

    // 新增到佇列
    const { data, error } = await supabase
      .from('upload_queue')
      .insert([{
        user_id: userId,
        sticker_id: stickerId,
        source_set_id: sourceSetId,
        image_url: imageUrl,
        expression: expression,
        queue_order: (count || 0) + 1
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {  // unique violation
        return { success: false, error: '此貼圖已在待上傳佇列中' };
      }
      throw error;
    }

    return { success: true, data, currentCount: (count || 0) + 1 };
  } catch (error) {
    console.error('新增到上傳佇列失敗:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 從上傳佇列移除貼圖
 */
async function removeFromUploadQueue(userId, stickerId) {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('upload_queue')
      .delete()
      .eq('user_id', userId)
      .eq('sticker_id', stickerId);

    if (error) throw error;

    // 重新排序
    await reorderUploadQueue(userId);

    return { success: true };
  } catch (error) {
    console.error('從上傳佇列移除失敗:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 重新排序上傳佇列
 */
async function reorderUploadQueue(userId) {
  try {
    const supabase = getSupabaseClient();

    // 取得所有佇列項目
    const { data: items } = await supabase
      .from('upload_queue')
      .select('id')
      .eq('user_id', userId)
      .order('queue_order', { ascending: true });

    // 重新設定順序
    for (let i = 0; i < items.length; i++) {
      await supabase
        .from('upload_queue')
        .update({ queue_order: i + 1 })
        .eq('id', items[i].id);
    }
  } catch (error) {
    console.error('重新排序失敗:', error);
  }
}

/**
 * 取得用戶的上傳佇列
 */
async function getUploadQueue(userId) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('upload_queue')
      .select('*')
      .eq('user_id', userId)
      .order('queue_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('取得上傳佇列失敗:', error);
    return [];
  }
}

/**
 * 清空用戶的上傳佇列
 */
async function clearUploadQueue(userId) {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('upload_queue')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('清空上傳佇列失敗:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 檢查貼圖是否在上傳佇列中
 */
async function isInUploadQueue(userId, stickerId) {
  try {
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('upload_queue')
      .select('id')
      .eq('user_id', userId)
      .eq('sticker_id', stickerId)
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * 記錄代幣交易
 */
async function recordTokenTransaction(userId, amount, balanceAfter, type, description, referenceId = null, adminNote = null) {
  try {
    const { error } = await getSupabaseClient()
      .from('token_transactions')
      .insert([{
        user_id: userId,
        amount,
        balance_after: balanceAfter,
        transaction_type: type,
        description,
        reference_id: referenceId,
        admin_note: adminNote
      }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('記錄代幣交易失敗:', error);
    return false;
  }
}

/**
 * 取得用戶代幣餘額
 */
async function getUserTokenBalance(lineUserId) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('sticker_credits')
      .eq('line_user_id', lineUserId)
      .single();

    if (error) throw error;
    return data?.sticker_credits || 0;
  } catch (error) {
    console.error('取得代幣餘額失敗:', error);
    return 0;
  }
}

/**
 * 檢查並扣除代幣（生成貼圖用）
 * @param {string} lineUserId - LINE 用戶 ID
 * @param {number} amount - 要扣除的數量
 * @param {string} description - 描述
 * @param {string} referenceId - 關聯 ID（如貼圖組 ID）
 * @returns {object} { success: boolean, balance: number, error?: string }
 */
async function deductTokens(lineUserId, amount, description, referenceId = null) {
  try {
    const supabase = getSupabaseClient();

    // 取得當前餘額
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('sticker_credits')
      .eq('line_user_id', lineUserId)
      .single();

    if (userError) throw userError;

    const currentBalance = user?.sticker_credits || 0;

    // 檢查是否足夠
    if (currentBalance < amount) {
      return {
        success: false,
        balance: currentBalance,
        error: `代幣不足！目前餘額 ${currentBalance}，需要 ${amount} 代幣`
      };
    }

    const newBalance = currentBalance - amount;

    // 扣除代幣
    const { error: updateError } = await supabase
      .from('users')
      .update({ sticker_credits: newBalance, updated_at: new Date().toISOString() })
      .eq('line_user_id', lineUserId);

    if (updateError) throw updateError;

    // 記錄交易
    await recordTokenTransaction(lineUserId, -amount, newBalance, 'generate', description, referenceId);

    return { success: true, balance: newBalance };
  } catch (error) {
    console.error('扣除代幣失敗:', error);
    return { success: false, balance: 0, error: error.message };
  }
}

/**
 * 增加代幣（購買/管理員調整用）
 */
async function addTokens(lineUserId, amount, type, description, adminNote = null) {
  try {
    const supabase = getSupabaseClient();

    // 取得當前餘額
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('sticker_credits')
      .eq('line_user_id', lineUserId)
      .single();

    if (userError) throw userError;

    const currentBalance = user?.sticker_credits || 0;
    const newBalance = currentBalance + amount;

    // 增加代幣
    const { error: updateError } = await supabase
      .from('users')
      .update({ sticker_credits: newBalance, updated_at: new Date().toISOString() })
      .eq('line_user_id', lineUserId);

    if (updateError) throw updateError;

    // 記錄交易
    await recordTokenTransaction(lineUserId, amount, newBalance, type, description, null, adminNote);

    return { success: true, balance: newBalance };
  } catch (error) {
    console.error('增加代幣失敗:', error);
    return { success: false, balance: 0, error: error.message };
  }
}

/**
 * 取得用戶代幣交易記錄
 */
async function getTokenTransactions(lineUserId, limit = 20) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('token_transactions')
      .select('*')
      .eq('user_id', lineUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('取得代幣交易記錄失敗:', error);
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
  getStickerImages,
  deleteStickerSet,
  getUserLatestTask,
  getUserPendingTasks,
  // 上傳佇列
  addToUploadQueue,
  removeFromUploadQueue,
  getUploadQueue,
  clearUploadQueue,
  isInUploadQueue,
  // 代幣系統
  recordTokenTransaction,
  getUserTokenBalance,
  deductTokens,
  addTokens,
  getTokenTransactions
};

