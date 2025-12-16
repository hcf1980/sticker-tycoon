/**
 * 更新構圖設定 - 精簡 prompt_addition
 * 移除冗長的描述，只保留核心指示
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dpuxmetnpghlfgrmthnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdXhtZXRucGdobGZncm10aG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDMwNzcsImV4cCI6MjA3OTgxOTA3N30._fleTY6Pw4myjEIjtAxkYYm6L8MfPeKq915zn68pM_8'
);

const simplifiedFraming = [
  {
    framing_id: 'fullbody',
    prompt_addition: 'full body shot, head to toe visible, small head (15% of height), character fills 90% of frame, feet visible at bottom',
    character_focus: 'FULL BODY visible head to toe, character fills 90% of frame, SMALL head (15%)'
  },
  {
    framing_id: 'halfbody',
    prompt_addition: 'half body shot waist up, medium head (25% of height), character fills 85% of frame, hands visible',
    character_focus: 'UPPER BODY waist up, character fills 85% of frame, MEDIUM head (25%)'
  },
  {
    framing_id: 'portrait',
    prompt_addition: 'head and shoulders portrait, large head (60% of height), character fills 85% of frame, face is main focus',
    character_focus: 'HEAD AND SHOULDERS, character fills 85% of frame, LARGE head (60%)'
  },
  {
    framing_id: 'closeup',
    prompt_addition: 'extreme face close-up, huge face (85% of frame), eyes at center, face nearly touches edges',
    character_focus: 'EXTREME FACE CLOSE-UP, face fills 85% of frame, HUGE face'
  }
];

async function updateFramingSettings() {
  console.log('🔄 開始更新構圖設定...\n');

  for (const framing of simplifiedFraming) {
    try {
      const { error } = await supabase
        .from('framing_settings')
        .update({
          prompt_addition: framing.prompt_addition,
          character_focus: framing.character_focus,
          updated_at: new Date().toISOString()
        })
        .eq('framing_id', framing.framing_id);

      if (error) {
        console.error(`❌ 更新 ${framing.framing_id} 失敗:`, error.message);
      } else {
        console.log(`✅ 更新 ${framing.framing_id} 成功`);
        console.log(`   新 prompt 長度: ${framing.prompt_addition.length} 字元\n`);
      }
    } catch (err) {
      console.error(`❌ 更新 ${framing.framing_id} 錯誤:`, err.message);
    }
  }

  // 驗證更新結果
  console.log('\n📊 驗證更新結果...\n');
  const { data, error } = await supabase
    .from('framing_settings')
    .select('framing_id, name, prompt_addition')
    .order('framing_id');

  if (error) {
    console.error('❌ 查詢失敗:', error.message);
  } else {
    data.forEach(f => {
      console.log(`📐 ${f.name} (${f.framing_id}): ${f.prompt_addition.length} 字元`);
    });
  }

  console.log('\n✅ 更新完成！');
}

updateFramingSettings()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ 執行錯誤:', err);
    process.exit(1);
  });

