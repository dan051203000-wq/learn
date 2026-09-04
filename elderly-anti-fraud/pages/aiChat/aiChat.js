// AI 反诈顾问对话页
// 调 aiChat 云函数（混元大模型），失败有兜底回复

Page({
  data: {
    messages: [],  // [{id, role: 'user'|'ai', content, aiPowered}]
    inputText: '',
    loading: false,
    scrollToView: ''
  },

  onLoad() {
    // 初始欢迎消息已写在 wxml，不重复加
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  askQuick(e) {
    const q = e.currentTarget.dataset.q;
    this.setData({ inputText: q });
    this.send();
  },

  send() {
    const text = this.data.inputText.trim();
    if (!text || this.data.loading) return;

    const userMsg = {
      id: 'u-' + Date.now(),
      role: 'user',
      content: text,
      aiPowered: null
    };

    this.setData({
      messages: [...this.data.messages, userMsg],
      inputText: '',
      loading: true,
      scrollToView: 'msg-' + userMsg.id
    });

    wx.cloud.callFunction({
      name: 'aiChat',
      data: { message: text, sessionId: getApp().globalData.openId || 'anon' },
      success: res => {
        const r = res.result || {};
        const aiMsg = {
          id: 'a-' + Date.now(),
          role: 'ai',
          content: r.reply || '抱歉，我现在有点累，稍后再问我吧。',
          aiPowered: !!r.aiPowered
        };
        this.setData({
          messages: [...this.data.messages, aiMsg],
          loading: false,
          scrollToView: 'msg-' + aiMsg.id
        });
      },
      fail: err => {
        console.warn('[aiChat] 调用失败:', err);
        const aiMsg = {
          id: 'a-' + Date.now(),
          role: 'ai',
          content: '我现在回复慢一些。建议您把可疑内容发给儿女，或直接打 96110 反诈专线咨询。⚠️ 紧急情况请直接拨打 110 或反诈专线 96110',
          aiPowered: false
        };
        this.setData({
          messages: [...this.data.messages, aiMsg],
          loading: false,
          scrollToView: 'msg-' + aiMsg.id
        });
      }
    });
  }
});
