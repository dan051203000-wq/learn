// 云函数：identifyImageAI
// 能力：图片 OCR 提取文字 + 调混元分析是否为诈骗
// 前置：需要在云开发控制台 → 该云函数 → 配置环境变量
//   TENCENT_SECRET_ID = 腾讯云 API 密钥 ID
//   TENCENT_SECRET_KEY = 腾讯云 API 密钥 Key
// 申请地址：https://console.cloud.tencent.com/cam/capi （个人可申请，免费 1000 次/月）

const cloud = require('wx-server-sdk');
const tencentcloud = require('tencentcloud-sdk-nodejs');
const OcrClient = tencentcloud.ocr.v20181119.Client;

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 60000
});

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { imageUrl } = event;

  if (!imageUrl) {
    return {
      success: false,
      needFallback: true,
      error: '缺少 imageUrl'
    };
  }

  // 1) OCR 提取文字
  let ocrText = '';
  try {
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;

    if (!secretId || !secretKey) {
      // 凭证未配置 → 友好提示（不是错误崩溃）
      return {
        success: false,
        needFallback: true,
        error: '图片 OCR 凭证未配置，请在云开发控制台配置 TENCENT_SECRET_ID / TENCENT_SECRET_KEY',
        hint: '申请地址：https://console.cloud.tencent.com/cam/capi （个人可申请，免费 1000 次/月）'
      };
    }

    const client = new OcrClient({
      credential: { secretId, secretKey },
      region: 'ap-guangzhou',
      profile: { httpProfile: { endpoint: 'ocr.tencentcloudapi.com' } }
    });

    const ocrRes = await client.GeneralBasicOCR({ ImageUrl: imageUrl });
    ocrText = (ocrRes.TextDetections || []).map(d => d.DetectedText).join(' ');
  } catch (ocrErr) {
    console.warn('[identifyImageAI] OCR 失败:', ocrErr);
    return {
      success: false,
      needFallback: true,
      error: 'OCR 识别失败：' + (ocrErr.message || '未知错误')
    };
  }

  if (!ocrText || ocrText.trim().length === 0) {
    return {
      success: false,
      needFallback: true,
      error: '图片中未识别到文字'
    };
  }

  // 2) 调混元分析 OCR 提取的文字
  try {
    const ai = cloud.ai();
    const model = ai.createModel('cloudbase');

    const res = await model.generateText({
      data: {
        model: 'hy3',  // 混元新模型名
        messages: [
          {
            role: 'system',
            content: `你是一位反诈专家。以下是从一张可疑图片中提取的文字。请判断是否为诈骗。

【输出格式】严格 JSON，无任何多余文字：
{
  "isFraud": true/false,
  "type": "诈骗类型/正常信息",
  "riskLevel": "high/medium/low/none",
  "riskTitle": "老人易懂的一句话",
  "fraudMethod": "骗子怎么骗的（2-3 句）",
  "features": ["识别依据1", "识别依据2"],
  "countermeasures": ["怎么办1", "怎么办2"],
  "disclaimer": "必须包含'本识别基于AI判断仅供参考，未检测到风险≠绝对安全，紧急情况请直接拨打110或96110反诈专线'"
}`
          },
          { role: 'user', content: `图片中提取的文字：「${ocrText.substring(0, 800)}」` }
        ],
        temperature: 0.3
      },
      timeout: 30000
    });

    let rawContent = '';
    if (res && res.choices && res.choices[0] && res.choices[0].message) {
      rawContent = res.choices[0].message.content || '';
    } else if (res && res.text) {
      rawContent = res.text;
    }

    // 解析 JSON
    let parsed = null;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else parsed = JSON.parse(rawContent);
    } catch (e) {
      return {
        success: false,
        needFallback: true,
        error: 'AI 输出格式异常',
        ocrText: ocrText.substring(0, 200)
      };
    }

    return {
      success: true,
      aiPowered: true,
      data: {
        ...parsed,
        ocrText: ocrText.substring(0, 500)
      },
      callerOpenId: wxContext.OPENID || ''
    };
  } catch (aiErr) {
    console.error('[identifyImageAI] AI 失败:', aiErr);
    // OCR 成功但 AI 失败：返回 OCR 文字，让客户端走兜底
    return {
      success: false,
      needFallback: true,
      error: 'AI 分析失败',
      ocrText: ocrText.substring(0, 500)
    };
  }
};
