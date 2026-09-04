// 云函数：getKeywords
// 读取 keywords 集合，供 identifyFraud 使用。
// 数据管理：通过微信开发者工具云开发控制台 → 数据库 → keywords 集合手动增删改
//           或调用 dataService 的 manageKeyword action（action: 'manageKeyword'）。
//           改完后再次识别即生效（识别函数启动时按需拉取一次）。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  try {
    const res = await db.collection('keywords').limit(500).get();
    return {
      success: true,
      data: res.data,
      count: res.data.length,
      fetchedAt: new Date()
    };
  } catch (err) {
    // 关键词集合未初始化时返回内置兜底词库（不影响识别主流程）
    const FALLBACK = [
      { keyword: '转账', riskLevel: 'high' },
      { keyword: '验证码', riskLevel: 'high' },
      { keyword: '安全账户', riskLevel: 'high' },
      { keyword: '公检法', riskLevel: 'high' },
      { keyword: '中奖', riskLevel: 'medium' },
      { keyword: '兼职', riskLevel: 'medium' },
      { keyword: '退款', riskLevel: 'medium' }
    ];
    return { success: true, data: FALLBACK, fallback: true, error: err.message };
  }
};