/**
 * Web API: LINE / Mini App / LIFF 登入（免帳密）
 *
 * 前端將 LINE 的 access token（Authorization: Bearer <token>）送來
 * 後端透過 LINE profile API 驗證 token 並取得 userId/profile
 *
 * 流程：
 * 1) 驗證 LINE access token（GET https://api.line.me/v2/profile）
 * 2) 依 line_user_id 查 users 表
 * 3) 若不存在：用 Supabase Admin API 建立一個 Auth 使用者（email 以 line-{userId}@... 假信箱），並在 users 表建立/更新資料
 * 4) 用 Auth API signInWithPassword 取得 session，回給前端沿用既有 auth.js
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { getUserByUnifiedId, createWebUser } = require('./services/user-service');
const { updateUserProfile } = require('./services/user-service');

function getSupabaseAuthClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 環境變數未設定');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function getSupabaseAdminClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase Admin 環境變數未設定：需要 SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function getOrigin(event) {
  const origin = event.headers.origin || event.headers.Origin;
  if (!origin) return null;

  const allowed = new Set(
    (process.env.WEB_ALLOWED_ORIGINS || 'http://localhost:8888,http://localhost:3000')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );

  return allowed.has(origin) ? origin : null;
}

async function getLineProfile(lineAccessToken) {
  const response = await axios.get('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${lineAccessToken}` },
    timeout: 10_000
  });

  return response.data;
}

function buildLineEmail(lineUserId) {
  // 只為了滿足 Supabase Auth 的 email 欄位需求（不會寄信/不需要確認）
  // 注意：網域可自行替換成你自己的，避免被誤判為真實 email
  return `line-${lineUserId}@sticker-tycoon.local`;
}

function buildLinePassword(lineUserId) {
  const AUTH_PASSWORD_PEPPER = process.env.AUTH_PASSWORD_PEPPER;
  if (!AUTH_PASSWORD_PEPPER) {
    throw new Error('缺少 AUTH_PASSWORD_PEPPER（請在環境變數設定一個隨機長字串）');
  }

  // 這不是用來讓使用者登入的密碼，只是用來交換 Supabase session。
  return `line:${lineUserId}:${AUTH_PASSWORD_PEPPER}`;
}

exports.handler = async (event) => {
  const preflight = require('./utils/cors').handleCorsPreflight(event, {
    allowMethods: 'POST, OPTIONS'
  });
  if (preflight) {
    return preflight;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...require('./utils/cors').buildCorsHeaders(event, {
      allowMethods: 'POST, OPTIONS'
    })
  };

  if (!headers['Access-Control-Allow-Origin']) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'CORS blocked' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '只支援 POST 方法' })
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '未提供 LINE access token' })
      };
    }

    const lineAccessToken = authHeader.replace('Bearer ', '');

    // 1) 驗證 token + 取 profile
    const profile = await getLineProfile(lineAccessToken);
    const lineUserId = profile.userId;

    if (!lineUserId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'LINE token 驗證失敗' })
      };
    }

    const displayName = profile.displayName || 'LINE User';
    const pictureUrl = profile.pictureUrl || null;

    // 2) 查 users（以 LINE userId）
    const existingLineUser = await getUserByUnifiedId(lineUserId, 'line');

    const email = buildLineEmail(lineUserId);
    const password = buildLinePassword(lineUserId);

    // 3) 確保 Supabase Auth 內有對應的 auth user
    // 這裡用 service role 走 admin.createUser
    const supabaseAdmin = getSupabaseAdminClient();
    let authUserId = existingLineUser?.auth_user_id || null;

    if (!authUserId) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          line_user_id: lineUserId
        }
      });

      if (createErr) {
        // 若 email 已存在（重試/舊資料），嘗試用 listUsers 找回
        const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        });

        if (listErr) {
          throw createErr;
        }

        const matched = listData.users?.find((u) => u.email === email);
        if (!matched) {
          throw createErr;
        }

        authUserId = matched.id;
      } else {
        authUserId = created.user?.id;
      }
    }

    if (!authUserId) {
      throw new Error('建立/取得 Supabase Auth 使用者失敗');
    }

    // 4) 確保 users 表有資料
    let user = await getUserByUnifiedId(authUserId, 'web');

    if (!user) {
      // 建立 web user（會給初始 40 張）
      user = await createWebUser(authUserId, email, displayName);
    }

    // 綁定 line_user_id + 更新頭像/名稱
    await updateUserProfile(authUserId, {
      line_user_id: lineUserId,
      display_name: displayName,
      picture_url: pictureUrl,
      user_type: 'web'
    });

    // 5) 用 email/password 換 session（anon key auth）
    const supabaseAuth = getSupabaseAuthClient();
    const { data: signInData, error: signInErr } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });

    if (signInErr || !signInData?.session || !signInData?.user) {
      console.error('LINE 登入 signIn 失敗:', signInErr);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '登入失敗，請稍後再試' })
      };
    }

    const freshUser = await getUserByUnifiedId(signInData.user.id, 'web');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'LINE 登入成功',
        user: freshUser
          ? {
              id: freshUser.id,
              authUserId: freshUser.auth_user_id,
              email: freshUser.email,
              displayName: freshUser.display_name,
              pictureUrl: freshUser.picture_url,
              credits: freshUser.sticker_credits,
              referralCode: freshUser.referral_code,
              lineUserId: freshUser.line_user_id,
              isLineBound: !!freshUser.line_user_id,
              userType: freshUser.user_type,
              createdAt: freshUser.created_at
            }
          : null,
        session: {
          accessToken: signInData.session.access_token,
          refreshToken: signInData.session.refresh_token,
          expiresAt: signInData.session.expires_at
        }
      })
    };
  } catch (error) {
    console.error('LINE 登入錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};
