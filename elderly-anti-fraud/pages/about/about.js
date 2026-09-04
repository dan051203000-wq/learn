// 关于页：合规说明、隐私摘要、免责声明
// 用户可以从首页"关于本工具"和"我的→关于"进入
Page({
  data: {
    fontLarge: false
  },

  onLoad(options) {
    this.setData({
      fontLarge: wx.getStorageSync('fontLarge') || false
    });
    // 可选：根据入口参数定位到不同 section（tab=privacy 等）
    if (options && options.tab) {
      // 简单起见这里不做滚动，后续可扩展
    }
  }
});
