const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};

    // 查詢單個貼圖組詳情
    if (params.setId) {
      const { data: set, error: setError } = await supabase
        .from('sticker_sets')
        .select('*')
        .eq('set_id', params.setId)
        .single();

      if (setError) throw setError;

      // 獲取該組的所有貼圖
      const { data: images, error: imagesError } = await supabase
        .from('stickers')
        .select('*')
        .eq('set_id', params.setId)
        .order('index_number', { ascending: true });

      if (imagesError) throw imagesError;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ set, images: images || [] })
      };
    }

    // 查詢貼圖組列表
    const page = parseInt(params.page) || 1;
    const perPage = 12;
    const offset = (page - 1) * perPage;

    let query = supabase
      .from('sticker_sets')
      .select('*', { count: 'exact' });

    // 篩選條件
    if (params.style && params.style !== '') {
      query = query.eq('style', params.style);
    }

    if (params.status === 'completed') {
      query = query.eq('status', 'completed');
    }

    // 排序
    if (params.sort === 'created_asc') {
      query = query.order('created_at', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + perPage - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // 為每個 set 獲取主圖
    const setsWithImages = await Promise.all((data || []).map(async (set) => {
      const { data: images } = await supabase
        .from('stickers')
        .select('image_url')
        .eq('set_id', set.set_id)
        .order('index_number', { ascending: true })
        .limit(1);

      return {
        ...set,
        main_image_url: images && images[0] ? images[0].image_url : null
      };
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sets: setsWithImages,
        total: count || 0,
        page,
        perPage
      })
    };

  } catch (error) {
    console.error('Admin stickers error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

