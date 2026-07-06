#!/usr/bin/env python3
# 신청(application) 히어로 — 1컷 사진에 네이비→그린 사선 듀오톤(프로그램과 동일 종목 정체성).
# 소스=장비(헬멧/고글) 진열 클로즈업. 같은 사진을 네이비/그린 두 톤으로 굽고 115° 사선으로 블렌드
# (네이비=좌·초점 / 그린=우측 헬멧). 그린 단독이면 노란 헬멧이 올리브로 뜨지만, 사선이라 초점은 네이비가 잡아 안 뭉갬.
# 풀와이드(좌우 안 자름) + 상하만 크롭. 스크림·텍스트는 DuotoneHero 컴포넌트가 CSS로 처리 → 여기선 톤만.
import os
from PIL import Image

SRC = "/Volumes/BridgeNine/NINE_DEV/PROJECT/PEA/_DEV/참고이미지/그라데이션/신청.jpg"
OUT = "/Volumes/BridgeNine/NINE_DEV/PROJECT/PEA/public/application"
os.makedirs(OUT, exist_ok=True)

W, H = 2100, 600               # 3.5:1 (프로그램 히어로 aspect-[7/2]와 동일)
AX, AY = 0.5, 0.25             # 풀와이드 + 상하 크롭 위치. AY↑=피사체 위로(상단 레일 맥락 유지 + 하단 텍스트 여백)
COLOR_MIX = 0.22               # 원본 컬러 믹스(프로그램과 동일)
NAVY = ((0x14, 0x27, 0x40), (0xc7, 0xd8, 0xe9))
GREEN = ((0x1a, 0x3c, 0x2a), (0xcc, 0xe4, 0xd2))
F0, F1, TILT = 0.30, 0.62, 0.18  # 그린 사선 페이드 구간·기울기(even). 프로그램 블렌드 개념 동일.
DARK_L, DARK_X = 0.20, 0.46     # 좌측(네이비 시작) 다크닝 — 좌단 최대 20%, DARK_X·W 지점에서 소멸(톤 앵커+텍스트 가독)

def crop_to(img, ratio, ax=0.5, ay=0.5):
    w, h = img.size
    if w / h > ratio:
        nw = int(h * ratio); x = int((w - nw) * ax); return img.crop((x, 0, x + nw, h))
    nh = int(w / ratio); y = int((h - nh) * ay); return img.crop((0, y, w, y + nh))

def duo_vivid(img, tone):
    (sh, hi) = tone
    g = img.convert("L")
    lut = []
    for ch in range(3):
        lut += [int(sh[ch] + (hi[ch] - sh[ch]) * i / 255) for i in range(256)]
    duo = g.convert("RGB").point(lut)
    return Image.blend(duo, img.convert("RGB"), COLOR_MIX)

base = crop_to(Image.open(SRC), W / H, ax=AX, ay=AY).resize((W, H), Image.LANCZOS)
navy = duo_vivid(base, NAVY)
green = duo_vivid(base, GREEN)

# 사선 페더 마스크 — 그린이 우측에서 페이드 인(좌=네이비 / 우=그린).
mask = Image.new("L", (W, H)); px = mask.load()
for y in range(H):
    ty = TILT * (0.5 - y / H)
    for x in range(W):
        a = ((x / W) + ty - F0) / (F1 - F0)
        px[x, y] = max(0, min(255, int(a * 255)))

comp = navy.copy()
comp.paste(green, (0, 0), mask)

# 좌측(네이비 시작) 다크닝 — 좌단 최대, 중앙(DARK_X)으로 선형 소멸.
cp = comp.load()
for y in range(H):
    for x in range(W):
        k = max(0.0, 1 - x / (DARK_X * W))
        if k > 0:
            f = 1 - DARK_L * k
            r, g, b = comp.getpixel((x, y))
            cp[x, y] = (int(r * f), int(g * f), int(b * f))

comp.save(os.path.join(OUT, "hero.jpg"), quality=88)
print("done →", os.path.join(OUT, "hero.jpg"))

# 미리보기(스크림+텍스트 자리 확인) → 스크래치패드
PREVIEW = "/private/tmp/claude-502/-Volumes-BridgeNine-NINE-DEV-PROJECT-PEA/f7812f89-c422-4d1f-91e6-ab80ed6ddb68/scratchpad"
if os.path.isdir(PREVIEW):
    prev = comp.copy(); sp = prev.load()
    for y in range(H):
        k = max(0.0, (y / H - 0.4) / 0.6)
        if k > 0:
            f = 1 - 0.72 * k
            for x in range(W):
                r, g, b = prev.getpixel((x, y)); sp[x, y] = (int(r * f), int(g * f), int(b * f))
    prev.save(os.path.join(PREVIEW, "apply_final_scrim.jpg"), quality=90)
