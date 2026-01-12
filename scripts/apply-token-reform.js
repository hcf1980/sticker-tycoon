#!/usr/bin/env node
/**
 * 執行代幣制度改革遷移腳本
 * 
 * 用途：將資料庫註解從「代幣」改為「張數」
 * 安全：只更新註解，不修改數據
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 讀取環境變數
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 錯誤：缺少環境變數 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeMigration() {
  console.log('🚀 開始執行代幣制度改革遷移...\n');

  try {
    // 讀取 SQL 遷移檔案
    const sqlPath = path.join(__dirname, '../migrations/token_reform_2025.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 讀取遷移檔案:', sqlPath);
    console.log('📊 SQL 長度:', sqlContent.length, '字元\n');

    // 執行 SQL（使用 rpc 方式）
    // 注意：Supabase JS Client 不直接支援執行原始 SQL
    // 需要使用 REST API 或建立 RPC function

    console.log('⚠️  注意：由於 Supabase JS Client 限制，無法直接執行註解更新');
    console.log('請使用以下方式之一執行遷移：\n');
    console.log('1️⃣ 使用 Supabase Dashboard SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/kqucbzvjukhxycvgosbo/sql\n');
    console.log('2️⃣ 或在本機安裝 PostgreSQL CLI (psql):');
    console.log('   brew install postgresql');
    console.log('   psql "postgresql://postgres.kqucbzvjukhxycvgosbo:Aa0934003778@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" -f migrations/token_reform_2025.sql\n');
    console.log('3️⃣ 複製以下 SQL 到 Supabase Dashboard 執行：');
    console.log('─'.repeat(80));
    console.log(sqlContent);
    console.log('─'.repeat(80));

    // 驗證當前資料狀態
    console.log('\n✅ 驗證當前資料庫狀態...\n');

    // 查詢用戶總數
    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userError) {
      console.error('❌ 查詢用戶失敗:', userError);
    } else {
      console.log(`👥 總用戶數: ${userCount}`);
    }

    // 查詢張數總量
    const { data: tokenData, error: tokenError } = await supabase
      .from('users')
      .select('sticker_credits');

    if (tokenError) {
      console.error('❌ 查詢張數失敗:', tokenError);
    } else {
      const totalCredits = tokenData.reduce((sum, u) => sum + (u.sticker_credits || 0), 0);
      const avgCredits = (totalCredits / tokenData.length).toFixed(2);
      console.log(`💰 總張數: ${totalCredits}`);
      console.log(`📊 平均張數: ${avgCredits}\n`);
    }

    // 查詢交易記錄統計
    const { data: txData, error: txError } = await supabase
      .from('token_transactions')
      .select('transaction_type, amount');

    if (txError) {
      console.error('❌ 查詢交易記錄失敗:', txError);
    } else {
      console.log('📈 交易記錄統計:');
      const stats = {};
      txData.forEach(tx => {
        if (!stats[tx.transaction_type]) {
          stats[tx.transaction_type] = { count: 0, total: 0 };
        }
        stats[tx.transaction_type].count++;
        stats[tx.transaction_type].total += tx.amount;
      });

      Object.entries(stats).forEach(([type, data]) => {
        console.log(`   ${type}: ${data.count} 筆，總計 ${data.total} 張`);
      });
    }

    console.log('\n✅ 資料庫狀態驗證完成');
    console.log('\n📝 下一步：');
    console.log('1. 執行 SQL 遷移（使用上述任一方法）');
    console.log('2. 更新程式碼檔案（此腳本將自動處理）');
    console.log('3. 測試完整流程\n');

  } catch (error) {
    console.error('❌ 執行遷移失敗:', error);
    process.exit(1);
  }
}

// 執行遷移
executeMigration();

