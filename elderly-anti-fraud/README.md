# 老年人防诈骗互助小程序

## 项目概述

这是一个针对老年人防诈骗的微信小程序，旨在帮助老年人识别、应对和举报诈骗，同时建立一个家庭守护和社区互助的平台。

## 核心功能

### 1. 诈骗识别助手 (pages/identify/)
- 文字识别：输入可疑信息，快速判断是否为诈骗
- 图片识别：拍照识别诈骗短信、链接等
- 识别历史：保存识别记录，便于查看
- 支持分享和举报

### 2. 诈骗案例库 (pages/cases/)
- 最新诈骗手段分类
- 真实案例说明
- 防预方法和应对步骤

### 3. 求助社区 (pages/community/)
- 用户可以发帖求助
- 其他用户和志愿者回答
- 支持点赞和评论

### 4. 家庭守护 (pages/family/)
- 子女可绑定父母账户
- 异常行为提醒
- 家庭防诈小组

### 5. 防诈知识库 (pages/knowledge/)
- 分类的诈骗知识
- 每日防诈小贴士
- 视频教程

### 6. 诈骗举报 (pages/report/)
- 举报诈骗信息
- 汇总到警方数据
- 举报热度排行

## 技术栈

- **前端**：微信小程序（WXML + WXSS + JavaScript）
- **后端**：微信云开发（云函数 + 云数据库）
- **AI识别**：云函数内置诈骗特征库
- **数据库**：微信云数据库（MySQL兼容）
- **存储**：微信云存储

## 项目结构

```
elderly-anti-fraud/
├── pages/                  # 页面文件
│   ├── index/             # 首页
│   ├── identify/          # 诈骗识别
│   ├── cases/             # 案例库
│   ├── community/         # 求助社区
│   ├── family/            # 家庭守护
│   ├── knowledge/         # 知识库
│   ├── report/            # 举报
│   └── profile/           # 个人中心
├── cloudfunctions/        # 云函数
│   ├── identifyFraud/     # 诈骗识别函数
│   ├── reportFraud/       # 举报诈骗函数
│   └── ...
├── assets/                # 静态资源
│   └── icons/            # 图标
├── app.js                # 应用入口
├── app.json              # 应用配置
├── app.wxss              # 全局样式
└── project.config.json   # 项目配置
```

## 云开发数据库设计

### Collections

1. **users** - 用户信息
```javascript
{
  _id: '',
  openId: '',
  nickName: '',
  userType: 'elderly' | 'guardian', // 老年人或守护者
  age: 0,
  phone: '',
  createdAt: Date,
  updatedAt: Date
}
```

2. **fraudCases** - 诈骗案例
```javascript
{
  _id: '',
  title: '',
  description: '',
  fraudType: '',
  riskLevel: 'high' | 'medium' | 'low',
  features: [],
  countermeasures: [],
  createdAt: Date
}
```

3. **communityPosts** - 社区帖子
```javascript
{
  _id: '',
  userId: '',
  title: '',
  content: '',
  likes: 0,
  replies: 0,
  createdAt: Date
}
```

4. **identifyHistory** - 识别历史
```javascript
{
  _id: '',
  userId: '',
  content: '',
  result: {},
  timestamp: Date
}
```

## 开发指南

### 环境准备
1. 安装微信开发者工具
2. 申请小程序账号
3. 创建云开发环境
4. 配置 AppID 到 project.config.json

### 本地开发
```bash
# 1. 在微信开发者工具中打开项目
# 2. 点击云开发图标，进入云开发面板
# 3. 创建数据库集合和云函数
# 4. 在模拟器中测试
```

### 部署云函数
```bash
# 在微信开发者工具中：
# 1. 右键点击 cloudfunctions 文件夹
# 2. 选择"创建新的 Node.js Cloud Function"
# 3. 编写函数逻辑
# 4. 右键选择"上传及部署"
```

## 使用场景

### 老年人使用流程
1. 收到可疑短信/链接
2. 打开小程序，进入"诈骗识别"
3. 输入或拍照可疑信息
4. 系统分析并给出风险提示
5. 如确定是诈骗，点击"举报"
6. 与家人分享警告信息

### 子女使用流程
1. 打开"家庭守护"功能
2. 邀请父母绑定账户
3. 设置异常行为提醒
4. 定期检查父母的活动

## 参赛优势

✅ **社会意义**：解决真实的老年人问题
✅ **创新性**：融合AI识别、社区互助、家庭守护
✅ **技术完整**：前端、后端、云开发、数据库
✅ **故事性强**：容易打动评委
✅ **市场潜力**：政府支持、防诈是国策

## 下一步开发计划

- [ ] 完成各页面的基础功能
- [ ] 集成腾讯云OCR进行图片识别
- [ ] 接入警方举报数据
- [ ] 实现用户认证系统
- [ ] 添加更多诈骗类型识别
- [ ] 性能优化和测试
- [ ] UI/UX 美化
- [ ] 发布到微信小程序市场

## 许可证

MIT

## 联系方式

如有问题或建议，欢迎提交 Issue 或 PR。
