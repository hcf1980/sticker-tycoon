/**
 * 風格設定載入器
 * 優先從資料庫讀取，如果沒有則使用程式碼預設值
 */

const { getSupabaseClient } = require('./supabase-client');
const { globalCache } = require('./utils/cache-manager');

/**
 * 從資料庫載入風格設定
 */
async function loadStyleSettings() {
  const cacheKey = 'style_settings:all';
  
  // 先檢查快取
  const cached = globalCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('style_settings')
      .select('*')
      .eq('is_active', true)
      .order('style_id');

    if (error) throw error;

    if (!data || data.length === 0) {
      return null; // 返回 null 表示使用預設值
    }

    // 轉換為 StyleEnhancer 格式
    const styleEnhancer = {};
    data.forEach(style => {
      styleEnhancer[style.style_id] = {
        coreStyle: style.core_style,
        lighting: style.lighting,
        composition: style.composition,
        brushwork: style.brushwork,
        mood: style.mood,
        colorPalette: style.color_palette,
        forbidden: style.forbidden,
        reference: style.reference
      };
    });

    // 快取 30 分鐘
    globalCache.set(cacheKey, styleEnhancer, 1800000);

    return styleEnhancer;

  } catch (error) {
    console.error('從資料庫載入風格設定失敗:', error);
    return null; // 失敗時使用預設值
  }
}

/**
 * 從資料庫載入構圖設定
 */
async function loadFramingSettings() {
  const cacheKey = 'framing_settings:all';
  
  const cached = globalCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('framing_settings')
      .select('*')
      .eq('is_active', true)
      .order('framing_id');

    if (error) throw error;

    if (!data || data.length === 0) {
      return null;
    }

    // 轉換為 FramingTemplates 格式
    const framingTemplates = {};
    data.forEach(framing => {
      framingTemplates[framing.framing_id] = {
        id: framing.framing_id,
        name: framing.name,
        emoji: framing.emoji,
        description: framing.description,
        promptAddition: framing.prompt_addition,
        characterFocus: framing.character_focus
      };
    });

    globalCache.set(cacheKey, framingTemplates, 1800000);

    return framingTemplates;

  } catch (error) {
    console.error('從資料庫載入構圖設定失敗:', error);
    return null;
  }
}

/**
 * 從資料庫載入裝飾風格設定
 */
async function loadSceneSettings() {
  const cacheKey = 'scene_settings:all';
  
  const cached = globalCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('scene_settings')
      .select('*')
      .eq('is_active', true)
      .order('scene_id');

    if (error) throw error;

    if (!data || data.length === 0) {
      return null;
    }

    // 轉換為 SceneTemplates 格式
    const sceneTemplates = {};
    data.forEach(scene => {
      sceneTemplates[scene.scene_id] = {
        id: scene.scene_id,
        name: scene.name,
        emoji: scene.emoji,
        description: scene.description,
        decorationStyle: scene.decoration_style,
        decorationElements: scene.decoration_elements,
        popTextStyle: scene.pop_text_style
      };
    });

    globalCache.set(cacheKey, sceneTemplates, 1800000);

    return sceneTemplates;

  } catch (error) {
    console.error('從資料庫載入裝飾風格設定失敗:', error);
    return null;
  }
}

/**
 * 清除風格設定快取
 */
function clearStyleSettingsCache() {
  globalCache.delete('style_settings:all');
  globalCache.delete('framing_settings:all');
  globalCache.delete('scene_settings:all');
  console.log('✅ 風格設定快取已清除');
}

module.exports = {
  loadStyleSettings,
  loadFramingSettings,
  loadSceneSettings,
  clearStyleSettingsCache
};

