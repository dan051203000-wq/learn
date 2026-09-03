// 案例库页面：展示真实诈骗案例，供老年人学习辨别
const demoCases = [
  {
    id: 'demo1',
    title: '冒充公安的电话诈骗',
    category: '冒充公检法',
    riskLevel: 'high',
    description: '王大爷接到自称"某市公安局"的电话，称其银行卡涉嫌洗钱，需要将存款转入"安全账户"配合调查，否则立即逮捕。',
    process: '骗子准确报出王大爷的姓名和身份证号，制造恐慌情绪，并让其添加"警官"微信发送假的"通缉令"照片。',
    loss: '被骗人民币 18 万元',
    tips: ['公检法机关不会通过电话办案', '不存在所谓的"安全账户"', '收到此类电话请直接挂断并拨打110'],
    date: '2026-08-15'
  },
  {
    id: 'demo2',
    title: '高息"养老理财"骗局',
    category: '投资理财',
    riskLevel: 'high',
    description: '李阿姨在小区讲座上购买了"年化收益15%"的养老理财产品，前期返利正常，三个月后公司人去楼空。',
    process: '骗子先送鸡蛋、米面吸引老人参加活动，小额返利取得信任后，诱导追加大额投资。',
    loss: '被骗人民币 32 万元',
    tips: ['收益超过6%就要打问号，超过8%很危险', '不轻信"保本高息"承诺', '投资认准银行等正规金融机构'],
    date: '2026-08-02'
  },
  {
    id: 'demo3',
    title: '"医保卡异常"短信诈骗',
    category: '医保社保',
    riskLevel: 'high',
    description: '张大爷收到短信称其医保卡"已被停用"，需点击链接补充信息重新激活，填写身份证和银行卡后被盗刷。',
    process: '短信中的链接指向伪造的"医保局官网"，页面与真实网站十分相似，诱导填写银行卡号、密码和验证码。',
    loss: '被盗刷人民币 2.6 万元',
    tips: ['医保部门不会发链接要求填银行卡信息', '办理医保业务请到政务大厅或官方APP', '验证码千万不能告诉任何人'],
    date: '2026-07-28'
  },
  {
    id: 'demo4',
    title: '"无抵押低息"贷款诈骗',
    category: '网络贷款',
    riskLevel: 'high',
    description: '刘先生因急用钱在网上申请贷款，对方以"解冻费""保证金"等名义要求先转账，转完后即被拉黑。',
    process: '骗子伪造放款截图，声称资金已到账但被冻结，需缴纳费用解冻，一步步套取更多转账。',
    loss: '被骗人民币 5 万元',
    tips: ['正规贷款放款前不收取任何费用', '不下载来路不明的贷款APP', '急需用钱请到银行正规渠道办理'],
    date: '2026-07-20'
  },
  {
    id: 'demo5',
    title: '假客服"退款理赔"诈骗',
    category: '购物退款',
    riskLevel: 'medium',
    description: '赵阿姨接到自称某电商平台客服电话，称其购买的商品有质量问题可双倍退款，按指引操作后被骗。',
    process: '"客服"准确说出订单信息骗取信任，引导下载屏幕共享软件，远程偷看银行卡密码和验证码。',
    loss: '被骗人民币 1.2 万元',
    tips: ['退款只会原路退回，无需其他操作', '客服电话请通过官方APP核实', '不要与陌生人屏幕共享'],
    date: '2026-08-10'
  },
  {
    id: 'demo6',
    title: '"恭喜中奖"连环骗局',
    category: '中奖福利',
    riskLevel: 'high',
    description: '孙大爷收到中奖通知，称中了二等奖"价值8万元轿车一辆"，但需先缴纳10%个人所得税才能领奖。',
    process: '骗子不断以个税、公证费、手续费等名义要求转账，声称"最后一笔"，前后共骗取多笔钱款。',
    loss: '被骗人民币 8000 元',
    tips: ['先交钱才能领奖的都是骗局', '没有参加过的抽奖一律是假的', '天上不会掉馅饼'],
    date: '2026-07-05'
  },
  {
    id: 'demo7',
    title: '冒充孙子"急需用钱"',
    category: '冒充亲友',
    riskLevel: 'high',
    description: '周奶奶接到"孙子"电话，哭诉自己打架被拘留急需赔钱私了，老人情急之下按对方要求汇了款。',
    process: '骗子利用老人疼爱晚辈、遇事慌乱的心理，要求"不要告诉爸妈"，催促尽快转账到陌生账户。',
    loss: '被骗人民币 3 万元',
    tips: ['涉及转账先挂断，直接回拨家人电话核实', '再着急也要和家人商量', '凡是要求"保密"的都有问题'],
    date: '2026-08-20'
  },
  {
    id: 'demo8',
    title: '"神医神药"保健品诈骗',
    category: '保健品',
    riskLevel: 'high',
    description: '吴大爷在"健康讲座"上花高价购买了号称能根治糖尿病的"祖传秘方"，实为三无产品，延误了正规治疗。',
    process: '骗子冒充"名医"免费义诊，谎称老人病情严重制造焦虑，再推销高价"特效药"。',
    loss: '被骗人民币 4.5 万元',
    tips: ['没有能"包治百病"的药', '买药请到正规医院药店', '免费讲座送礼品的多是套路'],
    date: '2026-06-30'
  }
];

const riskLevelMap = {
  high: '极高风险',
  medium: '中等风险',
  low: '低风险',
  none: '无风险'
};

Page({
  data: {
    categories: ['全部', '冒充公检法', '投资理财', '医保社保', '网络贷款', '购物退款', '中奖福利', '冒充亲友', '保健品'],
    currentCategory: '全部',
    caseList: [],
    filteredList: [],
    showDetail: false,
    detailCase: null,
    detailRiskText: '',
    fromCloud: false
  },

  onLoad(options) {
    this.loadCases();

    // 首页警报点击跳转：直接打开对应详情
    if (options.id) {
      this.openCaseById(options.id);
    }
  },

  loadCases() {
    // 通过 dataService 云函数加载案例（管理员权限读取），无数据时使用内置示例
    wx.cloud.callFunction({
      name: 'dataService',
      data: { action: 'getCases' },
      success: res => {
        const list = (res.result && res.result.success && res.result.data.length > 0)
          ? this.decorate(res.result.data)
          : this.decorate(demoCases);
        this.setData({
          caseList: list,
          filteredList: this.filterBy(this.data.currentCategory, list),
          fromCloud: !!(res.result && res.result.success && res.result.data.length > 0)
        });
      },
      fail: () => {
        // 云环境未就绪时使用本地示例
        const list = this.decorate(demoCases);
        this.setData({ caseList: list, filteredList: list, fromCloud: false });
      }
    });
  },

  decorate(list) {
    return list.map(item => ({
      ...item,
      riskText: riskLevelMap[item.riskLevel] || '风险未知'
    }));
  },

  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      currentCategory: category,
      filteredList: this.filterBy(category, this.data.caseList)
    });
  },

  filterBy(category, list) {
    if (category === '全部') return list;
    return list.filter(item => item.category === category);
  },

  openCaseById(id) {
    const found = this.data.caseList.find(item => item.id === id || item._id === id);
    if (found) {
      this.showCase(found);
    } else {
      wx.showToast({ title: '案例不存在', icon: 'none' });
    }
  },

  viewCase(e) {
    const { id } = e.currentTarget.dataset;
    this.openCaseById(id);
  },

  showCase(item) {
    this.setData({
      showDetail: true,
      detailCase: item,
      detailRiskText: riskLevelMap[item.riskLevel] || '风险未知'
    });
  },

  closeDetail() {
    this.setData({ showDetail: false, detailCase: null });
  },

  stopBubble() {
    // 阻止详情弹窗点击事件冒泡
  },

  shareCase() {
    // 分享当前案例给家人
    const item = this.data.detailCase;
    if (!item) return;
    wx.setClipboardData({
      data: `【防诈骗提醒】${item.title}：${item.description} 防骗要点：${(item.tips || []).join('；')}`,
      success: () => {
        wx.showToast({ title: '已复制，可粘贴发给家人', icon: 'none' });
      }
    });
  },

  goIdentify() {
    wx.navigateTo({
      url: '/pages/identify/identify'
    });
  }
});
