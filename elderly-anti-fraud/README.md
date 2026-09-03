# 老年人防诈骗互助小程序

> 帮助老年人识别、应对和举报诈骗，建立家庭守护和社区互助的微信小程序。

## 项目概述

面向 60+ 老年人群，提供 6 大核心能力：**诈骗识别**、**案例学习**、**社区求助**、**防诈知识**、**一键举报**、**家庭守护**。所有文字大、按钮大、关键操作一键到位，适老化设计贯穿全站。

## 核心功能

| 模块 | 路径 | 能力 |
|------|------|------|
| 首页 | `pages/index/` | 快速导航、最新诈骗警报、家庭守护入口 |
| 诈骗识别 | `pages/identify/` | 文字/图片识别、风险等级评估、应对建议、识别历史 |
| 案例库 | `pages/cases/` | 8 类诈骗 8 个真实案例、分类筛选、详情弹窗、防骗要点 |
| 求助社区 | `pages/community/` | 发帖求助、最新/热门切换、点赞、回复、反诈热线 |
| 防诈知识库 | `pages/knowledge/` | 6 大主题 6 篇文章、4 道防诈小测试、详情阅读 |
| 诈骗举报 | `pages/report/` | 表单提交（类型/电话/账号/截图/描述）、举报记录、官方渠道 |
| 家庭守护 | `pages/family/` | 角色选择（长辈/守护者）、6 位守护码、绑定/解除、守护动态 |
| 个人中心 | `pages/profile/` | 识别历史、举报次数、大字模式、修改称呼 |

## 技术栈

- **前端**：微信小程序（WXML + WXSS + JavaScript）
- **后端**：微信云开发（云函数 + 云数据库 + 云存储）
- **AI 识别**：云函数内置 6 类诈骗特征库 + 关键词匹配
- **图标**：`tools/gen_icons.py` 用 Pillow 批量生成（透明 PNG）

## 项目结构

```
elderly-anti-fraud/
├── pages/                         # 8 个页面
│   ├── index/                     # 首页
│   ├── identify/                  # 诈骗识别
│   ├── cases/                     # 案例库
│   ├── community/                 # 求助社区
│   ├── family/                    # 家庭守护
│   ├── knowledge/                 # 知识库
│   ├── report/                    # 举报
│   └── profile/                   # 个人中心
├── cloudfunctions/
│   ├── identifyFraud/            # 诈骗识别云函数（含 package.json）
│   ├── initDB/                   # 一键初始化：创建集合并写入示例数据
│   └── dataService/              # 数据统一代理云函数（所有数据读写走这里）
├── assets/icons/                  # tabBar 图标（8 个 PNG）
├── tools/gen_icons.py             # 图标生成脚本（Pillow）
├── app.js                         # 应用入口
├── app.json                       # 应用配置 + tabBar
├── app.wxss                       # 全局样式（含风险等级配色）
└── project.config.json            # 项目配置
```

## 云开发数据库设计

### Collections

1. **users** - 用户信息
2. **fraudCases** - 诈骗案例
3. **communityPosts** - 社区帖子
4. **identifyHistory** - 识别历史
5. **alerts** - 诈骗警报
6. **reports** - 举报记录（新增）

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
```

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

- [ ] 集成腾讯云 OCR 进行图片识别
- [ ] 守护码 → 云端 users 集合绑定（当前用本地缓存）
- [ ] 用户登录态 + openId 关联
- [ ] 推送高危警报到守护者
- [ ] 接入警方公开举报数据
- [ ] 视频/语音教程适配视力不便老人

## 许可证

MIT
