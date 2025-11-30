const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const method = event.httpMethod;

    // GET - 獲取當前示範圖集
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('demo_gallery')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      // 將資料庫的蛇形命名轉換為駝峰命名（符合前端期望）
      const items = (data || []).map(item => ({
        url: item.url,
        style: item.style,
        styleName: item.style_name,
        character: item.character,
        scene: item.scene,
        expression: item.expression,
        setId: item.set_id,
        index: item.sticker_index,
        displayOrder: item.display_order
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ items })
      };
    }

    // POST - 更新示範圖集
    if (method === 'POST') {
      const { items } = JSON.parse(event.body || '{}');

      if (!Array.isArray(items)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '無效的資料格式' })
        };
      }

      // 刪除舊的
      await supabase.from('demo_gallery').delete().neq('id', 0);

      // 插入新的
      const newItems = items.map((item, index) => ({
        url: item.url,
        style: item.style,
        style_name: item.styleName,
        character: item.character,
        scene: item.scene,
        expression: item.expression,
        set_id: item.setId,
        sticker_index: item.index,
        display_order: index
      }));

      const { error: insertError } = await supabase
        .from('demo_gallery')
        .insert(newItems);

      if (insertError) throw insertError;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Demo gallery error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

