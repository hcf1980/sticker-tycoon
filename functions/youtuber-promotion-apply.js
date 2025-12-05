/**
 * YouTuber 推廣計畫申請 API
 * 處理 YouTuber 推廣申請表單提交
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// 初始化 Supabase
let supabase = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('缺少 Supabase 環境變數');
    }

    supabase = createClient(url, key);
  }
  return supabase;
}

exports.handler = async (event, context) => {
  // 設置 CORS 頭
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // 處理 OPTIONS 請求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // 只允許 POST 請求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: '只允許 POST 請求' })
    };
  }

  try {
    const data = JSON.parse(event.body);

    // 驗證必填欄位
    const requiredFields = [
      'channelName', 'channelUrl', 'subscriberCount', 'email',
      'lineId', 'channelType', 'channelDescription', 'filmingPlan'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: `缺少必填欄位: ${field}` })
        };
      }
    }

    // 驗證訂閱數
    if (parseInt(data.subscriberCount) < 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '訂閱數必須達到 1000+' })
      };
    }

    // 驗證 Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Email 格式不正確' })
      };
    }

    const sb = getSupabase();

    // 檢查是否已申請過
    const { data: existing, error: checkError } = await sb
      .from('youtuber_promotions')
      .select('id')
      .eq('line_id', data.lineId)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ 檢查申請時出錯:', checkError);
      throw checkError;
    }

    if (existing) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ message: '您已有一個待審核的申請，請稍候' })
      };
    }

    // 插入申請記錄
    const applicationId = uuidv4();
    const { error: insertError } = await sb
      .from('youtuber_promotions')
      .insert([{
        application_id: applicationId,
        channel_name: data.channelName,
        channel_url: data.channelUrl,
        subscriber_count: parseInt(data.subscriberCount),
        email: data.email,
        phone: data.phone || null,
        line_id: data.lineId,
        channel_type: data.channelType,
        channel_description: data.channelDescription,
        filming_plan: data.filmingPlan,
        status: 'pending'
      }]);

    if (insertError) {
      console.error('❌ 資料庫錯誤:', insertError);
      // 如果是表不存在的錯誤
      if (insertError.code === 'PGRST116') {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            message: '系統尚未初始化，請聯絡管理員',
            error: 'TABLE_NOT_FOUND'
          })
        };
      }
      throw insertError;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: '✅ 申請成功！我們會在 1-3 個工作天內審核你的申請',
        applicationId
      })
    };

  } catch (error) {
    console.error('❌ 伺服器錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: '發生錯誤，請稍後重試',
        error: error.message
      })
    };
  }
};

