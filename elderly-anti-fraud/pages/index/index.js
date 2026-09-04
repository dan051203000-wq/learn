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
    // 反诈专线 96110
    wx.showModal({
      title: '反诈中心热线',
      content: '全国反诈中心专线：96110\n\n点击确定直接拨打',
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

  about() {
    wx.showModal({
      title: '关于防诈骗互助',
      content: '本应用帮助老人识别诈骗、学习防诈知识、守护家庭安全。\n\n遇到可疑信息请第一时间拨打 96110 反诈专线。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  viewAlertDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/cases/cases?id=${id}`
    });
  }
});
