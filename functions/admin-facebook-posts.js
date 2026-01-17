/**
 * Admin Facebook Posts API
 * - 生成 Facebook 貼文文案（多主題輪替、避免重複賣點）
 *
 * 安全性：
 * - 使用 ADMIN_API_KEY（環境變數）做最小化保護
 */

const { z } = require('zod');
const { callAIWithFallback } = require('./utils/ai-api-client');

// in-memory rate limit (best-effort; resets on cold start)
const rateLimitState = new Map();

function rateLimit(key, windowMs, max) {
  const now = Date.now();
  const hit = rateLimitState.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > hit.resetAt) {
    hit.count = 0;
    hit.resetAt = now + windowMs;
  }
  hit.count += 1;
  rateLimitState.set(key, hit);
  return hit.count <= max;
}


const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Api-Key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

function requireAdmin(event) {
  const required = process.env.ADMIN_API_KEY;
  if (!required) {
    console.warn('⚠️ ADMIN_API_KEY 未設定：管理 API 將缺少額外保護');
    return;
  }

  const key = event.headers?.['x-admin-api-key'] || event.headers?.['X-Admin-Api-Key'];
  if (!key || key !== required) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }
}

function json(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

const TOPICS = [
  {
    key: 'line-in-bot',
    label: '在 LINE 內直接操作',
    angle: '不用下載 App、不用學複雜工具，打開 LINE 就能開始做貼圖。'
  },
  {
    key: 'turn-photo-to-stickers',
    label: '照片變貼圖',
    angle: '把日常照片、寵物、家人、角色概念快速變成可用的貼圖風格。'
  },
  {
    key: 'no-design-skill',
    label: '零設計也能做',
    angle: '不會畫畫也沒關係，交給 AI 生成 + 系統整理成一套貼圖。'
  },
  {
    key: 'fast-workflow',
    label: '流程省時省力',
    angle: '省下找設計師、修圖、尺寸規格、命名打包的時間。'
  },
  {
    key: 'gift-and-fun',
    label: '送禮/社交話題',
    angle: '做一套專屬貼圖送朋友、情侶、家人，超有記憶點。'
  },
  {
    key: 'creator-monetize',
    label: '創作者上架',
    angle: '想上架但覺得麻煩？我們提供協助整理與上架流程，降低門檻。'
  },
  {
    key: 'rich-menu',
    label: 'Rich Menu / 官方帳號玩法',
    angle: '搭配官方帳號互動與選單，讓品牌更有溫度、更好玩。'
  }
];

const TONES = [
  { key: 'friendly', label: '親切' },
  { key: 'professional', label: '專業' },
  { key: 'funny', label: '幽默' },
  { key: 'story', label: '故事感' }
];

function pickTopic(excludeKeys = []) {
  const pool = TOPICS.filter(t => !excludeKeys.includes(t.key));
  if (pool.length === 0) return TOPICS[Math.floor(Math.random() * TOPICS.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [String(value)];
}

function buildPrompt({
  websiteName,
  websiteUrl,
  officialLineUrl,
  tone,
  topic,
  ctaStyle
}) {
  const toneLabel = TONES.find(t => t.key === tone)?.label || '親切';

  return `你是資深社群行銷文案寫手，請用「繁體中文」寫 1 篇可直接發在 Facebook 的貼文。

品牌/產品：${websiteName}
網站：${websiteUrl}
官方帳號（如需引導）：${officialLineUrl}

寫作目標：
- 不要一直重複同一個賣點
- 要逐步讓讀者接受「在 LINE 內就能操作」這件事（降低學習門檻）
- 強調這是一個能幫使用者輕鬆做出自己搞不定的 LINE 貼圖、並協助上架的服務
- 內容要真實、不浮誇，不要過度承諾

本次主題：${topic.label}
主題角度提示：${topic.angle}
語氣：${toneLabel}
CTA 風格：${ctaStyle}

輸出格式要求：
- 第一行要有一個能抓住注意力的開場句（不要用 emoji 開頭）
- 內文 120~220 字
- 用 3~6 行短段落（手機閱讀友善）
- 只使用 0~2 個 emoji（可不用）
- 結尾要有明確 CTA（引導：留言、私訊、或點擊連結/加入官方帳號）
- 最後附 5~10 個 hashtags（與 LINE 貼圖/AI/創作/社群相關）
- 不要提到「代幣」，統一用「張數」
`;
}

async function generatePost(event) {  
  const ip = event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for'] || 'unknown';
  if (!rateLimit(`admin-facebook-posts:${ip}`, 60 * 1000, 10)) {
    return json(429, { success: false, error: 'Rate limit exceeded' });
  }

  requireAdmin(event);

  const schema = z.object({
    websiteName: z.string().min(1).default('貼圖大亨 Sticker Tycoon'),
    websiteUrl: z.string().min(1).default(''),
    officialLineUrl: z.string().optional().nullable().default('https://line.me/R/ti/p/@sticker-tycoon'),
    tone: z.enum(TONES.map(t => t.key)).default('friendly'),
    topicKey: z.string().optional().nullable(),
    excludeTopicKeys: z.array(z.string()).optional().nullable(),
    ctaStyle: z.enum(['comment', 'dm', 'link', 'line']).default('line')
  });

  const body = schema.parse(JSON.parse(event.body || '{}'));

  const excludeTopicKeys = normalizeArray(body.excludeTopicKeys);
  const requestedTopic = TOPICS.find(t => t.key === body.topicKey);
  const topic = requestedTopic || pickTopic(excludeTopicKeys);

  const prompt = buildPrompt({
    websiteName: body.websiteName,
    websiteUrl: body.websiteUrl,
    officialLineUrl: body.officialLineUrl || '',
    tone: body.tone,
    topic,
    ctaStyle: body.ctaStyle
  });

  const result = await callAIWithFallback(
    [
      {
        role: 'user',
        content: prompt
      }
    ],
    { maxTokens: 700, timeout: 60000 }
  );

  const content = result?.response?.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 回應缺少內容');
  }

  return json(200, {
    success: true,
    topic: {
      key: topic.key,
      label: topic.label
    },
    tone: body.tone,
    post: content
  });
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const action = event.queryStringParameters?.action;

    if (event.httpMethod === 'POST' && action === 'generate') {
      return await generatePost(event);
    }

    if (event.httpMethod === 'GET' && action === 'meta') {
      return json(200, {
        success: true,
        topics: TOPICS,
        tones: TONES
      });
    }

    return json(400, { success: false, error: 'Invalid action' });
  } catch (error) {
    console.error('Admin Facebook Posts API error:', error);
    const statusCode = error.statusCode || 500;
    return json(statusCode, {
      success: false,
      error: error.message || 'Internal error',
      statusCode
    });
  }
};
