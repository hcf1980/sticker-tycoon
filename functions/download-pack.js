/**
 * Download Pack Module
 * 將貼圖組打包成 ZIP 供下載
 */

const archiver = require('archiver');
const { supabase, getStickerSet } = require('./supabase-client');
const { downloadImage } = require('./image-processor');

/**
 * 生成 ZIP 檔案內容
 */
async function generateStickerZip(setId) {
  try {
    console.log(`📦 開始打包貼圖組：${setId}`);

    // 取得貼圖組資料
    const stickerSet = await getStickerSet(setId);
    if (!stickerSet) {
      throw new Error('找不到貼圖組');
    }

    if (stickerSet.status !== 'completed') {
      throw new Error('貼圖組尚未完成生成');
    }

    // 列出該貼圖組的所有圖片
    const bucket = 'sticker-images';
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(setId);

    if (error) throw error;

    if (!files || files.length === 0) {
      throw new Error('找不到貼圖圖片');
    }

    console.log(`📁 找到 ${files.length} 個檔案`);

    // 建立 ZIP
    const chunks = [];
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('data', chunk => chunks.push(chunk));
    
    // 加入 README
    const readme = generateReadme(stickerSet);
    archive.append(readme, { name: 'README.txt' });

    // 下載並加入每個圖片
    for (const file of files) {
      const filePath = `${setId}/${file.name}`;
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      
      try {
        const imageBuffer = await downloadImage(data.publicUrl);
        archive.append(imageBuffer, { name: file.name });
        console.log(`  ✅ 已加入：${file.name}`);
      } catch (err) {
        console.warn(`  ⚠️ 無法下載：${file.name}`);
      }
    }

    await archive.finalize();

    // 合併 chunks 成 Buffer
    const zipBuffer = Buffer.concat(chunks);
    console.log(`📦 ZIP 打包完成，大小：${(zipBuffer.length / 1024).toFixed(2)}KB`);

    return zipBuffer;

  } catch (error) {
    console.error('❌ 打包失敗:', error);
    throw error;
  }
}

/**
 * 生成 README 文字
 */
function generateReadme(stickerSet) {
  return `貼圖大亨 - LINE 貼圖包
========================

貼圖組名稱：${stickerSet.name}
風格：${stickerSet.style}
貼圖數量：${stickerSet.sticker_count} 張
建立時間：${new Date(stickerSet.created_at).toLocaleString('zh-TW')}

檔案說明
--------
- main.png：主要圖片（240×240px）
- tab.png：聊天室標籤圖片（96×74px）
- 01.png ~ XX.png：貼圖圖片（最大 370×320px）

上傳步驟
--------
1. 前往 LINE Creators Market：https://creator.line.me/
2. 登入後點擊「新增貼圖」
3. 依序上傳 main.png、tab.png 和所有 XX.png
4. 填寫貼圖資訊並提交審核

注意事項
--------
- 所有圖片已符合 LINE 官方規格
- 審核通過後即可販售或私人使用
- 如需修改，請在貼圖大亨重新生成

感謝使用貼圖大亨！
`;
}

/**
 * 上傳 ZIP 到 Storage 並取得下載連結
 */
async function uploadAndGetDownloadUrl(setId, zipBuffer) {
  const bucket = 'sticker-images';
  const zipPath = `${setId}/sticker_pack.zip`;

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(zipPath, zipBuffer, {
        contentType: 'application/zip',
        upsert: true
      });

    if (error) throw error;

    // 取得公開 URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(zipPath);

    console.log(`📤 ZIP 已上傳：${data.publicUrl}`);
    return data.publicUrl;

  } catch (error) {
    console.error('❌ 上傳 ZIP 失敗:', error);
    throw error;
  }
}

/**
 * Netlify Function Handler
 */
exports.handler = async function(event, context) {
  console.log('🔔 Download Pack 被呼叫');

  try {
    // 支援 GET 或 POST
    let setId;
    if (event.httpMethod === 'GET') {
      setId = event.queryStringParameters?.setId;
    } else {
      const body = JSON.parse(event.body || '{}');
      setId = body.setId;
    }

    if (!setId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing setId' })
      };
    }

    // 檢查是否已有 ZIP
    const stickerSet = await getStickerSet(setId);
    if (stickerSet?.zip_url) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          downloadUrl: stickerSet.zip_url
        })
      };
    }

    // 生成並上傳 ZIP
    const zipBuffer = await generateStickerZip(setId);
    const downloadUrl = await uploadAndGetDownloadUrl(setId, zipBuffer);

    // 更新資料庫
    await supabase
      .from('sticker_sets')
      .update({ zip_url: downloadUrl, updated_at: new Date().toISOString() })
      .eq('set_id', setId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        downloadUrl
      })
    };

  } catch (error) {
    console.error('❌ 處理下載請求失敗:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

module.exports = {
  generateStickerZip,
  uploadAndGetDownloadUrl
};

