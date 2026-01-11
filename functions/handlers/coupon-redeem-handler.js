const axios = require('axios');
const { resetConversationState } = require('../conversation-state');

function getSiteUrl() {
  return process.env.URL || process.env.DEPLOY_PRIME_URL || '';
}

function normalizeCode(text) {
  return String(text || '').trim();
}

async function handleCouponRedeemFlow(client, replyToken, userId, text) {
  const redeemCode = normalizeCode(text);
  if (!redeemCode) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: '請輸入兌換碼（例如 Q3AEF）\n\n輸入「取消」可退出。'
    });
  }

  try {
    const url = `${getSiteUrl()}/.netlify/functions/coupons?action=redeem`;

    const { data } = await axios.post(
      url,
      { userId, redeemCode },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    await resetConversationState(userId);

    if (data && data.success) {
      const tokenAmount = data.campaign?.tokenAmount ?? data.campaign?.token_amount;
      const balance = data.balance;
      return client.replyMessage(replyToken, {
        type: 'text',
        text: `✅ 兌換成功！\n\n獲得 +${tokenAmount} 代幣\n目前餘額：${balance}`,
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '查詢代幣', text: '代幣' } },
            { type: 'action', action: { type: 'message', label: '創建貼圖', text: '創建貼圖' } },
            { type: 'action', action: { type: 'message', label: '我的貼圖', text: '我的貼圖' } }
          ]
        }
      });
    }

    const code = data?.code;
    if (code === 'already_used') {
      return client.replyMessage(replyToken, {
        type: 'text',
        text: '你已經使用過此優惠券囉。'
      });
    }

    return client.replyMessage(replyToken, {
      type: 'text',
      text: '兌換碼無效或已過期，請確認後再試一次。'
    });

  } catch (error) {
    console.error('Coupon redeem flow failed:', error?.response?.data || error.message);
    await resetConversationState(userId);
    return client.replyMessage(replyToken, {
      type: 'text',
      text: '系統忙碌，請稍後再試一次。'
    });
  }
}

module.exports = { handleCouponRedeemFlow };
