/**
 * 統一用戶服務
 * 支援 LINE 用戶和 Web 用戶，共用資料庫
 */

const { getSupabaseClient } = require('../supabase-client');

/**
 * 用戶類型
 */
const UserType = {
  LINE: 'line',
  WEB: 'web'
};

/**
 * 根據統一 ID 取得用戶
 * @param {string} unifiedUserId - 統一用戶 ID (可以是 line_user_id 或 auth_user_id)
 * @param {string} userType - 用戶類型 ('line' | 'web')
 */
async function getUserByUnifiedId(unifiedUserId, userType = null) {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('users').select('*');

    if (userType === UserType.LINE) {
      query = query.eq('line_user_id', unifiedUserId);
    } else if (userType === UserType.WEB) {
      query = query.eq('auth_user_id', unifiedUserId);
    } else {
      // 嘗試兩種方式查詢
      const { data: lineUser } = await supabase
        .from('users')
        .select('*')
        .eq('line_user_id', unifiedUserId)
        .single();
      
      if (lineUser) {return lineUser;}

      const { data: webUser } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', unifiedUserId)
        .single();
      
      return webUser || null;
    }

    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') {throw error;}
    return data || null;
  } catch (error) {
    console.error('取得用戶失敗:', error);
    return null;
  }
}

/**
 * 根據 Email 取得用戶
 */
async function getUserByEmail(email) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    // PGRST116 = 沒找到記錄（正常）
    // 42703 = 欄位不存在（需要執行資料庫遷移）
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 正常：沒找到用戶
      }
      if (error.code === '42703' || (error.message && error.message.includes('does not exist'))) {
        console.error('❌ 資料庫欄位 email 不存在，請執行資料庫遷移');
        throw new Error('資料庫尚未更新，請執行遷移腳本');
      }
      throw error;
    }
    return data || null;
  } catch (error) {
    console.error('根據 Email 取得用戶失敗:', error);
    throw error; // 將錯誤向上拋出，讓調用者處理
  }
}

/**
 * 創建 Web 用戶（使用 Supabase Auth）
 * @param {string} authUserId - Supabase Auth 用戶 ID
 * @param {string} email - Email
 * @param {string} displayName - 顯示名稱
 */
async function createWebUser(authUserId, email, displayName = null) {
  try {
    const supabase = getSupabaseClient();
    
    // 生成推薦碼
    const referralCode = generateReferralCode();
    
    // 計算到期時間（30 天後）
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newUser = {
      auth_user_id: authUserId,
      email: email.toLowerCase(),
      display_name: displayName || email.split('@')[0],
      user_type: UserType.WEB,
      sticker_credits: 40,  // 初始 40 張數
      referral_code: referralCode,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    const { data, error } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) {
      // 檢查是否為欄位不存在的錯誤
      if (error.code === '42703' || (error.message && error.message.includes('does not exist'))) {
        console.error('❌ 資料庫缺少必要欄位 (auth_user_id/email/user_type)');
        console.error('請執行以下 SQL 遷移：');
        console.error('ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;');
        console.error('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;');
        console.error('ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(10) DEFAULT \'line\';');
        throw new Error('資料庫尚未更新，請執行遷移腳本添加 auth_user_id, email, user_type 欄位');
      }
      throw error;
    }

    // 記錄初始張數到 token_ledger
    if (data) {
      await supabase
        .from('token_ledger')
        .insert([{
          user_id: data.auth_user_id,  // Web 用戶使用 auth_user_id
          tokens: 40,
          remaining_tokens: 40,
          source_type: 'initial',
          source_description: '新用戶註冊贈送',
          acquired_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_expired: false
        }]);

      // 記錄交易
      await supabase
        .from('token_transactions')
        .insert([{
          user_id: data.auth_user_id,
          amount: 40,
          balance_after: 40,
          transaction_type: 'initial',
          description: '新用戶贈送 40 張數',
          expires_at: expiresAt.toISOString()
        }]);
    }

    console.log(`✅ Web 用戶創建成功: ${email}`);
    return data;
  } catch (error) {
    console.error('創建 Web 用戶失敗:', error);
    throw error;
  }
}

/**
 * 綁定 LINE 帳號到現有 Web 用戶
 * @param {string} authUserId - Web 用戶的 auth_user_id
 * @param {string} lineUserId - LINE 用戶 ID
 */
async function bindLineAccount(authUserId, lineUserId) {
  try {
    const supabase = getSupabaseClient();

    // 1. 檢查 LINE 帳號是否已被其他用戶綁定
    const { data: existingLineUser } = await supabase
      .from('users')
      .select('*')
      .eq('line_user_id', lineUserId)
      .single();

    if (existingLineUser) {
      // LINE 帳號已存在，需要合併
      return await mergeUsers(authUserId, existingLineUser);
    }

    // 2. LINE 帳號未被使用，直接綁定
    const { data, error } = await supabase
      .from('users')
      .update({
        line_user_id: lineUserId,
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', authUserId)
      .select()
      .single();

    if (error) {throw error;}

    console.log(`✅ LINE 帳號綁定成功: ${lineUserId} -> ${authUserId}`);
    return { success: true, user: data, merged: false };
  } catch (error) {
    console.error('綁定 LINE 帳號失敗:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 合併用戶資料（將 LINE 用戶資料合併到 Web 用戶）
 * @param {string} webAuthUserId - Web 用戶的 auth_user_id
 * @param {object} lineUser - LINE 用戶資料
 */
async function mergeUsers(webAuthUserId, lineUser) {
  try {
    const supabase = getSupabaseClient();

    // 1. 取得 Web 用戶
    const { data: webUser, error: webError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', webAuthUserId)
      .single();

    if (webError) {throw webError;}

    // 2. 合併張數餘額
    const mergedCredits = (webUser.sticker_credits || 0) + (lineUser.sticker_credits || 0);

    // 3. 合併推薦次數
    const mergedReferralCount = (webUser.referral_count || 0) + (lineUser.referral_count || 0);

    // 4. 更新 Web 用戶（加入 LINE 資料）
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        line_user_id: lineUser.line_user_id,
        sticker_credits: mergedCredits,
        referral_count: mergedReferralCount,
        picture_url: lineUser.picture_url || webUser.picture_url,
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', webAuthUserId)
      .select()
      .single();

    if (updateError) {throw updateError;}

    // 5. 轉移 LINE 用戶的貼圖組到 Web 用戶
    await supabase
      .from('sticker_sets')
      .update({ user_id: webAuthUserId })
      .eq('user_id', lineUser.line_user_id);

    // 6. 轉移張數帳本
    await supabase
      .from('token_ledger')
      .update({ user_id: webAuthUserId })
      .eq('user_id', lineUser.line_user_id);

    // 7. 轉移交易記錄
    await supabase
      .from('token_transactions')
      .update({ user_id: webAuthUserId })
      .eq('user_id', lineUser.line_user_id);

    // 8. 轉移上傳佇列
    await supabase
      .from('upload_queue')
      .update({ user_id: webAuthUserId })
      .eq('user_id', lineUser.line_user_id);

    // 9. 轉移對話狀態
    await supabase
      .from('conversation_states')
      .update({ user_id: webAuthUserId })
      .eq('user_id', lineUser.line_user_id);

    // 10. 刪除舊的 LINE 用戶記錄
    await supabase
      .from('users')
      .delete()
      .eq('id', lineUser.id);

    console.log(`✅ 用戶合併成功: LINE ${lineUser.line_user_id} -> Web ${webAuthUserId}`);
    console.log(`   張數: ${webUser.sticker_credits} + ${lineUser.sticker_credits} = ${mergedCredits}`);

    return {
      success: true,
      user: updatedUser,
      merged: true,
      mergedCredits
    };
  } catch (error) {
    console.error('合併用戶失敗:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 取得用戶的統一 ID（用於資料庫操作）
 * Web 用戶返回 auth_user_id，LINE 用戶返回 line_user_id
 */
function getUnifiedUserId(user) {
  if (!user) {return null;}
  return user.auth_user_id || user.line_user_id;
}

/**
 * 檢查用戶是否已綁定 LINE
 */
function isLineBound(user) {
  return user && !!user.line_user_id;
}

/**
 * 檢查用戶是否為 Web 用戶
 */
function isWebUser(user) {
  return user && user.user_type === UserType.WEB;
}

/**
 * 生成 6 位推薦碼
 */
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 取得用戶張數餘額（統一接口）
 */
async function getUserTokenBalance(userId) {
  try {
    const supabase = getSupabaseClient();
    
    // 嘗試用 auth_user_id 查詢
    let { data } = await supabase
      .from('users')
      .select('sticker_credits')
      .eq('auth_user_id', userId)
      .single();

    // 如果沒找到，嘗試用 line_user_id
    if (!data) {
      const result = await supabase
        .from('users')
        .select('sticker_credits')
        .eq('line_user_id', userId)
        .single();
      data = result.data;
    }

    return data?.sticker_credits || 0;
  } catch (error) {
    console.error('取得張數餘額失敗:', error);
    return 0;
  }
}

/**
 * 扣除張數（統一接口，支援 FIFO）
 */
async function deductUserTokens(userId, amount, description, referenceId = null) {
  try {
    const supabase = getSupabaseClient();

    // 1. 查詢所有可用張數（FIFO）
    const { data: availableLedgers, error: ledgerError } = await supabase
      .from('token_ledger')
      .select('*')
      .eq('user_id', userId)
      .gt('remaining_tokens', 0)
      .eq('is_expired', false)
      .order('expires_at', { ascending: true });

    if (ledgerError) {throw ledgerError;}

    const totalAvailable = availableLedgers?.reduce(
      (sum, l) => sum + l.remaining_tokens, 0
    ) || 0;

    if (totalAvailable < amount) {
      return {
        success: false,
        balance: totalAvailable,
        error: `張數不足！目前餘額 ${totalAvailable}，需要 ${amount} 張數`
      };
    }

    // 2. FIFO 扣除
    let remaining = amount;
    for (const ledger of availableLedgers) {
      if (remaining <= 0) {break;}

      const deduct = Math.min(ledger.remaining_tokens, remaining);
      await supabase
        .from('token_ledger')
        .update({
          remaining_tokens: ledger.remaining_tokens - deduct,
          updated_at: new Date().toISOString()
        })
        .eq('id', ledger.id);

      remaining -= deduct;
    }

    // 3. 更新用戶總餘額
    const newBalance = totalAvailable - amount;
    
    // 嘗試更新 auth_user_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ sticker_credits: newBalance, updated_at: new Date().toISOString() })
      .eq('auth_user_id', userId);

    // 如果失敗，嘗試 line_user_id
    if (updateError) {
      await supabase
        .from('users')
        .update({ sticker_credits: newBalance, updated_at: new Date().toISOString() })
        .eq('line_user_id', userId);
    }

    // 4. 記錄交易
    await supabase
      .from('token_transactions')
      .insert([{
        user_id: userId,
        amount: -amount,
        balance_after: newBalance,
        transaction_type: 'generate',
        description,
        reference_id: referenceId
      }]);

    return { success: true, balance: newBalance };
  } catch (error) {
    console.error('扣除張數失敗:', error);
    return { success: false, balance: 0, error: error.message };
  }
}

/**
 * 更新用戶資料
 */
async function updateUserProfile(userId, updates) {
  try {
    const supabase = getSupabaseClient();
    
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // 嘗試用 auth_user_id 更新
    let { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('auth_user_id', userId)
      .select()
      .single();

    // 如果失敗，嘗試 line_user_id
    if (error || !data) {
      const result = await supabase
        .from('users')
        .update(updateData)
        .eq('line_user_id', userId)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {throw error;}
    return { success: true, user: data };
  } catch (error) {
    console.error('更新用戶資料失敗:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  UserType,
  getUserByUnifiedId,
  getUserByEmail,
  createWebUser,
  bindLineAccount,
  mergeUsers,
  getUnifiedUserId,
  isLineBound,
  isWebUser,
  generateReferralCode,
  getUserTokenBalance,
  deductUserTokens,
  updateUserProfile
};

