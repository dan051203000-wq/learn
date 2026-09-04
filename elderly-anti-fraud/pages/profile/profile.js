// 个人中心页面：用户信息、防诈成绩、识别历史、适老化设置
Page({
  data: {
    nickName: '我',
    fontLarge: false,
    stats: {
      identifyCount: 0,
      reportCount: 0,
      learnDays: 1
    },
    history: [],
    settings: [
      { key: 'fontLarge', title: '大字模式', desc: '放大页面文字，看得更清楚', icon: '🔍' }
    ],
    menuList: [
      { title: '我的举报记录', icon: '📋', url: '/pages/report/report' },
      { title: '家庭守护', icon: '👨‍👩‍👧‍👦', url: '/pages/family/family' },
      { title: '防诈知识库', icon: '📚', url: '/pages/knowledge/knowledge' }
    ]
  },

  onLoad() {
    this.setData({
      fontLarge: wx.getStorageSync('fontLarge') || false
    });
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
    this.loadHistory();
    this.loadStats();
  },

  loadUserInfo() {
    const savedName = wx.getStorageSync('nickName');
    if (savedName) {
      this.setData({ nickName: savedName });
      return;
    }
    const app = getApp();
    const name = app.globalData.userInfo && app.globalData.userInfo.nickName;
    if (name) {
      this.setData({ nickName: name });
      wx.setStorageSync('nickName', name);
    }
  },

  editName() {
    wx.showModal({
      title: '修改称呼',
      editable: true,
      placeholderText: '请输入您的称呼',
      success: res => {
        if (res.confirm && res.content && res.content.trim()) {
          const name = res.content.trim().substring(0, 10);
          wx.setStorageSync('nickName', name);
          this.setData({ nickName: name });
        }
      }
    });
  },

  loadStats() {
    const userId = getApp().globalData.openId || wx.getStorageSync('userId');
    if (!userId) return;

    wx.cloud.callFunction({
      name: 'dataService',
      data: { action: 'getStats', userId },
      success: res => {
        if (res.result && res.result.success) {
          this.setData({
            'stats.identifyCount': res.result.identifyCount || 0,
            'stats.reportCount': res.result.reportCount || 0
          });
        }
      }
    });
  },

  loadHistory() {
    const userId = getApp().globalData.openId || wx.getStorageSync('userId');
    if (!userId) return;

    wx.cloud.callFunction({
      name: 'dataService',
      data: { action: 'getHistory', userId, limit: 20 },
      success: res => {
        if (res.result && res.result.success) {
          const history = res.result.data.map(item => ({
            ...item,
            timeText: this.formatTime(item.timestamp),
            riskClass: this.riskClass(item.riskLevel)
          }));
          this.setData({ history });
        }
      },
      fail: () => {
        // 云环境未就绪时静默处理
      }
    });
  },

  riskClass(level) {
    if (level === 'high') return 'risk-high';
    if (level === 'medium') return 'risk-medium';
    return 'risk-low';
  },

  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  /* ===== 大字模式 ===== */
  toggleFont() {
    const fontLarge = !this.data.fontLarge;
    wx.setStorageSync('fontLarge', fontLarge);
    this.setData({ fontLarge });
    wx.showToast({
      title: fontLarge ? '已开启大字模式' : '已关闭大字模式',
      icon: 'none'
    });
  },

  viewHistoryDetail(e) {
    const { index } = e.currentTarget.dataset;
    const item = this.data.history[Number(index)];
    if (!item || !item.fullResult) return;

    const lines = [
      `识别内容：${item.text}`,
      `风险等级：${item.riskLevelText || ''}`,
      `诈骗手法：${(item.fullResult && item.fullResult.fraudMethod) || '未识别'}`
    ].join('\n');

    wx.showModal({
      title: '识别记录详情',
      content: lines,
      showCancel: false
    });
  },

  clearHistory() {
    if (this.data.history.length === 0) {
      wx.showToast({ title: '暂无记录', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '清空识别历史',
      content: '清空后将无法恢复，确定要清空吗？',
      confirmText: '清空',
      confirmColor: '#c62828',
      success: res => {
        if (res.confirm) {
          // 通过云函数批量删除该用户的识别记录
          wx.cloud.callFunction({
            name: 'dataService',
            data: { action: 'clearHistory', userId: getApp().globalData.openId || wx.getStorageSync('userId') },
            success: r => {
              if (r.result && r.result.success) {
                this.setData({ history: [] });
                wx.showToast({ title: '已清空', icon: 'success' });
              } else {
                wx.showToast({ title: '清空失败，请重试', icon: 'none' });
              }
            },
            fail: () => {
              wx.showToast({ title: '清空失败，请重试', icon: 'none' });
            }
          });
        }
      }
    });
  },

  goMenu(e) {
    const { url } = e.currentTarget.dataset;
    wx.navigateTo({ url });
  },

  goIdentify() {
    // identify 是 tabBar 页面，必须用 switchTab 跳转
    wx.switchTab({
      url: '/pages/identify/identify'
    });
  },

  callHotline() {
    wx.makePhoneCall({ phoneNumber: '96110' });
  },

  openAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  openPrivacy() {
    wx.navigateTo({
      url: '/pages/about/about?tab=privacy'
    });
  },

  openFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  }
});
