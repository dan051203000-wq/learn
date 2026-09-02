// 云函数：identifyFraud
// 用于识别诈骗信息

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 诈骗特征库
const fraudPatterns = [
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

function analyzeText(text) {
  text = text.toLowerCase();
  let maxRiskLevel = 'none';
  let matchedPattern = null;
  let matchedFeatures = [];
  let riskScores = { high: 0, medium: 0, low: 0 };

  for (const pattern of fraudPatterns) {
    let keywordMatches = 0;
    for (const keyword of pattern.keywords) {
      if (text.includes(keyword)) {
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

  // 检查其他风险特征
  const riskKeywords = ['转账', '汇款', '支付', '点击', '链接', '提供', '密码', '验证码', '账户'];
  let riskKeywordCount = 0;
  for (const keyword of riskKeywords) {
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
    riskKeywordCount
  };
}

function generateResult(analysis) {
  const riskLevelMap = {
    high: { text: '⚠️ 极高风险', icon: '🚨' },
    medium: { text: '⚠️ 中等风险', icon: '⚠️' },
    low: { text: '✓ 低风险', icon: 'ℹ️' },
    none: { text: '✓ 正常信息', icon: '✅' }
  };

  const riskInfo = riskLevelMap[analysis.riskLevel];
  const pattern = analysis.pattern;

  let fraudMethod = '未识别';
  let features = [];
  let countermeasures = [];

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
    '如有疑问，立即拨打110报警或官方客服电话'
  ];

  // 根据诈骗类型提供特定建议
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
  } else {
    countermeasures = generalCountermeasures;
  }

  return {
    riskLevel: analysis.riskLevel,
    riskTitle: riskInfo.text,
    icon: riskInfo.icon,
    riskLevelText: riskInfo.text,
    fraudMethod: fraudMethod,
    features: features.length > 0 ? features : ['信息来源不明', '包含风险关键词'],
    countermeasures: countermeasures,
    timestamp: new Date()
  };
}

exports.main = async (event, context) => {
  try {
    const { type, content, imageUrl } = event;

    if (type === 'text') {
      const analysis = analyzeText(content);
      const result = generateResult(analysis);
      return result;
    } else if (type === 'image') {
      // TODO: 集成OCR或图片内容识别服务
      // 这里简化处理，实际应该调用腾讯云OCR或其他服务
      return {
        riskLevel: 'medium',
        riskTitle: '⚠️ 建议核实',
        icon: '⚠️',
        riskLevelText: '⚠️ 建议核实',
        fraudMethod: '图片类诈骗',
        features: ['图片内容无法完全识别', '建议转发给朋友圈求证'],
        countermeasures: [
          '通过多个渠道核实信息',
          '分享给朋友或家人帮助判断',
          '如有疑问，拨打官方电话确认',
          '不要急于点击图片中的链接',
          '保存证据后报警'
        ],
        timestamp: new Date()
      };
    }

    return { error: '不支持的识别类型' };
  } catch (error) {
    console.error('识别失败:', error);
    return { error: '识别失败，请重试' };
  }
};
