// 应用入口：初始化云开发 + 微信登录换 OPENID
// 隐私说明：本小程序采用「匿名 OPENID」方案，不读取昵称/头像/手机号
App({
  onLaunch() {
    // 1. 初始化云开发（个人主体可用）
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: 'cloud1-d5guuelkl43c4771e',
      traceUser: true,
    });

    // 2. 微信登录：拿 code 换 OPENID（个人主体完全支持 wx.login）
    this.wxLogin();
  },

  /**
   * 调用 wx.login 拿临时 code → 通过云函数 login 换真实 OPENID
   * 成功后将 openid 写入 globalData.openId 和 wx.storage
   * 失败不阻断小程序启动（匿名模式降级运行）
   */
  wxLogin() {
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          console.warn('wx.login 未返回 code，使用本地 userId 兼容');
          this.fallbackLocalUserId();
          return;
        }
        wx.cloud.callFunction({
          name: 'login',
          data: {
            code: loginRes.code,
            nickName: wx.getStorageSync('nickName') || '匿名老人',
            role: wx.getStorageSync('familyRole') || 'elder'
          },
          success: (cfRes) => {
            if (cfRes && cfRes.result && cfRes.result.success && cfRes.result.openid) {
              const { openid, user } = cfRes.result;
              this.globalData.openId = openid;
              this.globalData.userInfo = { nickName: user.nickName, openId: openid };
              wx.setStorageSync('openId', openid);
              wx.setStorageSync('nickName', user.nickName);
              console.log('[登录成功] OPENID:', openid);
            } else {
              console.warn('login 云函数返回失败:', cfRes);
              this.fallbackLocalUserId();
            }
          },
          fail: (err) => {
            console.error('login 云函数调用失败:', err);
            this.fallbackLocalUserId();
          }
        });
      },
      fail: (err) => {
        console.error('wx.login 失败:', err);
        this.fallbackLocalUserId();
      }
    });
  },

  /**
   * 兜底：如果云端登录失败，临时用本地时间戳 userId（保证基础功能不崩）
   * 数据不跨设备，仅作降级方案
   */
  fallbackLocalUserId() {
    let localId = wx.getStorageSync('userId');
    if (!localId) {
      localId = 'u' + Date.now();
      wx.setStorageSync('userId', localId);
    }
    this.globalData.openId = null; // 标记非真实身份
    this.globalData.userInfo = { nickName: wx.getStorageSync('nickName') || '匿名老人' };
  },

  globalData: {
    userInfo: null,
    openId: null,       // 微信 OPENID，登录成功后写入
    isElderly: false,
    guardianId: null
  }
});