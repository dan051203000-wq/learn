// 家庭守护页面：通过守护码把家人绑定在一起，遇险互相提醒
// 数据存储在本地缓存（members）+ 云端 users 集合（绑定关系），云端失败时本地照常可用
Page({
  data: {
    role: '', // 'elder' 被守护者 / 'guardian' 守护者，空为未设置
    members: [],
    myCode: '',
    inputCode: '',
    inputName: '',
    showBind: false,
    recentEvents: []
  },

  onLoad() {
    const role = wx.getStorageSync('familyRole') || '';
    const members = wx.getStorageSync('familyMembers') || [];
    const myCode = wx.getStorageSync('familyCode') || '';
    this.setData({ role, members, myCode });
    this.loadEvents();
  },

  /* ===== 角色设置 ===== */
  chooseRole(e) {
    const { role } = e.currentTarget.dataset;
    let myCode = this.data.myCode;
    if (role === 'elder' && !myCode) {
      // 被守护者生成专属守护码
      myCode = this.generateCode();
      wx.setStorageSync('familyCode', myCode);
    }
    wx.setStorageSync('familyRole', role);
    this.setData({ role, myCode });

    if (role === 'elder') {
      wx.showToast({ title: '守护码已生成', icon: 'success' });
    }
  },

  switchRole() {
    wx.showModal({
      title: '切换角色',
      content: '确定要切换家庭守护角色吗？已绑定的家人不会丢失。',
      success: res => {
        if (res.confirm) {
          wx.setStorageSync('familyRole', '');
          this.setData({ role: '' });
        }
      }
    });
  },

  generateCode() {
    // 6位数字守护码，老年人口述方便
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += Math.floor(Math.random() * 10);
    }
    return code;
  },

  /* ===== 守护码操作 ===== */
  copyCode() {
    wx.setClipboardData({
      data: this.data.myCode,
      success: () => {
        wx.showToast({ title: '已复制，发给家人吧', icon: 'none' });
      }
    });
  },

  refreshCode() {
    wx.showModal({
      title: '更换守护码',
      content: '更换后原守护码将失效，家人需要重新绑定，确定更换吗？',
      success: res => {
        if (res.confirm) {
          const myCode = this.generateCode();
          wx.setStorageSync('familyCode', myCode);
          this.setData({ myCode });
        }
      }
    });
  },

  /* ===== 绑定家人（守护者输入老人的守护码） ===== */
  toggleBind() {
    this.setData({ showBind: !this.data.showBind, inputCode: '', inputName: '' });
  },

  onCodeInput(e) {
    this.setData({ inputCode: e.detail.value });
  },

  onNameInput(e) {
    this.setData({ inputName: e.detail.value });
  },

  bindMember() {
    const code = this.data.inputCode.trim();
    const name = this.data.inputName.trim() || '家人';
    if (!/^\d{6}$/.test(code)) {
      wx.showToast({ title: '请输入6位守护码', icon: 'none' });
      return;
    }

    const exists = this.data.members.some(m => m.code === code);
    if (exists) {
      wx.showToast({ title: '该守护码已绑定', icon: 'none' });
      return;
    }

    const members = this.data.members.concat({
      code,
      name,
      bindTime: this.formatTime(new Date()),
      status: '守护中'
    });
    wx.setStorageSync('familyMembers', members);
    this.setData({ members, showBind: false, inputCode: '', inputName: '' });
    wx.showToast({ title: `已绑定${name}`, icon: 'success' });
  },

  removeMember(e) {
    const { index } = e.currentTarget.dataset;
    const members = this.data.members.slice();
    const member = members[Number(index)];
    wx.showModal({
      title: '解除守护',
      content: `确定解除对"${member.name}"的守护吗？`,
      confirmText: '解除',
      success: res => {
        if (res.confirm) {
          members.splice(Number(index), 1);
          wx.setStorageSync('familyMembers', members);
          this.setData({ members });
        }
      }
    });
  },

  /* ===== 守护动态（示例数据，后续接入识别历史联动） ===== */
  loadEvents() {
    const userId = wx.getStorageSync('userId');
    wx.cloud.database().collection('identifyHistory')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get({
        success: res => {
          const recentEvents = res.data.map(item => ({
            nickName: '家人',
            action: '识别了一条可疑信息',
            result: item.riskLevelText || '',
            time: this.formatTime(item.timestamp)
          }));
          this.setData({ recentEvents });
        },
        fail: () => {
          // 云端不可用时展示本地说明
          this.setData({
            recentEvents: []
          });
        }
      });
  },

  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  /* ===== 给家人的快捷提醒 ===== */
  remindFamily() {
    wx.showActionSheet({
      itemList: ['电话提醒家人', '复制防诈提醒发给家人'],
      success: res => {
        if (res.tapIndex === 0) {
          wx.makePhoneCall({ phoneNumber: '96110' });
        } else {
          wx.setClipboardData({
            data: '【家庭防诈提醒】收到陌生电话谈钱要警惕：不轻信、不透露、不转账、多核实。拿不准就打96110问问。',
            success: () => {
              wx.showToast({ title: '已复制，发给家人吧', icon: 'none' });
            }
          });
        }
      }
    });
  },

  callHotline() {
    wx.makePhoneCall({ phoneNumber: '96110' });
  }
});
