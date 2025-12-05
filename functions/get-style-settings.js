/**
 * 取得風格設定 API
 * 從資料庫讀取風格、構圖、裝飾風格設定
 */

const { getSupabaseClient } = require('./supabase-client');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const supabase = getSupabaseClient();
    const { type } = event.queryStringParameters || {};

    if (type === 'styles') {
      // 取得風格設定
      const { data, error } = await supabase
        .from('style_settings')
        .select('*')
        .eq('is_active', true)
        .order('style_id');

      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data })
      };

    } else if (type === 'framing') {
      // 取得構圖設定
      const { data, error } = await supabase
        .from('framing_settings')
        .select('*')
        .eq('is_active', true)
        .order('framing_id');

      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data })
      };

    } else if (type === 'scenes') {
      // 取得裝飾風格設定
      const { data, error } = await supabase
        .from('scene_settings')
        .select('*')
        .eq('is_active', true)
        .order('scene_id');

      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data })
      };

    } else if (type === 'all') {
      // 取得所有設定
      const [stylesResult, framingResult, scenesResult] = await Promise.all([
        supabase.from('style_settings').select('*').eq('is_active', true).order('style_id'),
        supabase.from('framing_settings').select('*').eq('is_active', true).order('framing_id'),
        supabase.from('scene_settings').select('*').eq('is_active', true).order('scene_id')
      ]);

      if (stylesResult.error) throw stylesResult.error;
      if (framingResult.error) throw framingResult.error;
      if (scenesResult.error) throw scenesResult.error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            styles: stylesResult.data,
            framing: framingResult.data,
            scenes: scenesResult.data
          }
        })
      };

    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid type parameter. Use: styles, framing, scenes, or all'
        })
      };
    }

  } catch (error) {
    console.error('取得風格設定失敗:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

