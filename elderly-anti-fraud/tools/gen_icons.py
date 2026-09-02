# -*- coding: utf-8 -*-
"""生成小程序 tabBar 图标（81x81 PNG，透明背景）"""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), 'assets', 'icons')
os.makedirs(OUT, exist_ok=True)

GRAY = (153, 153, 153, 255)
BLUE = (33, 150, 243, 255)
SIZE = 81
LW = 6  # 线宽


def new_canvas():
    return Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))


def draw_home(color):
    img = new_canvas()
    d = ImageDraw.Draw(img)
    # 屋顶三角
    d.polygon([(40, 10), (10, 38), (70, 38)], outline=color, width=LW)
    # 房身
    d.rectangle([18, 38, 62, 68], outline=color, width=LW)
    # 门
    d.rectangle([34, 48, 46, 68], outline=color, width=4)
    return img


def draw_scan(color):
    img = new_canvas()
    d = ImageDraw.Draw(img)
    # 放大镜圈
    d.ellipse([12, 12, 54, 54], outline=color, width=LW)
    # 手柄
    d.line([(50, 50), (68, 68)], fill=color, width=LW + 2)
    return img


def draw_community(color):
    img = new_canvas()
    d = ImageDraw.Draw(img)
    # 聊天气泡
    d.rounded_rectangle([8, 12, 72, 56], radius=16, outline=color, width=LW)
    # 气泡尾巴
    d.polygon([(24, 54), (36, 54), (22, 70)], fill=color)
    # 三个点
    for x in (26, 40, 54):
        d.ellipse([x - 3, 30, x + 3, 36], fill=color)
    return img


def draw_profile(color):
    img = new_canvas()
    d = ImageDraw.Draw(img)
    # 头
    d.ellipse([28, 10, 52, 34], outline=color, width=LW)
    # 身体（半圆）
    d.arc([14, 40, 66, 86], start=180, end=360, fill=color, width=LW)
    return img


ICONS = {
    'home': draw_home,
    'scan': draw_scan,
    'community': draw_community,
    'profile': draw_profile,
}

for name, fn in ICONS.items():
    fn(GRAY).save(os.path.join(OUT, f'{name}.png'))
    fn(BLUE).save(os.path.join(OUT, f'{name}-active.png'))

print('生成完成:', sorted(os.listdir(OUT)))
