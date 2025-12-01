/**
 * Sticker Generator Worker
 * 異步執行貼圖生成任務
 */

const { v4: uuidv4 } = require('uuid');
const { getSupabaseClient, updateStickerSetStatus, getStickerSet, deductTokens, getUserTokenBalance } = require('./supabase-client');
const { generateStickerSet, generateStickerSetFromPhoto } = require('./ai-generator');
const { generateStickersIntelligent } = require('./sticker-generator-enhanced');
const { processStickerSet, generateMainImage, generateTabImage } = require('./image-processor');
const { DefaultExpressions } = require('./sticker-styles');

/**
 * 建立生成任務
 */
async function createGenerationTask(userId, setData) {
  const supabase = getSupabaseClient();
  const taskId = uuidv4();
  const setId = uuidv4();

  try {
    // 計算需要的代幣數量（9宮格批次生成：每9張只需3枚代幣）
    const stickerCount = setData.count || 9;
    const apiCalls = Math.ceil(stickerCount / 9);  // 每次API調用生成9張
    const tokenCost = apiCalls * 3;  // 每次API調用消耗3枚代幣

    // 💰 代幣扣除邏輯已移到 line-webhook.js 的 handleConfirmGeneration
    // 如果沒有預先扣除，才在這裡扣除（向後兼容）
    if (!setData.tokensDeducted) {
      const deductResult = await deductTokens(
        userId,
        tokenCost,
        `生成貼圖組「${setData.name}」(${stickerCount}張/${apiCalls}次API)`,
        setId
      );

      if (!deductResult.success) {
        console.log(`❌ 代幣不足: ${deductResult.error}`);
        return {
          error: deductResult.error || '代幣不足，無法生成貼圖',
          tokenBalance: deductResult.balance
        };
      }

      console.log(`💰 已扣除 ${tokenCost} 代幣，剩餘 ${deductResult.balance} 代幣`);
    } else {
      console.log(`💰 代幣已在確認階段扣除（${tokenCost} 代幣）`);
    }

    // 建立貼圖組記錄（包含用戶選擇的表情和場景）
    const { error: setError } = await supabase
      .from('sticker_sets')
      .insert([{
        set_id: setId,
        user_id: userId,
        name: setData.name,
        description: setData.description || '',
        style: setData.style,
        character_prompt: setData.character || '',  // 照片流程可能沒有
        photo_url: setData.photoUrl || null,        // 照片 URL
        photo_base64: setData.photoBase64 || null,  // 照片 Base64（用於 AI 生成）
        sticker_count: setData.count,
        expressions: JSON.stringify(setData.expressions || []), // 用戶選擇的表情列表
        scene: setData.scene || 'none',             // 場景 ID
        scene_config: setData.sceneConfig ? JSON.stringify(setData.sceneConfig) : null, // 場景配置
        framing: setData.framing || 'halfbody',     // 構圖選擇（全身/半身/大頭/特寫）
        status: 'generating',
        tokens_used: stickerCount  // 記錄使用的代幣數
      }]);

    if (setError) throw setError;

    // 建立任務記錄
    const { error: taskError } = await supabase
      .from('generation_tasks')
      .insert([{
        task_id: taskId,
        user_id: userId,
        set_id: setId,
        task_type: 'create_set',
        status: 'pending',
        progress: 0
      }]);

    if (taskError) throw taskError;

    console.log(`✅ 已建立生成任務：${taskId}, 貼圖組：${setId}`);
    return { taskId, setId };

  } catch (error) {
    console.error('❌ 建立任務失敗:', error);
    throw error;
  }
}

/**
 * 更新任務進度
 */
async function updateTaskProgress(taskId, progress, status = 'processing') {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('generation_tasks')
      .update({
        progress,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('task_id', taskId);

    if (error) throw error;
    console.log(`📊 任務 ${taskId} 進度：${progress}%`);
  } catch (error) {
    console.error('❌ 更新進度失敗:', error);
  }
}

/**
 * 執行貼圖生成
 */
async function executeGeneration(taskId, setId) {
  const supabase = getSupabaseClient();

  try {
    console.log(`🚀 開始執行生成任務：${taskId}`);

    // 立即更新狀態為 processing（從 pending 變成 processing）
    await updateTaskProgress(taskId, 5, 'processing');
    console.log(`📊 任務狀態已更新為 processing`);

    // 取得貼圖組資料
    const stickerSet = await getStickerSet(setId);
    if (!stickerSet) {
      throw new Error('找不到貼圖組資料');
    }

    const { user_id: userId, style, character_prompt, sticker_count, photo_base64, expressions: expressionsJson, scene, scene_config: sceneConfigJson, framing } = stickerSet;

    // 詳細日誌
    console.log(`📋 貼圖組資料：style=${style}, count=${sticker_count}`);
    console.log(`📋 photo_base64 長度: ${photo_base64 ? photo_base64.length : 0}`);
    console.log(`📋 character_prompt: ${character_prompt || '(無)'}`);
    console.log(`📋 expressions JSON: ${expressionsJson || '(無)'}`);
    console.log(`📋 scene: ${scene || 'none'}`);
    console.log(`📋 framing: ${framing || 'halfbody'}`);

    // 解析場景配置
    let sceneConfig = null;
    if (sceneConfigJson) {
      try {
        sceneConfig = JSON.parse(sceneConfigJson);
        console.log(`🌍 使用場景: ${sceneConfig.name} (${sceneConfig.id})`);
      } catch (e) {
        console.log(`⚠️ 解析場景JSON失敗: ${e.message}`);
      }
    }

    // 取得表情列表：優先使用用戶選擇的，否則使用基本日常
    let expressions;
    if (expressionsJson) {
      try {
        expressions = JSON.parse(expressionsJson);
        console.log(`✅ 使用用戶選擇的表情: ${expressions.join(', ')}`);
      } catch (e) {
        console.log(`⚠️ 解析表情JSON失敗，使用預設: ${e.message}`);
        expressions = DefaultExpressions.basic.expressions;
      }
    } else {
      expressions = DefaultExpressions.basic.expressions;
      console.log(`⚠️ 無用戶表情，使用預設基本日常`);
    }

    // 根據數量截取
    expressions = expressions.slice(0, sticker_count);
    console.log(`📋 最終表情列表 (${expressions.length} 個): ${expressions.join(', ')}`);

    // 更新進度：開始 AI 生成
    await updateTaskProgress(taskId, 10, 'processing');

    // 1. AI 生成圖片（使用智能生成器自動選擇最優模式）
    console.log(`🎨 開始 AI 生成 ${sticker_count} 張貼圖...`);
    let generatedImages;

    if (photo_base64) {
      // 照片流程：使用智能生成器（自動判斷是否用9宮格）
      console.log('📷 使用智能生成器（照片模式）');

      // 🆕 修改：只要表情數量 >= 9 就使用 9宮格模式
      // 原本只檢查 sticker_count 是否是 9/18/27，但實際 expressions 可能不同
      const actualCount = expressions.length;
      const useGridMode = actualCount >= 9 ? 'auto' : 'never';

      if (useGridMode === 'auto') {
        const batchCount = Math.ceil(actualCount / 9);
        console.log(`🎨 使用 9宮格批次模式（${actualCount}張 = ${batchCount}次API，節省成本）`);
      } else {
        console.log(`📌 使用傳統模式（${actualCount}張，少於9張）`);
      }

      generatedImages = await generateStickersIntelligent(photo_base64, style, expressions, {
        userId,
        setId,
        useGridMode,      // 'auto' 或 'never'
        sceneConfig,
        framingId: framing
      });
    } else {
      // 傳統流程：使用角色描述生成（不支持網格模式）
      console.log('✏️ 使用角色描述模式生成');
      generatedImages = await generateStickerSet(style, character_prompt, expressions);
    }

    // 詳細日誌 - 生成結果
    console.log(`📊 AI 生成結果：${JSON.stringify(generatedImages.map(img => ({
      index: img.index,
      status: img.status,
      hasUrl: !!img.imageUrl,
      hasBuffer: !!img.buffer,
      mode: img.mode || 'traditional'
    })))}`);
    await updateTaskProgress(taskId, 50, 'processing');

    // 2. 處理圖片（符合 LINE 規格）
    const successImages = generatedImages.filter(img => img.status === 'completed');

    // 🆕 處理不同格式的結果（網格模式返回 storagePath，傳統模式返回 imageUrl）
    const imageUrls = [];
    const storageProcessed = [];  // 已經處理並上傳的圖片（網格模式）

    for (const img of successImages) {
      if (img.storagePath) {
        // 網格模式：已經處理並上傳（storagePath 存在即可）
        storageProcessed.push(img);
      } else if (img.imageUrl) {
        // 傳統模式：需要處理
        imageUrls.push(img.imageUrl);
      }
    }

    console.log(`📊 成功的圖片: ${successImages.length} 張`);
    console.log(`   - 網格模式（已處理）: ${storageProcessed.length} 張`);
    console.log(`   - 傳統模式（待處理）: ${imageUrls.length} 張`);

    // 檢查是否有成功生成的圖片
    if (successImages.length === 0) {
      const failedReasons = generatedImages.filter(img => img.status === 'failed').map(img => img.error).join('; ');
      throw new Error(`所有圖片生成失敗：${failedReasons || 'API 錯誤'}`);
    }

    // 處理傳統模式的圖片
    let processedImages = [];
    if (imageUrls.length > 0) {
      console.log(`🖼️ 開始處理 ${imageUrls.length} 張圖片（傳統模式）...`);
      processedImages = await processStickerSet(imageUrls);
    }

    await updateTaskProgress(taskId, 80, 'processing');

    // 3. 生成主圖和標籤圖（使用第一張圖片）
    let mainImageBuffer = null;
    let tabImageBuffer = null;

    if (storageProcessed.length > 0) {
      // 網格模式：從 Storage URL 獲取第一張圖片
      const firstImg = storageProcessed[0];
      const bucket = 'sticker-images';
      const { data } = supabase.storage.from(bucket).getPublicUrl(firstImg.storagePath);
      const firstImageUrl = data.publicUrl;
      console.log(`📷 使用第一張圖片生成主圖/標籤: ${firstImageUrl}`);
      mainImageBuffer = await generateMainImage(firstImageUrl);
      tabImageBuffer = await generateTabImage(firstImageUrl);
    } else if (imageUrls.length > 0) {
      // 傳統模式：從 URL 生成
      mainImageBuffer = await generateMainImage(imageUrls[0]);
      tabImageBuffer = await generateTabImage(imageUrls[0]);
    }

    await updateTaskProgress(taskId, 90, 'processing');

    // 4. 上傳圖片到 Storage 並寫入資料庫
    let uploadResults;

    if (storageProcessed.length > 0) {
      // 網格模式：圖片已上傳，只需更新資料庫和上傳主圖/標籤
      uploadResults = await uploadGridModeResults(setId, storageProcessed, mainImageBuffer, tabImageBuffer, expressions);
    } else {
      // 傳統模式：使用現有上傳邏輯
      uploadResults = await uploadImagesToStorage(setId, processedImages, mainImageBuffer, tabImageBuffer, expressions);
    }

    // 檢查上傳結果
    const uploadedCount = uploadResults.stickerRecords?.length || 0;
    if (uploadedCount === 0) {
      throw new Error('圖片上傳失敗，沒有任何貼圖被保存');
    }

    // 5. 更新貼圖組狀態
    await updateStickerSetStatus(setId, 'completed', {
      main_image_url: uploadResults.mainImageUrl,
      tab_image_url: uploadResults.tabImageUrl
    });

    // 6. 完成任務
    await updateTaskProgress(taskId, 100, 'completed');
    console.log(`✅ 貼圖組 ${setId} 生成完成！共 ${uploadedCount} 張貼圖`);

    return {
      success: true,
      setId,
      imageCount: processedImages.filter(p => p.status === 'completed').length
    };

  } catch (error) {
    console.error(`❌ 生成任務失敗 (${taskId}):`, error);

    // 標記任務失敗
    await supabase
      .from('generation_tasks')
      .update({
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('task_id', taskId);

    await updateStickerSetStatus(setId, 'failed');

    throw error;
  }
}

/**
 * 上傳圖片到 Supabase Storage 並寫入 stickers 資料表
 */
async function uploadImagesToStorage(setId, processedImages, mainImageBuffer, tabImageBuffer, expressions = []) {
  const supabase = getSupabaseClient();
  const bucket = 'sticker-images';
  const uploadResults = { imageUrls: [], mainImageUrl: null, tabImageUrl: null, stickerRecords: [] };

  try {
    // 上傳主圖
    if (mainImageBuffer) {
      const mainPath = `${setId}/main.png`;
      const { error } = await supabase.storage.from(bucket).upload(mainPath, mainImageBuffer, {
        contentType: 'image/png', upsert: true
      });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(mainPath);
        uploadResults.mainImageUrl = data.publicUrl;
      }
    }

    // 上傳標籤圖
    if (tabImageBuffer) {
      const tabPath = `${setId}/tab.png`;
      const { error } = await supabase.storage.from(bucket).upload(tabPath, tabImageBuffer, {
        contentType: 'image/png', upsert: true
      });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(tabPath);
        uploadResults.tabImageUrl = data.publicUrl;
      }
    }

    // 上傳貼圖並寫入資料庫
    for (const img of processedImages) {
      if (img.status !== 'completed' || !img.buffer) continue;

      const stickerPath = `${setId}/sticker_${String(img.index).padStart(2, '0')}.png`;
      const { error } = await supabase.storage.from(bucket).upload(stickerPath, img.buffer, {
        contentType: 'image/png', upsert: true
      });

      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(stickerPath);
        const imageUrl = data.publicUrl;
        uploadResults.imageUrls.push(imageUrl);

        // 寫入 stickers 資料表
        const stickerId = uuidv4();
        const expression = expressions[img.index - 1] || `表情 ${img.index}`;

        const { error: dbError } = await supabase
          .from('stickers')
          .insert([{
            sticker_id: stickerId,
            set_id: setId,
            index_number: img.index,
            expression: expression,
            image_url: imageUrl,
            status: 'completed'
          }]);

        if (dbError) {
          console.error(`❌ 寫入貼圖記錄失敗 (${img.index}):`, dbError);
        } else {
          uploadResults.stickerRecords.push({ stickerId, index: img.index, imageUrl });
        }
      }
    }

    console.log(`📤 已上傳 ${uploadResults.imageUrls.length} 張貼圖到 Storage`);
    console.log(`📝 已寫入 ${uploadResults.stickerRecords.length} 筆貼圖記錄到資料庫`);
    return uploadResults;

  } catch (error) {
    console.error('❌ 上傳圖片失敗:', error);
    return uploadResults;
  }
}

/**
 * 🆕 處理網格模式結果（圖片已上傳，只需更新資料庫）
 */
async function uploadGridModeResults(setId, storageProcessed, mainImageBuffer, tabImageBuffer, expressions = []) {
  const supabase = getSupabaseClient();
  const bucket = 'sticker-images';
  const uploadResults = { imageUrls: [], mainImageUrl: null, tabImageUrl: null, stickerRecords: [] };

  try {
    // 上傳主圖
    if (mainImageBuffer) {
      const mainPath = `${setId}/main.png`;
      const { error } = await supabase.storage.from(bucket).upload(mainPath, mainImageBuffer, {
        contentType: 'image/png', upsert: true
      });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(mainPath);
        uploadResults.mainImageUrl = data.publicUrl;
      }
    }

    // 上傳標籤圖
    if (tabImageBuffer) {
      const tabPath = `${setId}/tab.png`;
      const { error } = await supabase.storage.from(bucket).upload(tabPath, tabImageBuffer, {
        contentType: 'image/png', upsert: true
      });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(tabPath);
        uploadResults.tabImageUrl = data.publicUrl;
      }
    }

    // 寫入資料庫（圖片已在網格模式中上傳）
    for (const img of storageProcessed) {
      if (img.status !== 'completed' || !img.storagePath) continue;

      // 取得公開 URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(img.storagePath);
      const imageUrl = data.publicUrl;
      uploadResults.imageUrls.push(imageUrl);

      // 寫入 stickers 資料表
      const stickerId = uuidv4();
      const expression = img.expression || expressions[img.index - 1] || `表情 ${img.index}`;

      const { error: dbError } = await supabase
        .from('stickers')
        .insert([{
          sticker_id: stickerId,
          set_id: setId,
          index_number: img.index,
          expression: expression,
          image_url: imageUrl,
          status: 'completed'
        }]);

      if (dbError) {
        console.error(`❌ 寫入貼圖記錄失敗 (${img.index}):`, dbError);
      } else {
        uploadResults.stickerRecords.push({ stickerId, index: img.index, imageUrl });
      }
    }

    console.log(`📤 網格模式：已處理 ${uploadResults.imageUrls.length} 張貼圖`);
    console.log(`📝 已寫入 ${uploadResults.stickerRecords.length} 筆貼圖記錄到資料庫`);
    return uploadResults;

  } catch (error) {
    console.error('❌ 處理網格模式結果失敗:', error);
    return uploadResults;
  }
}

/**
 * 記錄生成結果（不再 Push 通知，由用戶自己查詢）
 */
async function logGenerationResult(userId, success, setId, errorMessage = null) {
  if (success) {
    console.log(`✅ 用戶 ${userId} 的貼圖組 ${setId} 生成完成，等待用戶查詢「我的貼圖」`);
  } else {
    console.log(`❌ 用戶 ${userId} 的貼圖組 ${setId} 生成失敗: ${errorMessage}`);
  }
  // 不發送 Push 通知，由用戶自己輸入「我的貼圖」或「查詢進度」查看
}

/**
 * Netlify Background Function Handler
 * 最多可執行 15 分鐘
 */
exports.handler = async function(event, context) {
  console.log('🔔 ====== Sticker Generator Background Worker 開始執行 ======');
  console.log('📋 Event body:', event.body ? event.body.substring(0, 200) + '...' : 'null');

  try {
    const body = JSON.parse(event.body || '{}');
    const { taskId, setId, userId } = body;

    console.log('📦 解析參數:', { taskId, setId, userId });

    if (!taskId || !setId || !userId) {
      console.error('❌ 缺少必要參數:', { taskId, setId, userId });
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing taskId, setId or userId' }) };
    }

    console.log(`🚀 開始生成任務：taskId=${taskId}, setId=${setId}, userId=${userId}`);

    // 執行生成（這可能需要幾分鐘）
    const result = await executeGeneration(taskId, setId);

    // 記錄完成（不 Push 通知）
    logGenerationResult(userId, true, setId);

    console.log(`✅ Background Worker 完成：${JSON.stringify(result)}`);
    return { statusCode: 200, body: JSON.stringify(result) };

  } catch (error) {
    console.error('❌ Background Worker 執行失敗:', error.message);
    console.error('❌ 錯誤堆疊:', error.stack);

    // 記錄失敗（不 Push 通知）
    try {
      const body = JSON.parse(event.body || '{}');
      if (body.userId) {
        logGenerationResult(body.userId, false, body.setId, error.message);
      }
    } catch (e) {
      console.error('❌ 記錄失敗:', e.message);
    }

    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// 導出 handler 和其他函數
module.exports = {
  handler: exports.handler,
  createGenerationTask,
  executeGeneration,
  uploadGridModeResults  // 新增導出
};

