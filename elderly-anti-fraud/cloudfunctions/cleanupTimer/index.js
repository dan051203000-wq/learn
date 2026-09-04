// 云函数：cleanupTimer
// 定时清理过期数据（保护老人隐私 + 控制云开发资源用量）
// 触发器：在 cloudfunctions/cleanupTimer/config.json 中配置
// 推荐：每天凌晨 3 点（"0 0 3 * * * *"）执行
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = new Date(now - 7 * DAY);
  const THIRTY_DAYS = new Date(now - 30 * DAY);
  const NINETY_DAYS = new Date(now - 90 * DAY);

  const stats = { identify: 0, images: 0, feedback: 0, errors: [] };

  try {
    /* 1) 识别历史 > 7 天 */
    const oldIdentify = await db.collection('identifyHistory')
      .where({ timestamp: _.lt(SEVEN_DAYS) })
      .limit(100).get();
    for (const item of oldIdentify.data) {
      await db.collection('identifyHistory').doc(item._id).remove();
      stats.identify++;
    }
  } catch (e) { stats.errors.push('identify: ' + e.message); }

  try {
    /* 2) 举报图片 > 30 天（删除云存储文件） */
    const oldReports = await db.collection('reports')
      .where({ createTime: _.lt(THIRTY_DAYS) })
      .limit(100).get();
    for (const r of oldReports.data) {
      if (Array.isArray(r.imageFileIds) && r.imageFileIds.length > 0) {
        try {
          await cloud.deleteFile({ fileList: r.imageFileIds });
          stats.images += r.imageFileIds.length;
        } catch (e) {
          stats.errors.push('deleteFile: ' + r._id + ' ' + e.message);
        }
      }
      await db.collection('reports').doc(r._id).update({
        data: { imageFileIds: [] }
      });
    }
  } catch (e) { stats.errors.push('reports: ' + e.message); }

  try {
    /* 3) 反馈 > 90 天 */
    const oldFeedback = await db.collection('feedback')
      .where({ createTime: _.lt(NINETY_DAYS) })
      .limit(100).get();
    for (const item of oldFeedback.data) {
      await db.collection('feedback').doc(item._id).remove();
      stats.feedback++;
    }
  } catch (e) { stats.errors.push('feedback: ' + e.message); }

  console.log('cleanupTimer done:', JSON.stringify(stats));
  return { success: true, stats, cleanedAt: new Date() };
};