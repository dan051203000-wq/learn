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
    recentEvents: [],
    alertCount: 0, // 预警条数
    childContacts: [] // 老人端的子女快速呼叫列表 [{name, phone}]
  },

  onLoad() {
    const role = wx.getStorageSync('familyRole') || '';
    const members = wx.getStorageSync('familyMembers') || [];
    const myCode = wx.getStorageSync('familyCode') || '';
    const childContacts = wx.getStorageSync('childContacts') || [];
    this.setData({ role, members, myCode, childContacts });
    this.loadEvents();
  },

  onShow() {
    // 切回此页时刷新预警动态（如刚识别完）
    this.loadEvents();
  },

  /* ===== 角色设置 ===== */
  chooseRole(e) {
    const { role } = e.currentTarget.dataset;
    if (role === 'elder') {
      // elder 角色需要先录入一个称呼（demo 友好：预警卡片显示"妈妈识别了一条..."）
      this.promptElderName(name => {
        let myCode = this.data.myCode;
        if (!myCode) {
          myCode = this.generateCode();
          wx.setStorageSync('familyCode', myCode);
        }
        wx.setStorageSync('familyElderName', name);
        wx.setStorageSync('familyRole', role);
        this.setData({ role, myCode });
        wx.showToast({ title: '守护码已生成', icon: 'success' });
      });
    } else {
      wx.setStorageSync('familyRole', role);
      this.setData({ role });
    }
  },

  // 让长辈录入称呼（用于守护动态展示，如"妈妈""王大爷"）
  promptElderName(cb) {
    const cached = wx.getStorageSync('familyElderName') || '';
    wx.showModal({
      title: '设置长辈称呼',
      editable: true,
      placeholderText: '如：妈妈、王大爷',
      content: cached,
      success: res => {
        const input = (res.content || '').trim().substring(0, 10) || '长辈';
        cb(input);
      },
      fail: () => cb(cached || '长辈')
    });
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

  /* ===== 守护动态（最近识别预警：来自 familyAlerts） ===== */
  loadEvents() {
    wx.cloud.callFunction({
      name: 'dataService',
      data: { action: 'getFamilyAlerts', limit: 20 },
      success: res => {
        if (res.result && res.result.success && res.result.data.length > 0) {
          // 把救援预警和普通预警分开：救援预警单独置顶展示
          const rescueEvents = [];
          const recentEvents = [];
          for (const item of res.result.data) {
            const ev = {
              elderName: item.elderName || '长辈',
              action: '识别了一条可疑信息',
              result: item.riskTitle || '',
              riskLevel: item.riskLevel || 'none',
              snippet: item.snippet || '',
              fraudMethod: item.fraudMethod || '',
              time: this.formatTime(item.timestamp)
            };
            if (item.riskLevel === 'rescue') {
              rescueEvents.push(ev);
            } else {
              recentEvents.push(ev);
            }
          }
          this.setData({
            recentEvents,
            rescueEvents,
            alertCount: recentEvents.length,
            rescueCount: rescueEvents.length
          });
          // 拉到预警后调 AI 摘要（只对普通预警做摘要，救援不摘要）
          this.loadAISummary(recentEvents);
        } else {
          this.setData({
            recentEvents: [],
            alertCount: 0,
            aiSummary: '',
            rescueEvents: [],
            rescueCount: 0
          });
        }
      },
      fail: () => {
        this.setData({ recentEvents: [], alertCount: 0, rescueEvents: [], rescueCount: 0 });
      }
    });
  },

  /**
   * AI 智能摘要：调 aiSummary 云函数，把多条预警汇总成一句话
   */
  loadAISummary(recentEvents) {
    if (!recentEvents || recentEvents.length === 0) {
      this.setData({ aiSummary: '' });
      return;
    }
    // 用守护码（不是单个 alertCode，是所有绑定的成员）
    const memberCodes = (this.data.members || []).map(m => m.code).filter(Boolean);
    if (memberCodes.length === 0) {
      this.setData({ aiSummary: '' });
      return;
    }
    // 守护者端一次只能看一个长辈的，循环取第一个
    const elderCode = memberCodes[0];

    wx.cloud.callFunction({
      name: 'aiSummary',
      data: { elderCode, days: 1, maxItems: 5 },
      success: res => {
        const r = res.result || {};
        if (r.success && r.summary) {
          this.setData({ aiSummary: r.summary, aiPowered: !!r.aiPowered });
        }
      },
      fail: err => console.warn('[aiSummary] 调用失败:', err)
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
  },

  /* ===== 一键呼叫子女 ===== */
  callChild(e) {
    const { phone, name } = e.currentTarget.dataset;
    if (!phone) return;
    wx.showModal({
      title: `呼叫 ${name || '家人'}`,
      content: `即将拨打：${phone}\n\n请确认后再拨打`,
      confirmText: '立即拨打',
      success: res => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: phone,
            fail: (err) => {
              console.warn('拨号失败', err);
              wx.showToast({ title: '拨号失败，请手动拨打', icon: 'none' });
            }
          });
        }
      }
    });
  },

  addChild() {
    if (this.data.childContacts.length >= 3) {
      wx.showToast({ title: '最多保存 3 位家人', icon: 'none' });
      return;
    }
    this.promptAddChild(null, -1);
  },

  editChild(e) {
    const { index } = e.currentTarget.dataset;
    const item = this.data.childContacts[index];
    if (!item) return;
    this.promptAddChild(item, index);
  },

  // 录入 / 编辑 子女电话
  promptAddChild(existing, index) {
    wx.showModal({
      title: existing ? '修改家人电话' : '添加家人电话',
      editable: true,
      placeholderText: '如：女儿  13800138000',
      content: existing ? `${existing.name} ${existing.phone}` : '',
      success: res => {
        if (!res.confirm) return;
        const input = (res.content || '').trim();
        if (!input) {
          wx.showToast({ title: '内容不能为空', icon: 'none' });
          return;
        }
        // 解析 "称呼 电话" 或单独输入电话
        const parts = input.split(/\s+/);
        let name, phone;
        if (parts.length >= 2) {
          name = parts[0].substring(0, 10);
          phone = parts[1];
        } else {
          phone = input;
          name = '家人';
        }
        // 简单校验电话：11 位手机号 或 3-4 位短号
        if (!/^\d{3,}$/.test(phone)) {
          wx.showToast({ title: '电话号码格式不对', icon: 'none' });
          return;
        }
        const list = this.data.childContacts.slice();
        const entry = { name, phone };
        if (index >= 0) list[index] = entry;
        else list.push(entry);
        wx.setStorageSync('childContacts', list);
        this.setData({ childContacts: list });
        wx.showToast({
          title: index >= 0 ? '已修改' : '已添加，长按可改',
          icon: 'success'
        });
      }
    });
  }
});
