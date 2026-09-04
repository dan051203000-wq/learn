# 老年人防诈骗互助小程序

> 帮助老年人识别、应对和举报诈骗，建立家庭守护和社区互助的微信小程序。
> ⚠️ **本应用为社区辅助工具，不对接反诈中心/公安机关，紧急情况请拨打 110 或 96110**。详见 [COMPLIANCE.md](./COMPLIANCE.md)。

## 项目概述

面向 60+ 老年人群，提供 6 大核心能力：**诈骗识别**、**案例学习**、**社区求助**、**防诈知识**、**一键举报**、**家庭守护**。所有文字大、按钮大、关键操作一键到位，适老化设计贯穿全站。

## 核心功能

| 模块 | 路径 | 能力 |
|------|------|------|
| 首页 | `pages/index/` | 快速导航、最新诈骗警报、家庭守护入口、合规辅助声明 |
| 诈骗识别 | `pages/identify/` | 文字/图片识别、风险等级评估、应对建议、识别历史、**🔊 一键朗读**、**📷 拍照存证**、**🛎️ 自动推送预警给守护者** |
| 案例库 | `pages/cases/` | 8 类诈骗 8 个真实案例、分类筛选、详情弹窗、防骗要点 |
| 求助社区 | `pages/community/` | 发帖求助、最新/热门切换、点赞、回复、反诈热线 |
| 防诈知识库 | `pages/knowledge/` | 6 大主题 6 篇文章、4 道防诈小测试、详情阅读 |
| 诈骗举报 | `pages/report/` | 表单提交（类型/电话/账号/截图/描述）、举报记录、其他举报渠道 |
| 家庭守护 | `pages/family/` | 角色选择（长辈/守护者）、6 位守护码、绑定/解除、**🛎️ 家庭预警动态**（v1.2 新增）、**📞 一键呼叫子女**（最多 3 位） |
| 个人中心 | `pages/profile/` | 识别历史、举报次数、大字模式、修改称呼、**关于本工具（合规说明）**、**📮 意见反馈**（v1.2 新增） |
| 关于页 | `pages/about/` | 产品定位、隐私摘要、免责声明、合规承诺 |
| 反馈页 | `pages/feedback/` | 类型选择 + 内容 + 联系方式（手机号自动脱敏） |

## 技术栈

- **前端**：微信小程序（WXML + WXSS + JavaScript）
- **后端**：微信云开发（云函数 + 云数据库 + 云存储）
- **AI 识别**：云函数内置 6 类诈骗特征库 + 关键词匹配
- **图标**：`tools/gen_icons.py` 用 Pillow 批量生成（透明 PNG）

## 项目结构

```
elderly-anti-fraud/
├── pages/                         # 9 个页面（v1.2 新增 feedback）
│   ├── index/                     # 首页
│   ├── identify/                  # 诈骗识别（含云函数联动家庭预警）
│   ├── cases/                     # 案例库
│   ├── community/                 # 求助社区
│   ├── family/                    # 家庭守护（含家庭预警动态 · 子女协同）
│   ├── knowledge/                 # 知识库
│   ├── report/                    # 举报
│   ├── profile/                   # 个人中心
│   ├── about/                     # 关于页（合规说明）
│   └── feedback/                  # 意见反馈（v1.2 新增）
├── cloudfunctions/
│   ├── identifyFraud/            # 诈骗识别云函数（含家庭预警推送）
│   ├── dataService/              # 数据统一代理云函数（含 12+ actions）
│   ├── cleanupTimer/             # 每日 3 点定时清理（v1.2 新增）
│   ├── getKeywords/              # 关键词热更新读取（v1.2 新增）
│   └── initDB/                   # 一键初始化：创建集合并写入示例数据
├── docs/                  # 比赛/演示材料（v1.2 新增）
│   ├── DEMO_SCRIPT.md            # 演示视频脚本
│   ├── PPT_OUTLINE.md            # PPT 大纲
│   └── QA_ANSWERS.md             # 答辩话术
├── assets/icons/                  # tabBar 图标（10 个 PNG）
├── tools/gen_icons.py             # 图标生成脚本（Pillow）
├── app.js                         # 应用入口
├── app.json                       # 应用配置 + tabBar + 同声传译插件
├── app.wxss                       # 全局样式（含风险等级配色）
├── project.config.json            # 项目配置
├── COMPLIANCE.md                  # 合规与边界说明
├── README.md
└── SETUP.md                       # 保姆级部署指南
```

## 云开发数据库设计

### Collections（共 12 个）

1. **users** - 用户信息（含 openId）
2. **fraudCases** - 诈骗案例
3. **communityPosts** - 社区帖子
4. **identifyHistory** - 识别历史（保留 7 天）
5. **alerts** - 首页全国诈骗警报
6. **reports** - 举报记录（证据图保留 30 天）
7. **familyAlerts** - 家庭预警动态（保留 7 天，v1.2 新增）
8. **feedback** - 意见反馈（保留 90 天，v1.2 新增）
9. **keywords** - 关键词热更新库
10. **knowledgeArticles** - 防诈知识文章
11. **knowledgeQuizzes** - 防诈小测试
12. **fraudImages** - 识别图片云存储引用

### 各 Collection 字段示例

```javascript
// reports
{
  _id: '',
  userId: '',
  fraudType: '冒充公检法',
  fraudPhone: '0085xxxxxxx',
  fraudAccount: '银行卡号或网址',
  description: '事情经过',
  imageFileIds: ['cloud://...'],
  status: '已提交',
  createTime: Date
}

// familyAlerts（v1.2 新增）
{
  _id: '',
  elderCode: '123456',
  elderName: '妈妈',
  riskLevel: 'high',
  riskTitle: '⚠️ 极高风险',
  fraudMethod: '冒充公检法',
  snippet: '您好，我是北京市公安局...',
  timestamp: Date,
  expireAt: Date  // 7 天后过期
}
```

## ⭐ 核心创新点（v1.2）：子女远程协同预警

**演示闭环**：

```
[老人粘贴短信] → [云函数 identifyFraud 识别]
       ↓ 风险等级非 none
       ↓ 自动写 familyAlerts 集合
       ↓
[子女"家庭守护"页"家庭预警动态"]
       显示：妈妈 · 🚨 极高风险 · 冒充公检法 · "刚刚"
```

**关键代码位置**：
- 写预警：`cloudfunctions/identifyFraud/index.js` 的 `writeFamilyAlert` 函数
- 拉预警：`cloudfunctions/dataService/index.js` 的 `getFamilyAlerts` action
- UI 展示：`pages/family/family.wxml` events 卡片 + `pages/family/family.wxss` 预警色条

**设计取舍说明**：demo 场景下所有家庭预警对所有家庭成员可见（演示流程最短）；生产环境应按 guardianUserId+familyBindings 关系过滤。已预留 elderCode 字段便于后续扩展。

## 快速开始

### 1. 克隆并打开项目
```bash
git clone https://github.com/dan051203000-wq/learn.git
cd learn
git checkout elderly-anti-fraud
cd elderly-anti-fraud
```

### 2. 配置 AppID
用微信开发者工具打开本目录，将 `project.config.json` 里的 `appid` 填入你的小程序 AppID。

### 3. 创建云开发环境
1. 工具栏点击"云开发" → "创建"环境
2. 在 `app.js` 的 `wx.cloud.init({ env: '你的环境ID' })` 填入环境 ID

### 4. 创建数据库集合
在云开发控制台"数据库"中新建以下集合（建议权限设为"仅创建者及管理员可读写"）：
- `fraudCases`、`communityPosts`、`identifyHistory`、`alerts`、`reports`

### 5. 上传云函数
右键 `cloudfunctions/identifyFraud`、`cloudfunctions/initDB`、`cloudfunctions/dataService` → 选择"上传并部署：云端安装依赖"（三个都要上传）。

> **架构说明**：小程序端所有数据读写均通过 `dataService` 云函数完成。云函数以管理员权限访问数据库，不受集合权限设置影响，因此**无需手动配置数据库权限**，数据也无法被客户端直接篡改，更安全。

### 6. 重新生成 tabBar 图标（如有调整）
```bash
python tools/gen_icons.py
# 图标自动写入 assets/icons/
```

## 关键交互约定

- **tabBar 页面跳转**必须用 `wx.switchTab`（首页 → 识别/社区），其他页面用 `wx.navigateTo`
- **云端数据降级**：所有页面在云环境未就绪时自动回退到本地示例数据，方便离线体验
- **大字模式**：个人中心开关切换，全局通过 `font-large` class 放大关键字号
- **风险等级配色**：高 `#c62828`、中 `#e65100`、低 `#2e7d32`、无 `#1565c0`
- **TTS 朗读**：识别结果页可一键朗读（基于微信同声传译插件）
- **拍照存证**：选图后自动加密路径上传到云存储 `fraud-evidence/{userId}/`，作为举报佐证

## 使用流程示例

**老年人端**：
1. 收到可疑短信 → 打开"识别诈骗" → 输入文字 → 看到高风险提示
2. 进入"案例库"学习真实案例
3. 拿不准的事到"求助社区"发帖
4. 微信/电话被骚扰 → "诈骗举报"提交线索
5. 告诉子女自己的 6 位守护码，让子女守护自己

**子女端**：
1. 输入长辈的守护码完成绑定
2. 在"守护动态"里查看长辈识别过的高风险信息
3. 在"个人中心"切换"大字模式"远程辅助长辈

## 后续可优化方向

- [x] ✅ **子女远程协同预警**（v1.2 已实现：识别结果自动推送到家庭预警动态）
- [x] ✅ **一键呼叫子女**（v1.1 已实现：最多 3 位，本机存储）
- [x] ✅ **关键词热更新**（v1.2 已实现：keywords 集合 + getKeywords 云函数）
- [x] ✅ **数据保留策略自动清理**（v1.2 已实现：cleanupTimer 每日 3 点）
- [x] ✅ **拍照存证**（v1.1 已实现：fraud-evidence/{userId}/）
- [x] ✅ **TTS 朗读**（v1.1 已实现：同声传译插件）
- [ ] 集成腾讯云 OCR 进行图片文字提取（当前拍照仅上传证据）
- [ ] 守护码绑定关系上云端 users 集合（当前用本地缓存）
- [ ] 微信订阅消息真正推送（v1.2 演示版走云端集合，生产版应接订阅消息）
- [ ] 接入警方公开举报数据
- [ ] 视频/语音教程适配视力不便老人
- [ ] 大字模式持久化到云端（多设备同步）

## 📦 比赛/演示材料（v1.2 新增）

`docs/` 目录提供完整比赛准备材料：

| 文件 | 用途 |
|---|---|
| [DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md) | 5-7 分钟演示视频脚本（开场案例 → 四大功能 → 技术 → 收尾） |
| [PPT_OUTLINE.md](./docs/PPT_OUTLINE.md) | 10 页 PPT 大纲（每页含核心信息 / 图片建议 / 字号 / 配色规范） |
| [QA_ANSWERS.md](./docs/QA_ANSWERS.md) | 3 分钟答辩自我介绍 + 8 个高频评委追问话术 |

## 合规与边界

本项目严格遵守以下合规原则，详见 [COMPLIANCE.md](./COMPLIANCE.md)：

1. **不自称官方**：本应用是社区辅助工具，不自称"反诈中心""警方渠道"
2. **不涉及资金**：没有支付、转账、信贷功能，规避"金融"受限类目
3. **匿名优先**：使用自动生成的匿名 userId，不要求真实身份信息
4. **数据库权限**：所有集合"仅创建者可读写"，客户端不直连 db.collection（走 dataService 代理）
5. **第三方零共享**：不接入广告 SDK、不向任何第三方共享数据
6. **紧急情况引导**：在多个页面顶部直接显示 110 / 96110

## 许可证

MIT
