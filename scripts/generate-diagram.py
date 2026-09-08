#!/usr/bin/env python3
"""Generate Gambar 3.1 Arsitektur SIPERSA - opsi B vertical stacked for readability."""
from PIL import Image, ImageDraw, ImageFont
import pathlib, os

W, H = 1400, 2000
BG = (255,255,255)
BLUE = (31,78,120)
BLUE2 = (27,94,140)
BLUE3 = (46,117,70)
LIGHT = (242,242,242)
GRID = (220,220,220)

out = pathlib.Path(r"D:\Project\sipersa\public\panduan\arsitektur-sipersa.png")
out.parent.mkdir(parents=True, exist_ok=True)

img = Image.new("RGB", (W,H), BG)
draw = ImageDraw.Draw(img)

def load_font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except: pass
    return ImageFont.load_default()

f_title = load_font(32, True)
f_sub = load_font(18, False)
f_box_title = load_font(26, True)
f_box = load_font(23, False)
f_small = load_font(20, False)
f_rbac_title = load_font(22, True)
f_rbac = load_font(18, False)

# title bar
draw.rectangle([(0,0),(W,110)], fill=BLUE)
draw.text((W//2, 38), "ARSITEKTUR SIPERSA", font=f_title, fill=(255,255,255), anchor="mm")
draw.text((W//2, 78), "Nuxt 4 + Nitro + Turso/SQLite + Dropbox  •  UPTD Tekkomdik", font=f_sub, fill=(210,220,235), anchor="mm")

def rr(x,y,w,h,r, fill, outline=None):
    draw.rounded_rectangle([(x,y),(x+w,y+h)], radius=r, fill=fill, outline=outline, width=2)

gap = 40
bx_w = W - gap*2
bx_h = 420
y = 140

boxes = [
    ("CLIENT — Nuxt 4  (Vue 3 + TypeScript)", [
        "Tailwind CSS v4 + Nuxt UI v4  •  Chart.js / vue-chartjs",
        "SweetAlert2  •  Uppy (upload)  •  TinyMCE",
        "Pages: Dashboard, Surat Masuk/Keluar, Disposisi, Arsip",
        "Auth: Google OAuth + SSO placeholder",
    ], BLUE),
    ("SERVER — Nitro (Node)", [
        "server/api/**  •  bodySize 25 MB",
        "server/middleware/auth.ts  (sid httpOnly)",
        "server/utils/no.ts  •  body.ts  •  logger.ts",
        "RouteRules /api/**  csr:false",
    ], BLUE2),
    ("STORAGE  •  VALIDASI", [
        "Turso / SQLite  @libsql/client  •  .data/local.db",
        "migrate.ts  (ensureColumn + seed admin/admin123)",
        "Dropbox  /Surat Masuk | Keluar | Arsip  (refresh_token)",
        "Zod  lib/validations.ts  •  DOMPurify",
    ], BLUE3),
]

for title, lines, col in boxes:
    rr(gap, y, bx_w, bx_h, 18, fill=LIGHT, outline=GRID)
    # header
    draw.rounded_rectangle([(gap,y),(gap+bx_w,y+56)], radius=18, fill=col)
    draw.rectangle([(gap,y+28),(gap+bx_w,y+56)], fill=col)
    draw.text((gap+bx_w//2, y+28), title, font=f_box_title, fill=(255,255,255), anchor="mm")
    ty = y + 78
    for line in lines:
        # wrap manually if too long (approx 55 chars at 23pt ~ 900px)
        draw.text((gap+28, ty), "•  " + line, font=f_box, fill=(40,40,40), anchor="lm")
        ty += 38
    y += bx_h + 30
    # arrow down to next box (except last)
    if y < 140 + (bx_h+30)*3:
        # draw arrow
        ax = W//2
        ay1 = y - 18
        ay2 = y + 8
        draw.line([(ax, ay1),(ax, ay2)], fill=(60,60,60), width=5)
        draw.polygon([(ax-14, ay2-12),(ax, ay2),(ax+14, ay2-12)], fill=(60,60,60))
        draw.text((ax+22, (ay1+ay2)//2), "HTTPS / JSON", font=f_small, fill=(90,90,90), anchor="lm")

# RBAC bar
y_r = y + 10
rr(gap, y_r, bx_w, 300, 18, fill=(255,255,230), outline=(220,210,160))
draw.text((gap+24, y_r+22), "RBAC & ALUR SIPERSA", font=f_rbac_title, fill=(120,90,10), anchor="lm")
rbac_lines = [
    "•  admin : Users / Klasifikasi / Sesi / Log",
    "•  staff  : operasional harian + ajukan surat keluar",
    "•  pimpinan : approval + Kelola Disposisi",
    "Flow: Input auto NNN/SM-INST/Romawi/Thn → disposisi chain → notifikasi/WA → arsip retensi → Laporan",
]
ty = y_r + 58
for line in rbac_lines:
    draw.text((gap+24, ty), line, font=f_rbac, fill=(60,60,60), anchor="lm")
    ty += 30
draw.text((gap+24, y_r+ 258), "Footer Word: kanan bawah — Romawi i–vii (awal) → Arab 1.. (BAB I+)  •  kiri “SIPERSA -- Sistem Informasi Persuratan dan Arsip”", font=load_font(15, False), fill=(110,110,110), anchor="lm")

# border
draw.rounded_rectangle([(2,2),(W-2,H-2)], radius=14, outline=(200,200,200), width=2)

img.save(out, "PNG", dpi=(300,300))
print(f"saved {out} {W}x{H}")
