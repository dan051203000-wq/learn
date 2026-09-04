// 云函数：identifyFraud
// 用于识别诈骗信息
//
// 关键词库热更机制：
//   1. 管理员在云开发控制台 keywords 集合增删改
//   2. 调用 dataService.manageKeyword action 增删改
//   3. 下次识别启动时会自动拉取最新词库
//   4. 关键词集合不存在/读取失败时用内置兜底词库（不影响主流程）

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 内置兜底词库（关键词集合失败时使用）
const BUILTIN_FRAUD_PATTERNS = [
  {
    type: '冒充公检法',
    keywords: ['法院', '检察院', '警察', '公安', '传票', '冻结'],
    features: ['要求转账', '声称有法律纠纷', '急迫要求'],
    riskLevel: 'high'
  },
  {
    type: '投资诈骗',
    keywords: ['投资', '理财', '收益', '回报', '股票', '比特币'],
    features: ['承诺高收益', '急速致富', '限时优惠'],
    riskLevel: 'high'
  },
  {
    type: '医保诈骗',
    keywords: ['医保', '社保', '卡冻结', '补缴'],
    features: ['冒充政府部门', '要求操作', '需要提供信息'],
    riskLevel: 'high'
  },
  {
    type: '贷款诈骗',
    keywords: ['贷款', '借钱', '额度', '利率', '放款'],
    features: ['要求先付费', '承诺快速放款', '要求个人信息'],
    riskLevel: 'high'
  },
  {
    type: '购物诈骗',
    keywords: ['退款', '包裹', '发货', '点击链接', '确认收货'],
    features: ['伪造购物平台', '要求操作链接', '假客服'],
    riskLevel: 'medium'
  },
  {
    type: '中奖诈骗',
    keywords: ['中奖', '领奖', '大奖', '幸运', '恭喜'],
    features: ['虚假中奖信息', '要求支付费用', '个人信息获取'],
    riskLevel: 'high'
  }
];

const BUILTIN_RISK_KEYWORDS = ['转账', '汇款', '支付', '点击', '链接', '提供', '密码', '验证码', '账户'];

/**
 * 拉取热更关键词库
 * 失败时返回 null（调用方用内置兜底）
 */
async function fetchHotKeywords() {
  try {
    const res = await cloud.callFunction({ name: 'getKeywords' });
    if (res && res.result && res.result.success && Array.isArray(res.result.data)) {
      return res.result.data;
    }
    return null;
  } catch (e) {
    console.warn('fetchHotKeywords failed:', e.message);
    return null;
  }
}

function analyzeText(text, hotKeywords) {
  text = String(text || '').toLowerCase();

  // 合并热更关键词到 riskKeywords
  let riskKeywords = BUILTIN_RISK_KEYWORDS.slice();
  if (Array.isArray(hotKeywords)) {
    for (const item of hotKeywords) {
      if (item && item.keyword) {
        riskKeywords.push(String(item.keyword).toLowerCase());
      }
    }
  }

  let maxRiskLevel = 'none';
  let matchedPattern = null;
  let matchedFeatures = [];
  const riskScores = { high: 0, medium: 0, low: 0 };

  for (const pattern of BUILTIN_FRAUD_PATTERNS) {
    let keywordMatches = 0;
    for (const keyword of pattern.keywords) {
      if (text.includes(String(keyword).toLowerCase())) {
        keywordMatches++;
      }
    }
    if (keywordMatches >= 2) {
      matchedPattern = pattern;
      matchedFeatures = pattern.features;
      riskScores[pattern.riskLevel]++;
      maxRiskLevel = pattern.riskLevel;
      break;
    }
  }

  // 通用风险特征词（合并热更）
  let riskKeywordCount = 0;
  const seen = new Set();
  for (const keyword of riskKeywords) {
    if (seen.has(keyword)) continue;
    seen.add(keyword);
    if (text.includes(keyword)) {
      riskKeywordCount++;
    }
  }

  if (riskKeywordCount >= 3 && maxRiskLevel !== 'high') {
    maxRiskLevel = 'medium';
  }

  return {
    riskLevel: maxRiskLevel,
    pattern: matchedPattern,
    features: matchedFeatures,
    riskKeywordCount,
    hotMatched: riskKeywordCount
  };
}

function generateResult(analysis) {
  const riskLevelMap = {
    high: { text: '⚠️ 极高风险', icon: '🚨' },
    medium: { text: '⚠️ 中等风险', icon: '⚠️' },
    low: { text: '✓ 低风险', icon: 'ℹ️' },
    none: { text: '✓ 暂未检测到风险', icon: '✅' }
  };

  const riskInfo = riskLevelMap[analysis.riskLevel];
  const pattern = analysis.pattern;

  let fraudMethod = '未识别';
  let features = [];

  if (pattern) {
    fraudMethod = pattern.type;
    features = pattern.features;
  }

  // 通用应对方法
  const generalCountermeasures = [
    '不要点击不明链接或下载陌生应用',
    '不要提供个人隐私信息（身份证、银行卡、验证码等）',
    '不要转账汇款给陌生账户',
    '通过官方渠道验证信息真伪',
    '如有疑问，立即拨打 110 报警或反诈专线 96110'
  ];

  let countermeasures = generalCountermeasures;
  if (pattern && pattern.type === '冒充公检法') {
    countermeasures = [
      '真正的法院、检察院不会通过短信要求转账',
      '直接拨打当地法院、公安部门官方电话核实',
      '不要相信急迫的要求，给自己思考时间',
      '咨询律师或相关部门',
      '立即报警'
    ];
  } else if (pattern && pattern.type === '投资诈骗') {
    countermeasures = [
      '没有无风险的高收益投资',
      '不要被"专家指导""内部信息"等说法迷惑',
      '向证监会认可的正规机构咨询',
      '不要盲目跟风投资',
      '如已被骗，立即报警并保存证据'
    ];
  }

  return {
    riskLevel: analysis.riskLevel,
    riskTitle: riskInfo.text,
    icon: riskInfo.icon,
    riskLevelText: riskInfo.text,
    fraudMethod,
    features: features.length > 0 ? features : ['信息来源不明', '包含风险关键词'],
    countermeasures,
    // 关键：所有结果都加免责说明（避免虚假安全感）
    disclaimer: '本识别基于关键词匹配，结果不一定准确。未检测到风险 ≠ 绝对安全，仍建议通过官方渠道核实，紧急情况请直接拨打 110 或反诈专线 96110。',
    timestamp: new Date()
  };
}

exports.main = async (event, context) => {
  try {
    const { type, content, imageUrl } = event;

    // 拉取热更关键词（失败用内置兜底）
    const hotKeywords = await fetchHotKeywords();

    if (type === 'text') {
      const analysis = analyzeText(content, hotKeywords);
      const result = generateResult(analysis);
      result.hotKeywordCount = hotKeywords ? hotKeywords.length : 0;
      return result;
    } else if (type === 'image') {
      // 图片识别目前简化处理（未接入 OCR）
      // 仍返回 disclaimer，避免老人相信"没问题"
      return {
        riskLevel: 'medium',
        riskTitle: '⚠️ 建议核实',
        icon: '⚠️',
        riskLevelText: '⚠️ 建议核实',
        fraudMethod: '图片类信息',
        features: ['图片内容无法完全识别', '建议转发给家人或朋友圈求证'],
        countermeasures: [
          '通过多个渠道核实信息',
          '分享给朋友或家人帮助判断',
          '如有疑问，拨打 96110 反诈专线或 110 报警',
          '不要急于点击图片中的链接',
          '保存证据后通过 96110 反馈'
        ],
        disclaimer: '本识别基于简单规则，结果不一定准确。未检测到风险 ≠ 绝对安全，仍建议通过官方渠道核实，紧急情况请直接拨打 110 或反诈专线 96110。',
        timestamp: new Date()
      };
    }

    return { error: '不支持的识别类型', disclaimer: '识别异常，请直接拨打 96110 反诈专线核实' };
  } catch (error) {
    console.error('识别失败:', error);
    return { error: '识别失败，请重试', disclaimer: '识别服务异常，结果仅供参考，紧急情况请直接拨打 110 或 96110' };
  }
};