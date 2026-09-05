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

// 救援模式系统提示词：老人疑似已转账/已损失时切换
const RESCUE_SYSTEM_PROMPT = `你是「反诈紧急救援员」，专门帮助已经把钱转出去、可能已经被骗的中国老人。此刻老人非常焦虑、害怕、自责，你的每一句话都要稳住他。

【说话风格】
- 称呼"您"或"老人家"，像家人一样温和坚定
- 不责怪老人"怎么这么糊涂"，绝不二次伤害
- 每次回复控制在 120 字以内，句子短、节奏慢
- 用大白话，不要法律/金融术语

【必须按顺序引导老人做这些事】
1. 先稳住情绪："钱转出去不一定是您的错，骗子专门设计套路骗人，我们先冷静处理"
2. 立即止付：让老人马上拨打银行客服电话冻结账户（说出常见银行客服号）
3. 立即报警：拨打 110 或反诈专线 96110
4. 保存证据：转账记录、聊天截图、对方账号都别删
5. 联系家人：让老人立刻告诉子女或身边信任的人

【绝对禁止】
- 不要给老人"钱一定能追回来"的承诺（追回与否取决于警方和银行，不能打包票）
- 不要让老人自己处理（必须让他联系家人或警方）
- 不要讨论与本次救援无关的话题
- 回复结尾必须加："⚠️ 现在请立即拨打 110 或 96110，并联系您的家人"

【输出格式】直接回复文字，不要 JSON、不要 markdown 标题。`;

const RESCUE_FALLBACK_RESPONSES = [
  '老人家，钱转出去不一定是您的错，是骗子太狡猾。请您现在马上做三件事：① 打您银行卡背面的客服电话，说"我被骗了，请冻结账户"；② 拨打 110 或 96110 报警；③ 把转账记录和聊天截图都留着别删。⚠️ 现在请立即拨打 110 或 96110，并联系您的家人',
  '我现在回复慢一些，但这件事不能等：① 立刻打银行客服冻结账户；② 拨打 110 报警；③ 把骗子的电话、账号、聊天记录都截图保存；④ 立刻告诉您的子女或家人。⚠️ 现在请立即拨打 110 或 96110，并联系您的家人'
];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { message, sessionId = 'default', mode = 'normal' } = event;

  const isRescue = mode === 'rescue';
  const systemPrompt = isRescue ? RESCUE_SYSTEM_PROMPT : SYSTEM_PROMPT;
  const fallbacks = isRescue ? RESCUE_FALLBACK_RESPONSES : FALLBACK_RESPONSES;
  const emptyFallback = isRescue
    ? '老人家，您先把刚发生的事简单说给我听：转给了谁、转了多少、用什么方式转的？我帮您理一理下一步。⚠️ 现在请立即拨打 110 或 96110，并联系您的家人'
    : '老人家，您想说点什么？把收到的短信内容念给我听就行。⚠️ 紧急情况请直接拨打 110 或反诈专线 96110';

  if (!message || typeof message !== 'string' || !message.trim()) {
    return { success: false, reply: emptyFallback, mode };
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg }
        ],
        temperature: isRescue ? 0.4 : 0.7  // 救援模式温度更低，话术更稳定
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
      reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // 兜底：去掉 markdown 拋留（老人看星号会很奇怪）
    reply = reply.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '');

    return {
      success: true,
      aiPowered: true,
      reply: reply.substring(0, 500),
      mode,
      costMs,
      callerOpenId: wxContext.OPENID || ''
    };
  } catch (err) {
    console.error('[aiChat] AI 调用失败:', err);
    // 兜底回复
    return {
      success: false,
      aiPowered: false,
      mode,
      reply: fallbacks[Math.floor(Math.random() * fallbacks.length)],
      error: err.message || 'AI 调用失败'
    };
  }
};
