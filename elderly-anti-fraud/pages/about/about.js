// 关于页：合规说明、隐私摘要、免责声明
// 用户可以从首页"关于本工具"和"我的→关于"进入
Page({
  data: {
    fontScale: 'normal',
    seedingDemo: false
  },

  onLoad(options) {
    // 读取字号档位，向后兼容老 fontLarge
    const v = wx.getStorageSync('fontScale');
    let fontScale = 'normal';
    if (v === 'large' || v === 'xl') fontScale = v;
    else if (wx.getStorageSync('fontLarge') === true) fontScale = 'large';
    this.setData({ fontScale });
    // 可选：根据入口参数定位到不同 section（tab=privacy 等）
    if (options && options.tab) {
      // 简单起见这里不做滚动，后续可扩展
    }
  },

  /* ===== 评委/演示用：一键加载演示数据 =====
   * 调用 initDB 云函数 seedDemo 分支，给当前 openid 填充：
   *   - 8 条识别历史（近 6 天，覆盖 5 种诈骗类型）
   *   - 2 条举报记录
   *   - 1 条家庭预警
   *   - 清除旧 AI 画像缓存，下次进「我的」页会重新生成
   */
  loadDemoData() {
    if (this.data.seedingDemo) return;
    wx.showModal({
      title: '加载演示数据',
      content: '将给当前账号填充 8 条识别历史、2 条举报、1 条家庭预警，并清除旧的 AI 画像缓存（演示用，会覆盖您当前账号的同类数据）。',
      confirmText: '加载',
      cancelText: '取消',
      success: r => {
        if (!r.confirm) return;
        this.setData({ seedingDemo: true });
        wx.showLoading({ title: '正在加载演示数据...', mask: true });
        wx.cloud.callFunction({
          name: 'initDB',
          data: { action: 'seedDemo' },
          success: res => {
            wx.hideLoading();
            const result = res.result || {};
            if (result.success) {
              wx.showModal({
                title: '加载成功',
                content: (result.message || '演示数据已填充') + '\n\n现在去「我的」页即可看到 AI 防护画像和统计数字。',
                showCancel: false,
                confirmText: '去看看',
                success: () => {
                  wx.switchTab({ url: '/pages/profile/profile' });
                }
              });
            } else {
              wx.showModal({
                title: '加载失败',
                content: result.message || '请稍后重试',
                showCancel: false
              });
            }
          },
          fail: err => {
            wx.hideLoading();
            wx.showModal({
              title: '加载失败',
              content: '云函数调用失败：' + (err.errMsg || err.message || '未知错误') + '\n请确认 initDB 云函数已上传部署。',
              showCancel: false
            });
          },
          complete: () => {
            this.setData({ seedingDemo: false });
          }
        });
      }
    });
  }
});
