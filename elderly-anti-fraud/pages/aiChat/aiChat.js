// AI 反诈顾问对话页
// 调 aiChat 云函数（混元大模型），失败有兜底回复

Page({
  data: {
    messages: [],  // [{id, role: 'user'|'ai', content, aiPowered}]
    inputText: '',
    loading: false,
    scrollToView: '',
    mode: 'normal',  // 'normal' | 'rescue'
    rescueChips: [
      { q: '钱还能追回来吗？', icon: '💰' },
      { q: '我现在该怎么冻结银行卡？', icon: '🏦' },
      { q: '怎么保存证据？', icon: '📸' },
      { q: '我该怎么联系警方？', icon: '📞' }
    ]
  },

  onLoad(options) {
    // 初始欢迎消息已写在 wxml，不重复加
    // 支持从外部链接 ?mode=rescue 直接进入救援模式
    if (options && options.mode === 'rescue') {
      setTimeout(() => this.enterRescue(), 200);
    }
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  askQuick(e) {
    const q = e.currentTarget.dataset.q;
    this.setData({ inputText: q });
    this.send();
  },

  /* ===== 救援模式：老人疑似已转账时切换 ===== */
  enterRescue() {
    if (this.data.mode === 'rescue') return;
    wx.showModal({
      title: '🚨 紧急救援',
      content: '如果您刚刚已经把钱转出去了，请点确定。我会立刻告诉您接下来该怎么做，每一步都很重要。',
      confirmText: '我已转账',
      cancelText: '取消',
      confirmColor: '#c62828',
      success: r => {
        if (!r.confirm) return;
        this.setData({ mode: 'rescue' });
        // 同步给家庭守护端写入一条"紧急救援"预警，绑定子女打开小程序立刻可见
        this.notifyFamilyRescue();
        // 进入救援模式自动发首句，让 AI 立刻给出步骤
        this.setData({ inputText: '我可能已经被骗了，刚转了一笔钱出去，现在怎么办？' });
        // 给老人一条本地即时提示，避免干等 AI
        const tip = {
          id: 't-' + Date.now(),
          role: 'ai',
          content: '老人家，先别慌。我现在帮您理一理。同时请您立刻做两件事：① 拿起手机拨 110 或 96110 报警；② 打您银行卡背面的客服电话说"我被骗了请冻结账户"。我马上详细告诉您每一步。',
          aiPowered: false
        };
        this.setData({
          messages: [...this.data.messages, tip],
          scrollToView: 'msg-' + tip.id
        });
        setTimeout(() => this.send(), 300);
      }
    });
  },

  /* 把救援预警写到 familyAlerts，绑定子女打开「家庭守护」即可看到红色救援横幅
   * 说明：个人主体小程序订阅消息模板受限，这里用"云端写入 + 子女端拉取"的方式实现联动，
   *      无需订阅消息模板，零成本、零权限依赖，适合免费额度场景。
   *      如需实时推送，可在微信公众平台后台申请「求助/救援」类订阅消息模板后扩展。
   */
  notifyFamilyRescue() {
    const familyRole = wx.getStorageSync('familyRole') || '';
    const familyCode = wx.getStorageSync('familyCode') || '';
    const elderName = wx.getStorageSync('familyElderName') || '长辈';
    // 只有长辈角色且已生成守护码才写入（避免未设置角色的用户也写）
    if (familyRole !== 'elder' || !familyCode) return;
    wx.cloud.callFunction({
      name: 'dataService',
      data: {
        action: 'addFamilyAlert',
        elderCode: familyCode,
        elderName: elderName,
        riskLevel: 'rescue',
        riskTitle: '老人已进入紧急救援模式',
        fraudMethod: '可能已被骗',
        snippet: '老人点击了"我可能已经被骗了"按钮，请尽快联系确认'
      },
      success: () => console.log('[rescue] 已通知家庭守护端'),
      fail: err => console.warn('[rescue] 通知失败', err)
    });
  },

  exitRescue() {
    wx.showModal({
      title: '退出救援模式',
      content: '问题处理好了吗？退出后回到普通顾问模式。',
      success: r => {
        if (r.confirm) this.setData({ mode: 'normal' });
      }
    });
  },

  /* 救援模式一键拨打 110 */
  callPolice() {
    wx.makePhoneCall({
      phoneNumber: '110',
      fail: err => console.warn('拨号失败', err)
    });
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
      data: {
        message: text,
        sessionId: getApp().globalData.openId || 'anon',
        mode: this.data.mode
      },
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
        const fallback = this.data.mode === 'rescue'
          ? '我现在回复慢一些，但这件事不能等：① 立刻打银行客服冻结账户；② 拨打 110 报警；③ 把转账记录和聊天截图都留着别删；④ 立刻告诉您的家人。⚠️ 现在请立即拨打 110 或 96110'
          : '我现在回复慢一些。建议您把可疑内容发给儿女，或直接打 96110 反诈专线咨询。⚠️ 紧急情况请直接拨打 110 或反诈专线 96110';
        const aiMsg = {
          id: 'a-' + Date.now(),
          role: 'ai',
          content: fallback,
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
