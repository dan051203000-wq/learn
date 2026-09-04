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

      /* ===== 数据保留策略自动清理 =====
         * 由 cleanupTimer 定时触发，也可手动调用
         * - identifyHistory > 7 天 → 删除（防止老人敏感信息长期留存）
         * - reports 中的 imageFileIds > 30 天 → 删除云存储+清空引用
         * - 反馈数据保留 90 天，便于回查
         */
      case 'cleanupExpired': {
        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;
        const SEVEN_DAYS = now - 7 * DAY;
        const THIRTY_DAYS = now - 30 * DAY;
        const NINETY_DAYS = now - 90 * DAY;

        const stats = { identify: 0, images: 0, feedback: 0 };

        // 1) 识别历史：超过 7 天
        const oldIdentify = await db.collection('identifyHistory')
          .where({ timestamp: _.lt(new Date(SEVEN_DAYS)) })
          .limit(100)
          .get();
        for (const item of oldIdentify.data) {
          await db.collection('identifyHistory').doc(item._id).remove();
          stats.identify++;
        }

        // 2) 举报图片：超过 30 天，删除云存储文件并清空 imageFileIds
        const oldReports = await db.collection('reports')
          .where({ createTime: _.lt(new Date(THIRTY_DAYS)) })
          .limit(100)
          .get();
        for (const r of oldReports.data) {
          if (Array.isArray(r.imageFileIds) && r.imageFileIds.length > 0) {
            try {
              await cloud.deleteFile({ fileList: r.imageFileIds });
              stats.images += r.imageFileIds.length;
            } catch (e) {
              console.warn('deleteFile failed', r._id, e.message);
            }
          }
          await db.collection('reports').doc(r._id).update({
            data: { imageFileIds: [] }
          });
        }

        // 3) 反馈：超过 90 天
        const oldFeedback = await db.collection('feedback')
          .where({ createTime: _.lt(new Date(NINETY_DAYS)) })
          .limit(100)
          .get();
        for (const item of oldFeedback.data) {
          await db.collection('feedback').doc(item._id).remove();
          stats.feedback++;
        }

        return { success: true, stats, cleanedAt: new Date() };
      }

      /* ===== 意见反馈 ===== */
      case 'submitFeedback': {
        const { userId, type, content, contact } = event;
        if (!content || !content.trim()) {
          return { success: false, message: '反馈内容不能为空' };
        }
        // 敏感词过滤（手机号中间4位 → 屏蔽）
        const sanitized = (content || '').replace(/(\d{3})\d{4}(\d{4})/g, '$1****$2');
        await db.collection('feedback').add({
          data: {
            userId: userId || '',
            type: (type || '建议').substring(0, 20),
            content: sanitized.substring(0, 500),
            contact: (contact || '').substring(0, 50),
            status: '待处理',
            createTime: db.serverDate()
          }
        });
        return { success: true };
      }

      /* ===== 关键词库热更新 =====
         * 由管理员通过微信开发者工具云开发控制台手动调用
         * 每次识别云函数会读取 keywords 集合，所以更新后下次识别立即生效
         */
      case 'getKeywords': {
        const res = await db.collection('keywords').limit(200).get();
        return { success: true, data: res.data };
      }

      case 'manageKeyword': {
        const { keyword, riskLevel, op } = event;
        // op: 'add' / 'remove' / 'list'
        if (op === 'list') {
          const res = await db.collection('keywords').limit(500).get();
          return { success: true, data: res.data };
        }
        if (!keyword) return { success: false, message: '缺少关键词' };
        if (op === 'add') {
          // 查重
          const exist = await db.collection('keywords')
            .where({ keyword })
            .limit(1).get();
          if (exist.data.length > 0) {
            await db.collection('keywords').doc(exist.data[0]._id).update({
              data: { riskLevel: riskLevel || 'medium', updatedAt: db.serverDate() }
            });
          } else {
            await db.collection('keywords').add({
              data: {
                keyword: keyword.substring(0, 30),
                riskLevel: riskLevel || 'medium',
                source: 'manual',
                updatedAt: db.serverDate()
              }
            });
          }
          return { success: true };
        }
        if (op === 'remove') {
          await db.collection('keywords').where({ keyword }).remove();
          return { success: true };
        }
        return { success: false, message: '未知 op: ' + op };
      }

      default:
        return { success: false, message: '未知操作: ' + action };
    }
  } catch (err) {
    console.error('dataService error:', action, err);
    return { success: false, message: err.message || '服务异常' };
  }
};
