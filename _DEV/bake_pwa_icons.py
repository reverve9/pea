#!/usr/bin/env python3
# PWA 아이콘 굽기 — 헤더 로고(가로 락업)에서 좌측 원형 엠블럼만 추출해 정사각 아이콘 생성.
# 출력: public/icons/{icon-512,icon-192,apple-touch-icon,favicon-32,favicon-16}.png
# 배경=흰색 불투명(iOS는 투명 비허용). 마스커블 세이프존 위해 엠블럼을 80%로 센터 배치.
import os
from PIL import Image

SRC = 'public/logo/pea-logo-header.png'
OUT = 'public/icons'
os.makedirs(OUT, exist_ok=True)

src = Image.open(SRC).convert('RGBA')
# 좌측 엠블럼 영역만(텍스트 제외) — 원 우측끝 ~390px, 여유 두고 430
left = src.crop((0, 0, 430, src.height))
bbox = left.split()[3].getbbox()  # 불투명 엠블럼 alpha 바운딩박스
emb = left.crop(bbox)

# 정사각 캔버스(투명)에 센터
w, h = emb.size
s = max(w, h)
sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
sq.paste(emb, ((s - w) // 2, (s - h) // 2), emb)


def make(size, scale, out):
    canvas = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    inner = int(size * scale)
    e = sq.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    canvas.alpha_composite(e, (off, off))
    canvas.convert('RGB').save(os.path.join(OUT, out), 'PNG')
    print('wrote', out, size)


make(512, 0.80, 'icon-512.png')          # 마스커블/일반
make(192, 0.80, 'icon-192.png')
make(180, 0.88, 'apple-touch-icon.png')  # iOS 홈화면(모서리는 iOS가 라운딩)
make(32, 0.86, 'favicon-32.png')
make(16, 0.86, 'favicon-16.png')
print('emblem bbox on left region:', bbox, '-> square', s)
