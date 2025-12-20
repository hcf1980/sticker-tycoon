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
            color: '#888888',
            margin: 'sm'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'md',
            action: {
              type: 'message',
              label: '🚀 開始創建貼圖',
              text: '創建貼圖'
            },
            color: '#FF6B6B'
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'secondary',
                height: 'sm',
                flex: 1,
                action: {
                  type: 'message',
                  label: '📖 功能說明',
                  text: '功能說明'
                }
              },
              {
                type: 'button',
                style: 'secondary',
                height: 'sm',
                flex: 1,
                action: {
                  type: 'message',
                  label: '📁 我的貼圖',
                  text: '我的貼圖'
                }
              }
            ]
          },
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'message',
              label: '🎁 分享給好友賺代幣',
              text: '分享給好友'
            }
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            paddingAll: 'sm',
            backgroundColor: '#FFF3E0',
            cornerRadius: 'md',
            contents: [
              {
                type: 'text',
                text: '🎁 分享給好友，雙方各得 10 代幣！',
                size: 'xs',
                color: '#E65100',
                align: 'center',
                weight: 'bold'
              }
            ]
          }
        ],
        flex: 0
      }
    },
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
        { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
        { type: 'action', action: { type: 'message', label: '🎁 分享給好友', text: '分享給好友' } }
      ]
    }
  };
}

/**
 * 風格選擇 Flex Message
 * @param {Array} styles - 從資料庫讀取的風格設定陣列，如果為空則使用預設值
 */
function generateStyleSelectionFlexMessage(styles = null) {
  // 如果沒有提供風格資料，使用預設的 StickerStyles
  const styleList = styles || Object.values(StickerStyles);

  // 將資料庫格式轉換為按鈕格式
  const styleButtons = styleList.map(style => ({
    type: 'button',
    style: 'secondary',
    height: 'sm',
    action: {
      type: 'message',
      label: `${style.emoji} ${style.name}`,
      text: `風格:${style.style_id || style.id}`
    },
    margin: 'sm'
  }));

  // Quick Reply 項目
  const quickReplyItems = styleList.map(style => ({
    type: 'action',
    action: {
      type: 'message',
      label: `${style.emoji} ${style.name}`,
      text: `風格:${style.style_id || style.id}`
    }
  }));
  quickReplyItems.push({
    type: 'action',
    action: { type: 'message', label: '❌ 取消', text: '取消' }
  });

  return {
    type: 'flex',
    altText: '請選擇貼圖風格',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎨 選擇貼圖風格',
            weight: 'bold',
            size: 'lg',
            color: '#FF6B6B'
          },
          {
            type: 'text',
            text: '請選擇你喜歡的風格：',
            size: 'sm',
            color: '#666666',
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: styleButtons.slice(0, 4)
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            contents: styleButtons.slice(4)
          }
        ]
      }
    },
    quickReply: {
      items: quickReplyItems.slice(0, 13) // LINE 最多 13 個 Quick Reply
    }
  };
}

/**
 * 表情選擇 Flex Message（從資料庫動態載入）
 * @param {Array} templates - 從資料庫讀取的表情模板陣列
 */
async function generateExpressionSelectionFlexMessage(templates = null) {
  // 如果沒有提供模板，從資料庫載入
  let templateList = templates;

  if (!templateList) {
    try {
      const { getSupabaseClient } = require('./supabase-client');
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('expression_template_settings')
        .select('*')
        .eq('is_active', true)
        .order('template_id');

      if (error) throw error;

      // 轉換格式：template_id -> id, 保持相容性
      templateList = (data || []).map(t => ({
        id: t.template_id,
        name: t.name,
        emoji: t.emoji,
        expressions: t.expressions
      }));

      console.log(`✅ 從資料庫載入 ${templateList.length} 個表情模板`);
    } catch (error) {
      console.error('❌ 從資料庫載入表情模板失敗，使用預設值:', error);
      // 降級到硬編碼的 DefaultExpressions
      const { DefaultExpressions } = require('./sticker-styles');
      templateList = Object.values(DefaultExpressions);
    }
  }

  const templateButtons = templateList.map(template => ({
    type: 'button',
    style: 'secondary',
    height: 'sm',
    action: {
      type: 'message',
      label: `${template.emoji || '😀'} ${template.name}`,
      text: `表情模板:${template.id}`
    },
    margin: 'sm'
  }));

  // Quick Reply 項目
  const quickReplyItems = templateList.map(template => ({
    type: 'action',
    action: {
      type: 'message',
      label: `${template.emoji || '😀'} ${template.name}`,
      text: `表情模板:${template.id}`
    }
  }));
  quickReplyItems.push({
    type: 'action',
    action: { type: 'message', label: '❌ 取消', text: '取消' }
  });

  return {
    type: 'flex',
    altText: '請選擇表情模板',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '😀 選擇表情模板', weight: 'bold', size: 'lg', color: '#FF6B6B' },
          { type: 'text', text: '選擇預設模板', size: 'sm', color: '#666666', margin: 'md' },
          { type: 'separator', margin: 'lg' },
          { type: 'box', layout: 'vertical', margin: 'lg', contents: templateButtons }
        ]
      }
    },
    quickReply: {
      items: quickReplyItems.slice(0, 13)
    }
  };
}

/**
 * 檢查是否應該顯示功能說明（每週最多一次）
 */
async function shouldShowTutorial(userId) {
  try {
    const supabase = getSupabaseClient();

    // 查詢用戶的最後一次教學顯示時間
    const { data, error } = await supabase
      .from('users')
      .select('last_tutorial_shown_at')
      .eq('line_user_id', userId)
      .single();

    if (error) {
      console.error('查詢教學顯示時間失敗:', error);
      return true; // 錯誤時預設顯示
    }

    // 如果從未顯示過，應該顯示
    if (!data || !data.last_tutorial_shown_at) {
      return true;
    }

    // 檢查是否超過 7 天
    const lastShown = new Date(data.last_tutorial_shown_at);
    const now = new Date();
    const daysDiff = (now - lastShown) / (1000 * 60 * 60 * 24);

    return daysDiff >= 7;
  } catch (error) {
    console.error('檢查教學顯示條件失敗:', error);
    return true; // 錯誤時預設顯示
  }
}

/**
 * 記錄教學已顯示
 */
async function markTutorialShown(userId) {
  try {
    const supabase = getSupabaseClient();

    await supabase
      .from('users')
      .update({ last_tutorial_shown_at: new Date().toISOString() })
      .eq('line_user_id', userId);

    console.log(`✅ 已記錄教學顯示時間: ${userId}`);
  } catch (error) {
    console.error('記錄教學顯示時間失敗:', error);
  }
}

/**
 * 完整功能說明 Flex Message（第一部分：基本操作）
 */
function generateTutorialPart1FlexMessage() {
  return {
    type: 'flex',
    altText: '📖 貼圖大亨 - 完整功能說明（1/2）',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📖 完整功能說明',
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF'
          },
          {
            type: 'text',
            text: '第 1 部分：基本操作',
            size: 'sm',
            color: '#FFFFFF',
            margin: 'sm'
          }
        ],
        backgroundColor: '#FF6B6B',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎨 創建貼圖流程',
            weight: 'bold',
            size: 'lg',
            color: '#333333'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: '1️⃣', size: 'md', flex: 0, margin: 'none' },
                  {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    contents: [
                      { type: 'text', text: '輸入「創建貼圖」開始', size: 'sm', weight: 'bold', color: '#333333' },
                      { type: 'text', text: '設定貼圖組名稱', size: 'xs', color: '#666666', margin: 'xs' }
                    ]
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  { type: 'text', text: '2️⃣', size: 'md', flex: 0 },
                  {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    contents: [
                      { type: 'text', text: '上傳你的照片', size: 'sm', weight: 'bold', color: '#333333' },
                      { type: 'text', text: '建議：正面清晰大頭照', size: 'xs', color: '#666666', margin: 'xs' }
                    ]
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  { type: 'text', text: '3️⃣', size: 'md', flex: 0 },
                  {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    contents: [
                      { type: 'text', text: '選擇風格與構圖', size: 'sm', weight: 'bold', color: '#333333' },
                      { type: 'text', text: '可愛風、寫實風、Q版等', size: 'xs', color: '#666666', margin: 'xs' }
                    ]
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  { type: 'text', text: '4️⃣', size: 'md', flex: 0 },
                  {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    contents: [
                      { type: 'text', text: '選擇表情與數量', size: 'sm', weight: 'bold', color: '#333333' },
                      { type: 'text', text: '8-40 張，每 6 張 = 3 代幣', size: 'xs', color: '#666666', margin: 'xs' }
                    ]
                  }
                ]
              }
            ]
          },
          { type: 'separator', margin: 'xl' },
          {
            type: 'text',
            text: '💰 代幣說明',
            weight: 'bold',
            size: 'lg',
            color: '#333333',
            margin: 'xl'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            backgroundColor: '#FFF3E0',
            cornerRadius: 'md',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '🎁 新用戶免費 40 代幣', size: 'sm', color: '#E65100', weight: 'bold' },
              { type: 'text', text: '📊 每 6 張貼圖 = 3 代幣', size: 'xs', color: '#666666', margin: 'sm' },
              { type: 'text', text: '🎯 18 張完整包 = 9 代幣', size: 'xs', color: '#666666', margin: 'xs' },
              { type: 'text', text: '💎 40 張最大包 = 20 代幣', size: 'xs', color: '#666666', margin: 'xs' }
            ]
          }
        ],
        paddingAll: '20px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#FF6B6B',
            action: {
              type: 'message',
              label: '👉 查看第 2 部分',
              text: '功能說明2'
            }
          },
          {
            type: 'button',
            style: 'link',
            action: {
              type: 'message',
              label: '🚀 立即開始創建',
              text: '創建貼圖'
            }
          }
        ],
        spacing: 'sm'
      }
    },
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: '👉 功能說明2', text: '功能說明2' } },
        { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
        { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } }
      ]
    }
  };
}

/**
 * 完整功能說明 Flex Message（第二部分：進階功能與注意事項）
 */
function generateTutorialPart2FlexMessage() {
  return {
    type: 'flex',
    altText: '📖 貼圖大亨 - 完整功能說明（2/2）',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📖 完整功能說明',
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF'
          },
          {
            type: 'text',
            text: '第 2 部分：進階功能',
            size: 'sm',
            color: '#FFFFFF',
            margin: 'sm'
          }
        ],
        backgroundColor: '#06C755',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📁 管理貼圖',
            weight: 'bold',
            size: 'lg',
            color: '#333333'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            contents: [
              { type: 'text', text: '• 輸入「我的貼圖」查看所有貼圖組', size: 'sm', color: '#555555' },
              { type: 'text', text: '• 輸入「查詢進度」查看生成狀態', size: 'sm', color: '#555555' },
              { type: 'text', text: '• 輸入「代幣」查詢剩餘代幣', size: 'sm', color: '#555555' },
              { type: 'text', text: '• 點擊「管理待上傳」準備打包', size: 'sm', color: '#555555' }
            ]
          },
          { type: 'separator', margin: 'xl' },
          {
            type: 'text',
            text: '🎁 賺取代幣',
            weight: 'bold',
            size: 'lg',
            color: '#333333',
            margin: 'xl'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            backgroundColor: '#E8F5E9',
            cornerRadius: 'md',
            paddingAll: 'md',
            contents: [
              { type: 'text', text: '📤 分享給好友，雙方各得 10 代幣', size: 'sm', color: '#2E7D32', weight: 'bold' },
              { type: 'text', text: '👥 最多推薦 3 位好友 = 30 代幣', size: 'xs', color: '#666666', margin: 'sm' },
              { type: 'text', text: '🎬 YouTuber 推廣計畫另有優惠', size: 'xs', color: '#666666', margin: 'xs' }
            ]
          },
          { type: 'separator', margin: 'xl' },
          {
            type: 'text',
            text: '⚠️ 重要注意事項',
            weight: 'bold',
            size: 'lg',
            color: '#FF6B6B',
            margin: 'xl'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            backgroundColor: '#FFEBEE',
            cornerRadius: 'md',
            paddingAll: 'md',
            contents: [
              {
                type: 'text',
                text: '📸 照片品質',
                size: 'sm',
                weight: 'bold',
                color: '#C62828'
              },
              {
                type: 'text',
                text: '• 正面清晰大頭照效果最佳\n• 光線充足、背景簡單\n• 避免側臉、遮擋、模糊',
                size: 'xs',
                color: '#666666',
                margin: 'xs',
                wrap: true
              },
              {
                type: 'text',
                text: '⏱️ 生成時間',
                size: 'sm',
                weight: 'bold',
                color: '#C62828',
                margin: 'md'
              },
              {
                type: 'text',
                text: '• 通常 2-5 分鐘完成\n• 高峰期可能需要 5-10 分鐘\n• 完成後會自動通知',
                size: 'xs',
                color: '#666666',
                margin: 'xs',
                wrap: true
              },
              {
                type: 'text',
                text: '📦 上傳 LINE',
                size: 'sm',
                weight: 'bold',
                color: '#C62828',
                margin: 'md'
              },
              {
                type: 'text',
                text: '• 需滿 40 張才能打包\n• 下載 ZIP 檔案\n• 到 LINE Creators Market 上傳\n• 審核通過後即可販售',
                size: 'xs',
                color: '#666666',
                margin: 'xs',
                wrap: true
              }
            ]
          },
          { type: 'separator', margin: 'xl' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            backgroundColor: '#FFF3E0',
            cornerRadius: 'md',
            paddingAll: 'md',
            contents: [
              {
                type: 'text',
                text: '💡 小提示',
                size: 'sm',
                weight: 'bold',
                color: '#E65100'
              },
              {
                type: 'text',
                text: '• 隨時輸入「取消」可重新開始\n• 輸入「示範圖集」查看範例\n• 有問題輸入「客服」聯繫我們',
                size: 'xs',
                color: '#666666',
                margin: 'xs',
                wrap: true
              }
            ]
          }
        ],
        paddingAll: '20px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            action: {
              type: 'message',
              label: '🚀 開始創建貼圖',
              text: '創建貼圖'
            }
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            margin: 'sm',
            contents: [
              {
                type: 'button',
                style: 'link',
                flex: 1,
                action: {
                  type: 'message',
                  label: '📁 我的貼圖',
                  text: '我的貼圖'
                }
              },
              {
                type: 'button',
                style: 'link',
                flex: 1,
                action: {
                  type: 'message',
                  label: '🎁 分享賺幣',
                  text: '分享給好友'
                }
              }
            ]
          }
        ],
        spacing: 'sm'
      }
    },
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: '🎨 創建貼圖', text: '創建貼圖' } },
        { type: 'action', action: { type: 'message', label: '📁 我的貼圖', text: '我的貼圖' } },
        { type: 'action', action: { type: 'message', label: '🎁 分享給好友', text: '分享給好友' } }
      ]
    }
  };
}

module.exports = {
  generateWelcomeFlexMessage,
  generateStyleSelectionFlexMessage,
  generateExpressionSelectionFlexMessage,
  generateTutorialPart1FlexMessage,
  generateTutorialPart2FlexMessage,
  shouldShowTutorial,
  markTutorialShown
};

