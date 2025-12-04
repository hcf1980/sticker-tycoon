/**
 * 管理員 - 上架申請管理 API
 */

const { getSupabaseClient } = require('./supabase-client');
const archiver = require('archiver');
const https = require('https');
const http = require('http');

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

      if (action === 'downloadPack') {
        if (!applicationId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: '缺少申請編號' })
          };
        }

        try {
          // 取得申請詳情
          const { data: application, error: appError } = await supabase
            .from('listing_applications')
            .select('*')
            .eq('application_id', applicationId)
            .single();

          if (appError || !application) {
            throw new Error('找不到申請記錄');
          }

          // 解析貼圖 URLs
          const stickers = JSON.parse(application.sticker_urls || '[]');
          if (stickers.length === 0) {
            throw new Error('沒有貼圖可下載');
          }

          // 生成 ZIP 檔案
          const zipBuffer = await generateApplicationZip(application, stickers);

          // 返回 base64 編碼的 ZIP 檔案供前端下載
          return {
            statusCode: 200,
            headers: {
              ...headers,
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${application.application_id}_stickers.zip"`
            },
            body: zipBuffer.toString('base64'),
            isBase64Encoded: true
          };
        } catch (err) {
          console.error('❌ 下載貼圖包失敗:', err);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: err.message || '生成下載檔案失敗' })
          };
        }
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

/**
 * 下載圖片 Buffer
 */
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * 生成申請貼圖的 ZIP 檔案
 */
async function generateApplicationZip(application, stickers) {
  const chunks = [];
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('data', chunk => chunks.push(chunk));

  // 添加 README
  const readme = `貼圖大亨 - 申請貼圖包
========================

申請編號：${application.application_id}
英文名稱：${application.name_en}
中文名稱：${application.name_zh || 'N/A'}
售價：NT$${application.price}
申請時間：${new Date(application.created_at).toLocaleString('zh-TW')}
用戶 ID：${application.user_id}

貼圖數量：${stickers.length} 張

檔案說明
--------
- cover.png：封面圖片
- sticker_01.png ~ sticker_XX.png：貼圖圖片

注意事項
--------
- 所有貼圖已由用戶提交
- 請檢查貼圖品質和內容合規性
- 審核通過後可提交至 LINE Creators Market

感謝使用貼圖大亨！
`;
  archive.append(readme, { name: 'README.txt' });

  // 添加封面圖片
  if (application.cover_url) {
    try {
      const coverBuffer = await downloadImage(application.cover_url);
      archive.append(coverBuffer, { name: 'cover.png' });
      console.log('✅ 已加入封面圖片');
    } catch (err) {
      console.warn('⚠️ 無法下載封面圖片:', err.message);
    }
  }

  // 添加所有貼圖
  for (let i = 0; i < stickers.length; i++) {
    const sticker = stickers[i];
    try {
      const stickerBuffer = await downloadImage(sticker.url);
      const filename = `sticker_${String(i + 1).padStart(2, '0')}.png`;
      archive.append(stickerBuffer, { name: filename });
      console.log(`✅ 已加入：${filename}`);
    } catch (err) {
      console.warn(`⚠️ 無法下載貼圖 ${i + 1}:`, err.message);
    }
  }

  await archive.finalize();
  return Buffer.concat(chunks);
}

