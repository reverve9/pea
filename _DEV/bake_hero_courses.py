#!/usr/bin/env python3
# 연수안내(courses) 히어로 후보 — 강습 컷 2종을 네이비→그린 사선 듀오톤(+좌측 다크닝)으로 베이크.
# 비교용: 연수1=상반신(AY↓) / 연수2=하반신(AY↑). 스크림·텍스트는 DuotoneHero 컴포넌트가 CSS로 처리 → 톤만.
import os
from PIL import Image

DIR = "/Volumes/BridgeNine/NINE_DEV/PROJECT/PEA/_DEV/참고이미지/그라데이션"
OUT = "/Volumes/BridgeNine/NINE_DEV/PROJECT/PEA/public/courses"
os.makedirs(OUT, exist_ok=True)

W, H = 2100, 600
COLOR_MIX = 0.22
NAVY = ((0x14, 0x27, 0x40), (0xc7, 0xd8, 0xe9))
GREEN = ((0x1a, 0x3c, 0x2a), (0xcc, 0xe4, 0xd2))
F0, F1, TILT = 0.30, 0.62, 0.18
DARK_L, DARK_X = 0.20, 0.46
# (출력명, 소스, AY) — AY↓=위쪽밴드(상반신) / AY↑=아래밴드(하반신)
# 채택=연수1 상반신(강습·아이 정면). 미채택 후보 B=연수2.jpg 하반신 AY 0.92.
JOBS = {"hero": ("연수1.jpg", 0.06)}

def crop_ay(img, ratio, ay):
    w, h = img.size
    nh = int(w / ratio); y = int((h - nh) * ay)
    return img.crop((0, y, w, y + nh))

def duo(img, tone):
    g = img.convert("L"); (sh, hi) = tone; lut = []
    for c in range(3):
        lut += [int(sh[c] + (hi[c] - sh[c]) * i / 255) for i in range(256)]
    return Image.blend(g.convert("RGB").point(lut), img.convert("RGB"), COLOR_MIX)

for name, (fn, ay) in JOBS.items():
    base = crop_ay(Image.open(os.path.join(DIR, fn)), W / H, ay).resize((W, H), Image.LANCZOS)
    navy = duo(base, NAVY); green = duo(base, GREEN)
    m = Image.new("L", (W, H)); px = m.load()
    for y in range(H):
        ty = TILT * (0.5 - y / H)
        for x in range(W):
            a = ((x / W) + ty - F0) / (F1 - F0); px[x, y] = max(0, min(255, int(a * 255)))
    comp = navy.copy(); comp.paste(green, (0, 0), m)
    cp = comp.load()
    for y in range(H):
        for x in range(W):
            k = max(0.0, 1 - x / (DARK_X * W))
            if k > 0:
                f = 1 - DARK_L * k
                r, g, b = comp.getpixel((x, y)); cp[x, y] = (int(r * f), int(g * f), int(b * f))
    comp.save(os.path.join(OUT, f"{name}.jpg"), quality=88)
    print("done", name, fn, ay)
