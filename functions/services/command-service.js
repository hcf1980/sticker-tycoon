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
 * 處理「張數查詢」命令
 */
async function handleTokenQuery(userId) {
  logger.info('處理張數查詢命令', { userId });

  const balance = await getUserTokenBalance(userId);
  const transactions = await getTokenTransactions(userId, 5); // 最近 5 筆交易

  let text = `💰 您的可用張數：${balance} 張\n\n`;

  if (transactions && transactions.length > 0) {
    text += '📊 最近交易記錄：\n';
    transactions.forEach((tx) => {
      const date = new Date(tx.created_at).toLocaleDateString('zh-TW');
      const amount = tx.amount > 0 ? `+${tx.amount}` : tx.amount;
      const type = getTransactionTypeText(tx.transaction_type);
      text += `\n${date} ${type} ${amount} 張`;
    });
  }

  text += '\n\n💡 輸入「購買張數」查看儲值方案';
  text += '\n📖 輸入「購買說明」查看詳細說明';

  return {
    type: 'text',
    text,
  };
}

/**
 * 處理「購買張數」命令
 */
function handlePurchaseInfo() {
  logger.info('處理購買張數命令');

  const plans = [
    {
      price: 300,
      stickers: 140,
      isPopular: false,
    },
    {
      price: 500,
      stickers: 260,
      isPopular: true,
    },
  ];

  const bubbles = plans.map((plan) => {
    const costPerSticker = (plan.price / plan.stickers).toFixed(1);

    return {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#06C755',
        paddingAll: 'lg',
        contents: [
          ...(plan.isPopular
            ? [
                {
                  type: 'box',
                  layout: 'horizontal',
                  justifyContent: 'center',
                  contents: [
                    {
                      type: 'text',
                      text: '🔥 最熱門',
                      color: '#FFFFFF',
                      size: 'sm',
                      weight: 'bold',
                      flex: 0,
                    },
                  ],
                },
              ]
            : []),
          {
            type: 'text',
            text: `NT$ ${plan.price}`,
            color: '#FFFFFF',
            size: 'xxl',
            weight: 'bold',
            align: 'center',
            margin: plan.isPopular ? 'sm' : 'none',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            alignItems: 'center',
            spacing: 'xs',
            contents: [
              {
                type: 'text',
                text: `${plan.stickers} 張`,
                size: 'xxl',
                weight: 'bold',
                color: '#111827',
              },
            ],
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                justifyContent: 'space-between',
                contents: [
                  {
                    type: 'text',
                    text: '每張約',
                    color: '#6B7280',
                    size: 'sm',
                  },
                  {
                    type: 'text',
                    text: `$${costPerSticker}`,
                    color: '#111827',
                    size: 'sm',
                    weight: 'bold',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                justifyContent: 'space-between',
                contents: [
                  {
                    type: 'text',
                    text: '可製作約',
                    color: '#6B7280',
                    size: 'sm',
                  },
                  {
                    type: 'text',
                    text: `${plan.stickers} 張貼圖`,
                    color: '#111827',
                    size: 'sm',
                    weight: 'bold',
                  },
                ],
              },
            ],
          },
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            height: 'sm',
            margin: 'lg',
            action: {
              type: 'message',
              label: '結帳付款',
              text: `購買方案:${plan.price}`,
            },
          },
        ],
      },
    };
  });

  return {
    type: 'flex',
    altText: '請選擇購買方案',
    contents: {
      type: 'carousel',
      contents: bubbles,
    },
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

  let text = `🎁 推薦好友賺張數\n\n`;
  text += `您的推薦碼：${referral_code}\n\n`;
  text += `✅ 已推薦：${referral_count} 位好友\n`;
  text += `💎 剩餘次數：${remainingCount} 次\n\n`;
  text += `💰 獎勵說明：\n`;
  text += `• 好友使用您的推薦碼\n`;
  text += `• 您和好友各得 10 張\n`;
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
        text:
          `🎉 推薦碼使用成功！\n\n` +
          `✅ 您獲得 ${result.tokens} 張\n` +
          `💰 目前餘額：${result.balance} 張\n\n` +
          `感謝您的支持！`,
      };
    }

    return {
      type: 'text',
      text: `❌ ${result.message}`,
    };
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

  return {
    type: 'text',
    text:
      `📦 貼圖組：${set.name}\n\n` +
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
