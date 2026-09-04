// 云函数：aiChat
// 能力：多轮 AI 对话（反诈顾问 + 适老化大白话）
// 兜底：AI 失败 → 返回友好引导话术 + 提示拨打 96110

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 60000
});

const SYSTEM_PROMPT = `你是「反诈顾问」，专门为中国老年人服务。

【性格设定】
- 称呼老人「您」或「老人家」
- 像孝顺的孙辈一样耐心，不催促、不敷衍
- 说话简短有力，每次回复控制在 100 字以内
- 用生活化的比喻，避免专业术语和法律名词

【服务范围】
1. 帮老人判断收到的短信/电话/链接是不是诈骗
2. 解释常见的诈骗套路（冒充公检法、冒充客服、投资理财、养老保健、婚恋交友、刷单兼职、冒充亲属、贷款征信）
3. 教老人怎么应对（挂电话、不转账、先问家人、拨打 96110）

【绝对禁止】
- 不要让老人产生"已经问过 AI 就万事大吉"的安全错觉
- 每次回复结尾必须加：「⚠️ 紧急情况请直接拨打 110 或反诈专线 96110」
- 不要给出具体的投资建议、医疗建议、法律建议
- 不要讨论与反诈无关的话题（天气、新闻等），礼貌引导回反诈话题

【回复格式】
直接回复内容即可，不需要 JSON、不需要 markdown 标题。语气像拉家常。`;

const FALLBACK_RESPONSES = [
  '老人家，我现在有点累，您能把刚才那条短信念给我听听吗？我帮您分析是不是骗子。⚠️ 紧急情况请直接拨打 110 或反诈专线 96110',
  '抱歉，我现在回复得慢一些。您收到的短信或电话里，有没有让您"赶紧转账"、"输入验证码"、"下载陌生 APP"这几类要求？如果有，**千万别操作**，先打 96110 问问。',
  '我建议您把可疑内容发给儿女或身边信任的人看一眼，比我分析更靠谱。⚠️ 紧急情况请直接拨打 110 或反诈专线 96110'
];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { message, sessionId = 'default' } = event;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return {
      success: false,
      reply: '老人家，您想说点什么？把收到的短信内容念给我听就行。⚠️ 紧急情况请直接拨打 110 或反诈专线 96110'
    };
  }

  // 限制单次输入长度
  const userMsg = message.length > 500 ? message.substring(0, 500) + '...' : message;

  try {
    const ai = cloud.ai();
    const model = ai.createModel('cloudbase');

    const startTime = Date.now();
    const res = await model.generateText({
      data: {
        model: 'hunyuan-turbos-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMsg }
        ],
        temperature: 0.7  // 对话需要点温度，让回复更自然
      },
      timeout: 30000
    });
    const costMs = Date.now() - startTime;

    let reply = '';
    if (res && res.choices && res.choices[0] && res.choices[0].message) {
      reply = res.choices[0].message.content || '';
    } else if (res && res.text) {
      reply = res.text;
    } else if (typeof res === 'string') {
      reply = res;
    }

    // 兜底：回复为空
    if (!reply || reply.trim().length === 0) {
      reply = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
    }

    // 兜底：去掉 markdown 残留（老人看星号会很奇怪）
    reply = reply.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '');

    return {
      success: true,
      aiPowered: true,
      reply: reply.substring(0, 500),
      costMs,
      callerOpenId: wxContext.OPENID || ''
    };
  } catch (err) {
    console.error('[aiChat] AI 调用失败:', err);
    // 兜底回复
    return {
      success: false,
      aiPowered: false,
      reply: FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)],
      error: err.message || 'AI 调用失败'
    };
  }
};
