/**
 * Sticker Flex Message Module
 * 建立各種貼圖相關的 Flex Message
 */

const { StickerStyles, DefaultExpressions, LineStickerSpecs } = require('./sticker-styles');
const { getSupabaseClient } = require('./supabase-client');

/**
 * 歡迎訊息 Flex Message
 */
function generateWelcomeFlexMessage() {
  return {
    type: 'flex',
    altText: '歡迎使用貼圖大亨！',
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎨 貼圖大亨',
            weight: 'bold',
            size: 'xxl',
            color: '#FF6B6B',
            align: 'center'
          },
          {
            type: 'text',
            text: 'AI 智慧貼圖生成器',
            size: 'md',
            color: '#666666',
            align: 'center',
            margin: 'sm'
          }
        ],
        paddingAll: '20px',
        backgroundColor: '#FFF5F5'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✨ 三步驟創建專屬貼圖',
            weight: 'bold',
            size: 'md',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              { type: 'text', text: '1️⃣ 選擇風格 & 描述角色', size: 'sm', color: '#555555' },
              { type: 'text', text: '2️⃣ AI 自動生成 8-40 張貼圖', size: 'sm', color: '#555555' },
              { type: 'text', text: '3️⃣ 下載並上傳到 LINE Creators', size: 'sm', color: '#555555' }
            ]
          },
          {
            type: 'separator',
            margin: 'xl'
          },
          {
            type: 'text',
            text: '📋 符合 LINE 官方規格',
            weight: 'bold',
            size: 'sm',
            margin: 'xl',
            color: '#06C755'
          },
          {
            type: 'text',
            text: '自動去背、尺寸調整、打包下載',
            size: 'xs',
            color: '#888888'
          }
        ],
        paddingAll: '20px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'message',
              label: '🎨 立即創建貼圖',
              text: '創建貼圖'
            },
            color: '#06C755'
          }
        ],
        paddingAll: '20px'
      }
    }
  };
}

function generateCouponRedeemPromptFlexMessage() {
  return {
    type: 'flex',
    altText: '輸入優惠碼',
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'Sticker Tycoon',
            weight: 'bold',
            size: 'lg',
            color: '#FFFFFF'
          },
          {
            type: 'text',
            text: '貼圖大亨活動碼兌換',
            size: 'sm',
            color: '#E6FFE9',
            margin: 'xs'
          }
        ],
        paddingAll: '16px',
        backgroundColor: '#06C755'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '請直接輸入你的兌換碼',
            weight: 'bold',
            size: 'md',
            color: '#111827'
          },
          {
            type: 'text',
            text: '優惠碼皆為限時活動使用，請留意兌換期限。',
            size: 'sm',
            color: '#374151',
            wrap: true
          },
          {
            type: 'text',
            text: '貼圖大亨的最新活動資訊會不定期於官方管道公告，\n多多參與活動與分享，不錯過任何一次專屬優惠！',
            size: 'sm',
            color: '#374151',
            wrap: true
          }
        ],
        paddingAll: '16px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'message',
              label: '取消',
              text: '取消'
            }
          }
        ],
        paddingAll: '16px'
      }
    }
  };
}

function generateCouponRedeemResultFlexMessage({
  success,
  tokenAmount,
  balance,
  message
}) {
  const title = success ? '兌換成功' : '兌換失敗';
  const color = success ? '#06C755' : '#EF4444';

  const bodyLines = success
    ? [
        { label: '獲得代幣', value: `+${tokenAmount}` },
        { label: '目前餘額', value: `${balance}` }
      ]
    : [{ label: '原因', value: message || '兌換碼無效或已過期' }];

  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `Sticker Tycoon｜${title}`,
            weight: 'bold',
            size: 'md',
            color: '#FFFFFF'
          }
        ],
        paddingAll: '16px',
        backgroundColor: color
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: bodyLines.map((row) => ({
              type: 'box',
              layout: 'baseline',
              contents: [
                { type: 'text', text: row.label, size: 'sm', color: '#6B7280', flex: 2 },
                { type: 'text', text: row.value, size: 'sm', color: '#111827', flex: 3, wrap: true }
              ]
            }))
          }
        ],
        paddingAll: '16px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'message',
              label: '查詢代幣',
              text: '代幣'
            },
            color: '#06C755'
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'message',
              label: '創建貼圖',
              text: '創建貼圖'
            }
          }
        ],
        paddingAll: '16px'
      }
    }
  };
}

module.exports = {
  generateWelcomeFlexMessage,
  generateCouponRedeemPromptFlexMessage,
  generateCouponRedeemResultFlexMessage
};
