/**
 * Pack for LINE Market - Background Worker
 * 在背景處理 40 張貼圖的打包並上傳到 Supabase Storage
 */

const archiver = require('archiver');
const sharp = require('sharp');
const axios = require('axios');
const { getUploadQueue, supabase } = require('./supabase-client');

async function quickDownload(url) {
  if (url.startsWith('data:image')) {
    return Buffer.from(url.split(',')[1], 'base64');
  }
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  return Buffer.from(res.data);
}

async function updateTaskStatus(taskId, status, extra = {}) {
  await supabase
    .from('line_pack_tasks')
    .update({ status, ...extra, updated_at: new Date().toISOString() })
    .eq('task_id', taskId);
}

function generateReadme(queue) {
  return `LINE 貼圖包 - 貼圖大亨
============================
📦 檔案說明: main.png(封面240×240), tab.png(標籤96×74), 01-40.png(貼圖370×320)
📋 上傳: https://creator.line.me/ → 新增 → 貼圖 → 上傳圖片 → 提交審核
⚠️ 審核約 1-7 天

貼圖內容:
${queue.map((item, i) => `${String(i+1).padStart(2, '0')}. ${item.expression || '貼圖'}`).join('\n')}
`;
}

async function packAndUpload(taskId, userId, mainIndex) {
  console.log(`📦 [${taskId}] 開始打包`);
  await updateTaskStatus(taskId, 'processing', { progress: 0 });

  const queue = await getUploadQueue(userId);
  if (queue.length !== 40) throw new Error(`需要 40 張，目前 ${queue.length} 張`);

  const chunks = [];
  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.on('data', chunk => chunks.push(chunk));

  const mainItem = queue[mainIndex] || queue[0];
  const coverBuffer = await quickDownload(mainItem.image_url);
  await updateTaskStatus(taskId, 'processing', { progress: 5 });

  // main.png & tab.png
  const mainBuffer = await sharp(coverBuffer)
    .resize(240, 240, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  archive.append(mainBuffer, { name: 'main.png' });

  const tabBuffer = await sharp(coverBuffer)
    .resize(96, 74, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  archive.append(tabBuffer, { name: 'tab.png' });
  await updateTaskStatus(taskId, 'processing', { progress: 10 });

  // 處理 40 張貼圖
  const batchSize = 8;
  const totalBatches = Math.ceil(queue.length / batchSize);

  for (let batch = 0; batch < totalBatches; batch++) {
    const start = batch * batchSize;
    const items = queue.slice(start, start + batchSize);

    const downloads = await Promise.all(
      items.map(async (item, i) => {
        const idx = start + i + 1;
        try {
          const buffer = await quickDownload(item.image_url);
          const processed = await sharp(buffer)
            .resize(370, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png().toBuffer();
          return { idx, buffer: processed };
        } catch (err) {
          console.error(`❌ #${idx}:`, err.message);
          return { idx, buffer: null };
        }
      })
    );

    downloads.forEach(({ idx, buffer }) => {
      if (buffer) archive.append(buffer, { name: `${String(idx).padStart(2, '0')}.png` });
    });

    const progress = 10 + Math.round((batch + 1) / totalBatches * 80);
    await updateTaskStatus(taskId, 'processing', { progress });
    console.log(`   ✅ 批次 ${batch + 1}/${totalBatches} (${progress}%)`);
  }

  archive.append(generateReadme(queue), { name: 'README.txt' });
  archive.finalize();

  await new Promise((resolve, reject) => {
    archive.on('end', resolve);
    archive.on('error', reject);
  });

  const zipBuffer = Buffer.concat(chunks);
  console.log(`📦 ZIP: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  await updateTaskStatus(taskId, 'processing', { progress: 95 });

  // 上傳到 Supabase
  const zipPath = `line-packs/${userId}/${taskId}.zip`;
  const { error } = await supabase.storage
    .from('sticker-images')
    .upload(zipPath, zipBuffer, { contentType: 'application/zip', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('sticker-images').getPublicUrl(zipPath);
  console.log(`✅ 上傳完成: ${data.publicUrl}`);
  return data.publicUrl;
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let taskId;
  try {
    const { taskId: tid, userId, mainIndex } = JSON.parse(event.body || '{}');
    taskId = tid;

    if (!taskId || !userId) {
      return { statusCode: 400, body: 'Missing parameters' };
    }

    console.log(`🚀 [${taskId}] 開始背景打包`);
    const downloadUrl = await packAndUpload(taskId, userId, mainIndex || 0);
    await updateTaskStatus(taskId, 'completed', { download_url: downloadUrl, progress: 100 });
    console.log(`✅ [${taskId}] 完成`);

  } catch (error) {
    console.error(`❌ [${taskId}] 失敗:`, error);
    if (taskId) {
      await updateTaskStatus(taskId, 'failed', { error_message: error.message });
    }
  }

  return { statusCode: 202, body: 'Accepted' };
};