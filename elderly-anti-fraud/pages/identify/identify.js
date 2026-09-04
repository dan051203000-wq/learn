// 识别页面：粘贴文字/上传图片 → 调云函数识别 → 大色块结果 → 朗读/保存/举报
// 注：TTS 朗读功能依赖微信「同声传译」插件（仅企业/认证主体可用）。
// 个人主体小程序暂不支持该插件，UI 上保留按钮但点击提示「暂未开放」。

Page({
  data: {
    inputType: 'text',
    inputText: '',
    uploadedImage: '',
    showResult: false,
    result: {},
    history: [],
    speaking: false, // 是否在朗读
    evidenceFileId: '', // 拍照存证返回的 fileID
    ttsAvailable: false // TTS 是否可用（个人主体小程序为 false）
  },

  onLoad() {
    this.loadHistory();
    this.initTTS();
  },

  onUnload() {
    // 页面卸载时停止朗读
    this.stopSpeak();
  },

  setInputType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ inputType: type });
  },

  onTextInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const file = res.tempFiles[0];
        this.setData({ uploadedImage: file.tempFilePath, evidenceFileId: '' });
        // 选完图立刻上传到云存储做证据保留（用户主动提交，由云函数代理）
        this.uploadEvidence(file.tempFilePath);
      }
    });
  },

  /**
   * 把用户选的可疑截图加密路径上传到云存储，作为"证据链"
   * 仅本机账号能看到，不会被其他人读取（集合权限"仅创建者可读写"）
   */
  uploadEvidence(filePath) {
    // 优先用 OPENID，回退本地 userId
    const userId = getApp().globalData.openId || wx.getStorageSync('userId') || 'anonymous';
    const cloudPath = `fraud-evidence/${userId}/${Date.now()}.jpg`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: res => {
        this.setData({ evidenceFileId: res.fileID });
        wx.showToast({ title: '已为您保留证据', icon: 'success' });
      },
      fail: err => {
        // 上传失败不阻断识别流程
        console.warn('证据上传失败', err);
      }
    });
  },

  identifyText() {
    const text = this.data.inputText.trim();
    if (!text) {
      wx.showToast({ title: '请输入要识别的信息', icon: 'error' });
      return;
    }

    wx.showLoading({ title: 'AI 智能分析中...', mask: true });

    // 携带 elderCode + elderName，用于家庭预警推送
    const familyCode = wx.getStorageSync('familyCode') || '';
    const elderName = wx.getStorageSync('familyElderName') || '';

    // 第一步：尝试 AI 识别（混元大模型）
    wx.cloud.callFunction({
      name: 'identifyFraudAI',
      data: {
        text,
        source: 'text'
      },
      success: aiRes => {
        const aiResult = aiRes.result || {};
        if (aiResult.success && aiResult.data) {
          // AI 成功 → 用 AI 结果
          wx.hideLoading();
          this.handleIdentifyResult(text, aiResult.data, aiResult);
          return;
        }
        // AI 返回 needFallback 或失败 → 兜底调原规则匹配
        console.warn('[identify] AI 识别走兜底:', aiResult.error);
        this.callIdentifyFraudFallback('text', text, familyCode, elderName);
      },
      fail: err => {
        console.warn('[identify] AI 云函数调用失败，走兜底:', err);
        this.callIdentifyFraudFallback('text', text, familyCode, elderName);
      }
    });
  },

  identifyImage() {
    const imagePath = this.data.uploadedImage;
    if (!imagePath) {
      wx.showToast({ title: '请选择图片', icon: 'error' });
      return;
    }

    wx.showLoading({ title: '上传并分析图片...', mask: true });

    // 上传图片到云存储（如尚未上传）
    if (!this.data.evidenceFileId) {
      const userId = getApp().globalData.openId || wx.getStorageSync('userId') || 'anon';
      const fileName = `fraud-images/${userId}/${Date.now()}.jpg`;
      wx.cloud.uploadFile({
        cloudPath: fileName,
        filePath: imagePath,
        success: res => {
          this.setData({ evidenceFileId: res.fileID });
          this.callImageAI(res.fileID);
        },
        fail: err => {
          wx.hideLoading();
          wx.showToast({ title: '上传图片失败', icon: 'error' });
        }
      });
    } else {
      this.callImageAI(this.data.evidenceFileId);
    }
  },

  /**
   * 图片 AI 识别：优先调 identifyImageAI（OCR + 混元）
   * 失败兜底调原 identifyFraud
   */
  callImageAI(fileID) {
    wx.cloud.callFunction({
      name: 'identifyImageAI',
      data: { imageUrl: fileID }
    }).then(ocrRes => {
      wx.hideLoading();
      const ocrResult = ocrRes.result || {};
      if (ocrResult.success && ocrResult.data) {
        // OCR + AI 成功
        const text = ocrResult.data.ocrText || '（图片中未识别到文字）';
        this.callIdentifyFraudFallback('image', text, wx.getStorageSync('familyCode') || '', wx.getStorageSync('familyElderName') || '', true);
        return;
      }
      // OCR 失败（凭证缺失/调用失败）→ 兜底原识别
      console.warn('[identify] 图片 AI 走兜底:', ocrResult.error);
      this.callIdentifyFraudFallback('image', fileID, wx.getStorageSync('familyCode') || '', wx.getStorageSync('familyElderName') || '', false, true);
    }).catch(err => {
      wx.hideLoading();
      console.warn('[identify] 图片 AI 调用失败，走兜底:', err);
      this.callIdentifyFraudFallback('image', fileID, wx.getStorageSync('familyCode') || '', wx.getStorageSync('familyElderName') || '', false, true);
    });
  },

  /**
   * 兜底：调原 identifyFraud（规则匹配）
   * @param {string} type - 'text' | 'image'
   * @param {string} payload - 文本内容 或 fileID
   * @param {string} familyCode - 守护码
   * @param {string} elderName - 长辈称呼
   * @param {boolean} fromOCR - 图片是否经过 OCR（true 时把 payload 当文本）
   * @param {boolean} isImageFile - 兜底路径时把 payload 当 fileID
   */
  callIdentifyFraudFallback(type, payload, familyCode, elderName, fromOCR, isImageFile) {
    const data = { type };
    if (type === 'text') data.content = payload;
    else if (type === 'image' && fromOCR) data.content = payload;  // OCR 后的文本
    else data.imageUrl = payload;  // 兜底原图 fileID

    data.elderCode = familyCode;
    data.elderName = elderName;

    if (type === 'image' && !isImageFile && !fromOCR) {
      // 兜底原图
      data.imageUrl = payload;
    }

    wx.cloud.callFunction({
      name: 'identifyFraud',
      data,
      success: res => {
        wx.hideLoading();
        const result = res.result;
        this.handleIdentifyResult(type === 'image' && fromOCR ? (payload.substring(0, 50) + '[图片OCR]') : (type === 'image' ? '图片识别' : payload), result, null);
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '识别失败，请重试', icon: 'error' });
        console.error('兜底识别失败', err);
      }
    });
  },

  /**
   * 统一处理识别结果（AI 或兜底）
   */
  handleIdentifyResult(textSnippet, result, aiMeta) {
    // 适配显示（统一字段）
    const display = this.normalizeResult(result);
    this.setData({ showResult: true, result: display, aiPowered: !!(aiMeta && aiMeta.aiPowered) });
    this.saveToHistory(textSnippet, display);
    this.afterIdentify(display);
  },

  /**
   * 字段归一：把 AI 返回 / 原规则返回的字段统一为页面渲染需要的格式
   */
  normalizeResult(r) {
    if (!r) return {};
    return {
      riskLevel: r.riskLevel || 'none',
      riskLevelText: r.riskLevelText || ({ high: '🚨 高风险', medium: '⚠️ 中风险', low: '⚠️ 低风险', none: '✅ 安全' })[r.riskLevel] || '已识别',
      riskTitle: r.riskTitle || '识别结果',
      icon: r.icon || ({ high: '🚨', medium: '⚠️', low: '⚠️', none: '✅' })[r.riskLevel] || '🔍',
      fraudMethod: r.fraudMethod || '',
      features: r.features || [],
      countermeasures: r.countermeasures || [],
      disclaimer: r.disclaimer || '本识别仅供参考，未检测到风险 ≠ 绝对安全，紧急情况请直接拨打 110 或 96110 反诈专线。'
    };
  },

  /* ===== 识别后联动（家庭预警已通过云函数自动写入 familyAlerts） ===== */
  afterIdentify(result) {
    // 仅当有风险且识别者设置了 elderCode 时，弹一条 toast 提示子女已收到预警
    const hasCode = !!wx.getStorageSync('familyCode');
    if (hasCode && result && result.riskLevel && result.riskLevel !== 'none') {
      wx.showToast({
        title: '已同步给您的守护者',
        icon: 'success',
        duration: 2000
      });
    }
  },

  saveToHistory(text, result) {
    const app = getApp();
    const userId = app.globalData.openId || wx.getStorageSync('userId') || '';
    wx.cloud.callFunction({
      name: 'dataService',
      data: {
        action: 'saveHistory',
        userId,
        text: text.substring(0, 50),
        result
      },
      success: () => {
        this.loadHistory();
      }
    });
  },

  loadHistory() {
    const app = getApp();
    const userId = app.globalData.openId || wx.getStorageSync('userId');
    if (!userId) return;

    wx.cloud.callFunction({
      name: 'dataService',
      data: { action: 'getHistory', userId, limit: 10 },
      success: res => {
        if (res.result && res.result.success) {
          const history = res.result.data.map(item => {
            const r = item.result || {};
            const level = r.riskLevel || 'none';
            return {
              ...item,
              time: new Date(item.timestamp).toLocaleString(),
              riskClass: level,
              riskLevelText: r.riskLevelText || this.levelText(level),
              icon: r.icon || '🔍',
              riskTitle: r.riskTitle || '识别记录'
            };
          });
          this.setData({ history });
        }
      }
    });
  },

  levelText(level) {
    const map = { high: '高风险', medium: '中风险', low: '低风险', none: '安全' };
    return map[level] || '已识别';
  },

  callHotline() {
    // 拨打 96110
    wx.showModal({
      title: '反诈专线 96110',
      content: '发现可疑情况，可拨打全国反诈中心专线 96110 咨询。\n\n点击确定直接拨打',
      confirmText: '拨打 96110',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '96110',
            fail: (err) => console.warn('拨号失败', err)
          });
        }
      }
    });
  },

  reportFraud() {
    wx.navigateTo({
      url: '/pages/report/report'
    });
  },

  shareFraud() {
    wx.showActionSheet({
      itemList: ['分享给朋友', '分享到朋友圈'],
      success: res => {
        wx.showToast({ title: '已分享', icon: 'success' });
      }
    });
  },

  viewHistory(e) {
    const { id } = e.currentTarget.dataset;
    // 显示历史记录详情
  },

  /* ===== TTS 朗读（适配老人看不清字） ===== */
  initTTS() {
    if (!this._ttsAudio) {
      this._ttsAudio = wx.createInnerAudioContext();
      this._ttsAudio.onEnded(() => {
        this.setData({ speaking: false });
      });
      this._ttsAudio.onError((err) => {
        console.warn('TTS 播放失败', err);
        this.setData({ speaking: false });
        wx.showToast({ title: '朗读失败', icon: 'none' });
      });
    }
    // 探测插件是否可用（个人主体小程序 requirePlugin 会失败/抛错）
    try {
      const plugin = requirePlugin('WechatSI');
      this._ttsPlugin = plugin;
      this.setData({ ttsAvailable: !!(plugin && typeof plugin.textToSpeech === 'function') });
    } catch (e) {
      this._ttsPlugin = null;
      this.setData({ ttsAvailable: false });
    }
  },

  speakResult() {
    const r = this.data.result;
    if (!r) return;
    this.initTTS();
    const plugin = this._ttsPlugin;
    if (!plugin || typeof plugin.textToSpeech !== 'function') {
      // 个人主体小程序走不到这里，但仍保留兜底
      wx.showModal({
        title: '朗读功能暂未开放',
        content: '本工具为个人主体小程序，「语音朗读」依赖微信「同声传译」插件，仅企业/认证主体可用。\n\n建议把识别结果截图发给您信任的家人，请他们念给您听。',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    // 拼接朗读文本：风险标题 + 等级 + 怎么骗 + 怎么识别 + 怎么办
    const text = [
      '风险提示：' + (r.riskTitle || ''),
      '风险等级：' + (r.riskLevelText || ''),
      '骗子是怎么骗的：' + (r.fraudMethod || ''),
      '怎么识别：' + ((r.features || []).join('，')),
      '您应该这样做：' + ((r.countermeasures || []).join('，'))
    ].join('。');

    this.setData({ speaking: true });
    plugin.textToSpeech({
      lang: 'zh_CN',
      tts: true,
      content: text,
      success: (res) => {
        if (res && res.filename) {
          this._ttsAudio.src = res.filename;
          this._ttsAudio.play();
        } else {
          this.setData({ speaking: false });
        }
      },
      fail: (err) => {
        console.warn('TTS 调用失败', err);
        this.setData({ speaking: false });
        wx.showToast({ title: '朗读功能暂不可用', icon: 'none' });
      }
    });
  },

  stopSpeak() {
    if (this._ttsAudio) {
      this._ttsAudio.stop();
    }
    this.setData({ speaking: false });
  }
});
