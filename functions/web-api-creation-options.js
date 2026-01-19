/**
 * Web API: 創建貼圖選項（從資料庫動態載入）
 *
 * 供 Web/Mini App 取得：
 * - styles（style_settings）
 * - framings（framing_settings）
 * - scenes（scene_settings，含 custom）
 * - expression templates（expression_template_settings）
 */

const { getSupabaseClient } = require('./supabase-client');
const { getActiveStyles } = require('./handlers/messages/style-settings-messages');
const {
  loadFramingSettings,
  loadSceneSettings,
  loadExpressionTemplateSettings
} = require('./style-settings-loader');
const { StickerStyles, FramingTemplates, SceneTemplates, DefaultExpressions } = require('./sticker-styles');

function getOrigin(event) {
  return event.headers.origin || event.headers.Origin || '*';
}

function normalizeStyle(style) {
  return {
    id: style.style_id || style.id,
    name: style.name,
    emoji: style.emoji,
    description: style.description || '',
  };
}

function normalizeFraming(framing) {
  return {
    id: framing.id,
    name: framing.name,
    emoji: framing.emoji,
    description: framing.description || ''
  };
}

function normalizeScene(scene) {
  return {
    id: scene.id,
    name: scene.name,
    emoji: scene.emoji,
    description: scene.description || '',
    isCustom: scene.id === 'custom'
  };
}

function normalizeExpressionTemplate(template) {
  return {
    id: template.id,
    name: template.name,
    emoji: template.emoji,
    description: template.description || '',
    expressions: Array.isArray(template.expressions) ? template.expressions : []
  };
}

exports.handler = async (event) => {
  const origin = getOrigin(event);
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '只支援 GET 方法' })
    };
  }

  try {
    // styles（優先 DB，失敗 fallback StickerStyles）
    const stylesRaw = await getActiveStyles();
    const styles = (stylesRaw || Object.values(StickerStyles)).map(normalizeStyle);

    // framings（優先 DB loader，失敗 fallback FramingTemplates）
    const dbFramings = await loadFramingSettings();
    const framingsMap = dbFramings && Object.keys(dbFramings).length > 0 ? dbFramings : FramingTemplates;
    const framings = Object.values(framingsMap).map(normalizeFraming);

    // scenes（優先 DB loader，失敗 fallback SceneTemplates）
    const dbScenes = await loadSceneSettings();
    const scenesMap = dbScenes && Object.keys(dbScenes).length > 0 ? dbScenes : SceneTemplates;
    const scenes = Object.values(scenesMap).map(normalizeScene);

    // expression templates（優先 DB loader，失敗 fallback DefaultExpressions）
    const dbTemplates = await loadExpressionTemplateSettings();
    const templatesMap = dbTemplates && Object.keys(dbTemplates).length > 0
      ? dbTemplates
      : Object.fromEntries(
          Object.entries(DefaultExpressions).map(([id, t]) => [id, { id, name: t.name, emoji: t.emoji, expressions: t.expressions }])
        );

    const expressionTemplates = Object.values(templatesMap).map(normalizeExpressionTemplate);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        styles,
        framings,
        scenes,
        expressionTemplates
      })
    };
  } catch (error) {
    console.error('取得創建選項失敗:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '系統錯誤，請稍後再試' })
    };
  }
};
