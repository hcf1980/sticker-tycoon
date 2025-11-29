/**
 * Pack for LINE Market - 打包符合 LINE Creators Market 規格的貼圖包
 *
 * 由於 Netlify Functions 有超時限制，改用簡化方式：
 * - 直接打包原始圖片（已經是正確尺寸）
 * - 用第一張圖片生成 main.png 和 tab.png
 */

const archiver = require('archiver');
const sharp = require('sharp');
const axios = require('axios');
const { getUploadQueue, supabase } = require('./supabase-client');

/**
 * 快速下載圖片
 */
async function quickDownload(url) {
  if (url.startsWith('data:image')) {
    return Buffer.from(url.split(',')[1], 'base64');
  }
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(res.data);
}

/**
 * 打包待上傳佇列為 LINE 貼圖包（優化版 - 並行下載）
 */
async function packQueueForLine(userId, mainImageIndex = 0) {
  console.log(`📦 開始打包 LINE 貼圖包 (userId: ${userId})`);

  const queue = await getUploadQueue(userId);

  if (queue.length !== 40) {
    throw new Error(`需要 40 張貼圖，目前只有 ${queue.length} 張`);
  }

  const chunks = [];

  return new Promise(async (resolve, reject) => {
    try {
      const archive = archiver('zip', { zlib: { level: 6 } }); // 降低壓縮等級加快速度

      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => {
        const zipBuffer = Buffer.concat(chunks);
        console.log(`✅ ZIP 完成：${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        resolve(zipBuffer);
      });
      archive.on('error', reject);

      const mainItem = queue[mainImageIndex] || queue[0];
      console.log(`📸 封面：${mainItem.expression || '#1'}`);

      // 下載封面圖
      const coverBuffer = await quickDownload(mainItem.image_url);

      // 1. main.png (240 × 240) - 使用 sharp 快速處理
      const mainBuffer = await sharp(coverBuffer)
        .resize(240, 240, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      archive.append(mainBuffer, { name: 'main.png' });

      // 2. tab.png (96 × 74)
      const tabBuffer = await sharp(coverBuffer)
        .resize(96, 74, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      archive.append(tabBuffer, { name: 'tab.png' });

      // 3. 並行下載所有貼圖（分批，每批 10 張）
      console.log('🖼️ 下載 40 張貼圖...');
      const batchSize = 10;
      for (let batch = 0; batch < 4; batch++) {
        const start = batch * batchSize;
        const items = queue.slice(start, start + batchSize);

        const downloads = await Promise.all(
          items.map(async (item, i) => {
            const idx = start + i + 1;
            try {
              const buffer = await quickDownload(item.image_url);
              // 確保尺寸符合 LINE 規格
              const processed = await sharp(buffer)
                .resize(370, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toBuffer();
              return { idx, buffer: processed };
            } catch (err) {
              console.error(`❌ #${idx} 失敗:`, err.message);
              return { idx, buffer: null };
            }
          })
        );

        downloads.forEach(({ idx, buffer }) => {
          if (buffer) {
            archive.append(buffer, { name: `${String(idx).padStart(2, '0')}.png` });
          }
        });
        console.log(`   ✅ 批次 ${batch + 1}/4 完成`);
      }

      // 4. README
      archive.append(generateReadme(queue), { name: 'README.txt' });

      archive.finalize();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 生成 README
 */
function generateReadme(queue) {
  return `LINE 貼圖包 - 貼圖大亨
============================

📦 檔案說明
-----------
main.png  - 主要圖片（封面）240×240px
tab.png   - 聊天室標籤 96×74px
01.png ~ 40.png - 貼圖圖片（最大 370×320px）

📋 上傳步驟
-----------
1. 前往 LINE Creators Market
   https://creator.line.me/
   
2. 登入後點擊「新增」→「貼圖」

3. 上傳圖片：
   - 主要圖片：上傳 main.png
   - 標籤圖片：上傳 tab.png  
   - 貼圖圖片：上傳 01.png ~ 40.png

4. 填寫貼圖資訊並提交審核

⚠️ 注意事項
-----------
- 所有圖片已符合 LINE 官方規格
- 審核時間約 1-7 天
- 若需修改請重新生成

貼圖內容
--------
${queue.map((item, i) => `${String(i+1).padStart(2, '0')}. ${item.expression || '貼圖'}`).join('\n')}

感謝使用貼圖大亨！
`;
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  try {
    const params = event.httpMethod === 'GET' 
      ? event.queryStringParameters 
      : JSON.parse(event.body || '{}');
    
    const { userId, mainIndex } = params;
    
    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '缺少 userId' }) };
    }
    
    const zipBuffer = await packQueueForLine(userId, parseInt(mainIndex) || 0);
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="line_stickers.zip"'
      },
      body: zipBuffer.toString('base64'),
      isBase64Encoded: true
    };
    
  } catch (error) {
    console.error('❌ 打包失敗:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

module.exports = { packQueueForLine };

