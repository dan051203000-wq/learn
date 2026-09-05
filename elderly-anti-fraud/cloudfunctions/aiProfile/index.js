// 云函数：aiProfile
// 能力：基于老人近期识别历史，AI 生成个性化防护画像（薄弱类型 + 针对性建议）
// 额度控制：按"用户+自然周"缓存一次，本周内重复调用直接返回缓存，不重复调 AI
// 兜底：AI 失败/无历史 → 返回统计版画像或空状态

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 60000
});

const db = cloud.database();
const _ = db.command;

const SYSTEM_PROMPT = `你是一位老年反诈防护顾问。根据老人最近识别的可疑信息记录，生成一份个性化防护画像，帮助老人和子女了解他的薄弱点。

【输出格式（严格 JSON，无任何多余文字）】
{
  "summary": "一句话总体评价（30字内，语气温和不打击，但要指出风险点）",
  "weakTypes": ["最常遇到的诈骗类型1", "诈骗类型2", "诈骗类型3"],
  "highRiskCount": 数字,
  "suggestions": ["针对性建议1（具体可执行）", "针对性建议2", "针对性建议3"],
  "encouragement": "一句鼓励老人的话（20字内）"
}

【要求】
1. weakTypes 不超过 3 条，按出现频率从高到低
2. suggestions 必须针对他遇到的具体诈骗类型给，不要给空泛的"提高警惕"
3. summary 和 encouragement 用老人听得懂的大白话
4. 不需要在结尾加 96110 提示（前端会统一加）`;

/**
 * 计算本周 key（年-周数），用于缓存命中
 */
function getWeekKey(d) {
  const date = new Date(d);
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const dayOfYear = Math.floor((date - start) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((dayOfYear + start.getDay() + 1) / 7);
  return `${year}-W${week}`;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID || event.userId || '';

  if (!userId) {
    return { success: false, error: '未登录，无法生成画像' };
  }

  const { force = false } = event;
  const weekKey = getWeekKey(new Date());
  const cacheKey = `${userId}_${weekKey}`;

  // 1) 命中缓存直接返回（除非 force=true）
  if (!force) {
    try {
      const cached = await db.collection('aiProfiles')
        .where({ cacheKey })
        .limit(1)
        .get();
      if (cached.data && cached.data.length > 0) {
        return {
          success: true,
          aiPowered: cached.data[0].aiPowered !== false,
          profile: cached.data[0].profile,
          cached: true,
          generatedAt: cached.data[0].generatedAt
        };
      }
    } catch (e) {
      // 集合不存在时静默跳过，继续走生成流程
      console.warn('[aiProfile] 缓存读取失败:', e.message);
    }
  }

  // 2) 拉取最近 30 条识别历史
  let history = [];
  try {
    const res = await db.collection('identifyHistory')
      .where({ userId })
      .orderBy('timestamp', 'desc')
      .limit(30)
      .get();
    history = res.data || [];
  } catch (e) {
    console.warn('[aiProfile] 拉取历史失败:', e.message);
    return { success: false, error: '暂无识别记录，无法生成画像' };
  }

  if (history.length === 0) {
    return {
      success: true,
      empty: true,
      message: '您还没有识别过可疑信息。多用几次识别功能，我就能给您出一份专属防护建议啦。'
    };
  }

  // 3) 统计：高风险次数、按诈骗手法分组
  const highRiskCount = history.filter(h => h.riskLevel === 'high').length;
  const methodCount = {};
  for (const h of history) {
    const full = h.fullResult || {};
    const method = full.fraudMethod || h.riskLevelText || '未知';
    methodCount[method] = (methodCount[method] || 0) + 1;
  }

  // 4) 拼接喂给 AI 的脱敏摘要（只取风险等级 + 诈骗类型 + 内容前 20 字）
  const itemsDesc = history.slice(0, 30).map((h, i) => {
    const full = h.fullResult || {};
    const method = full.fraudMethod || '未知';
    const snippet = (h.text || '').substring(0, 20);
    const level = h.riskLevel || 'none';
    return `${i + 1}. [${level}] ${method} | ${snippet}`;
  }).join('\n');

  // 5) 调混元生成画像
  try {
    const ai = cloud.ai();
    const model = ai.createModel('cloudbase');

    const startCall = Date.now();
    const res = await model.generateText({
      data: {
        model: 'hunyuan-turbos-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `老人最近 ${history.length} 次识别记录如下（[风险等级] 诈骗类型 | 内容摘要）：\n${itemsDesc}\n\n其中高风险 ${highRiskCount} 次。请生成防护画像。`
          }
        ],
        temperature: 0.4
      },
      timeout: 30000
    });
    const costMs = Date.now() - startCall;

    let rawContent = '';
    if (res && res.choices && res.choices[0] && res.choices[0].message) {
      rawContent = res.choices[0].message.content || '';
    } else if (res && res.text) {
      rawContent = res.text;
    } else if (typeof res === 'string') {
      rawContent = res;
    }

    // 解析 JSON
    let parsed = null;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);
    } catch (parseErr) {
      console.warn('[aiProfile] JSON 解析失败:', parseErr.message, '\n原始:', rawContent);
      // 兜底：统计版画像
      return {
        success: true,
        aiPowered: false,
        profile: buildFallbackProfile(history, highRiskCount, methodCount),
        costMs
      };
    }

    // 字段校验 + 截断
    const profile = {
      summary: String(parsed.summary || '暂无可分析的画像').substring(0, 60),
      weakTypes: Array.isArray(parsed.weakTypes)
        ? parsed.weakTypes.slice(0, 3).map(t => String(t).substring(0, 30))
        : [],
      highRiskCount: Number(parsed.highRiskCount) || highRiskCount,
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 3).map(s => String(s).substring(0, 80))
        : [],
      encouragement: String(parsed.encouragement || '保持警惕，您做得很好').substring(0, 40),
      totalChecks: history.length
    };

    // 6) 写缓存（失败不影响返回）
    try {
      await db.collection('aiProfiles').add({
        data: {
          cacheKey,
          userId,
          profile,
          aiPowered: true,
          generatedAt: new Date(),
          expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    } catch (e) {
      console.warn('[aiProfile] 写缓存失败:', e.message);
    }

    return { success: true, aiPowered: true, profile, costMs };
  } catch (err) {
    console.error('[aiProfile] AI 调用失败:', err);
    return {
      success: true,
      aiPowered: false,
      profile: buildFallbackProfile(history, highRiskCount, methodCount)
    };
  }
};

/**
 * 兜底：AI 不可用时，用统计生成基础画像
 */
function buildFallbackProfile(history, highRiskCount, methodCount) {
  // 按出现次数倒序取前 3 个手法
  const sortedMethods = Object.keys(methodCount)
    .sort((a, b) => methodCount[b] - methodCount[a])
    .slice(0, 3);

  let summary = '';
  if (highRiskCount > 0) {
    summary = `最近识别 ${history.length} 次，其中 ${highRiskCount} 次高风险，请重点关注。`;
  } else {
    summary = `最近识别 ${history.length} 次，暂未发现高风险，继续保持警惕。`;
  }

  return {
    summary,
    weakTypes: sortedMethods.length > 0 ? sortedMethods : ['暂无明显薄弱点'],
    highRiskCount,
    suggestions: [
      '收到陌生短信谈钱，先打 96110 问问再决定',
      '不让家人看一眼的转账，宁可不转',
      '凡是要求"验证码""安全账户"的，一律是骗'
    ],
    encouragement: '多识别一次，少上当一次，您做得对',
    totalChecks: history.length
  };
}
