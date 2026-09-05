// 个人中心页面：用户信息、防诈成绩、识别历史、适老化设置
Page({
  data: {
    nickName: '我',
    fontScale: 'normal',  // 适老化三档：'normal' 标准 / 'large' 大字 / 'xl' 超大字
    stats: {
      identifyCount: 0,
      reportCount: 0,
      learnDays: 1
    },
    history: [],
    profile: null,          // AI 防护画像
    profileLoading: false,  // 画像生成中
    fontOptions: [
      { scale: 'normal', label: '标准' },
      { scale: 'large', label: '大字' },
      { scale: 'xl', label: '超大字' }
    ],
    menuList: [
      { title: '我的举报记录', icon: '📋', url: '/pages/report/report' },
      { title: '家庭守护', icon: '👨‍👩‍👧‍👦', url: '/pages/family/family' },
      { title: '防诈知识库', icon: '📚', url: '/pages/knowledge/knowledge' }
    ]
  },

  onLoad() {
    this.setData({
      fontScale: this.readFontScale()
    });
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
    this.loadHistory();
    this.loadStats();
    this.loadProfile();
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

  /* ===== AI 防护画像（基于识别历史，每周缓存一次，控额度） ===== */
  loadProfile() {
    const userId = getApp().globalData.openId || wx.getStorageSync('userId');
    if (!userId) return;
    this.setData({ profileLoading: true });

    wx.cloud.callFunction({
      name: 'aiProfile',
      data: { userId },
      success: res => {
        const r = res.result || {};
        if (r.success) {
          this.setData({
            profile: r.empty ? null : (r.profile || null),
            profileEmpty: !!r.empty,
            profileEmptyMsg: r.empty ? r.message : '',
            profileAiPowered: !!r.aiPowered,
            profileCached: !!r.cached,
            profileLoading: false
          });
        } else {
          this.setData({ profile: null, profileLoading: false });
        }
      },
      fail: () => {
        this.setData({ profile: null, profileLoading: false });
      }
    });
  },

  /* 强制刷新画像（本周重新生成一次，会消耗一次 AI 调用） */
  refreshProfile() {
    const userId = getApp().globalData.openId || wx.getStorageSync('userId');
    if (!userId) return;
    wx.showModal({
      title: '重新生成画像',
      content: '会重新调用 AI 分析，确定吗？',
      success: r => {
        if (!r.confirm) return;
        this.setData({ profileLoading: true });
        wx.cloud.callFunction({
          name: 'aiProfile',
          data: { userId, force: true },
          success: res => {
            const rr = res.result || {};
            if (rr.success) {
              this.setData({
                profile: rr.empty ? null : (rr.profile || null),
                profileEmpty: !!rr.empty,
                profileEmptyMsg: rr.empty ? rr.message : '',
                profileAiPowered: !!rr.aiPowered,
                profileCached: false,
                profileLoading: false
              });
              wx.showToast({ title: '画像已更新', icon: 'success' });
            } else {
              this.setData({ profileLoading: false });
              wx.showToast({ title: rr.error || '生成失败', icon: 'none' });
            }
          },
          fail: () => {
            this.setData({ profileLoading: false });
            wx.showToast({ title: '网络异常', icon: 'none' });
          }
        });
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

  /* ===== 适老化三档大字 ===== */
  // 读取字号档位，向后兼容老的 fontLarge 布尔值
  readFontScale() {
    const v = wx.getStorageSync('fontScale');
    if (v === 'large' || v === 'xl') return v;
    // 老版本：fontLarge 是布尔值，true → 'large'
    const old = wx.getStorageSync('fontLarge');
    return old === true ? 'large' : 'normal';
  },

  // 点击三档分段选择器
  setFontScale(e) {
    const { scale } = e.currentTarget.dataset;
    if (!scale || scale === this.data.fontScale) return;
    wx.setStorageSync('fontScale', scale);
    // 清掉旧的 fontLarge 标记，避免回滚混淆
    try { wx.removeStorageSync('fontLarge'); } catch (e) {}
    this.setData({ fontScale: scale });
    const label = scale === 'xl' ? '超大字模式' : (scale === 'large' ? '大字模式' : '标准模式');
    wx.showToast({ title: `已切换到${label}`, icon: 'none' });
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
