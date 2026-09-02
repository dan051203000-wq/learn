App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        traceUser: true,
      });
    }

    // 获取用户信息
    this.getUserInfo();
  },

  getUserInfo() {
    // 检查是否已授权
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已授权，获取用户信息
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo;
            }
          });
        }
      }
    });
  },

  globalData: {
    userInfo: null,
    userId: null,
    isElderly: false, // 是否为老年人账户
    guardianId: null // 如果是守护者账户，存储被守护者ID
  }
});
