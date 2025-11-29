/**
 * 管理員 - 上架申請管理 API
 */

const { getSupabaseClient } = require('./supabase-client');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const supabase = getSupabaseClient();

    // GET 請求 - 取得列表
    if (event.httpMethod === 'GET') {
      const action = event.queryStringParameters?.action || 'list';

      if (action === 'list') {
        const { data, error } = await supabase
          .from('listing_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, applications: data || [] })
        };
      }

      if (action === 'stats') {
        const { data, error } = await supabase
          .from('listing_applications')
          .select('status');

        if (error) throw error;

        const stats = { pending: 0, processing: 0, submitted: 0, approved: 0, rejected: 0, total: 0 };
        (data || []).forEach(item => {
          if (stats[item.status] !== undefined) stats[item.status]++;
          stats.total++;
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, stats })
        };
      }
    }

    // POST 請求 - 更新狀態
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action, applicationId, status, lineStickerUrl, adminNotes } = body;

      if (action === 'updateStatus') {
        if (!applicationId || !status) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: '缺少必要參數' })
          };
        }

        const updateData = {
          status,
          updated_at: new Date().toISOString()
        };

        // 根據狀態添加時間戳
        if (status === 'submitted') {
          updateData.submitted_at = new Date().toISOString();
        }
        if (status === 'approved') {
          updateData.approved_at = new Date().toISOString();
          if (lineStickerUrl) updateData.line_sticker_id = lineStickerUrl;
        }
        if (adminNotes) {
          updateData.admin_notes = adminNotes;
        }

        const { error } = await supabase
          .from('listing_applications')
          .update(updateData)
          .eq('application_id', applicationId);

        if (error) throw error;

        // TODO: 發送 LINE 通知給用戶（狀態更新）

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: '狀態已更新' })
        };
      }

      if (action === 'delete') {
        if (!applicationId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: '缺少申請編號' })
          };
        }

        const { error } = await supabase
          .from('listing_applications')
          .delete()
          .eq('application_id', applicationId);

        if (error) throw error;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: '已刪除' })
        };
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: '無效的操作' })
    };

  } catch (error) {
    console.error('❌ Admin listing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || '系統錯誤' })
    };
  }
};

