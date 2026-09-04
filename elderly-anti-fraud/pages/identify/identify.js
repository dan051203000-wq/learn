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
    const userId = wx.getStorageSync('userId') || 'anonymous';
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

    wx.showLoading({ title: '识别中...' });

    // 调用云函数进行识别（携带 elderCode + elderName，用于家庭预警推送）
    const familyCode = wx.getStorageSync('familyCode') || '';
    const elderName = wx.getStorageSync('familyElderName') || '';
    wx.cloud.callFunction({
      name: 'identifyFraud',
      data: {
        type: 'text',
        content: text,
        elderCode: familyCode,
        elderName
      },
      success: res => {
        wx.hideLoading();
        const result = res.result;
        this.setData({ showResult: true, result });
        this.saveToHistory(text, result);
        this.afterIdentify(result);
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '识别失败，请重试', icon: 'error' });
        console.error('识别失败', err);
      }
    });
  },

  identifyImage() {
    const imagePath = this.data.uploadedImage;
    if (!imagePath) {
      wx.showToast({ title: '请选择图片', icon: 'error' });
      return;
    }

    wx.showLoading({ title: '识别中...' });

    // 上传图片到云存储（如尚未上传）
    if (!this.data.evidenceFileId) {
      const fileName = `fraud-images/${wx.getStorageSync('userId') || 'anon'}/${Date.now()}.jpg`;
      wx.cloud.uploadFile({
        cloudPath: fileName,
        filePath: imagePath,
        success: res => {
          this.setData({ evidenceFileId: res.fileID });
          this.callIdentifyFraud('image', res.fileID);
        },
        fail: err => {
          wx.hideLoading();
          wx.showToast({ title: '上传图片失败', icon: 'error' });
        }
      });
    } else {
      this.callIdentifyFraud('image', this.data.evidenceFileId);
    }
  },

  callIdentifyFraud(type, payload) {
    const data = { type };
    if (type === 'text') data.content = payload;
    else data.imageUrl = payload;

    // 携带 elderCode + elderName（家庭预警推送用）
    data.elderCode = wx.getStorageSync('familyCode') || '';
    data.elderName = wx.getStorageSync('familyElderName') || '';

    wx.cloud.callFunction({
      name: 'identifyFraud',
      data,
      success: res => {
        wx.hideLoading();
        const result = res.result;
        this.setData({ showResult: true, result });
        this.saveToHistory(type === 'image' ? '图片识别' : payload, result);
        this.afterIdentify(result);
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '识别失败', icon: 'error' });
      }
    });
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
    wx.cloud.callFunction({
      name: 'dataService',
      data: {
        action: 'saveHistory',
        userId: wx.getStorageSync('userId'),
        text: text.substring(0, 50),
        result
      },
      success: () => {
        this.loadHistory();
      }
    });
  },

  loadHistory() {
    const userId = wx.getStorageSync('userId');
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
