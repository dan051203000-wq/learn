Page({
  data: {
    userName: '',
    alerts: [],
    showGuardian: false,
    guardianName: ''
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const app = getApp();
    this.setData({
      userName: app.globalData.userInfo?.nickName || ''
    });
  },

  loadData() {
    // 通过 dataService 云函数加载最新警报（管理员权限读取，不受集合权限限制）
    wx.cloud.callFunction({
      name: 'dataService',
      data: { action: 'getAlerts' },
      success: res => {
        if (res.result && res.result.success && res.result.data.length > 0) {
          this.setData({
            alerts: res.result.data
          });
        }
      },
      fail: err => {
        console.error('加载警报失败', err);
      }
    });
  },

  goIdentify() {
    // identify 是 tabBar 页面，必须用 switchTab 跳转
    wx.switchTab({
      url: '/pages/identify/identify'
    });
  },

  goCommunity() {
    // community 是 tabBar 页面，必须用 switchTab 跳转
    wx.switchTab({
      url: '/pages/community/community'
    });
  },

  goKnowledge() {
    wx.navigateTo({
      url: '/pages/knowledge/knowledge'
    });
  },

  goCases() {
    wx.navigateTo({
      url: '/pages/cases/cases'
    });
  },

  goReport() {
    wx.navigateTo({
      url: '/pages/report/report'
    });
  },

  goFamily() {
    // family 是 tabBar 页面（第 4 个），必须用 switchTab 跳转
    wx.switchTab({
      url: '/pages/family/family'
    });
  },

  callHotline() {
    // 引导用户拨打 96110 反诈专线（外线电话，非本工具能力）
    wx.showModal({
      title: '国家反诈中心 96110',
      content: '本应用是社区辅助工具，不直接对接反诈中心。\n遇到可疑情况建议拨打全国反诈专线 96110 咨询。\n\n点击确定直接拨打',
      confirmText: '拨打 96110',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '96110',
            fail: (err) => {
              // 用户取消或不支持
              console.warn('拨号失败', err);
            }
          });
        }
      }
    });
  },

  openAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  viewAlertDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/cases/cases?id=${id}`
    });
  },

  goAiChat() {
    wx.navigateTo({
      url: '/pages/aiChat/aiChat'
    });
  }
});
