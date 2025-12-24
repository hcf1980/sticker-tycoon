/**
 * Web API: 創建貼圖組
 * 上傳照片、選擇風格、開始生成
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const { getUserByUnifiedId, deductUserTokens } = require('../services/user-service');
const { getSupabaseClient } = require('../supabase-client');
const { generateCharacterID, StickerStyles, SceneTemplates, FramingTemplates } = require('../sticker-styles');

function getSupabaseAuthClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

async function verifyUser(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabaseAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '只支援 POST 方法' })
    };
  }

  try {
    // 驗證用戶
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const authUser = await verifyUser(authHeader);

    if (!authUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '請先登入' })
      };
    }

    const userId = authUser.id;

    // 取得用戶資料
    const user = await getUserByUnifiedId(userId, 'web');
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: '用戶不存在' })
      };
    }

    // 解析請求
    const {
      name,
      photoBase64,
      style = 'cute',
      framingId = 'halfbody',
      sceneId = 'kawaii',
      expressions = [],
      count = 6
    } = JSON.parse(event.body || '{}');

    // 驗證必填欄位
    if (!name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '請提供貼圖組名稱' })
      };
    }

    if (!photoBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '請上傳照片' })
      };
    }

    // 驗證數量
    const validCounts = [6, 12, 18];
    if (!validCounts.includes(count)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '數量只能是 6、12 或 18 張' })
      };
    }

    // 驗證表情數量
    if (expressions.length !== count) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `表情數量 (${expressions.length}) 不符合貼圖數量 (${count})` 
        })
      };
    }

    // 計算所需代幣
    const tokensRequired = Math.ceil(count / 6) * 3;  // 每 6 張 = 3 代幣

    // 檢查代幣餘額
    if (user.sticker_credits < tokensRequired) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `代幣不足！需要 ${tokensRequired} 代幣，目前餘額 ${user.sticker_credits}`,
          needTokens: tokensRequired,
          currentTokens: user.sticker_credits,
          buyTokensUrl: 'https://line.me/R/ti/p/@YOUR_BOT_ID'  // LINE Bot 購買連結
        })
      };
    }

    const supabase = getSupabaseClient();

    // 生成 IDs
    const setId = uuidv4();
    const characterID = generateCharacterID(photoBase64.slice(0, 1000) + style);

    // 取得風格和場景設定
    const styleConfig = StickerStyles[style] || StickerStyles.cute;
    const sceneConfig = SceneTemplates[sceneId] || SceneTemplates.kawaii;
    const framingConfig = FramingTemplates[framingId] || FramingTemplates.halfbody;

    // 創建貼圖組
    const { data: stickerSet, error: setError } = await supabase
      .from('sticker_sets')
      .insert([{
        set_id: setId,
        user_id: userId,
        name,
        style,
        sticker_count: count,
        status: 'pending',
        character_id: characterID,
        framing_id: framingId,
        scene_id: sceneId,
        source: 'web',  // 標記來源為網頁版
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (setError) {
      console.error('創建貼圖組失敗:', setError);
      throw setError;
    }

    // 創建生成任務
    const taskId = uuidv4();
    const { error: taskError } = await supabase
      .from('generation_tasks')
      .insert([{
        task_id: taskId,
        set_id: setId,
        user_id: userId,
        status: 'pending',
        progress: 0,
        total_stickers: count,
        style,
        expressions: JSON.stringify(expressions),
        photo_data: photoBase64,  // 儲存照片數據
        character_id: characterID,
        framing_id: framingId,
        scene_config: JSON.stringify(sceneConfig),
        source: 'web',
        created_at: new Date().toISOString()
      }]);

    if (taskError) {
      console.error('創建任務失敗:', taskError);
      throw taskError;
    }

    // 扣除代幣
    const deductResult = await deductUserTokens(
      userId,
      tokensRequired,
      `生成貼圖組「${name}」(${count}張)`,
      setId
    );

    if (!deductResult.success) {
      // 代幣扣除失敗，刪除已創建的記錄
      await supabase.from('sticker_sets').delete().eq('set_id', setId);
      await supabase.from('generation_tasks').delete().eq('task_id', taskId);

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: deductResult.error })
      };
    }

    console.log(`✅ 貼圖組創建成功: ${name} (${setId})`);
    console.log(`   用戶: ${userId}, 代幣: ${tokensRequired}, 餘額: ${deductResult.balance}`);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: '貼圖組創建成功，開始生成中...',
        stickerSet: {
          id: stickerSet.id,
          setId,
          name,
          count,
          style: styleConfig.name,
          scene: sceneConfig.name,
          framing: framingConfig.name,
          status: 'pending'
        },
        task: {
          taskId,
          status: 'pending',
          progress: 0
        },
        tokensUsed: tokensRequired,
        remainingTokens: deductResult.balance,
        // 用於輪詢狀態的端點
        statusUrl: `/.netlify/functions/web-api/sticker-status?taskId=${taskId}`
      })
    };

  } catch (error) {
    console.error('創建貼圖組錯誤:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};

