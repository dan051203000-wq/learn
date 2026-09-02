// 举报平台页面：提交诈骗线索 + 查看举报记录 + 官方举报渠道
const fraudTypes = [
  '冒充公检法',
  '投资理财诈骗',
  '医保社保诈骗',
  '网络贷款诈骗',
  '购物退款诈骗',
  '中奖福利诈骗',
  '冒充亲友诈骗',
  '保健品诈骗',
  '其他诈骗'
];

Page({
  data: {
    fraudTypes,
    typeIndex: -1,
    typeText: '请选择诈骗类型',
    fraudPhone: '',
    fraudAccount: '',
    description: '',
    images: [],
    submitting: false,
    myReports: []
  },

  onLoad() {
    this.loadMyReports();
  },

  onShow() {
    this.loadMyReports();
  },

  /* ===== 表单输入 ===== */
  pickType(e) {
    const typeIndex = Number(e.detail.value);
    this.setData({
      typeIndex,
      typeText: fraudTypes[typeIndex]
    });
  },

  onPhoneInput(e) {
    this.setData({ fraudPhone: e.detail.value });
  },

  onAccountInput(e) {
    this.setData({ fraudAccount: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 3 - this.data.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const newImages = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          images: this.data.images.concat(newImages).slice(0, 3)
        });
      }
    });
  },

  removeImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.images.slice();
    images.splice(Number(index), 1);
    this.setData({ images });
  },

  /* ===== 提交举报 ===== */
  submitReport() {
    const { typeIndex, fraudPhone, description, submitting } = this.data;

    if (typeIndex === -1) {
      wx.showToast({ title: '请选择诈骗类型', icon: 'none' });
      return;
    }
    if (!fraudPhone.trim() && !description.trim()) {
      wx.showToast({ title: '请填写诈骗电话或事情经过', icon: 'none' });
      return;
    }
    if (submitting) return;

    wx.showModal({
      title: '确认提交举报',
      content: '提交后我们将协助您对接反诈中心，紧急情况请直接拨打110或96110。',
      confirmText: '确认提交',
      success: res => {
        if (res.confirm) this.doSubmit();
      }
    });
  },

  doSubmit() {
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    const uploadTasks = this.data.images.map(path => {
      return new Promise(resolve => {
        const cloudPath = `report-images/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
        wx.cloud.uploadFile({
          cloudPath,
          filePath: path,
          success: res => resolve(res.fileID),
          fail: () => resolve('')
        });
      });
    });

    Promise.all(uploadTasks).then(imageFileIds => {
      const db = wx.cloud.database();
      db.collection('reports').add({
        data: {
          userId: wx.getStorageSync('userId'),
          fraudType: this.data.typeText,
          fraudPhone: this.data.fraudPhone.trim(),
          fraudAccount: this.data.fraudAccount.trim(),
          description: this.data.description.trim(),
          imageFileIds,
          status: '已提交',
          createTime: db.serverDate()
        },
        success: () => {
          wx.hideLoading();
          this.setData({
            submitting: false,
            typeIndex: -1,
            typeText: '请选择诈骗类型',
            fraudPhone: '',
            fraudAccount: '',
            description: '',
            images: []
          });
          wx.showToast({ title: '举报提交成功', icon: 'success' });
          this.loadMyReports();
        },
        fail: () => {
          wx.hideLoading();
          this.setData({ submitting: false });
          wx.showToast({ title: '提交失败，可拨打96110举报', icon: 'none' });
        }
      });
    });
  },

  /* ===== 我的举报记录 ===== */
  loadMyReports() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    wx.cloud.database().collection('reports')
      .where({ userId })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get({
        success: res => {
          const myReports = res.data.map(item => ({
            ...item,
            timeText: this.formatTime(item.createTime)
          }));
          this.setData({ myReports });
        },
        fail: () => {
          // 云环境未就绪时静默处理
        }
      });
  },

  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  /* ===== 官方渠道 ===== */
  callPhone(e) {
    const { phone } = e.currentTarget.dataset;
    wx.makePhoneCall({ phoneNumber: phone });
  },

  copyUrl() {
    wx.setClipboardData({
      data: 'https://www.12321.cn',
      success: () => {
        wx.showToast({ title: '网址已复制', icon: 'success' });
      }
    });
  }
});
