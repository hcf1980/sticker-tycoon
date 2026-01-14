const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let supabase = null;

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  return supabase;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

// NOTE: 目前此 API 未做後端身份驗證。
// 若要加強安全性，建議改回 Netlify Identity（context.clientContext.user）或改為 server-side session/token。
function getIdentitySummary() {
  return null;
}

// 讀取 functions 目錄下的檔案資訊
function getFunctionsInfo() {
  const functionsDir = path.join(__dirname, '.');
  const files = fs.readdirSync(functionsDir);

  return files
    .filter((file) => file.endsWith('.js') && file !== 'admin-project-overview.js')
    .map((file) => {
      const stats = fs.statSync(path.join(functionsDir, file));
      const functionName = file.replace(/\.js$/, '');

      return {
        name: functionName,
        filename: file,
        sizeBytes: stats.size,
        updatedAt: stats.mtime.toISOString(),
        isBackground: file.endsWith('-background.js'),
        endpoint: `/.netlify/functions/${functionName}`
      };
    });
}

// 從 netlify.toml 讀取 redirects 和 functions 配置
function getNetlifyConfig() {
  const configPath = path.join(process.cwd(), 'netlify.toml');
  const configContent = fs.readFileSync(configPath, 'utf-8');

  // 簡單解析 netlify.toml 中的 functions 配置
  const functionConfigs = [];
  const functionRegex = /\[functions\."([^"]+)"\]\s*\n([\s\S]*?)(?=\n\[|$)/g;

  let match;
  while ((match = functionRegex.exec(configContent)) !== null) {
    const functionName = match[1];
    const configBlock = match[2];
    const timeoutMatch = configBlock.match(/timeout\s*=\s*(\d+)/);
    const scheduleMatch = configBlock.match(/schedule\s*=\s*"([^"]+)"/);

    functionConfigs.push({
      name: functionName,
      timeoutSeconds: timeoutMatch ? parseInt(timeoutMatch[1], 10) : null,
      schedule: scheduleMatch ? scheduleMatch[1] : null,
      isBackground: functionName.endsWith('-background')
    });
  }

  // 解析 redirects
  const redirects = [];
  const redirectRegex = /\[\[redirects\]\]\s*\n([\s\S]*?)(?=\n\[\[|$)/g;

  while ((match = redirectRegex.exec(configContent)) !== null) {
    const redirectBlock = match[1];
    const fromMatch = redirectBlock.match(/from\s*=\s*"([^"]+)"/);
    const toMatch = redirectBlock.match(/to\s*=\s*"([^"]+)"/);
    const statusMatch = redirectBlock.match(/status\s*=\s*(\d+)/);

    if (fromMatch && toMatch) {
      redirects.push({
        from: fromMatch[1],
        to: toMatch[1],
        status: statusMatch ? parseInt(statusMatch[1], 10) : 301
      });
    }
  }

  return { functions: functionConfigs, redirects };
}

function enrichFunctions(functionsInfo, netlifyConfig) {
  const configByName = new Map(netlifyConfig.functions.map((f) => [f.name, f]));

  return functionsInfo.map((func) => {
    const config = configByName.get(func.name);

    return {
      ...func,
      timeoutSeconds: config?.timeoutSeconds ?? null,
      schedule: config?.schedule ?? null,
      isBackground: config?.isBackground ?? func.isBackground
    };
  });
}

async function getSupabaseHealth(db) {
  if (!db) {
    return {
      isConfigured: false,
      isHealthy: false,
      checks: [],
      checkedAt: new Date().toISOString()
    };
  }

  const checks = [];
  const checkedAt = new Date().toISOString();

  async function checkCount(table) {
    const startedAt = Date.now();
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
    const durationMs = Date.now() - startedAt;

    return {
      name: `count:${table}`,
      isOk: !error,
      durationMs,
      details: error ? { message: error.message } : { count: count ?? 0 }
    };
  }

  checks.push(await checkCount('users'));
  checks.push(await checkCount('sticker_sets'));
  checks.push(await checkCount('token_transactions'));

  const isHealthy = checks.every((c) => c.isOk);

  return {
    isConfigured: true,
    isHealthy,
    checks,
    checkedAt
  };
}

exports.handler = async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }


  try {
    const db = getSupabase();

    const functionsInfo = getFunctionsInfo();
    const netlifyConfig = getNetlifyConfig();

    const [supabaseHealth] = await Promise.all([getSupabaseHealth(db)]);

    const functions = enrichFunctions(functionsInfo, netlifyConfig);

    const response = {
      meta: {
        lastUpdated: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      identity: getIdentitySummary(context),
      runtime: {
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime())
      },
      project: {
        name: '貼圖大亨',
        version: '1.0.0',
        description: 'LINE Bot for AI-powered sticker generation'
      },
      functions: {
        count: functions.length,
        list: functions
      },
      apiEndpoints: {
        count: netlifyConfig.redirects.length,
        list: netlifyConfig.redirects
      },
      health: {
        supabase: supabaseHealth
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error in admin-project-overview:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};