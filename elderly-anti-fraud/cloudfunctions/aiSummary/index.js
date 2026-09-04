// 云函数：aiSummary
// 能力：把老人最近 N 条预警汇总成一句话（家庭守护页展示）
// 兜底：AI 失败 → 返回"今天识别了 X 条可疑信息"

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 60000
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { elderCode, days = 1, maxItems = 5 } = event;

  if (!elderCode) {
    return { success: false, error: '缺少 elderCode' };
  }

  // 1) 拉取最近 N 天预警
  const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let alerts = [];
  try {
    const res = await db.collection('familyAlerts')
      .where({
        elderCode: String(elderCode),
        timestamp: _.gte(startTime)
      })
      .orderBy('timestamp', 'desc')
      .limit(maxItems)
      .get();
    alerts = res.data || [];
  } catch (err) {
    console.warn('[aiSummary] 拉取预警失败:', err);
    return { success: false, error: '拉取预警失败' };
  }

  if (alerts.length === 0) {
    return {
      success: true,
      summary: '最近没有收到预警，您家人暂时安全 ✓',
      aiPowered: false,
      alertCount: 0
    };
  }

  // 2) 拼接喂给 AI 的内容
  const itemsDesc = alerts.map((a, i) =>
    `${i + 1}. ${a.riskLevel === 'high' ? '高风险' : '中低风险'} - ${a.fraudMethod || a.riskTitle || '可疑信息'}`
  ).join('\n');

  // 3) 调 AI 生成摘要
  try {
    const ai = cloud.ai();
    const model = ai.createModel('cloudbase');

    const startCall = Date.now();
    const res = await model.generateText({
      data: {
        model: 'hunyuan-turbos-latest',
        messages: [
          {
            role: 'system',
            content: '你是一位家庭守护助手。请根据长辈最近识别的可疑信息，给子女一句话汇报。要求：不超过 30 字，语气温和但要提示风险。直接给文字，不要任何前缀。'
          },
          {
            role: 'user',
            content: `长辈最近识别到 ${alerts.length} 条可疑信息：\n${itemsDesc}\n\n请用一句话（30 字内）告诉子女：这些信息里最值得警惕的是什么。`
          }
        ],
        temperature: 0.5
      },
      timeout: 25000
    });
    const costMs = Date.now() - startCall;

    let summary = '';
    if (res && res.choices && res.choices[0] && res.choices[0].message) {
      summary = res.choices[0].message.content || '';
    } else if (res && res.text) {
      summary = res.text;
    } else if (typeof res === 'string') {
      summary = res;
    }

    // 兜底：摘要为空或太长
    if (!summary || summary.trim().length === 0) {
      summary = `今天识别 ${alerts.length} 条可疑信息，请关注`;
    } else {
      summary = summary.replace(/["「」]/g, '').replace(/\*\*/g, '').trim();
      if (summary.length > 40) summary = summary.substring(0, 40) + '...';
    }

    return {
      success: true,
      aiPowered: true,
      summary,
      alertCount: alerts.length,
      costMs
    };
  } catch (err) {
    console.warn('[aiSummary] AI 调用失败:', err);
    // 兜底：直接给统计
    const highCount = alerts.filter(a => a.riskLevel === 'high').length;
    let fallbackSummary;
    if (highCount > 0) {
      fallbackSummary = `⚠️ 今天识别 ${highCount} 条高风险信息，请尽快与家人沟通`;
    } else {
      fallbackSummary = `今天识别 ${alerts.length} 条可疑信息，建议关注`;
    }
    return {
      success: true,
      aiPowered: false,
      summary: fallbackSummary,
      alertCount: alerts.length
    };
  }
};
