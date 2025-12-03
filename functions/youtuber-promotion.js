/**
 * YouTuber 推廣計畫 API
 * 處理 YouTuber 申請、審核、代幣發放等功能
 */

const admin = require('firebase-admin');
const axios = require('axios');

const db = admin.firestore();
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

/**
 * 提交 YouTuber 推廣申請
 */
exports.submitYoutuberApplication = async (req, res) => {
  try {
    const {
      channelName,
      channelUrl,
      subscriberCount,
      email,
      phone,
      lineId,
      channelType,
      channelDescription,
      filmingPlan,
      agreeTerms
    } = req.body;

    // 驗證必填欄位
    if (!channelName || !channelUrl || !subscriberCount || !email || !lineId) {
      return res.status(400).json({ message: '缺少必填欄位' });
    }

    // 驗證訂閱數
    if (subscriberCount < 1000) {
      return res.status(400).json({ message: '訂閱數必須達到 1000+' });
    }

    // 驗證同意條款
    if (!agreeTerms) {
      return res.status(400).json({ message: '必須同意條款才能申請' });
    }

    // 檢查是否已申請過
    const existingApp = await db.collection('youtuber_applications')
      .where('email', '==', email)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingApp.empty) {
      return res.status(400).json({ message: '你已有待審核的申請，請耐心等待' });
    }

    // 建立申請記錄
    const applicationId = db.collection('youtuber_applications').doc().id;
    const now = new Date();

    await db.collection('youtuber_applications').doc(applicationId).set({
      // 基本資訊
      channelName,
      channelUrl,
      subscriberCount,
      email,
      phone: phone || '',
      lineId,
      channelType,
      channelDescription,
      filmingPlan,

      // 狀態
      status: 'pending', // pending, approved, rejected, completed
      applicationId,
      appliedAt: now,
      approvedAt: null,
      rejectedAt: null,
      completedAt: null,

      // 代幣
      initialTokens: 0, // 前期代幣（審核通過後發放）
      completionTokens: 0, // 完成獎勵（影片通過審核後發放）
      tokensIssued: false,
      tokensIssuedAt: null,

      // 影片資訊
      videoUrl: null,
      videoTitle: null,
      videoSubmittedAt: null,
      videoApprovedAt: null,
      videoApprovalStatus: null, // pending, approved, rejected

      // 其他
      notes: '',
      adminNotes: '',
      featured: false // 是否在網頁展示
    });

    // 發送確認訊息給用戶
    await sendLineNotification(lineId, `
✅ 感謝申請！

你的申請已收到，我們會在 1-3 個工作天內審核。

📋 申請編號：${applicationId}
📺 頻道：${channelName}
👥 訂閱數：${subscriberCount}

敬請期待！
    `);

    // 發送通知給管理員
    await notifyAdmins(`
🎬 新的 YouTuber 推廣申請

頻道名稱：${channelName}
訂閱數：${subscriberCount}
Email：${email}
LINE ID：${lineId}
頻道類型：${channelType}

申請編號：${applicationId}
    `);

    res.json({
      success: true,
      message: '申請已提交，我們會盡快審核！',
      applicationId
    });

  } catch (error) {
    console.error('提交申請失敗:', error);
    res.status(500).json({ message: '提交申請失敗，請稍後重試' });
  }
};

/**
 * 審核 YouTuber 申請（管理員）
 */
exports.approveYoutuberApplication = async (req, res) => {
  try {
    const { applicationId, approved, reason } = req.body;

    if (!applicationId) {
      return res.status(400).json({ message: '缺少申請編號' });
    }

    const appDoc = await db.collection('youtuber_applications').doc(applicationId).get();
    if (!appDoc.exists) {
      return res.status(404).json({ message: '申請不存在' });
    }

    const appData = appDoc.data();
    const now = new Date();

    if (approved) {
      // 批准申請
      await db.collection('youtuber_applications').doc(applicationId).update({
        status: 'approved',
        approvedAt: now,
        tokensIssued: true,
        tokensIssuedAt: now,
        initialTokens: 50,
        adminNotes: reason || ''
      });

      // 發放 50 代幣
      await issueTokens(appData.email, 50, `YouTuber 推廣計畫前期代幣 - ${applicationId}`);

      // 發送 LINE 通知
      await sendLineNotification(appData.lineId, `
🎉 恭喜！你的申請已通過審核！

✅ 你已獲得 50 代幣，可以開始拍片了！

📋 申請編號：${applicationId}
💰 代幣：50

接下來：
1. 使用代幣在貼圖大亨生成貼圖
2. 拍攝推廣影片
3. 上傳影片並提供連結
4. 通過審核後獲得 250 代幣獎勵

祝你拍片順利！[object Object]`);

    } else {
      // 拒絕申請
      await db.collection('youtuber_applications').doc(applicationId).update({
        status: 'rejected',
        rejectedAt: now,
        adminNotes: reason || '不符合條件'
      });

      // 發送 LINE 通知
      await sendLineNotification(appData.lineId, `
⚠️ 申請審核結果

很遺憾，你的申請未通過審核。

原因：${reason || '不符合條件'}

如有疑問，請聯絡我們。
      `);
    }

    res.json({ success: true, message: '已更新申請狀態' });

  } catch (error) {
    console.error('審核申請失敗:', error);
    res.status(500).json({ message: '審核失敗，請稍後重試' });
  }
};

/**
 * 提交影片進行審核
 */
exports.submitVideo = async (req, res) => {
  try {
    const { applicationId, videoUrl, videoTitle } = req.body;

    if (!applicationId || !videoUrl) {
      return res.status(400).json({ message: '缺少必填欄位' });
    }

    const appDoc = await db.collection('youtuber_applications').doc(applicationId).get();
    if (!appDoc.exists) {
      return res.status(404).json({ message: '申請不存在' });
    }

    const appData = appDoc.data();
    if (appData.status !== 'approved') {
      return res.status(400).json({ message: '申請未通過審核' });
    }

    const now = new Date();

    // 更新影片資訊
    await db.collection('youtuber_applications').doc(applicationId).update({
      videoUrl,
      videoTitle: videoTitle || '推廣影片',
      videoSubmittedAt: now,
      videoApprovalStatus: 'pending'
    });

    // 發送通知給管理員
    await notifyAdmins(`
🎥 新的影片提交審核

頻道：${appData.channelName}
影片標題：${videoTitle || '推廣影片'}
影片連結：${videoUrl}

申請編號：${applicationId}
    `);

    res.json({ success: true, message: '影片已提交審核' });

  } catch (error) {
    console.error('提交影片失敗:', error);
    res.status(500).json({ message: '提交失敗，請稍後重試' });
  }
};

/**
 * 審核影片（管理員）
 */
exports.approveVideo = async (req, res) => {
  try {
    const { applicationId, approved, reason } = req.body;

    if (!applicationId) {
      return res.status(400).json({ message: '缺少申請編號' });
    }

    const appDoc = await db.collection('youtuber_applications').doc(applicationId).get();
    if (!appDoc.exists) {
      return res.status(404).json({ message: '申請不存在' });
    }

    const appData = appDoc.data();
    const now = new Date();

    if (approved) {
      // 批准影片
      await db.collection('youtuber_applications').doc(applicationId).update({
        videoApprovalStatus: 'approved',
        videoApprovedAt: now,
        status: 'completed',
        completedAt: now,
        completionTokens: 250,
        featured: true // 預設展示在網頁
      });

      // 發放 250 代幣
      await issueTokens(appData.email, 250, `YouTuber 推廣計畫完成獎勵 - ${applicationId}`);

      // 發送 LINE 通知
      await sendLineNotification(appData.lineId, `
🏆 恭喜！你的影片已通過審核！

✅ 你已獲得 250 代幣獎勵！

📋 申請編號：${applicationId}
💰 代幣：250
📺 影片：將展示在官網

總計獲得：300 代幣

感謝你的推廣！🎉
      `);

    } else {
      // 拒絕影片
      await db.collection('youtuber_applications').doc(applicationId).update({
        videoApprovalStatus: 'rejected',
        adminNotes: reason || '影片不符合要求'
      });

      // 發送 LINE 通知
      await sendLineNotification(appData.lineId, `
⚠️ 影片審核結果

你的影片未通過審核。

原因：${reason || '影片不符合要求'}

建議：
- 確保清楚展示貼圖大亨的功能
- 影片品質清晰
- 推廣內容真實有趣

你可以修改後重新提交。
      `);
    }

    res.json({ success: true, message: '已更新影片審核狀態' });

  } catch (error) {
    console.error('審核影片失敗:', error);
    res.status(500).json({ message: '審核失敗，請稍後重試' });
  }
};

/**
 * 獲取所有 YouTuber 申請（管理員）
 */
exports.getApplications = async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = db.collection('youtuber_applications');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query
      .orderBy('appliedAt', 'desc')
      .limit(parseInt(limit))
      .get();

    const applications = [];
    snapshot.forEach(doc => {
      applications.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({ applications });

  } catch (error) {
    console.error('獲取申請失敗:', error);
    res.status(500).json({ message: '獲取失敗' });
  }
};

/**
 * 獲取已完成的推廣影片（用於網頁展示）
 */
exports.getFeaturedVideos = async (req, res) => {
  try {
    const snapshot = await db.collection('youtuber_applications')
      .where('featured', '==', true)
      .where('status', '==', 'completed')
      .orderBy('completedAt', 'desc')
      .limit(20)
      .get();

    const videos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      videos.push({
        id: doc.id,
        channelName: data.channelName,
        channelUrl: data.channelUrl,
        videoUrl: data.videoUrl,
        videoTitle: data.videoTitle,
        completedAt: data.completedAt,
        subscriberCount: data.subscriberCount
      });
    });

    res.json({ videos });

  } catch (error) {
    console.error('獲取影片失敗:', error);
    res.status(500).json({ message: '獲取失敗' });
  }
};

/**
 * 發放代幣
 */
async function issueTokens(email, amount, reason) {
  try {
    // 獲取用戶
    const userQuery = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userQuery.empty) {
      console.warn(`用戶 ${email} 不存在`);
      return;
    }

    const userId = userQuery.docs[0].id;
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    // 更新代幣
    const newTokens = (userData.tokens || 0) + amount;
    await db.collection('users').doc(userId).update({
      tokens: newTokens
    });

    // 記錄交易
    await db.collection('token_transactions').add({
      userId,
      email,
      type: 'promotion_reward',
      amount,
      reason,
      timestamp: new Date(),
      balanceBefore: userData.tokens || 0,
      balanceAfter: newTokens
    });

    console.log(`✅ 已發放 ${amount} 代幣給 ${email}`);

  } catch (error) {
    console.error('發放代幣失敗:', error);
  }
}

/**
 * 發送 LINE 通知
 */
async function sendLineNotification(lineId, message) {
  try {
    // 這裡需要實現 LINE 通知邏輯
    // 可以使用 LINE Bot API 或其他方式
    console.log(`📨 LINE 通知 (${lineId}): ${message}`);
  } catch (error) {
    console.error('發送 LINE 通知失敗:', error);
  }
}

/**
 * 通知管理員
 */
async function notifyAdmins(message) {
  try {
    // 獲取所有管理員
    const admins = await db.collection('users')
      .where('role', '==', 'admin')
      .get();

    // 發送通知給每個管理員
    for (const doc of admins.docs) {
      const admin = doc.data();
      if (admin.lineId) {
        await sendLineNotification(admin.lineId, message);
      }
    }
  } catch (error) {
    console.error('通知管理員失敗:', error);
  }
}

module.exports = {
  submitYoutuberApplication: exports.submitYoutuberApplication,
  approveYoutuberApplication: exports.approveYoutuberApplication,
  submitVideo: exports.submitVideo,
  approveVideo: exports.approveVideo,
  getApplications: exports.getApplications,
  getFeaturedVideos: exports.getFeaturedVideos
};

