// 求助社区页面：遇到可疑信息可以发帖求助，邻里互助辨别诈骗
const demoPosts = [
  {
    id: 'demo1',
    nickName: '热心张阿姨',
    content: '今天收到短信说我快递丢了要赔我钱，让我点链接填银行卡号，这是骗局吗？',
    replies: [
      { nickName: '社区志愿者小李', content: '是典型的"快递理赔"诈骗！千万别点链接，直接删掉。' },
      { nickName: '王大爷', content: '我上个月也收到了，差点上当，还好先来问了。' }
    ],
    likes: 23,
    createTimeText: '2026-09-01 10:24'
  },
  {
    id: 'demo2',
    nickName: '刘叔',
    content: '有人拉我进群说跟着老师炒股稳赚不赔，群里天天有人晒收益截图，可信吗？',
    replies: [
      { nickName: '反诈宣传员', content: '不可信！群里的"赚钱截图"都是骗子的小号演戏。凡是拉群荐股、稳赚不赔的都是诈骗。' }
    ],
    likes: 41,
    createTimeText: '2026-08-30 15:02'
  },
  {
    id: 'demo3',
    nickName: '陈奶奶',
    content: '提醒大家：刚才有个自称燃气公司的人要进门检查，没穿工装也没工作证，被我拒绝了。大家也要当心！',
    replies: [],
    likes: 66,
    createTimeText: '2026-08-28 09:15'
  }
];

Page({
  data: {
    posts: [],
    displayPosts: [],
    activeTab: 'latest',
    content: '',
    replyToId: '',
    replyContent: '',
    publishing: false,
    nickName: '我'
  },

  onLoad() {
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      // 生成一个简单用户标识，用于区分"我的"帖子
      const newId = 'u' + Date.now();
      wx.setStorageSync('userId', newId);
    }
    const savedName = wx.getStorageSync('nickName');
    if (savedName) {
      this.setData({ nickName: savedName });
    } else {
      const app = getApp();
      const name = app.globalData.userInfo && app.globalData.userInfo.nickName;
      if (name) this.setData({ nickName: name });
    }
    this.loadPosts();
  },

  onPullDownRefresh() {
    this.loadPosts(() => wx.stopPullDownRefresh());
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
    this.updateDisplayPosts();
  },

  updateDisplayPosts() {
    const posts = this.data.posts.slice();
    if (this.data.activeTab === 'hot') {
      posts.sort((a, b) => ((b.likes || 0) + (b.replies || []).length * 2) - ((a.likes || 0) + (a.replies || []).length * 2));
    } else {
      posts.sort((a, b) => (b.createTime || 0) - (a.createTime || 0) || (b.createTimeText > a.createTimeText ? 1 : -1));
    }
    this.setData({ displayPosts: posts });
  },

  loadPosts(callback) {
    wx.cloud.database().collection('communityPosts')
      .orderBy('createTime', 'desc')
      .limit(20)
      .get({
        success: res => {
          if (res.data && res.data.length > 0) {
            this.setData({ posts: this.decorate(res.data) });
          } else {
            this.setData({ posts: this.decorate(demoPosts) });
          }
          this.updateDisplayPosts();
        },
        fail: () => {
          this.setData({ posts: this.decorate(demoPosts) });
          this.updateDisplayPosts();
        },
        complete: () => {
          if (callback) callback();
        }
      });
  },

  decorate(list) {
    return list.map(item => ({
      ...item,
      createTimeText: item.createTimeText || this.formatTime(item.createTime),
      liked: this.isLiked(item.id || item._id)
    }));
  },

  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  isLiked(id) {
    const liked = wx.getStorageSync('likedPosts') || [];
    return liked.indexOf(id) > -1;
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onReplyInput(e) {
    this.setData({ replyContent: e.detail.value });
  },

  startReply(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ replyToId: id, replyContent: '' });
  },

  cancelReply() {
    this.setData({ replyToId: '', replyContent: '' });
  },

  publish() {
    const content = this.data.content.trim();
    if (!content) {
      wx.showToast({ title: '请先说说遇到的情况', icon: 'none' });
      return;
    }
    if (this.data.publishing) return;
    this.setData({ publishing: true });

    const userId = wx.getStorageSync('userId');
    const db = wx.cloud.database();

    db.collection('communityPosts').add({
      data: {
        userId,
        nickName: this.data.nickName,
        content,
        replies: [],
        likes: 0,
        createTime: db.serverDate()
      },
      success: () => {
        this.setData({ content: '', publishing: false });
        wx.showToast({ title: '发布成功', icon: 'success' });
        this.setData({ activeTab: 'latest' });
        this.loadPosts();
      },
      fail: () => {
        this.setData({ publishing: false });
        wx.showToast({ title: '发布失败，请重试', icon: 'none' });
      }
    });
  },

  submitReply() {
    const replyContent = this.data.replyContent.trim();
    if (!replyContent) {
      wx.showToast({ title: '请输入回复内容', icon: 'none' });
      return;
    }

    const postId = this.data.replyToId;
    const post = this.data.posts.find(p => (p.id || p._id) === postId);
    const replies = (post && post.replies) ? post.replies.slice() : [];
    replies.push({
      nickName: this.data.nickName,
      content: replyContent
    });

    wx.cloud.database().collection('communityPosts').doc(postId).update({
      data: { replies },
      success: () => {
        this.cancelReply();
        wx.showToast({ title: '回复成功', icon: 'success' });
        this.loadPosts();
      },
      fail: () => {
        // 云端失败时本地展示（演示数据帖子无法写入云端）
        const posts = this.data.posts.map(p => {
          if ((p.id || p._id) === postId) {
            return { ...p, replies };
          }
          return p;
        });
        this.setData({ posts, replyToId: '', replyContent: '' });
        wx.showToast({ title: '回复成功（本地展示）', icon: 'none' });
      }
    });
  },

  likePost(e) {
    const { id } = e.currentTarget.dataset;
    const liked = wx.getStorageSync('likedPosts') || [];
    const idx = liked.indexOf(id);
    const isLike = idx === -1;

    if (isLike) {
      liked.push(id);
    } else {
      liked.splice(idx, 1);
    }
    wx.setStorageSync('likedPosts', liked);

    let newLikes = 0;
    const posts = this.data.posts.map(p => {
      const pid = p.id || p._id;
      if (pid === id) {
        newLikes = (p.likes || 0) + (isLike ? 1 : -1);
        return { ...p, liked: isLike, likes: newLikes };
      }
      return p;
    });
    this.setData({ posts });
    this.updateDisplayPosts();

    // 同步到云端（失败静默，本地点赞已生效）
    wx.cloud.database().collection('communityPosts').doc(id).update({
      data: { likes: newLikes }
    });
  },

  callHotline() {
    wx.makePhoneCall({
      phoneNumber: '96110'
    });
  }
});
