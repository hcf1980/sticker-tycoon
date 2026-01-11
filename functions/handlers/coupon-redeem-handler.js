const axios = require('axios');
const { resetConversationState } = require('../conversation-state');
const {
  generateCouponRedeemPromptFlexMessage,
  generateCouponRedeemResultFlexMessage
} = require('../sticker-flex-message');

function getSiteUrl() {
  return process.env.URL || process.env.DEPLOY_PRIME_URL || '';
}

function normalizeCode(text) {
  return String(text || '').trim();
}

async function handleCouponRedeemFlow(client, replyToken, userId, text) {
  const redeemCode = normalizeCode(text);
  if (!redeemCode) {
    return client.replyMessage(replyToken, generateCouponRedeemPromptFlexMessage());
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

      return client.replyMessage(
        replyToken,
        generateCouponRedeemResultFlexMessage({
          success: true,
          tokenAmount,
          balance,
          message: null
        })
      );
    }

    const code = data?.code;

    if (code === 'already_used') {
      return client.replyMessage(
        replyToken,
        generateCouponRedeemResultFlexMessage({
          success: false,
          tokenAmount: null,
          balance: null,
          message: '你已經使用過此優惠券囉。'
        })
      );
    }

    return client.replyMessage(
      replyToken,
      generateCouponRedeemResultFlexMessage({
        success: false,
        tokenAmount: null,
        balance: null,
        message: '兌換碼無效或已過期，請確認後再試一次。'
      })
    );

  } catch (error) {
    console.error('Coupon redeem flow failed:', error?.response?.data || error.message);
    await resetConversationState(userId);

    return client.replyMessage(
      replyToken,
      generateCouponRedeemResultFlexMessage({
        success: false,
        tokenAmount: null,
        balance: null,
        message: '系統忙碌，請稍後再試一次。'
      })
    );
  }
}

module.exports = { handleCouponRedeemFlow };
