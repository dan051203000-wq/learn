Page({
  data: {
    inputType: 'text',
    inputText: '',
    uploadedImage: '',
    showResult: false,
    result: {},
    history: []
  },

  onLoad() {
    this.loadHistory();
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
        this.setData({ uploadedImage: file.tempFilePath });
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

    // 调用云函数进行识别
    wx.cloud.callFunction({
      name: 'identifyFraud',
      data: {
        type: 'text',
        content: text
      },
      success: res => {
        wx.hideLoading();
        const result = res.result;
        this.setData({ showResult: true, result });
        this.saveToHistory(text, result);
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

    // 上传图片到云存储
    const fileName = `fraud-images/${Date.now()}.jpg`;
    wx.cloud.uploadFile({
      cloudPath: fileName,
      filePath: imagePath,
      success: res => {
        // 调用云函数进行识别
        wx.cloud.callFunction({
          name: 'identifyFraud',
          data: {
            type: 'image',
            imageUrl: res.fileID
          },
          success: res => {
            wx.hideLoading();
            const result = res.result;
            this.setData({ showResult: true, result });
            this.saveToHistory('图片识别', result);
          },
          fail: err => {
            wx.hideLoading();
            wx.showToast({ title: '识别失败', icon: 'error' });
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '上传图片失败', icon: 'error' });
      }
    });
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
  }
});
