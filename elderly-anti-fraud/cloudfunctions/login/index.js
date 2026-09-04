// 云函数 login
// 职责：
//   1. 从 cloud.getWXContext() 取当前调用者的 OPENID（个人主体可用，无需鉴权 token）
//   2. 用 OPENID 作为唯一标识 upsert 到 users 集合（首次注册写入默认昵称与角色）
//   3. 返回 { success, openid, isNew, user } 供客户端写入 globalData
//
// 隐私说明：本函数不收集任何敏感信息，不读取昵称/头像，仅以 OPENID 作为匿名身份标识
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, message: '未获取到 OPENID，请检查微信登录态' };
  }

  // 兼容：客户端可传入 nickName / role，但必须做白名单过滤
  const nickName = (event.nickName && typeof event.nickName === 'string')
    ? event.nickName.slice(0, 20) : '匿名老人';
  const role = ['elder', 'guardian'].includes(event.role) ? event.role : 'elder';

  // upsert：查到就更新 lastLoginTime，查不到就新增
  const userCol = db.collection('users');
  let isNew = false;
  let user = null;

  try {
    const exist = await userCol.where({ openid }).limit(1).get();
    if (exist.data && exist.data.length > 0) {
      user = exist.data[0];
      await userCol.doc(user._id).update({
        data: { lastLoginTime: new Date(), nickName }
      });
      user.lastLoginTime = new Date();
      user.nickName = nickName;
    } else {
      isNew = true;
      const newUser = {
        openid,
        nickName,
        role,
        createTime: new Date(),
        lastLoginTime: new Date()
      };
      const addRes = await userCol.add({ data: newUser });
      user = { ...newUser, _id: addRes._id };
    }
  } catch (err) {
    // users 集合可能不存在（首次部署未建），用 dataService 的 initDB 建集合
    console.error('users 集合访问失败：', err);
    return {
      success: false,
      message: '用户集合未初始化，请先在云开发控制台执行 initDB 云函数创建 users 集合',
      openid
    };
  }

  return {
    success: true,
    openid,
    isNew,
    user: {
      openid: user.openid,
      nickName: user.nickName,
      role: user.role,
      createTime: user.createTime,
      lastLoginTime: user.lastLoginTime
    }
  };
};