// 云函数：identifyFraudAI
// 能力：调腾讯混元大模型做智能识别（v1.4 全 AI 版）
// 兜底：AI 失败/超时/解析错误 → 返回 needFallback:true，客户端再调原 identifyFraud

const cloud = require('wx-server-sdk');

// 初始化（AI 调用需要更长 timeout）
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 60000  // AI 调用默认 60s
});

const SYSTEM_PROMPT = `你是一位经验丰富的反诈专家，专门帮助中国老年人识别诈骗信息。你的判断必须基于客观事实，避免误报和漏报。

【工作原则】
1. 优先保护老人，宁可"宁可错杀不可放过"——疑似诈骗应判为高风险
2. 用老人听得懂的话解释（避免专业术语）
3. 输出的应对建议必须具体可执行（不要"小心"这种空话）
4. 永远不要让老人产生"没问题就是绝对没问题"的错觉

【8 类常见诈骗特征速查】
- 冒充公检法：自称公安/检察院/法院 + 涉及"洗钱/案件/账户冻结" + 要求转账到"安全账户"
- 冒充客服：自称电商/快递/银行客服 + "退款/理赔/升级" + 要银行卡验证码
- 投资理财：承诺"高回报/稳赚/内部消息" + 拉群/下载APP/充值
- 养老保健：免费讲座/免费旅游/免费体检 + 推销高价保健品/器械
- 婚恋交友：网恋/相亲 + 各种理由要钱 + 引导投资/赌博
- 刷单兼职：在家可做/日结/高佣金 + 要押金/垫付
- 冒充亲属：突然联系 + 出事/急用钱 + 不让告诉家长
- 贷款征信：低息/无抵押/秒到账 + 要"流水/保证金/解冻费"

【输出格式（严格 JSON，无任何多余文字）】
{
  "isFraud": true/false,
  "type": "诈骗类型（8 类之一）或'正常信息'",
  "riskLevel": "high/medium/low/none",
  "riskTitle": "老人易懂的一句话标题（如：'🚨 这是冒充公检法诈骗'）",
  "fraudMethod": "骗子是怎么骗的（2-3 句话，老人能听懂）",
  "features": ["识别依据1", "识别依据2", "识别依据3"],
  "countermeasures": ["具体该怎么办1", "具体该怎么办2", "具体该怎么办3"],
  "disclaimer": "必须包含'本识别基于AI判断仅供参考，未检测到风险≠绝对安全，紧急情况请直接拨打110或96110反诈专线'"
}`;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { text, source = 'text' } = event;

  // 入参校验
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      success: false,
      needFallback: true,
      error: '内容为空'
    };
  }

  // 内容过长截断（避免 token 浪费）
  const trimmedText = text.length > 800 ? text.substring(0, 800) + '...' : text;

  try {
    const ai = cloud.ai();
    // 注意：cloudbase 是统一入口，内部按 model 字段路由到混元/DeepSeek
    const model = ai.createModel('cloudbase');

    const startTime = Date.now();
    const res = await model.generateText({
      data: {
        model: 'hunyuan-turbos-latest',  // 混元 turbo 版，平衡速度与质量
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请判断以下${source === 'image' ? '图片中提取的' : ''}信息是否为诈骗：\n\n「${trimmedText}」` }
        ],
        temperature: 0.3  // 低温度让判断更稳定
      },
      timeout: 30000  // 单次 AI 调用 30s
    });
    const costMs = Date.now() - startTime;

    // 提取模型输出
    let rawContent = '';
    if (res && res.choices && res.choices[0] && res.choices[0].message) {
      rawContent = res.choices[0].message.content || '';
    } else if (res && res.text) {
      rawContent = res.text;
    } else if (typeof res === 'string') {
      rawContent = res;
    }

    // 解析 JSON（兼容模型返回 ```json ... ``` 代码块的情况）
    let parsed = null;
    try {
      // 提取 JSON 部分
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(rawContent);
      }
    } catch (parseErr) {
      console.warn('[identifyFraudAI] JSON 解析失败:', parseErr.message, '\n原始:', rawContent);
      return {
        success: false,
        needFallback: true,
        error: 'AI 输出格式异常',
        rawContent: rawContent.substring(0, 500)
      };
    }

    // 字段校验 + 兜底
    const validated = {
      isFraud: Boolean(parsed.isFraud),
      type: (parsed.type || '未知').toString().substring(0, 30),
      riskLevel: ['high', 'medium', 'low', 'none'].includes(parsed.riskLevel) ? parsed.riskLevel : 'low',
      riskTitle: (parsed.riskTitle || '').toString().substring(0, 50),
      fraudMethod: (parsed.fraudMethod || '').toString().substring(0, 200),
      features: Array.isArray(parsed.features) ? parsed.features.slice(0, 5).map(f => String(f).substring(0, 100)) : [],
      countermeasures: Array.isArray(parsed.countermeasures) ? parsed.countermeasures.slice(0, 5).map(c => String(c).substring(0, 100)) : [],
      disclaimer: (parsed.disclaimer || '本识别基于 AI 判断仅供参考，未检测到风险 ≠ 绝对安全，紧急情况请直接拨打 110 或 96110 反诈专线').toString().substring(0, 300)
    };

    return {
      success: true,
      aiPowered: true,  // 标记：本次由 AI 提供
      data: validated,
      costMs,
      callerOpenId: wxContext.OPENID || ''
    };

  } catch (err) {
    console.error('[identifyFraudAI] AI 调用失败:', err);
    return {
      success: false,
      needFallback: true,
      error: err.message || 'AI 调用失败',
      errorCode: err.code || 'UNKNOWN'
    };
  }
};
