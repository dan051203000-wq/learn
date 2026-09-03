// 云函数：dataService
// 数据统一代理：小程序所有数据读写都走本函数（云函数以管理员权限操作数据库，
// 不受集合权限限制，同时避免在客户端暴露全部数据）。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { action } = event;
  try {
    switch (action) {
      /* ===== 案例库 ===== */
      case 'getCases': {
        const res = await db.collection('fraudCases')
          .orderBy('date', 'desc')
          .limit(50)
          .get();
        return { success: true, data: res.data };
      }

      /* ===== 首页警报 ===== */
      case 'getAlerts': {
        const res = await db.collection('alerts')
          .orderBy('date', 'desc')
          .limit(3)
          .get();
        return { success: true, data: res.data };
      }

      /* ===== 求助社区 ===== */
      case 'getPosts': {
        const res = await db.collection('communityPosts')
          .orderBy('createTime', 'desc')
          .limit(20)
          .get();
        return { success: true, data: res.data };
      }

      case 'createPost': {
        const { userId, nickName, content } = event;
        if (!content || !content.trim()) {
          return { success: false, message: '内容不能为空' };
        }
        await db.collection('communityPosts').add({
          data: {
            userId: userId || '',
            nickName: (nickName || '热心用户').substring(0, 20),
            content: content.trim().substring(0, 500),
            replies: [],
            likes: 0,
            createTime: db.serverDate()
          }
        });
        return { success: true };
      }

      case 'replyPost': {
        const { postId, nickName, content } = event;
        if (!postId || !content || !content.trim()) {
          return { success: false, message: '参数不完整' };
        }
        const doc = await db.collection('communityPosts').doc(postId).get();
        const replies = (doc.data && doc.data.replies) ? doc.data.replies.slice() : [];
        replies.push({
          nickName: (nickName || '热心用户').substring(0, 20),
          content: content.trim().substring(0, 300)
        });
        await db.collection('communityPosts').doc(postId).update({
          data: { replies }
        });
        return { success: true };
      }

      case 'likePost': {
        const { postId, delta } = event;
        if (!postId) return { success: false, message: '参数不完整' };
        await db.collection('communityPosts').doc(postId).update({
          data: { likes: _.inc(delta === -1 ? -1 : 1) }
        });
        return { success: true };
      }

      case 'removeReply': {
        // 删除帖子中的指定回复（内容管理用）
        const { postId, nickName, content } = event;
        if (!postId) return { success: false, message: '参数不完整' };
        const doc = await db.collection('communityPosts').doc(postId).get();
        const replies = (doc.data && doc.data.replies || []).filter(r => !(r.nickName === nickName && r.content === content));
        await db.collection('communityPosts').doc(postId).update({
          data: { replies }
        });
        return { success: true };
      }

      /* ===== 举报平台 ===== */
      case 'addReport': {
        const { userId, fraudType, fraudPhone, fraudAccount, description, imageFileIds } = event;
        const res = await db.collection('reports').add({
          data: {
            userId: userId || '',
            fraudType: fraudType || '其他诈骗',
            fraudPhone: (fraudPhone || '').substring(0, 30),
            fraudAccount: (fraudAccount || '').substring(0, 50),
            description: (description || '').substring(0, 1000),
            imageFileIds: Array.isArray(imageFileIds) ? imageFileIds : [],
            status: '已提交',
            createTime: db.serverDate()
          }
        });
        return { success: true, id: res._id };
      }

      case 'getReports': {
        const { userId } = event;
        if (!userId) return { success: true, data: [] };
        const res = await db.collection('reports')
          .where({ userId })
          .orderBy('createTime', 'desc')
          .limit(20)
          .get();
        return { success: true, data: res.data };
      }

      case 'deleteReport': {
        const { id } = event;
        if (!id) return { success: false, message: '参数不完整' };
        await db.collection('reports').doc(id).remove();
        return { success: true };
      }

      /* ===== 识别历史 ===== */
      case 'saveHistory': {
        const { userId, text, result } = event;
        await db.collection('identifyHistory').add({
          data: {
            userId: userId || '',
            text: (text || '').substring(0, 50),
            riskLevel: result && result.riskLevel,
            riskLevelText: result && result.riskLevelText,
            fullResult: result || {},
            timestamp: new Date(),
            createTime: db.serverDate()
          }
        });
        return { success: true };
      }

      case 'getHistory': {
        const { userId, limit } = event;
        if (!userId) return { success: true, data: [] };
        const res = await db.collection('identifyHistory')
          .where({ userId })
          .orderBy('timestamp', 'desc')
          .limit(Number(limit) || 20)
          .get();
        return { success: true, data: res.data };
      }

      case 'getStats': {
        const { userId } = event;
        if (!userId) return { success: true, identifyCount: 0, reportCount: 0 };
        const [h, r] = await Promise.all([
          db.collection('identifyHistory').where({ userId }).count(),
          db.collection('reports').where({ userId }).count()
        ]);
        return { success: true, identifyCount: h.total, reportCount: r.total };
      }

      case 'deleteHistory': {
        const { id } = event;
        if (!id) return { success: false, message: '参数不完整' };
        await db.collection('identifyHistory').doc(id).remove();
        return { success: true };
      }

      case 'clearHistory': {
        const { userId } = event;
        if (!userId) return { success: false, message: '参数不完整' };
        // 批量删除该用户全部识别记录
        const MAX_LOOP = 50;
        for (let i = 0; i < MAX_LOOP; i++) {
          const res = await db.collection('identifyHistory')
            .where({ userId })
            .limit(20)
            .get();
          if (!res.data.length) break;
          for (const item of res.data) {
            await db.collection('identifyHistory').doc(item._id).remove();
          }
        }
        return { success: true };
      }

      /* ===== 家庭守护动态 ===== */
      case 'getRecentIdentify': {
        const res = await db.collection('identifyHistory')
          .orderBy('timestamp', 'desc')
          .limit(5)
          .get();
        return { success: true, data: res.data };
      }

      default:
        return { success: false, message: '未知操作: ' + action };
    }
  } catch (err) {
    console.error('dataService error:', action, err);
    return { success: false, message: err.message || '服务异常' };
  }
};
