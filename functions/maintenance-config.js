/**
 * Maintenance Config
 *
 * NOTE:
 * - 目前使用環境變數（NETLIFY / Functions）做全域即時切換。
 * - 若未來要改成資料庫/後台設定，可在此處做統一封裝。
 */

function getMaintenanceConfig() {
  const isEnabled = String(process.env.MAINTENANCE_MODE || '').toLowerCase() === 'true';
  const mode = process.env.MAINTENANCE_MODE_TYPE || 'create';

  return {
    isEnabled,
    mode,
    message: {
      title: '網站施工中',
      body:
        '目前維修團隊正在處理中，請您體諒。\n' +
        '依問題嚴重性可能需要 4～24 小時處理，我們將儘快修復。\n' +
        '屆時會恢復原有狀態，請勿擔心。\n\n' +
        '其他一般性功能（例如：我的貼圖、下載貼圖等）不受影響，仍可繼續操作。'
    }
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Api-Key',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

module.exports = {
  getMaintenanceConfig,
  json
};
