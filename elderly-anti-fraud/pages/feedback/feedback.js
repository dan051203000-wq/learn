// 意见反馈页面
// 数据走 dataService.submitFeedback action（云端持久化，自动敏感词过滤）
Page({
  data: {
    feedbackType: '建议',
    contact: '',
    content: '',
    submitting: false,
    types: [
      { value: '建议', label: '改进建议', icon: '💡' },
      { value: '问题', label: '功能问题', icon: '⚠️' },
      { value: '误判', label: '识别误判', icon: '🔍' },
      { value: '表扬', label: '鼓励表扬', icon: '👍' }
    ]
  },

  selectType(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({ feedbackType: value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  submitFeedback() {
    if (!this.data.content.trim()) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...', mask: true });

    wx.cloud.callFunction({
      name: 'dataService',
      data: {
        action: 'submitFeedback',
        userId: getApp().globalData.openId || wx.getStorageSync('userId') || '',
        type: this.data.feedbackType,
        content: this.data.content,
        contact: this.data.contact
      },
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          wx.showModal({
            title: '✅ 感谢您的支持',
            content: '反馈已提交，我们会认真查看。\n\n紧急问题请直接拨打反诈专线 96110。',
            showCancel: false,
            confirmText: '我知道了',
            success: () => {
              wx.navigateBack({ delta: 1 });
            }
          });
        } else {
          wx.showToast({ title: res.result.message || '提交失败', icon: 'none' });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常，请重试', icon: 'none' });
      },
      complete: () => {
        this.setData({ submitting: false });
      }
    });
  }
});