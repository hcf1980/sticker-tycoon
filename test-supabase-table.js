/**
 * 測試 Supabase youtuber_promotions 表是否存在
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ 已設置' : '❌ 未設置');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ 已設置' : '❌ 未設置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTable() {
  console.log('🔍 測試 youtuber_promotions 表...\n');

  try {
    // 1. 測試查詢表
    console.log('1️⃣ 測試查詢表...');
    const { data, error, count } = await supabase
      .from('youtuber_promotions')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (error) {
      console.error('❌ 查詢失敗:', error.message);
      console.error('錯誤代碼:', error.code);
      console.error('錯誤詳情:', error.details);
      
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('\n⚠️  表不存在！需要執行 SQL 創建表。');
        console.log('\n請在 Supabase Dashboard 執行以下 SQL：');
        console.log('---');
        console.log(require('fs').readFileSync('./supabase/migrations/20250115_youtuber_promotion.sql', 'utf8'));
        console.log('---');
      }
      return;
    }

    console.log('✅ 表存在！');
    console.log(`📊 當前記錄數: ${count}`);
    
    if (data && data.length > 0) {
      console.log('\n最近的申請:');
      data.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.channel_name} - ${row.status} (${row.created_at})`);
      });
    } else {
      console.log('📝 目前沒有申請記錄');
    }

    // 2. 測試插入（然後刪除）
    console.log('\n2️⃣ 測試插入權限...');
    const testData = {
      application_id: 'test-' + Date.now(),
      channel_name: 'Test Channel',
      channel_url: 'https://youtube.com/@test',
      subscriber_count: 1000,
      email: 'test@test.com',
      line_id: '@test',
      channel_type: 'tech',
      channel_description: 'Test description',
      filming_plan: 'Test plan',
      status: 'pending'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('youtuber_promotions')
      .insert([testData])
      .select();

    if (insertError) {
      console.error('❌ 插入測試失敗:', insertError.message);
      return;
    }

    console.log('✅ 插入測試成功');

    // 刪除測試數據
    const { error: deleteError } = await supabase
      .from('youtuber_promotions')
      .delete()
      .eq('application_id', testData.application_id);

    if (deleteError) {
      console.error('⚠️  刪除測試數據失敗:', deleteError.message);
    } else {
      console.log('✅ 測試數據已清理');
    }

    console.log('\n✅ 所有測試通過！表已正確設置。');

  } catch (err) {
    console.error('❌ 測試過程出錯:', err);
  }
}

testTable();

