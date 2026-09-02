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
    // 从云数据库加载最新警报
    wx.cloud.database().collection('alerts')
      .orderBy('date', 'desc')
      .limit(3)
      .get({
        success: res => {
          this.setData({
            alerts: res.data
          });
        },
        fail: err => {
          console.error('加载警报失败', err);
        }
      });
  },

  goIdentify() {
    wx.navigateTo({
      url: '/pages/identify/identify'
    });
  },

  goCommunity() {
    wx.navigateTo({
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
