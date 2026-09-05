# 银发守护宝 Logo 生成记录（可回溯）

> 用于在需要重新生成或调整 logo 时，凭此文件复现同一画面或微调方向。

## 一、设计方向（已采用）

**盾牌 + 爱心，温暖橙金 + 安心蓝绿，粗实圆角扁平**

- 主体：圆角盾牌（识诈=防护）
- 盾内：爱心（守护和关爱老人）
- 配色：温暖橙金 + 安心蓝/绿
- 风格：粗实线条、圆角、扁平化设计、矢量图、高对比度
- 寓意：守护 + 关爱老年人

## 二、SDXL Prompt（英文，生成用）

```
Rounded tactile icon style logo, main shape is a shield, inside the shield contains a heart symbol representing protection and care for elderly people, warm orange and gold combined with calming blue and green accent, thick bold lines, rounded corners, flat design, simple modern style, suitable for mobile app icon, clean white background, no extra details, vector illustration, high contrast, easy to recognize
```

## 三、生成参数

| 项 | 值 |
|---|---|
| API | https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image |
| image_size | `square_hd`（高清正方形，适合应用图标） |
| 生成时间 | 2026-09-05 14:31 |
| 输出文件 | `assets/logo_generated.jpg`（API 实际返回 JPEG，扩展名必须用 .jpg，否则微信小程序加载失败显示方格子） |
| 文件大小 | 176626 bytes |
| SHA256 | E330CD023298A812503E10A067A3F88E1CBC094F37F6FD2A88FDB6799495B37E |

## 四、生成脚本

[tools/gen_logo.ps1](file:///d:/elderly-anti-fraud/tools/gen_logo.ps1)

执行：
```
powershell -ExecutionPolicy Bypass -File d:\elderly-anti-fraud\tools\gen_logo.ps1
```

## 五、集成位置（已集成）

1. **关于页 hero**：[pages/about/about.wxml](file:///d:/elderly-anti-fraud/pages/about/about.wxml) 的 `.hero-logo` 替换原 🛡️ emoji
2. **首页 header 角标**：[pages/index/index.wxml](file:///d:/elderly-anti-fraud/pages/index/index.wxml) 右上角小圆形徽章
3. **分享卡片封面**：[pages/index/index.js](file:///d:/elderly-anti-fraud/pages/index/index.js) onShareAppMessage 的 imageUrl
4. **小程序头像**（需手动）：微信公众平台后台 → 设置 → 基本设置 → 头像，上传 `assets/logo_generated.jpg`（建议 512×512，微信头像也支持 JPG）

## 六、备选 Prompt（如需调整方向）

### 备选 A. 盾牌 + 老人剪影 + AI 闪光（早期方案）
```
Minimalist mobile app icon logo, rounded blue shield with simplified silver-haired elderly person silhouette inside, small white sparkle AI element upper right, flat modern style, soft rounded corners, white background, centered, generous padding, no text, vector illustration, professional tech brand
```

### 备选 B. 放大镜 + "诈"字
```
Minimalist mobile app icon logo, magnifying glass with stylized Chinese character inside, blue and red accent colors, flat modern style, soft rounded corners, white background, centered, generous padding, vector illustration, professional tech brand
```

### 备选 C. 双手托举 + 心形 + 小盾牌
```
Minimalist mobile app icon logo, two hands holding a heart with small shield inside, warm orange and blue color palette, flat modern style, soft rounded corners, white background, centered, generous padding, vector illustration, caring brand
```

## 七、规格提醒

- 微信小程序头像是**圆形裁切**，重要内容必须放在中心 70% 区域
- 关于页/分享图也建议保留至少 10% 内边距
- 若需深色模式适配，可基于此 prompt 把 "white background" 换成 "dark navy background" 重新生成一份
- 当前 logo 是白底，放在蓝色 hero 区时已用 `border-radius: 50%` + `background: white` 包成圆形徽章，视觉自然
