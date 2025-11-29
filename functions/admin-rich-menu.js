/**
 * Rich Menu Admin API - 貼圖大亨
 * 提供 Rich Menu 管理的 API 端點
 */

const { createRichMenu, uploadRichMenuImage, setDefaultRichMenu, deleteRichMenu, listRichMenus } = require('./rich-menu-manager');

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
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          richMenuId: currentMenu?.richMenuId || null,
          menuName: currentMenu?.name || null,
          totalMenus: menus.length
        })
      };
    }

    // POST /api/admin/update-rich-menu - 更新 Rich Menu 圖片
    if (event.httpMethod === 'POST' && path.includes('update-rich-menu')) {
      // 解析 multipart form data
      const contentType = event.headers['content-type'] || event.headers['Content-Type'];
      
      if (!contentType || !contentType.includes('multipart/form-data')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '請使用 multipart/form-data 格式上傳' })
        };
      }

      // 解析 boundary
      const boundary = contentType.split('boundary=')[1];
      const body = event.isBase64Encoded 
        ? Buffer.from(event.body, 'base64') 
        : Buffer.from(event.body);

      // 簡易解析 multipart（實際應用建議用 busboy 等庫）
      const parts = body.toString('binary').split('--' + boundary);
      let imageBuffer = null;

      for (const part of parts) {
        if (part.includes('filename=') && part.includes('image')) {
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            const imageData = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'));
            imageBuffer = Buffer.from(imageData, 'binary');
          }
        }
      }

      if (!imageBuffer) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '未找到圖片檔案' })
        };
      }

      // 步驟 1: 取得現有 Rich Menu
      const menus = await listRichMenus();
      const oldMenu = menus.find(m => m.name === '貼圖大亨主選單');

      // 步驟 2: 創建新的 Rich Menu
      const newMenuId = await createRichMenu();

      // 步驟 3: 上傳新圖片
      await uploadRichMenuImage(newMenuId, imageBuffer);

      // 步驟 4: 設為預設
      await setDefaultRichMenu(newMenuId);

      // 步驟 5: 刪除舊的 Rich Menu
      if (oldMenu) {
        await deleteRichMenu(oldMenu.richMenuId);
      }

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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};

