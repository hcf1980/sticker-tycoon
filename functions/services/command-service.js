/**
 * LINE Bot 命令處理器
 * 處理用戶的各種命令
 */

const {
  getUserStickerSets,
  getUserTokenBalance,
  getTokenTransactions,
  getUserReferralInfo,
  applyReferralCode,
  getStickerSet,
  getStickerImages,
  deleteStickerSet,
} = require('../supabase-client');
const { generateStickerListFlexMessage } = require('../sticker-flex-message');
const logger = require('../utils/logger');
const { validator } = require('../utils');

/**
 * 處理「我的貼圖」命令
 */
async function handleMyStickers(userId) {
  logger.info('處理我的貼圖命令', { userId });
  
  const sets = await getUserStickerSets(userId);
  
  if (sets.length === 0) {
    return {
      type: 'text',
      text: '📁 你還沒有創建任何貼圖組\n\n輸入「創建貼圖」開始創建你的第一組貼圖！',
    };
  }
  
  // 生成貼圖列表 Flex Message（帶推薦好友資訊）
  const referralInfo = await getUserReferralInfo(userId);
  return generateStickerListFlexMessage(sets, referralInfo);
}

/**
 * 處理「代幣查詢」命令
 */
async function handleTokenQuery(userId) {
  logger.info('處理代幣查詢命令', { userId });

  const balance = await getUserTokenBalance(userId);
  const transactions = await getTokenTransactions(userId, 5); // 最近 5 筆交易

  let text = `💰 您的代幣餘額：${balance} 代幣\n\n`;

  if (transactions && transactions.length > 0) {
    text += '📊 最近交易記錄：\n';
    transactions.forEach(tx => {
      const date = new Date(tx.created_at).toLocaleDateString('zh-TW');
      const amount = tx.amount > 0 ? `+${tx.amount}` : tx.amount;
      const type = getTransactionTypeText(tx.transaction_type);
      text += `\n${date} ${type} ${amount} 代幣`;
    });
  }

  text += '\n\n💡 輸入「購買代幣」查看儲值方案';
  text += '\n📖 輸入「購買說明」查看詳細說明';

  return {
    type: 'text',
    text,
  };
}

/**
 * 處理「購買代幣」命令
 */
function handlePurchaseInfo() {
  logger.info('處理購買代幣命令');
  
  return {
    type: 'text',
    text: '💳 代幣儲值方案\n\n' +
          '方案一：NT$ 300 → 70 代幣\n' +
          '方案二：NT$ 500 → 130 代幣 ⭐推薦\n' +
          '方案三：NT$ 1000 → 300 代幣\n\n' +
          '💰 付款方式：\n' +
          '請使用以下帳號轉帳後\n' +
          '提供轉帳後五碼給管理員\n\n' +
          '📞 聯絡管理員購買',
  };
}

/**
 * 處理「推薦好友」命令
 */
async function handleReferralInfo(userId) {
  logger.info('處理推薦好友命令', { userId });

  const referralInfo = await getUserReferralInfo(userId);
  const { referral_code, referral_count } = referralInfo;

  const remainingCount = Math.max(0, 30 - referral_count);

  let text = `🎁 推薦好友賺代幣\n\n`;
  text += `您的推薦碼：${referral_code}\n\n`;
  text += `✅ 已推薦：${referral_count} 位好友\n`;
  text += `💎 剩餘次數：${remainingCount} 次\n\n`;
  text += `💰 獎勵說明：\n`;
  text += `• 好友使用您的推薦碼\n`;
  text += `• 您和好友各得 10 代幣\n`;
  text += `• 限時推廣，上限增至30位\n\n`;
  text += `📢 分享方式：\n`;
  text += `告訴好友輸入：\n`;
  text += `「輸入推薦碼 ${referral_code}」`;

  return {
    type: 'text',
    text,
  };
}

/**
 * 處理「使用推薦碼」命令
 */
async function handleApplyReferralCode(userId, code) {
  logger.info('處理使用推薦碼命令', { userId, code });
  
  // 驗證推薦碼格式
  const validation = validator.validate('referralCode', code);
  if (!validation.success) {
    return {
      type: 'text',
      text: `❌ ${validation.error}\n\n推薦碼格式：6 位大寫英數字\n例如：ABC123`,
    };
  }
  
  try {
    const result = await applyReferralCode(userId, code);
    
    if (result.success) {
      return {
        type: 'text',
        text: `🎉 推薦碼使用成功！\n\n` +
              `✅ 您獲得 ${result.tokens} 代幣\n` +
              `💰 目前餘額：${result.balance} 代幣\n\n` +
              `感謝您的支持！`,
      };
    } else {
      return {
        type: 'text',
        text: `❌ ${result.message}`,
      };
    }
  } catch (error) {
    logger.error('使用推薦碼失敗', { userId, code, error: error.message });
    return {
      type: 'text',
      text: '❌ 使用推薦碼失敗，請稍後再試',
    };
  }
}

/**
 * 處理「查看貼圖組」命令
 */
async function handleViewStickerSet(userId, setId) {
  logger.info('處理查看貼圖組命令', { userId, setId });
  
  const set = await getStickerSet(setId);
  
  if (!set || set.user_id !== userId) {
    return {
      type: 'text',
      text: '❌ 找不到此貼圖組',
    };
  }
  
  const stickers = await getStickerImages(setId);
  
  // 生成貼圖組詳情 Flex Message
  // TODO: 創建專用的 Flex Message
  
  return {
    type: 'text',
    text: `📦 貼圖組：${set.name}\n\n` +
          `🎨 風格：${set.style}\n` +
          `📊 數量：${stickers.length} 張\n` +
          `📌 狀態：${set.status}\n\n` +
          `輸入「下載貼圖:${setId}」下載打包`,
  };
}

/**
 * 處理「刪除貼圖組」命令
 */
async function handleDeleteStickerSet(userId, setId) {
  logger.info('處理刪除貼圖組命令', { userId, setId });
  
  const set = await getStickerSet(setId);
  
  if (!set || set.user_id !== userId) {
    return {
      type: 'text',
      text: '❌ 找不到此貼圖組',
    };
  }
  
  await deleteStickerSet(setId);
  
  return {
    type: 'text',
    text: `✅ 已刪除貼圖組「${set.name}」`,
  };
}

/**
 * 取得交易類型文字
 */
function getTransactionTypeText(type) {
  const typeMap = {
    initial: '初始贈送',
    purchase: '購買',
    generate: '生成消耗',
    admin_adjust: '管理員調整',
    refund: '退款',
    referral_reward: '推薦獎勵',
    referred_reward: '被推薦獎勵',
  };
  return typeMap[type] || type;
}

module.exports = {
  handleMyStickers,
  handleTokenQuery,
  handlePurchaseInfo,
  handleReferralInfo,
  handleApplyReferralCode,
  handleViewStickerSet,
  handleDeleteStickerSet,
};

