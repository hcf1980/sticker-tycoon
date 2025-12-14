/**
 * 測試 Background Worker 是否正常運行
 * 用於診斷模組載入和執行問題
 */

exports.handler = async function(event, context) {
  console.log('🧪 ====== Background Worker 診斷測試 ======');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasSupabase: !!process.env.SUPABASE_URL,
      hasLineToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN
    },
    modules: {}
  };

  // 測試各個模組載入
  const modulesToTest = [
    'uuid',
    './supabase-client',
    './ai-generator',
    './sticker-generator-enhanced',
    './image-processor',
    './sticker-styles'
  ];

  for (const moduleName of modulesToTest) {
    try {
      console.log(`📦 測試載入: ${moduleName}`);
      const module = require(moduleName);
      diagnostics.modules[moduleName] = {
        success: true,
        exports: Object.keys(module || {})
      };
      console.log(`✅ ${moduleName} 載入成功`);
    } catch (error) {
      console.error(`❌ ${moduleName} 載入失敗:`, error.message);
      diagnostics.modules[moduleName] = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  // 測試 sharp（最可能的問題源）
  try {
    console.log('📦 測試載入: sharp');
    const sharp = require('sharp');
    diagnostics.sharp = {
      success: true,
      version: sharp.versions
    };
    console.log('✅ sharp 載入成功:', sharp.versions);
  } catch (error) {
    console.error('❌ sharp 載入失敗:', error.message);
    diagnostics.sharp = {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }

  console.log('📋 診斷結果:', JSON.stringify(diagnostics, null, 2));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(diagnostics, null, 2)
  };
};

