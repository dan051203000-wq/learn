// 知识库页面：防诈骗知识学习 + 小测试
const knowledgeData = [
  {
    id: 'k1',
    category: '电话诈骗',
    icon: '📞',
    title: '接到陌生电话怎么办？记住"三不一多"',
    summary: '陌生来电谈钱就要警惕：不轻信、不透露、不转账、多核实。',
    content: [
      '陌生来电只要一谈到银行卡、转账、验证码，一律挂掉。',
      '只要一谈到"中奖了""退税补贴"，一律挂掉。',
      '只要一谈到"电话转接公检法"，一律挂掉——公检法机关不会通过电话办案，更没有"安全账户"。',
      '所有短信里让你点击链接的，一律删掉；不明链接可能藏有木马，会偷走你手机里的钱。',
      '微信 QQ 上"熟人"借钱，一定要当面或打电话核实，语音也可能被伪造。',
      '拿不准的时候，多问一句家人，或拨打反诈专线 96110。'
    ],
    readCount: 1280
  },
  {
    id: 'k2',
    category: '电话诈骗',
    icon: '📞',
    title: '冒充公检法诈骗的套路全解析',
    summary: '"涉嫌洗钱""通缉令""安全账户"都是吓唬人的幌子。',
    content: [
      '第一步：骗子冒充电信、银行客服，说你的电话卡或银行卡"涉嫌违法犯罪"，即将被停用。',
      '第二步：把电话转接到假"公安局""检察院"，声称你卷入洗钱案，出示伪造的"通缉令"恐吓你。',
      '第三步：以"协助调查、资金审查"为名，要求你把钱转到所谓"安全账户"，或套取你的银行卡密码和验证码。',
      '记住：公安机关办案会当面出示证件和法律文书，绝不会在电话里让你转账！',
      '遇到此类电话，直接挂断并拨打 110 核实。'
    ],
    readCount: 960
  },
  {
    id: 'k3',
    category: '投资理财',
    icon: '💰',
    title: '高收益理财骗局的识别口诀',
    summary: '"收益6%要打问号、8%很危险、10%以上准备损失全部本金"。',
    content: [
      '银保监会提示：高收益意味着高风险，收益率超过6%就要打问号，超过8%就很危险，10%以上要做好损失全部本金的准备。',
      '骗局常用话术："保本保息""稳赚不赔""内部消息""老师带单"。',
      '常见套路：先给小额返利尝甜头，等投入大额资金后就无法提现或平台跑路。',
      '警惕"拉群荐股""虚拟货币""养老项目"等新型骗局。',
      '投资理财请认准银行、证券公司等持牌金融机构，通过官方渠道购买。'
    ],
    readCount: 1520
  },
  {
    id: 'k4',
    category: '网络支付',
    icon: '💳',
    title: '保护好自己的"钱袋子"：验证码比密码更重要',
    summary: '短信验证码是最后一道防线，谁要都不给。',
    content: [
      '银行卡短信验证码等同于支付密码，任何人索要验证码都是诈骗，包括自称"客服""警察"的人。',
      '不要把银行卡、身份证拍照发给陌生人，也不要在不明网站填写。',
      '不要下载陌生人推荐的 APP，不要和陌生人进行"屏幕共享"，否则密码和验证码会被看得一清二楚。',
      '手机里不要存身份证、银行卡照片；废弃手机要恢复出厂设置后再处理。',
      '建议给支付软件设置每日转账限额，给自己留一道"后悔门"。'
    ],
    readCount: 876
  },
  {
    id: 'k5',
    category: '保健品',
    icon: '💊',
    title: '"免费领鸡蛋"背后的保健品套路',
    summary: '免费讲座、专家义诊、祖传秘方，目标都是你的养老钱。',
    content: [
      '套路一：小恩小惠拉人头。鸡蛋、米面、洗衣液免费送，专门吸引老年人参加"健康讲座"。',
      '套路二：假专家制造焦虑。冒充"名医"免费体检，夸大病情，说再不治就晚了。',
      '套路三：天价"神药"。把普通食品、三无产品包装成"祖传秘方""最新科技"，卖出天价。',
      '记住：世上没有包治百病的药；正规药品都有"国药准字"批准文号，可到国家药监局官网查询。',
      '买药请到正规医院和药店，身体不适先看医生。'
    ],
    readCount: 1105
  },
  {
    id: 'k6',
    category: '个人信息',
    icon: '🔒',
    title: '个人信息保护：这些东西千万别随便给',
    summary: '身份证号、银行卡号、验证码、人脸——都是骗子的目标。',
    content: [
      '身份证复印件要注明用途，如"仅供办理XX业务使用"，防止被挪用。',
      '快递单要撕掉或涂抹姓名、电话、地址后再丢弃。',
      '公共场合不要随意连接免费 WiFi 进行支付操作。',
      '遇到"刷脸"要求要警惕：视频通话里让对方"眨眨眼、摇摇头"可能是盗取你的人脸信息。',
      '不在朋友圈晒身份证、机票、火车票等含个人信息的照片。',
      '手机丢失后第一时间挂失手机号并冻结支付账户。'
    ],
    readCount: 742
  }
];

const quizData = [
  {
    question: '接到自称"公安局"的电话，说您涉嫌洗钱，需要把钱转到"安全账户"配合调查，应该怎么办？',
    options: ['按对方要求转账', '挂断电话，拨打110核实', '提供银行卡密码自证清白'],
    answer: 1,
    explanation: '公检法机关不会电话办案，更没有"安全账户"，这是典型诈骗话术。'
  },
  {
    question: '短信验证码可以告诉自称银行客服的人吗？',
    options: ['可以，客服需要核实身份', '不能，任何人索要验证码都是诈骗', '只告诉后四位'],
    answer: 1,
    explanation: '验证码等同于支付密码，银行客服绝不会索要。'
  },
  {
    question: '小区里有人推销"年化收益20%、保本保息"的理财产品，该不该买？',
    options: ['收益高，机不可失', '先小额试试', '不买，高收益保本必然是骗局'],
    answer: 2,
    explanation: '高收益必然伴随高风险，"保本高息"是非法集资的典型话术。'
  },
  {
    question: '"孙子"打电话说打架被拘留急需用钱，还叮嘱不要告诉爸妈，怎么办？',
    options: ['赶紧汇款救人', '挂断后直接拨打孙子本人或其父母电话核实', '先把钱转过去再说'],
    answer: 1,
    explanation: '冒充亲友诈骗常利用"保密"话术阻止核实，先挂断回拨家人即可识破。'
  }
];

Page({
  data: {
    categories: [],
    currentCategory: '全部',
    articleList: [],
    showArticle: false,
    currentArticle: null,
    showQuiz: false,
    quizIndex: 0,
    quizTotal: quizData.length,
    quizQuestion: '',
    quizOptions: [],
    quizAnswer: -1,
    quizExplanation: '',
    quizAnswered: false,
    quizSelected: -1,
    quizScore: 0,
    quizFinished: false
  },

  onLoad() {
    const categories = ['全部'].concat(
      knowledgeData.map(item => item.category).filter((v, i, a) => a.indexOf(v) === i)
    );
    this.setData({
      categories,
      articleList: knowledgeData
    });
  },

  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    const articleList = category === '全部'
      ? knowledgeData
      : knowledgeData.filter(item => item.category === category);
    this.setData({ currentCategory: category, articleList });
  },

  viewArticle(e) {
    const { id } = e.currentTarget.dataset;
    const article = knowledgeData.find(item => item.id === id);
    this.setData({ showArticle: true, currentArticle: article });
  },

  closeArticle() {
    this.setData({ showArticle: false, currentArticle: null });
  },

  stopBubble() {
    // 阻止弹窗事件冒泡
  },

  /* ===== 防诈小测试 ===== */
  startQuiz() {
    this.setData({
      showQuiz: true,
      quizIndex: 0,
      quizSelected: -1,
      quizAnswered: false,
      quizScore: 0,
      quizFinished: false
    });
    this.syncQuiz();
  },

  syncQuiz() {
    const question = quizData[this.data.quizIndex];
    this.setData({
      quizQuestion: question.question,
      quizOptions: question.options,
      quizAnswer: question.answer,
      quizExplanation: question.explanation
    });
  },

  closeQuiz() {
    this.setData({ showQuiz: false });
  },

  selectOption(e) {
    if (this.data.quizAnswered) return;
    const { index } = e.currentTarget.dataset;
    const question = quizData[this.data.quizIndex];
    const correct = Number(index) === question.answer;
    this.setData({
      quizSelected: Number(index),
      quizAnswered: true,
      quizScore: this.data.quizScore + (correct ? 1 : 0)
    });
  },

  nextQuiz() {
    if (this.data.quizIndex < quizData.length - 1) {
      this.setData({
        quizIndex: this.data.quizIndex + 1,
        quizSelected: -1,
        quizAnswered: false
      });
      this.syncQuiz();
    } else {
      this.setData({ quizFinished: true });
    }
  },

  restartQuiz() {
    this.startQuiz();
  },

  goIdentify() {
    wx.navigateTo({
      url: '/pages/identify/identify'
    });
  }
});
