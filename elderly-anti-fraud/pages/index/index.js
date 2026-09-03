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

  goReport() {
    wx.navigateTo({
      url: '/pages/report/report'
    });
  },

  goFamily() {
    wx.navigateTo({
      url: '/pages/family/family'
    });
  },

  viewAlertDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/cases/cases?id=${id}`
    });
  }
});
