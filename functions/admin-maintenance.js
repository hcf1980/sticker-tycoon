/**
 * Admin Maintenance API
 * - 回傳目前維護模式狀態（GET）
 * - 透過環境變數切換維護模式（POST）
 *
 * 安全性：
 * - 使用 ADMIN_API_KEY（header: X-Admin-Api-Key）做最小化保護
 *
 * 注意：
 * - 在 Netlify 上「寫入環境變數」屬於平台層級操作，Function 本身無法永久修改。
 * - 因此這支 API 目前設計為：
 *   - GET：回傳 process.env 的狀態
 *   - POST：僅回傳“建議你設定的值”，並提供提示（不做永久寫入）
 * - 若你希望真的在網頁上“即時切換且持久”，需要把狀態存到 Supabase（建議）或其他 KV。
 */

const { z } = require('zod');
const { getMaintenanceConfig, json } = require('./maintenance-config');

function requireAdmin(event) {
  const required = process.env.ADMIN_API_KEY;
  if (!required) {
    console.warn('⚠️ ADMIN_API_KEY 未設定：管理 API 將缺少額外保護');
    return;
  }

  const key = event.headers?.['x-admin-api-key'] || event.headers?.['X-Admin-Api-Key'];
  if (!key || key !== required) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }
}

const PostSchema = z.object({
  isEnabled: z.boolean()
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, {});
  }

  try {
    if (event.httpMethod === 'GET') {
      return json(200, {
        success: true,
        maintenance: getMaintenanceConfig()
      });
    }

    if (event.httpMethod === 'POST') {
      requireAdmin(event);

      const parsed = PostSchema.safeParse(JSON.parse(event.body || '{}'));
      if (!parsed.success) {
        return json(400, { success: false, error: 'Invalid payload' });
      }

      const nextIsEnabled = parsed.data.isEnabled;

      return json(200, {
        success: true,
        note:
          '此 API 目前無法永久寫入 Netlify 環境變數（Functions 無法直接修改平台設定）。\n' +
          '若要“網頁即時切換且持久”，建議改存 Supabase 設定表；我可以接著幫你改成那種版本。',
        nextSuggestedEnv: {
          MAINTENANCE_MODE: nextIsEnabled ? 'true' : 'false'
        },
        maintenance: {
          ...getMaintenanceConfig(),
          isEnabled: nextIsEnabled
        }
      });
    }

    return json(405, { success: false, error: 'Method not allowed' });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    return json(statusCode, { success: false, error: statusCode === 401 ? 'Unauthorized' : 'Server error' });
  }
};
