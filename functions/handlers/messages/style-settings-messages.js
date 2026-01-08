const { getSupabaseClient } = require('../../supabase-client');
const { StickerStyles } = require('../../sticker-styles');

/**
 * 計算風格總字數（用於排序）
 */
function calculateStyleCharCount(style) {
  const fields = [
    style.core_style || '',
    style.lighting || '',
    style.composition || '',
    style.brushwork || '',
    style.mood || '',
    style.color_palette || '',
    style.description || '',
    style.forbidden || '',
    style.reference || '',
  ];
  return fields.join('').length;
}

/**
 * 從資料庫讀取啟用的風格設定（按字數從大到小排序）
 */
async function getActiveStyles() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('style_settings')
      .select('*')
      .eq('is_active', true)
      .order('style_id');

    if (error) {
      console.error('讀取風格設定失敗:', error);
      // 如果資料庫讀取失敗，返回預設風格
      return Object.values(StickerStyles);
    }

    // 如果沒有資料，返回預設風格
    if (!data || data.length === 0) {
      console.log('資料庫無風格設定，使用預設值');
      return Object.values(StickerStyles);
    }

    // 🆕 按字數從大到小排序
    const sortedData = [...data].sort((a, b) => {
      const countA = calculateStyleCharCount(a);
      const countB = calculateStyleCharCount(b);
      return countB - countA; // 從大到小
    });

    console.log(
      `📊 風格已按字數排序（最多 ${calculateStyleCharCount(sortedData[0])} 字元 → 最少 ${calculateStyleCharCount(sortedData[sortedData.length - 1])} 字元）`
    );

    return sortedData;
  } catch (error) {
    console.error('讀取風格設定異常:', error);
    return Object.values(StickerStyles);
  }
}

/**
 * 根據 ID 從資料庫讀取單一風格設定
 */
async function getStyleById(styleId) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('style_settings')
      .select('*')
      .eq('style_id', styleId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('讀取風格失敗，使用預設值:', error);
      // 如果資料庫讀取失敗，返回預設風格
      return StickerStyles[styleId];
    }

    return data;
  } catch (error) {
    console.error('讀取風格異常:', error);
    return StickerStyles[styleId];
  }
}

module.exports = {
  calculateStyleCharCount,
  getActiveStyles,
  getStyleById,
};
