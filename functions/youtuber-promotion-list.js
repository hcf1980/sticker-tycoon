/**
 * YouTuber 推廣計畫 - 獲取申請列表 API
 * 管理員查看所有申請
 */

const { createClient } = require('@supabase/supabase-js');

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
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: '只允許 GET 請求' })
    };
  }

  try {
    const sb = getSupabase();
    const status = event.queryStringParameters?.status;

    let query = sb
      .from('youtuber_promotions')
      .select('*')
      .order('created_at', { ascending: false });

    // 如果指定狀態，進行篩選
    if (status) {
      query = query.eq('status', status);
    }

    const { data: applications, error } = await query;

    if (error) {
      console.error('❌ 查詢失敗:', error);
      throw error;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        applications: applications || []
      })
    };

  } catch (error) {
    console.error('❌ 伺服器錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: '查詢失敗',
        error: error.message
      })
    };
  }
};

