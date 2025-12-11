/**
 * Rich Menu Admin API - 貼圖大亨
 * 提供 Rich Menu 管理的 API 端點
 */

const { createRichMenu, uploadRichMenuImage, setDefaultRichMenu, deleteRichMenu, listRichMenus } = require('./rich-menu-manager');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // 處理 CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path = event.path;

  try {
    // GET /api/admin/rich-menu-info - 取得當前 Rich Menu 資訊
    if (event.httpMethod === 'GET' && path.includes('rich-menu-info')) {
      const menus = await listRichMenus();
      const currentMenu = menus.find(m => m.name === '貼圖大亨主選單');

      // 取得儲存在 Supabase 的 Rich Menu 圖片 URL（可選功能）
      let imageUrl = null;
      try {
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
          const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
          );
          const { data: publicUrl } = supabase.storage
            .from('stickers')
            .getPublicUrl('rich-menu/current.jpg');
          imageUrl = publicUrl?.publicUrl || null;
        }
      } catch (supabaseErr) {
        console.warn('⚠️ 無法取得 Supabase 圖片 URL:', supabaseErr.message);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          richMenuId: currentMenu?.richMenuId || null,
          menuName: currentMenu?.name || null,
          totalMenus: menus.length,
          imageUrl: imageUrl
        })
      };
    }

    // POST /api/admin/update-rich-menu - 更新 Rich Menu 圖片
    if (event.httpMethod === 'POST' && path.includes('update-rich-menu')) {
      console.log('🔧 開始處理 Rich Menu 更新請求...');

      // 解析 multipart form data
      const contentType = event.headers['content-type'] || event.headers['Content-Type'];
      console.log('📋 Content-Type:', contentType);

      if (!contentType || !contentType.includes('multipart/form-data')) {
        console.error('❌ 錯誤的 Content-Type');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '請使用 multipart/form-data 格式上傳' })
        };
      }

      // 解析 boundary
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) {
        console.error('❌ 無法解析 boundary');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '無法解析 multipart boundary' })
        };
      }

      console.log('📦 Boundary:', boundary);

      const body = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : Buffer.from(event.body);

      console.log('📏 Body 大小:', body.length, 'bytes');

      // 簡易解析 multipart（實際應用建議用 busboy 等庫）
      const parts = body.toString('binary').split('--' + boundary);
      console.log('📦 Parts 數量:', parts.length);

      let imageBuffer = null;

      for (const part of parts) {
        if (part.includes('filename=') && part.includes('image')) {
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            const imageData = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'));
            imageBuffer = Buffer.from(imageData, 'binary');
            console.log('✅ 找到圖片，大小:', imageBuffer.length, 'bytes');
          }
        }
      }

      if (!imageBuffer) {
        console.error('❌ 未找到圖片檔案');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '未找到圖片檔案' })
        };
      }

      // 步驟 1: 取得現有 Rich Menu
      console.log('📋 步驟 1: 取得現有 Rich Menu...');
      const menus = await listRichMenus();
      const oldMenu = menus.find(m => m.name === '貼圖大亨主選單');
      console.log(`✅ 找到 ${menus.length} 個 Rich Menu${oldMenu ? '，包含舊選單' : ''}`);

      // 步驟 2: 創建新的 Rich Menu
      console.log('📋 步驟 2: 創建新的 Rich Menu...');
      const newMenuId = await createRichMenu();
      console.log(`✅ 新 Rich Menu ID: ${newMenuId}`);

      // 步驟 3: 上傳新圖片到 LINE
      console.log('📋 步驟 3: 上傳圖片到 LINE...');
      await uploadRichMenuImage(newMenuId, imageBuffer);
      console.log('✅ 圖片上傳完成');

      // 步驟 4: 設為預設
      console.log('📋 步驟 4: 設為預設 Rich Menu...');
      await setDefaultRichMenu(newMenuId);
      console.log('✅ 已設為預設');

      // 步驟 5: 刪除舊的 Rich Menu
      if (oldMenu) {
        console.log(`📋 步驟 5: 刪除舊 Rich Menu (${oldMenu.richMenuId})...`);
        await deleteRichMenu(oldMenu.richMenuId);
        console.log('✅ 舊選單已刪除');
      } else {
        console.log('ℹ️ 步驟 5: 沒有舊選單需要刪除');
      }

      // 步驟 6: 備份圖片到 Supabase Storage（供後台顯示，可選功能）
      console.log('📋 步驟 6: 備份圖片到 Supabase...');
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        try {
          const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
          );
          await supabase.storage
            .from('stickers')
            .upload('rich-menu/current.jpg', imageBuffer, {
              contentType: 'image/jpeg',
              upsert: true
            });
          console.log('✅ Rich Menu 圖片已備份到 Supabase');
        } catch (uploadErr) {
          console.warn('⚠️ 備份圖片失敗（不影響主要功能）:', uploadErr.message);
        }
      } else {
        console.log('ℹ️ 跳過 Supabase 備份（環境變數未設置）');
      }

      console.log('🎉 Rich Menu 更新流程完成！');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Rich Menu 更新成功',
          newRichMenuId: newMenuId,
          deletedMenuId: oldMenu?.richMenuId || null
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: '找不到 API 端點' })
    };

  } catch (error) {
    console.error('❌ Admin Rich Menu API 錯誤:', error);

    // 提取詳細錯誤訊息
    let errorMessage = error.message || '未知錯誤';

    // 如果是 axios 錯誤，提取更多資訊
    if (error.response) {
      const lineError = error.response.data;
      if (lineError && lineError.message) {
        errorMessage = `LINE API 錯誤: ${lineError.message}`;
      } else {
        errorMessage = `HTTP ${error.response.status}: ${JSON.stringify(lineError)}`;
      }
    }

    console.error('📋 詳細錯誤:', errorMessage);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        details: error.response?.data || null
      })
    };
  }
};

