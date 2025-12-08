/**
 * 管理員 - 上架申請管理 API
 */

const { getSupabaseClient } = require('./supabase-client');
const archiver = require('archiver');
const https = require('https');
const http = require('http');

const supabase = getSupabaseClient();

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

          // 檢查是否已有緩存 ZIP
          if (application.zip_cache_url) {
            console.log(`✅ 使用緩存的 ZIP: ${application.zip_cache_url}`);
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                downloadUrl: application.zip_cache_url
              })
            };
          }

          // 生成 ZIP 檔案
          const zipBuffer = await generateApplicationZip(application, stickers);

          // 上傳 ZIP 到 Storage 以實現快速下載
          const zipUrl = await uploadZipToStorage(applicationId, zipBuffer);

          // 更新資料庫，記錄 ZIP 快取
          await supabase
            .from('listing_applications')
            .update({ zip_cache_url: zipUrl })
            .eq('application_id', applicationId);

          // 返回下載連結給前端
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              downloadUrl: zipUrl
            })
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
 * 上傳 ZIP 到 Supabase Storage
 */
async function uploadZipToStorage(applicationId, zipBuffer) {
  const bucket = 'listing-zips';
  const zipPath = `${applicationId}/${applicationId}_stickers.zip`;

  try {
    console.log(`📤 上傳 ZIP 到 Storage: ${zipPath}，大小: ${(zipBuffer.length / 1024).toFixed(2)} KB`);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(zipPath, zipBuffer, {
        contentType: 'application/zip',
        upsert: true
      });

    if (error) throw error;

    // 取得公開下載連結
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(zipPath);

    console.log(`✅ ZIP 已上傳：${data.publicUrl}`);
    return data.publicUrl;
  } catch (error) {
    console.error('❌ 上傳 ZIP 失敗:', error);
    throw error;
  }
}

/**
 * 下載圖片 Buffer（支援重定向和超時）
 */
function downloadImage(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      timeout: 30000 // 30 秒超時
    }, (response) => {
      // 處理重定向
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        if (maxRedirects > 0) {
          console.log(`🔄 重定向到: ${response.headers.location}`);
          return downloadImage(response.headers.location, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
        } else {
          return reject(new Error('重定向次數過多'));
        }
      }

      // 檢查狀態碼
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}: ${url}`));
      }

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        if (chunks.length === 0) {
          return reject(new Error('下載的圖片為空'));
        }
        resolve(Buffer.concat(chunks));
      });
      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('下載超時'));
    });
  });
}

/**
 * 生成申請貼圖的 ZIP 檔案
 */
async function generateApplicationZip(application, stickers) {
  console.log(`📦 開始打包申請 ${application.application_id}，共 ${stickers.length} 張貼圖`);

  return new Promise(async (resolve, reject) => {
    const chunks = [];
    // 使用壓縮等級 5：兼顧速度和大小
    const archive = archiver('zip', { zlib: { level: 5 } });

    // 監聽錯誤
    archive.on('error', (err) => {
      console.error('❌ Archive 錯誤:', err);
      reject(err);
    });

    // 監聽警告
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️ Archive 警告:', err);
      } else {
        reject(err);
      }
    });

    // 收集數據
    archive.on('data', chunk => chunks.push(chunk));

    // 完成時返回
    archive.on('end', () => {
      const zipBuffer = Buffer.concat(chunks);
      console.log(`✅ ZIP 打包完成，大小: ${(zipBuffer.length / 1024).toFixed(2)} KB`);
      resolve(zipBuffer);
    });

    try {
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
          console.log(`📥 下載封面圖片: ${application.cover_url}`);
          const coverBuffer = await downloadImage(application.cover_url);
          archive.append(coverBuffer, { name: 'cover.png' });
          console.log('✅ 已加入封面圖片');
        } catch (err) {
          console.warn('⚠️ 無法下載封面圖片:', err.message);
        }
      }

      // 添加所有貼圖（限制最多 40 張以避免超時）
      let successCount = 0;
      let failCount = 0;
      const maxStickers = Math.min(stickers.length, 40);

      if (stickers.length > 40) {
        console.warn(`⚠️ 貼圖數量過多 (${stickers.length})，僅處理前 40 張`);
      }

      for (let i = 0; i < maxStickers; i++) {
        const sticker = stickers[i];
        try {
          console.log(`📥 下載貼圖 ${i + 1}/${maxStickers}: ${sticker.url}`);
          const stickerBuffer = await downloadImage(sticker.url);
          const filename = `sticker_${String(i + 1).padStart(2, '0')}.png`;
          archive.append(stickerBuffer, { name: filename });
          console.log(`✅ 已加入：${filename}`);
          successCount++;
        } catch (err) {
          console.error(`❌ 無法下載貼圖 ${i + 1}:`, err.message);
          failCount++;
        }
      }

      console.log(`📊 下載統計: 成功 ${successCount}/${maxStickers}，失敗 ${failCount}`);

      if (successCount === 0) {
        throw new Error('所有貼圖下載失敗，無法生成壓縮包');
      }

      // 完成打包
      await archive.finalize();
      console.log('🔄 等待 ZIP 完成...');

    } catch (err) {
      console.error('❌ 打包過程錯誤:', err);
      reject(err);
    }
  });
}

