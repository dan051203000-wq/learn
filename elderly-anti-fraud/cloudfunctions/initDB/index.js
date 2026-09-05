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
  // ===== 演示数据分支：评委/演示账号一键填充识别历史 + 举报 + 家庭预警 =====
  if (event && event.action === 'seedDemo') {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID || event.openid || '';
    if (!openid) {
      return { success: false, message: '未获取到 openid，无法填充演示数据' };
    }
    try {
      // 确保所需集合存在
      for (const name of ['identifyHistory', 'reports', 'familyAlerts', 'aiProfiles']) {
        try { await db.createCollection(name); } catch (e) { /* 忽略已存在 */ }
      }
      const summary = await seedDemoData(openid);
      return {
        success: true,
        message: `演示数据已填充：${summary.identify} 条识别历史 · ${summary.reports} 条举报 · ${summary.familyAlerts} 条家庭预警 · 清除旧画像缓存 ${summary.profileCleared} 条`,
        summary
      };
    } catch (err) {
      return { success: false, message: err.message || '填充演示数据失败', error: String(err) };
    }
  }

  // ===== 默认分支：初始化全局集合 + 全局示例数据 =====
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

/* ===== 演示种子数据：给评委/演示账号一键填充识别历史 + 举报 + 家庭预警 =====
 * 调用方式：在云开发控制台 → 云函数 → initDB → 测试，参数传 { action: 'seedDemo' }
 *          或在小程序「关于」页点「加载演示数据」按钮
 * 数据特点：
 *   - 8 条识别历史，分布在近 6 天（避开 cleanupTimer 的 7 天清理）
 *   - 2 条举报记录，分布在近 3 天
 *   - 1 条家庭预警（高风险），近 12 小时
 *   - 覆盖 5 种主流诈骗类型，便于 AI 画像生成有多样化数据
 * 重复调用：会先清掉该 OPENID 的旧演示数据再写入，保证演示一致性
 */
const DEMO_IDENTIFY_HISTORY = [
  {
    text: '我是淘宝客服，您购买的奶粉检测出问题，现给您三倍理赔，请点击链接填写退款信息',
    riskLevel: 'high',
    riskLevelText: '高风险：冒充客服退款诈骗',
    fraudType: '冒充客服',
    fullResult: { riskLevel: 'high', riskLevelText: '高风险：冒充客服退款诈骗', matchedKeywords: ['客服', '理赔', '退款', '链接'] }
  },
  {
    text: '这里是XX市公安分局，您名下银行卡涉嫌洗钱案件，请配合调查，将资金转入安全账户自证清白',
    riskLevel: 'high',
    riskLevelText: '高风险：冒充公检法诈骗',
    fraudType: '冒充公检法',
    fullResult: { riskLevel: 'high', riskLevelText: '高风险：冒充公检法诈骗', matchedKeywords: ['公安', '涉嫌', '安全账户', '转账'] }
  },
  {
    text: '内部消息：XX项目稳赚不赔，年化收益25%，仅剩最后3个名额，扫码进群立即上车',
    riskLevel: 'high',
    riskLevelText: '高风险：虚假投资理财诈骗',
    fraudType: '投资理财',
    fullResult: { riskLevel: 'high', riskLevelText: '高风险：虚假投资理财诈骗', matchedKeywords: ['内部消息', '稳赚不赔', '年化', '上车'] }
  },
  {
    text: '招聘居家刷单员，日入300-500，操作简单，动动手指就能赚钱，加微信详聊',
    riskLevel: 'medium',
    riskLevelText: '中风险：刷单兼职诈骗',
    fraudType: '刷单兼职',
    fullResult: { riskLevel: 'medium', riskLevelText: '中风险：刷单兼职诈骗', matchedKeywords: ['刷单', '日入', '加微信'] }
  },
  {
    text: '您的医保卡在外地被冒用，将被冻结，请按提示操作解冻，否则影响医保待遇',
    riskLevel: 'high',
    riskLevelText: '高风险：冒充医保/社保诈骗',
    fraudType: '冒充客服',
    fullResult: { riskLevel: 'high', riskLevelText: '高风险：冒充医保/社保诈骗', matchedKeywords: ['医保卡', '冻结', '解冻'] }
  },
  {
    text: '恭喜您中奖88万元！请先缴纳公证费和税费5000元，即可领取奖金',
    riskLevel: 'high',
    riskLevelText: '高风险：虚假中奖诈骗',
    fraudType: '虚假中奖',
    fullResult: { riskLevel: 'high', riskLevelText: '高风险：虚假中奖诈骗', matchedKeywords: ['中奖', '公证费', '税费'] }
  },
  {
    text: '我是您孩子的班主任，孩子在校受伤正在医院，请立即转账2万元医药费',
    riskLevel: 'high',
    riskLevelText: '高风险：冒充熟人/领导诈骗',
    fraudType: '冒充熟人',
    fullResult: { riskLevel: 'high', riskLevelText: '高风险：冒充熟人/领导诈骗', matchedKeywords: ['班主任', '受伤', '转账'] }
  },
  {
    text: '您的快递丢失，点击链接www.xxx.com填写信息进行理赔',
    riskLevel: 'medium',
    riskLevelText: '中风险：虚假快递理赔诈骗',
    fraudType: '冒充客服',
    fullResult: { riskLevel: 'medium', riskLevelText: '中风险：虚假快递理赔诈骗', matchedKeywords: ['快递丢失', '理赔', '链接'] }
  }
];

const DEMO_REPORTS = [
  {
    fraudType: '冒充公检法',
    fraudPhone: '008613900000000',
    fraudAccount: '6222000000000000000',
    description: '接到自称公安的电话，说我涉嫌洗钱，要求转到安全账户。已挂断并标记。',
    status: '已提交'
  },
  {
    fraudType: '投资理财',
    fraudPhone: '400-xxx-xxxx',
    fraudAccount: '未知',
    description: '某理财APP宣称稳赚不赔，投入5万后无法提现，客服失联。',
    status: '已提交'
  }
];

async function seedDemoData(openid) {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const summary = { identify: 0, reports: 0, familyAlerts: 0, profileCleared: 0 };

  // 0) 清掉该 OPENID 的旧演示数据 + 旧画像缓存（保证演示一致性）
  // 识别历史
  for (let i = 0; i < 20; i++) {
    const res = await db.collection('identifyHistory').where({ userId: openid }).limit(20).get();
    if (!res.data.length) break;
    for (const item of res.data) {
      await db.collection('identifyHistory').doc(item._id).remove();
    }
  }
  // 举报
  for (let i = 0; i < 10; i++) {
    const res = await db.collection('reports').where({ userId: openid }).limit(20).get();
    if (!res.data.length) break;
    for (const item of res.data) {
      await db.collection('reports').doc(item._id).remove();
    }
  }
  // 画像缓存
  const oldProfiles = await db.collection('aiProfiles').where({ userId: openid }).limit(10).get();
  for (const item of oldProfiles.data) {
    await db.collection('aiProfiles').doc(item._id).remove();
    summary.profileCleared++;
  }

  // 1) 写入 8 条识别历史，分布在近 6 天
  const offsets = [6 * DAY, 5 * DAY, 4 * DAY, 3 * DAY, 2.5 * DAY, 2 * DAY, 1 * DAY, 6 * 60 * 60 * 1000];
  for (let i = 0; i < DEMO_IDENTIFY_HISTORY.length; i++) {
    const item = DEMO_IDENTIFY_HISTORY[i];
    await db.collection('identifyHistory').add({
      data: {
        userId: openid,
        text: item.text,
        riskLevel: item.riskLevel,
        riskLevelText: item.riskLevelText,
        fullResult: item.fullResult,
        fraudType: item.fraudType,
        timestamp: new Date(now - offsets[i]),
        createTime: db.serverDate()
      }
    });
    summary.identify++;
  }

  // 2) 写入 2 条举报
  const reportOffsets = [3 * DAY, 1 * DAY];
  for (let i = 0; i < DEMO_REPORTS.length; i++) {
    const r = DEMO_REPORTS[i];
    await db.collection('reports').add({
      data: {
        userId: openid,
        fraudType: r.fraudType,
        fraudPhone: r.fraudPhone,
        fraudAccount: r.fraudAccount,
        description: r.description,
        imageFileIds: [],
        status: r.status,
        timestamp: new Date(now - reportOffsets[i]),
        createTime: db.serverDate()
      }
    });
    summary.reports++;
  }

  // 3) 写入 1 条家庭预警（高风险，12 小时前）
  await db.collection('familyAlerts').add({
    data: {
      elderCode: 'demo',
      elderOpenId: openid,
      elderName: '演示老人',
      riskLevel: 'high',
      riskTitle: '冒充公检法诈骗',
      fraudMethod: '电话',
      snippet: '自称公安，要求转账到安全账户',
      timestamp: new Date(now - 12 * 60 * 60 * 1000),
      expireAt: new Date(now + 7 * DAY)
    }
  });
  summary.familyAlerts = 1;

  return summary;
}

// 通过 event.action === 'seedDemo' 触发演示数据填充（仅供评委演示用）
// 入口在 exports.main 顶部判断，便于小程序客户端直接调用 initDB 云函数
