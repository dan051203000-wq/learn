// 云函数：initDB
// 功能：一键创建 6 个数据库集合 + 写入示例数据
// 调用方式：在云开发控制台 → 云函数 → initDB → 测试，参数留空即可
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTIONS = [
  'users',
  'fraudCases',
  'communityPosts',
  'identifyHistory',
  'alerts',
  'reports'
];

// 6 个诈骗案例（写入 fraudCases 集合）
const SAMPLE_CASES = [
  {
    title: '冒充公检法要求转账到"安全账户"',
    category: '冒充公检法',
    risk: 'high',
    summary: '骗子自称法院/检察院工作人员，谎称你涉案要被冻结资产，要求把钱转到"安全账户"自证清白。',
    process: '电话/短信 → 自称公检法 → 制造恐慌(涉案/冻结) → 引导转账到所谓安全账户',
    prevention: '公检法绝不会电话办案，更没有"安全账户"。凡是要你转账的，100% 是骗子。',
    createdAt: Date.now()
  },
  {
    title: '高回报投资理财诈骗',
    category: '投资理财',
    risk: 'high',
    summary: '声称有"内部消息"或稳赚不赔的项目，承诺年化 20% 以上回报，先给甜头后卷款跑路。',
    process: '拉入群 → 晒"盈利截图" → 诱导下载APP → 小额返现 → 大额投入 → 无法提现',
    prevention: '天上不会掉馅饼。承诺保本高收益的，一定是诈骗。',
    createdAt: Date.now()
  },
  {
    title: '医保卡/社保卡异常骗局',
    category: '冒充客服',
    risk: 'high',
    summary: '冒充医保局/社保局工作人员，谎称账户异常要被注销，引导你点链接或转账。',
    process: '电话 → 报出你部分身份信息(泄露的) → 制造紧张 → 引导操作',
    prevention: '医保/社保问题请直接到当地社保局窗口或拨打 12333 咨询。',
    createdAt: Date.now()
  },
  {
    title: '刷单兼职诈骗',
    category: '刷单兼职',
    risk: 'medium',
    summary: '招聘"在家动动手指就能赚钱"的刷单员，前几单正常返利，大单后卷钱消失。',
    process: '发布广告 → 小额返利取得信任 → 大单任务 → 系统故障需再转账',
    prevention: '网络刷单本身就是违法行为，凡是刷单 100% 是诈骗。',
    createdAt: Date.now()
  },
  {
    title: '冒充客服退款诈骗',
    category: '冒充客服',
    risk: 'high',
    summary: '自称淘宝/京东客服，说商品有问题要给你退款，诱导你点链接"领取"实际上在骗你转账。',
    process: '准确说出你近期购物 → 主动提出退款 → 引导加微信/QQ → 发钓鱼链接',
    prevention: '退款请通过原购物平台官方渠道操作，无需加好友或点陌生链接。',
    createdAt: Date.now()
  }
];

// 求助帖示例
const SAMPLE_POSTS = [
  {
    title: '今天接到一个电话说医保卡异常，该信吗？',
    content: '刚才接到自称医保局的电话，说我医保卡在外地被冒用，要我配合调查转到安全账户。',
    type: 'question',
    author: '李奶奶',
    avatar: '👵',
    likes: 12,
    comments: 3,
    createdAt: Date.now() - 3600000
  },
  {
    title: '感谢这个平台，让我及时识破了骗局',
    content: '昨天差点被冒充公检法的骗了，用这个程序一查才发现是骗局，太感谢了！',
    type: 'experience',
    author: '王大爷',
    avatar: '👴',
    likes: 28,
    comments: 5,
    createdAt: Date.now() - 86400000
  }
];

// 警报示例
const SAMPLE_ALERTS = [
  {
    title: '近期高发：冒充医保局诈骗',
    level: 'high',
    summary: '近一周多地出现冒充医保局/社保局工作人员的诈骗电话，请提醒家中老人不要轻信。',
    createdAt: Date.now()
  },
  {
    title: '春节后刷单兼职诈骗高发',
    level: 'medium',
    summary: '节后求职季，刷单兼职类诈骗案件明显增加，请提高警惕。',
    createdAt: Date.now() - 86400000
  }
];

exports.main = async (event, context) => {
  const results = {
    collections: [],
    seeds: [],
    errors: []
  };

  // 1) 创建 6 个集合（不存在则创建）
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name);
      results.collections.push(`${name} ✓ 创建`);
    } catch (e) {
      // 已存在会报错，忽略
      if (/already|exists|EXIST/i.test(e.errMsg || e.message || '')) {
        results.collections.push(`${name} 已存在`);
      } else {
        results.errors.push(`创建 ${name} 失败: ${e.errMsg || e.message}`);
      }
    }
  }

  // 2) 写入示例数据（先查是否已有数据，避免重复）
  async function seedIfEmpty(collection, docs, label) {
    try {
      const { total } = await db.collection(collection).count();
      if (total > 0) {
        results.seeds.push(`${label} 已有 ${total} 条，跳过`);
        return;
      }
      for (const doc of docs) {
        await db.collection(collection).add({ data: doc });
      }
      results.seeds.push(`${label} ✓ 写入 ${docs.length} 条`);
    } catch (e) {
      results.errors.push(`写入 ${label} 失败: ${e.errMsg || e.message}`);
    }
  }

  await seedIfEmpty('fraudCases', SAMPLE_CASES, '案例库');
  await seedIfEmpty('communityPosts', SAMPLE_POSTS, '社区帖子');
  await seedIfEmpty('alerts', SAMPLE_ALERTS, '诈骗警报');

  return {
    success: results.errors.length === 0,
    message: results.errors.length === 0
      ? '初始化完成！现在可以回小程序体验了。'
      : '部分步骤失败，请查看 errors',
    results
  };
};
