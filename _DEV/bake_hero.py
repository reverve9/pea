#!/usr/bin/env python3
# 프로그램 히어로 — 홈 개념(스키/스노보드를 서로 다른 톤 듀오톤)을 한 히어로에 사선 블렌드.
# 스노보드=네이비 듀오톤(좌, #14263f→#cfe0ec) / 스키=그린 듀오톤(우, #1c3f31→#cfe8d8, 축소해 우측).
# 각 톤에 원본 컬러 일부 믹스로 채도 유지(칙칙함 제거). 2:1, 단일 hero.jpg 출력.
import os, math
from PIL import Image, ImageFilter, ImageDraw

SRC = "/Volumes/BridgeNine/NINE_DEV/PROJECT/PEA/_DEV/참고이미지/그라데이션"
SKI = os.path.join(SRC, "female-skiing-at-speed-down-mountain-2026-01-09-09-12-01-utc.jpg")
SNB = os.path.join(SRC, "snowboarder-jumping-high-above-snow-capped-mountai-2026-01-08-08-15-55-utc.jpg")
OUT = "/Volumes/BridgeNine/NINE_DEV/PROJECT/PEA/public/program"
PREVIEW = "/private/tmp/claude-502/-Volumes-BridgeNine-NINE-DEV-PROJECT-PEA/be878676-20ca-4c9d-8942-b34f89a30f61/scratchpad"
os.makedirs(OUT, exist_ok=True)

W, H = 2100, 600               # 3.5:1
# 톤을 각 사진에 구워넣어 이미지 자체가 두 톤으로 섞이게. 톤 대비는 중간(은근하게).
NAVY = ((0x14, 0x27, 0x40), (0xc7, 0xd8, 0xe9))   # 스노보드(은근한 블루)
GREEN = ((0x1a, 0x3c, 0x2a), (0xcc, 0xe4, 0xd2))  # 스키(은근한 그린)
COLOR_MIX = 0.22               # 원본 컬러 믹스(채도) — ↓일수록 톤 뚜렷
GRAD_OP = 0.0                  # 컬러 워시 오버레이 OFF(이미지 톤으로만 그라데이션)
GRAD_NAVY = (34, 74, 138)
GRAD_GREEN = (40, 118, 70)

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

# ── 베이스: 깨끗한 네이비 필드(스노보드 블러+어둡게). 그 위 라이더 줌인 배치 + 스키를 넓게 부드럽게 디졸브.
snb_src = Image.open(SNB)
snb_duo_full = duo_vivid(crop_to(snb_src, W / H, ax=0.40, ay=0.5).resize((W, H), Image.LANCZOS), NAVY)
base = snb_duo_full.filter(ImageFilter.GaussianBlur(78)).point(lambda p: int(p * 0.82))

SNB_BOX = (700, 120, 2700, 1780)   # 원본(5849×1950) 라이더 주변 크롭 박스
SNB_H = 730                        # 레이어 높이(↑=크게)
SNB_X = 110                        # 가로 위치(양수=우측으로)
SNB_DROP = 125                     # 하단 정렬에서 더 내릴 px(보드 크롭 허용)
snb_box = snb_src.crop(SNB_BOX)
scl = SNB_H / snb_box.height
snb_layer = duo_vivid(snb_box.resize((int(snb_box.width * scl), SNB_H), Image.LANCZOS), NAVY)
slw, slh = snb_layer.size
F = 46
fm = Image.new("L", (slw, slh), 0)
ImageDraw.Draw(fm).rectangle([F, F, slw - F, slh - F], fill=255)
fm = fm.filter(ImageFilter.GaussianBlur(F * 0.7))
base.paste(snb_layer, (SNB_X, H - slh + SNB_DROP), fm)

# ── 스키 그린 레이어: 풀높이, 우측 폭만(축소=피사체 작게+우측)
LW = int(0.60 * W)
_ski = Image.open(SKI)
_ski = _ski.crop((0, 0, int(_ski.width * 0.92), _ski.height))   # 우측 여백 살짝만 드롭(줌↓=스키어 축소), 불투명 구간 유지
ski_layer = duo_vivid(crop_to(_ski, LW / H, ax=0.0, ay=0.46).resize((LW, H), Image.LANCZOS), GREEN)

# ── 사선 페더 마스크: 레이어 좌측이 페이드 인(네이비→그린 사선 전환)
mask = Image.new("L", (LW, H))
px = mask.load()
f0, f1, tilt = 0.0, 0.64, 0.18   # 좌측 넓게 부드럽게, 스키어(우측)는 불투명
for y in range(H):
    ty = tilt * (0.5 - y / H)
    for x in range(LW):
        a = ((x / LW) + ty - f0) / (f1 - f0)
        px[x, y] = max(0, min(255, int(a * 255)))

comp = base.copy()
comp.paste(ski_layer, (W - LW, 0), mask)

# ── (옵션) 대각 두톤 컬러 워시 — 기본 OFF(GRAD_OP=0). 이미지 톤만으로 그라데이션.
if GRAD_OP > 0:
    A = math.radians(115)
    dx, dy = math.sin(A), -math.cos(A)
    Ln = abs(W * math.sin(A)) + abs(H * math.cos(A))
    cx, cy = W / 2, H / 2
    grad = Image.new("RGB", (W, H))
    gp = grad.load()
    for y in range(H):
        for x in range(W):
            t = ((x - cx) * dx + (y - cy) * dy) / Ln + 0.5
            t = max(0.0, min(1.0, t))
            gp[x, y] = tuple(int(GRAD_NAVY[i] + (GRAD_GREEN[i] - GRAD_NAVY[i]) * t) for i in range(3))
    comp = Image.blend(comp, grad, GRAD_OP)

comp.save(os.path.join(OUT, "hero.jpg"), quality=88)

# 미리보기: 하단 스크림(텍스트 자리 확인)
prev = comp.copy()
sp = prev.load()
for y in range(H):
    k = max(0.0, (y / H - 0.4) / 0.6)
    if k > 0:
        f = 1 - 0.72 * k
        for x in range(W):
            r, g, b = prev.getpixel((x, y))
            sp[x, y] = (int(r * f), int(g * f), int(b * f))
prev.save(os.path.join(PREVIEW, "hero_preview.jpg"), quality=90)

for f in ("hero-ski.jpg", "hero-snowboard.jpg"):
    p = os.path.join(OUT, f)
    if os.path.exists(p):
        os.remove(p)
print("done:", os.listdir(OUT))
