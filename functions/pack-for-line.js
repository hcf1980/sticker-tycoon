/**
 * Pack for LINE Market - 打包符合 LINE Creators Market 規格的貼圖包
 * 
 * LINE 官方規格：
 * - main.png: 240 × 240 px (封面)
 * - tab.png: 96 × 74 px (聊天室標籤)
 * - 01.png ~ 40.png: 最大 370 × 320 px (貼圖)
 */

const archiver = require('archiver');
const { getUploadQueue } = require('./supabase-client');
const { downloadImage, processImage, generateMainImage, generateTabImage } = require('./image-processor');

/**
 * 打包待上傳佇列為 LINE 貼圖包
 */
async function packQueueForLine(userId, mainImageIndex = 0) {
  console.log(`📦 開始打包 LINE 貼圖包 (userId: ${userId})`);
  
  // 取得佇列
  const queue = await getUploadQueue(userId);
  
  if (queue.length !== 40) {
    throw new Error(`需要 40 張貼圖，目前只有 ${queue.length} 張`);
  }
  
  const chunks = [];
  
  return new Promise(async (resolve, reject) => {
    try {
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => {
        const zipBuffer = Buffer.concat(chunks);
        console.log(`✅ ZIP 打包完成，大小：${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        resolve(zipBuffer);
      });
      archive.on('error', reject);
      
      // 選擇封面圖片（預設第一張）
      const mainItem = queue[mainImageIndex] || queue[0];
      console.log(`📸 封面圖片：${mainItem.expression || '第1張'}`);
      
      // 1. main.png (240 × 240)
      console.log('🎯 生成主要圖片 (240×240)...');
      const mainBuffer = await generateMainImage(mainItem.image_url);
      archive.append(mainBuffer, { name: 'main.png' });
      
      // 2. tab.png (96 × 74)
      console.log('📑 生成標籤圖片 (96×74)...');
      const tabBuffer = await generateTabImage(mainItem.image_url);
      archive.append(tabBuffer, { name: 'tab.png' });
      
      // 3. 貼圖圖片 01.png ~ 40.png
      console.log('🖼️ 處理 40 張貼圖...');
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        const filename = `${String(i + 1).padStart(2, '0')}.png`;
        console.log(`   ⏳ ${filename} - ${item.expression || '貼圖'}`);
        
        try {
          const stickerBuffer = await processImage(item.image_url, 'sticker');
          archive.append(stickerBuffer, { name: filename });
        } catch (err) {
          console.error(`   ❌ ${filename} 處理失敗:`, err.message);
          throw err;
        }
      }
      
      // 4. 加入 README
      const readme = generateReadme(queue);
      archive.append(readme, { name: 'README.txt' });
      
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

