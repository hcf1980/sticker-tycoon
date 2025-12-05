/**
 * Profile 更新器
 * 非同步更新用戶 Profile，不阻塞主要回應流程
 */

const { getLineClient } = require('../services/line-client');
const { getOrCreateUser } = require('../supabase-client');
const { globalCache } = require('./cache-manager');

// 記錄最近更新的用戶，避免頻繁更新
const recentlyUpdated = new Map();
const UPDATE_INTERVAL = 3600000; // 1 小時內不重複更新

/**
 * 非同步更新用戶 Profile
 * 只在必要時才從 LINE API 取得 Profile 並更新
 */
async function updateUserProfileAsync(userId) {
  try {
    // 檢查是否最近已更新過
    const lastUpdate = recentlyUpdated.get(userId);
    if (lastUpdate && Date.now() - lastUpdate < UPDATE_INTERVAL) {
      return; // 跳過更新
    }

    // 標記為已更新
    recentlyUpdated.set(userId, Date.now());

    // 非同步取得 Profile 並更新
    const profile = await getLineClient().getProfile(userId);
    await getOrCreateUser(userId, profile.displayName, profile.pictureUrl);
    
    console.log(`✅ 非同步更新用戶 Profile: ${userId}`);
  } catch (error) {
    console.log(`⚠️ 非同步更新 Profile 失敗: ${error.message}`);
  }
}

/**
 * 排程更新用戶 Profile（不等待結果）
 */
function scheduleProfileUpdate(userId) {
  // 使用 setImmediate 或 setTimeout 確保不阻塞當前執行
  setImmediate(() => {
    updateUserProfileAsync(userId).catch(err => {
      console.error('排程更新 Profile 失敗:', err);
    });
  });
}

/**
 * 清理過期的更新記錄
 */
function cleanupUpdateRecords() {
  const now = Date.now();
  for (const [userId, timestamp] of recentlyUpdated.entries()) {
    if (now - timestamp > UPDATE_INTERVAL) {
      recentlyUpdated.delete(userId);
    }
  }
}

// 定期清理
setInterval(cleanupUpdateRecords, 600000); // 每 10 分鐘清理一次

module.exports = {
  updateUserProfileAsync,
  scheduleProfileUpdate
};

