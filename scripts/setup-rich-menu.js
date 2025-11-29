/**
 * Rich Menu 設置腳本 - 貼圖大亨
 * 創建並設置 LINE Rich Menu
 * 
 * 使用方式：npm run setup:richmenu
 */

require('dotenv').config();
const { createRichMenu, uploadRichMenuImage, setDefaultRichMenu, deleteRichMenu, listRichMenus } = require('../functions/rich-menu-manager');
const { generateRichMenuImage } = require('./generate-rich-menu-image');

async function setupRichMenu() {
  try {
    console.log('🚀 開始設置貼圖大亨 Rich Menu...\n');

    // 檢查環境變數
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('請設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數');
    }

    // 步驟 1：列出現有 Rich Menu
    console.log('📝 步驟 1/4：檢查現有 Rich Menu');
    const existingMenus = await listRichMenus();
    console.log(`   找到 ${existingMenus.length} 個現有 Rich Menu`);
    
    // 刪除名為「貼圖大亨主選單」的舊 menu
    for (const menu of existingMenus) {
      if (menu.name === '貼圖大亨主選單') {
        console.log(`   刪除舊的 Rich Menu: ${menu.richMenuId}`);
        await deleteRichMenu(menu.richMenuId);
      }
    }
    console.log('✅ 檢查完成\n');

    // 步驟 2：生成 Rich Menu 圖片
    console.log('📝 步驟 2/4：生成 Rich Menu 圖片');
    const imageBuffer = generateRichMenuImage();
    console.log('✅ 圖片生成完成\n');

    // 步驟 3：創建 Rich Menu
    console.log('📝 步驟 3/4：創建 Rich Menu');
    const richMenuId = await createRichMenu();
    console.log(`✅ Rich Menu 創建完成：${richMenuId}\n`);

    // 步驟 4：上傳圖片
    console.log('📝 步驟 4/4：上傳 Rich Menu 圖片');
    await uploadRichMenuImage(richMenuId, imageBuffer);
    console.log('✅ 圖片上傳完成\n');

    // 步驟 5：設定為預設 Rich Menu
    console.log('📝 步驟 5/5：設定為預設 Rich Menu');
    await setDefaultRichMenu(richMenuId);
    console.log('✅ 預設 Rich Menu 設定完成\n');

    console.log('═'.repeat(50));
    console.log('🎉 Rich Menu 設置完成！');
    console.log('═'.repeat(50));
    console.log(`\n📊 Rich Menu ID: ${richMenuId}`);
    console.log('\n📋 功能選單：');
    console.log('   1️⃣ 創建貼圖 - 點擊開始創建新貼圖');
    console.log('   2️⃣ 我的貼圖 - 查看已生成的貼圖組');
    console.log('   3️⃣ 示範圖集 - 查看精選作品範例');
    console.log('\n💡 提示：');
    console.log('   1. 請將以下內容添加到 .env 文件：');
    console.log(`      RICH_MENU_ID=${richMenuId}`);
    console.log('   2. 在 LINE 中打開貼圖大亨 Bot，應該會看到底部的功能選單');
    console.log('   3. 點擊選單中的按鈕測試功能是否正常\n');

  } catch (error) {
    console.error('\n❌ 設置 Rich Menu 失敗:', error.message);
    console.error('\n💡 請檢查：');
    console.error('   1. .env 檔案是否存在且包含 LINE_CHANNEL_ACCESS_TOKEN');
    console.error('   2. LINE Channel Access Token 是否有效');
    console.error('   3. 網路連線是否正常');
    process.exit(1);
  }
}

// 執行設置
setupRichMenu();

