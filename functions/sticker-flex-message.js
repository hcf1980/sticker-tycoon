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
              { type: 'text', text: '1️⃣ 選擇繪畫風格 & 描述角色', size: 'sm', color: '#555555' },
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
            text: '優惠碼為限時活動，請留意期限。',
            size: 'sm',
            color: '#374151',
            wrap: true
          },
          {
            type: 'text',
            text: '活動資訊將於官方管道公告，\n參與分享，掌握專屬優惠！',
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
        { label: '獲得張數', value: `+${tokenAmount}` },
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
              label: '查詢張數',
              text: '張數'
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

/**
 * 教學第一部分 Flex Message
 */
function generateTutorialPart1FlexMessage() {
        return {
    type: 'flex',
    altText: '功能說明 - 第一部分',
    contents: {
    type: 'bubble',
      hero: {
      type: 'box',
      layout: 'vertical',
      contents: [
          {
            type: 'text',
            text: '📸 功能說明',
            weight: 'bold',
            size: 'xxl',
            color: '#FFFFFF',
            align: 'center'
          },
          {
            type: 'text',
            text: '第一部分：創建貼圖',
            size: 'md',
            color: '#E6FFE9',
            align: 'center',
            margin: 'sm'
          }
        ],
        paddingAll: '20px',
        backgroundColor: '#06C755'
    },
      body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
            text: '🎨 三步驟創建專屬貼圖',
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
            {
                type: 'text',
                text: '1️⃣ 輸入貼圖組名稱',
                size: 'sm',
                color: '#111827',
                wrap: true
        },
        {
                type: 'text',
                text: '2️⃣ 上傳一張清晰大頭照',
                size: 'sm',
                color: '#111827',
                wrap: true
              },
              {
            type: 'text',
                text: '3️⃣ 選擇繪畫風格、人物大小、問侯話語',
                size: 'sm',
                color: '#111827',
                wrap: true
              },
              {
                type: 'text',
                text: '4️⃣ AI 自動生成 8-40 張貼圖',
                size: 'sm',
                color: '#111827',
                wrap: true
              }
            ]
          },
          {
            type: 'separator',
            margin: 'xl'
          },
          {
            type: 'text',
            text: '💡 小提示',
            weight: 'bold',
            size: 'sm',
            margin: 'xl',
            color: '#06C755'
          },
          {
            type: 'text',
            text: '• 照片建議：正面清晰、背景簡單\n• 生成時間：約 1-2 分鐘\n• 符合 LINE 官方規格，可直接上架',
            size: 'xs',
            color: '#666666',
            wrap: true
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
              label: '下一頁：我的貼圖',
              text: '功能說明2'
            },
            color: '#06C755'
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'message',
              label: '🎨 立即創建',
              text: '創建貼圖'
            }
        }
        ],
        paddingAll: '20px'
      }
  }
  };
}

/**
 * 教學第二部分 Flex Message
 */
function generateTutorialPart2FlexMessage() {
  return {
    type: 'flex',
    altText: '功能說明 - 第二部分',
    contents: {
    type: 'bubble',
      hero: {
      type: 'box',
      layout: 'vertical',
      contents: [
          {
            type: 'text',
            text: '📁 功能說明',
            weight: 'bold',
            size: 'xxl',
            color: '#FFFFFF',
            align: 'center'
          },
          {
            type: 'text',
            text: '第二部分：我的貼圖',
            size: 'md',
            color: '#E6FFE9',
            align: 'center',
            margin: 'sm'
          }
        ],
        paddingAll: '20px',
        backgroundColor: '#06C755'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
          {
            type: 'text',
            text: '📦 管理你的貼圖作品',
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
              {
                type: 'text',
                text: '📥 查看已生成的貼圖組',
                size: 'sm',
                color: '#111827',
                wrap: true
              },
              {
                type: 'text',
                text: '⬇️ 下載貼圖包（ZIP 格式）',
                size: 'sm',
                color: '#111827',
                wrap: true
              },
              {
                type: 'text',
                text: '📤 一鍵上傳到 LINE Creators',
                size: 'sm',
                color: '#111827',
                wrap: true
              },
              {
                type: 'text',
                text: '🗑️ 刪除不需要的貼圖組',
                size: 'sm',
                color: '#111827',
                wrap: true
              }
      ]
          },
          {
            type: 'separator',
            margin: 'xl'
          },
          {
            type: 'text',
            text: '💡 小提示',
            weight: 'bold',
            size: 'sm',
            margin: 'xl',
            color: '#06C755'
          },
          {
            type: 'text',
            text: '• 貼圖會自動去背、調整尺寸\n• 下載後可直接上傳到 LINE Creators\n• 支援批次下載多組貼圖',
            size: 'xs',
            color: '#666666',
            wrap: true
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
              label: '下一頁：早安圖',
              text: '功能說明3'
            },
            color: '#06C755'
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'message',
              label: '📁 我的貼圖',
              text: '我的貼圖'
            }
          }
        ],
        paddingAll: '20px'
      }
    }
  };
}

/**
 * 教學第三部分 Flex Message（早安圖說明）
 */
function generateTutorialPart3FlexMessage() {
  return {
    type: 'flex',
    altText: '功能說明 - 第三部分',
    contents: {
    type: 'bubble',
      hero: {
      type: 'box',
      layout: 'vertical',
      contents: [
          {
            type: 'text',
            text: '🌅 功能說明',
            weight: 'bold',
            size: 'xxl',
            color: '#FFFFFF',
            align: 'center'
          },
          {
            type: 'text',
            text: '第三部分：早安圖',
            size: 'md',
            color: '#E6FFE9',
            align: 'center',
            margin: 'sm'
          }
        ],
        paddingAll: '20px',
        backgroundColor: '#06C755'
    },
      body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
            text: '🌅 每日早安圖',
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
            {
                type: 'text',
                text: '📅 每日自動更新',
                size: 'sm',
                color: '#111827',
                wrap: true
              },
              {
                type: 'text',
                text: '🎨 結合節氣與祝福語',
                size: 'sm',
                color: '#111827',
                wrap: true
        },
        {
          type: 'text',
                text: '💬 可分享給好友',
                size: 'sm',
                color: '#111827',
                wrap: true
              },
              {
                type: 'text',
                text: '🆓 完全免費使用',
                size: 'sm',
                color: '#111827',
                wrap: true
              }
            ]
          },
          {
            type: 'separator',
            margin: 'xl'
          },
          {
            type: 'text',
            text: '💡 小提示',
            weight: 'bold',
            size: 'sm',
            margin: 'xl',
            color: '#06C755'
          },
          {
            type: 'text',
            text: '• 早安圖每日凌晨自動更新\n• 結合當日節氣與祝福語\n• 可分享給好友或群組',
          size: 'xs',
          color: '#666666',
            wrap: true
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
              label: '🌅 查看早安圖',
              text: '早安圖'
            },
            color: '#06C755'
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'message',
              label: '🎨 創建貼圖',
              text: '創建貼圖'
            }
          }
        ],
        paddingAll: '20px'
      }
    }
  };
}

/**
 * 檢查是否需要顯示教學（新用戶或很久沒上線）
 */
async function shouldShowTutorial(userId) {
  try {
    const supabase = getSupabaseClient();
    
    // 檢查用戶的教學顯示記錄
    const { data, error } = await supabase
      .from('users')
      .select('tutorial_shown_at, created_at')
      .eq('line_user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('檢查教學狀態失敗:', error);
      return false;
    }

    // 如果用戶不存在，視為新用戶
    if (!data) {
      return true;
    }

    // 如果從未顯示過教學，需要顯示
    if (!data.tutorial_shown_at) {
      return true;
    }

    // 如果超過 30 天沒顯示過教學，再次顯示
    const lastShown = new Date(data.tutorial_shown_at);
    const daysSinceShown = (Date.now() - lastShown.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceShown > 30;
  } catch (error) {
    console.error('檢查教學狀態異常:', error);
    return false;
  }
}

/**
 * 標記教學已顯示
 */
async function markTutorialShown(userId) {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('users')
      .update({ tutorial_shown_at: new Date().toISOString() })
      .eq('line_user_id', userId);

    if (error) {
      console.error('標記教學已顯示失敗:', error);
    }
  } catch (error) {
    console.error('標記教學已顯示異常:', error);
  }
}

/**
 * 生成風格選擇 Flex Message
 */
function generateStyleSelectionFlexMessage(styles) {
  if (!styles || !Array.isArray(styles) || styles.length === 0) {
    // 如果沒有繪畫風格，使用預設繪畫風格
    styles = Object.values(StickerStyles);
  }

  // 限制最多顯示 12 個繪畫風格（LINE Flex Message 限制）
  const displayStyles = styles.slice(0, 12);

  // 將繪畫風格轉換為按鈕（單欄）
  const styleButtons = displayStyles.map((style) => {
    const styleId = style.style_id || style.id;
    const styleName = style.name || '未知繪畫風格';
    const styleEmoji = style.emoji || '🎨';
    
    return {
      type: 'button',
      style: 'primary',
      height: 'sm',
      action: {
        type: 'message',
        label: `${styleEmoji} ${styleName}`,
        text: `繪畫風格:${styleId}`
      },
      color: '#FF6B6B' // 統一使用粉色
    };
  });

  return {
    type: 'flex',
    altText: '選擇繪畫風格',
    contents: {
      type: 'bubble',
      size: 'giga',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎨 選擇繪畫風格',
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF',
            align: 'center'
          },
          {
            type: 'text',
            text: '請選擇一個你喜歡的繪畫風格',
            size: 'sm',
            color: '#FFFFFFE6',
            align: 'center',
            margin: 'sm'
          }
        ],
        paddingAll: '20px',
        backgroundColor: '#FF6B6B' // 主題色改為粉色
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md', // 增加按鈕間距
        contents: styleButtons,
        paddingTop: '20px',
        paddingBottom: '20px',
        paddingStart: '20px',
        paddingEnd: '20px'
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
              label: '❌ 取消',
              text: '取消'
            }
          }
        ],
        paddingAll: '20px'
      }
    },
    quickReply: {
      items: displayStyles.slice(0, 5).map((style, index) => {
        const styleId = style.style_id || style.id || `style_${index}`;
        const styleName = style.name || style.style_name || '未知風格';
        const styleEmoji = style.emoji || '🎨';
        return {
          type: 'action',
          action: {
            type: 'message',
            label: `${styleEmoji} ${styleName}`,
            text: `繪畫風格:${styleId}`
          }
        };
      })
    }
  };
}

/**
 * 生成表情選擇 Flex Message
 */
async function getExpressionTemplates() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('expression_template_settings')
      .select('*')
      .eq('is_active', true)
      .order('template_id', { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      return data.map(t => ({ id: t.template_id, name: t.name, emoji: t.emoji }));
    }
  } catch (error) {
    console.error('從資料庫讀取表情模板失敗:', error);
  }
  // Fallback to default if DB fails
  return Object.values(DefaultExpressions || {});
}

/**
 * 生成表情選擇 Flex Message
 */
async function generateExpressionSelectionFlexMessage() {
  const templates = await getExpressionTemplates();

  // 將問侯話語轉換為按鈕（單欄、同色系）
  const templateButtons = templates.map((template) => ({
    type: 'button',
    style: 'primary',
    height: 'sm',
    action: {
      type: 'message',
      label: `${template.emoji} ${template.name}`,
      text: `問侯話語:${template.id}`
    },
    color: '#FF6B6B'
  }));

  return {
    type: 'flex',
    altText: '選擇問侯話語',
    contents: {
      type: 'bubble',
      size: 'giga',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '💬 選擇問侯話語',
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF',
            align: 'center'
          },
          {
            type: 'text',
            text: '選擇要生成的問侯話語分類',
            size: 'sm',
            color: '#FFFFFFE6',
            align: 'center',
            margin: 'sm'
          }
        ],
        paddingAll: '20px',
        backgroundColor: '#FF6B6B'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: templateButtons.length > 0
          ? templateButtons
          : [
              {
                type: 'text',
                text: '暫無可用問侯話語',
                size: 'sm',
                color: '#666666',
                align: 'center'
              }
            ],
        paddingTop: '20px',
        paddingBottom: '20px',
        paddingStart: '20px',
        paddingEnd: '20px'
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
              label: '❌ 取消',
              text: '取消'
            }
          }
        ],
        paddingAll: '20px'
      }
    },
    quickReply: {
      items: [
        ...templates.slice(0, 6).map((template) => ({
          type: 'action',
          action: {
            type: 'message',
            label: `${template.emoji} ${template.name}`,
            text: `問侯話語:${template.id}`
          }
        })),
        {
          type: 'action',
          action: {
            type: 'message',
            label: '❌ 取消',
            text: '取消'
          }
        }
      ]
    }
  };
}

module.exports = {
  generateWelcomeFlexMessage,
  generateCouponRedeemPromptFlexMessage,
  generateCouponRedeemResultFlexMessage,
  generateTutorialPart1FlexMessage,
  generateTutorialPart2FlexMessage,
  generateTutorialPart3FlexMessage,
  shouldShowTutorial,
  markTutorialShown,
  generateStyleSelectionFlexMessage,
  generateExpressionSelectionFlexMessage
};
