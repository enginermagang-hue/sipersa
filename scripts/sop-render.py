#!/usr/bin/env python3
"""Render SOP alur lengkap SIPERSA -> public/sop-alur-lengkap.svg.

Gaya horizontal (kiri -> kanan), kop logo instansi di atas.
Logo di-embed base64 agar SVG mandiri. Jalankan: python scripts/sop-render.py
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]


def b64(rel: str) -> str:
    return base64.b64encode((ROOT / rel).read_bytes()).decode("ascii")


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


W = 2480
MARGIN = 40
CONTENT = W - 2 * MARGIN
GAP = 44
COLW = (CONTENT - 4 * GAP) // 5  # 457
COLXS = [MARGIN + i * (COLW + GAP) for i in range(5)]
BOXW = COLW - 28  # inset 14

ROLES = {
    "Staff": ("#1d4ed8", "#dbeafe"),
    "Pimpinan": ("#b45309", "#fef3c7"),
    "Admin": ("#7c3aed", "#ede9fe"),
    "Sistem": ("#475569", "#f1f5f9"),
    "Admin & Staff": ("#0e7490", "#cffafe"),
}

# (kolom, id, judul lines, deskripsi lines, peran, dashed)
BOXES = [
    (0, "L1", ["Login"], ["Username + password", "atau Google OAuth"], "Sistem", False),
    (0, "L2", ["Dashboard per peran"], ["KPI · antrean approval", "notifikasi + WA"], "Sistem", False),
    (1, "M1", ["Staff catat surat masuk"], ["Form + unggah pindaian", "khusus peran Staff"], "Staff", False),
    (1, "M2", ["Nomor otomatis + simpan"], ["NNN/SM-INST/Romawi/Thn", "file ke Dropbox"], "Sistem", False),
    (1, "M3", ["Notifikasi pimpinan"], ["In-app + WhatsApp", "ke semua pimpinan"], "Sistem", False),
    (2, "D1", ["Pimpinan buat disposisi"], ["Tujuan ke staff", "instruksi + batas waktu"], "Pimpinan", False),
    (2, "D2", ["Staff terima & proses"], ["baru → diproses", "kerjakan instruksi"], "Staff", False),
    (2, "D3", ["Teruskan berantai"], ["ke staff lain", "parent–child tercatat"], "Staff", False),
    (2, "D4", ["Selesaikan"], ["diproses → selesai", "semua selesai → surat selesai"], "Staff", False),
    (3, "S1", ["Staff tulis draft"], ["Editor / unggah file", "nomor SK-INST otomatis"], "Staff", False),
    (3, "S2", ["Submit pengajuan"], ["draft/ditolak →", "menunggu persetujuan"], "Staff", False),
    (3, "S3", ["Pimpinan setujui", "→ TERKIRIM"], ["PDF bertanda tangan", "riwayat approval tercatat"], "Pimpinan", False),
    (3, "S4", ["Ditolak → revisi"], ["catatan penolakan", "kembali ke draft"], "Pimpinan", False),
    (4, "A1", ["Arsipkan surat"], ["1 surat = 1 arsip", "ref masuk / keluar"], "Admin & Staff", False),
    (4, "A2", ["Laporan & export"], ["Khusus admin + staff", "Excel / cetak PDF"], "Admin & Staff", False),
    (4, "A3", ["Kelola sistem"], ["Users · klasifikasi", "sesi · log aktivitas"], "Admin", True),
]

COLS = ["1 · AKSES", "2 · SURAT MASUK", "3 · DISPOSISI", "4 · SURAT KELUAR", "5 · ARSIP & LAPORAN"]

HEAD_Y = 350
HEAD_H = 48
BOX_Y0 = 424
VGAP = 40


def box_h(title, desc) -> int:
    return 14 + 26 + 34 * len(title) + 28 * len(desc) + 20


geom = {}
col_bottom = {}
for c in range(5):
    y = BOX_Y0
    for col, bid, t, d, _r, _ds in [b for b in BOXES if b[0] == c]:
        h = box_h(t, d)
        x = COLXS[c] + 14
        geom[bid] = (x, y, BOXW, h)
        y += h + VGAP
    col_bottom[c] = y - VGAP

BUS_Y = max(col_bottom.values()) + 48
FOOT_Y = BUS_Y + 56
H = FOOT_Y + 150

out = []
out.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Inter, \'Segoe UI\', Arial, sans-serif">')
out.append("<defs>"
           '<linearGradient id="band" x1="0" y1="0" x2="1" y2="0">'
           '<stop offset="0" stop-color="#1d4ed8"/><stop offset="1" stop-color="#6d28d9"/>'
           "</linearGradient>"
           '<marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
           '<path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker>'
           '<marker id="arrB" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
           '<path d="M0,0 L10,5 L0,10 z" fill="#1d4ed8"/></marker>'
           '<marker id="arrG" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
           '<path d="M0,0 L10,5 L0,10 z" fill="#16a34a"/></marker>'
           '<marker id="arrR" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
           '<path d="M0,0 L10,5 L0,10 z" fill="#dc2626"/></marker>'
           "</defs>")
out.append(f'<rect x="0" y="0" width="{W}" height="{H}" fill="#ffffff"/>')

# ---- Kop ----
tut = b64("public/tutwuri.png")
ntt = b64("public/ntt.png")
out.append(f'<image href="data:image/png;base64,{ntt}" x="48" y="26" width="108" height="108"/>')
out.append(f'<image href="data:image/png;base64,{tut}" x="{W - 156}" y="26" width="108" height="108"/>')
out.append(f'<text x="{W // 2}" y="62" text-anchor="middle" font-size="34" font-weight="800" fill="#0f172a">PEMERINTAH PROVINSI NUSA TENGGARA TIMUR</text>')
out.append(f'<text x="{W // 2}" y="100" text-anchor="middle" font-size="26" font-weight="600" fill="#334155">DINAS PENDIDIKAN DAN KEBUDAYAAN — UPTD TEKKOMDIK</text>')
out.append(f'<text x="{W // 2}" y="134" text-anchor="middle" font-size="22" letter-spacing="2" fill="#64748b">SISTEM INFORMASI PERSURATAN DAN ARSIP DIGITAL (SIPERSA)</text>')
out.append(f'<line x1="40" y1="158" x2="{W - 40}" y2="158" stroke="#cbd5e1" stroke-width="2"/>')

# ---- Pita judul ----
out.append(f'<rect x="40" y="176" width="{W - 80}" height="86" rx="16" fill="url(#band)"/>')
out.append(f'<text x="{W // 2}" y="214" text-anchor="middle" font-size="31" font-weight="800" fill="#ffffff">SOP ALUR LENGKAP — DARI SURAT MASUK &amp; DISPOSISI HINGGA SURAT KELUAR &amp; ARSIP</text>')
out.append(f'<text x="{W // 2}" y="244" text-anchor="middle" font-size="22" fill="#dbeafe">Alur horizontal kiri → kanan · Berlaku untuk peran Staff · Pimpinan · Admin</text>')

# ---- Legenda ----
lx = 48
ly = 292
out.append(f'<text x="{lx}" y="{ly}" font-size="23" font-weight="700" fill="#0f172a">Keterangan peran:</text>')
lx += 250
for role in ["Staff", "Pimpinan", "Admin & Staff", "Admin", "Sistem"]:
    c, bg = ROLES[role]
    out.append(f'<rect x="{lx}" y="{ly - 26}" width="34" height="26" rx="7" fill="{bg}" stroke="{c}" stroke-width="2"/>')
    out.append(f'<text x="{lx + 44}" y="{ly}" font-size="23" fill="#334155">{esc(role)}</text>')
    lx += 44 + len(role) * 13 + 70

# Legenda warna panah
lx += 50
out.append(f'<text x="{lx}" y="{ly}" font-size="23" font-weight="700" fill="#0f172a">Panah:</text>')
lx += 105
for lab, c, m in [("alur normal", "#64748b", "arr"), ("buat / ajukan", "#1d4ed8", "arrB"),
                  ("YA / setuju", "#16a34a", "arrG"), ("TIDAK / tolak", "#dc2626", "arrR")]:
    out.append(f'<line x1="{lx}" y1="{ly - 8}" x2="{lx + 54}" y2="{ly - 8}" stroke="{c}" stroke-width="4" marker-end="url(#{m})"/>')
    out.append(f'<text x="{lx + 62}" y="{ly}" font-size="22" fill="#334155">{lab}</text>')
    lx += 62 + len(lab) * 11 + 28

# ---- Kolom ----
for c, title in enumerate(COLS):
    x = COLXS[c]
    out.append(f'<rect x="{x}" y="{HEAD_Y}" width="{COLW}" height="{HEAD_H}" rx="12" fill="#1e293b"/>')
    out.append(f'<circle cx="{x + 34}" cy="{HEAD_Y + HEAD_H // 2}" r="17" fill="#ffffff"/>')
    out.append(f'<text x="{x + 34}" y="{HEAD_Y + 33}" text-anchor="middle" font-size="24" font-weight="800" fill="#1e293b">{c + 1}</text>')
    out.append(f'<text x="{x + 62}" y="{HEAD_Y + 33}" font-size="24" font-weight="700" fill="#ffffff">{esc(title)}</text>')

for col, bid, t, d, role, dashed in BOXES:
    x, y, w, h = geom[bid]
    c, _bg = ROLES[role]
    dash = ' stroke-dasharray="10 6"' if dashed else ""
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"{dash}/>')
    out.append(f'<rect x="{x + 3}" y="{y + 10}" width="10" height="{h - 20}" rx="5" fill="{c}"/>')
    out.append(f'<text x="{x + 28}" y="{y + 38}" font-size="20" font-weight="700" letter-spacing="2" fill="{c}">{esc(role.upper())}</text>')
    ty = y + 70
    for line in t:
        out.append(f'<text x="{x + 28}" y="{ty}" font-size="28" font-weight="700" fill="#0f172a">{esc(line)}</text>')
        ty += 34
    for line in d:
        out.append(f'<text x="{x + 28}" y="{ty}" font-size="23" fill="#475569">{esc(line)}</text>')
        ty += 28


def vlabel(x, y, text, size=20):
    """Label vertikal (diputar) untuk koridor sempit antar kolom."""
    out.append(f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}" font-weight="600" fill="#0f172a" paint-order="stroke" stroke="#ffffff" stroke-width="6" transform="rotate(-90 {x} {y})">{esc(text)}</text>')


def edge(points, label=None, lx_=None, ly_=None, blue=False, color="gray"):
    if blue:
        color = "blue"
    cols = {"gray": ("#64748b", "arr"), "blue": ("#1d4ed8", "arrB"),
            "green": ("#16a34a", "arrG"), "red": ("#dc2626", "arrR")}
    col, m = cols[color]
    w = 4 if color in ("blue", "green", "red") else 3
    pts = " ".join(f"{x},{y}" for x, y in points)
    out.append(f'<polyline points="{pts}" fill="none" stroke="{col}" stroke-width="{w}" marker-end="url(#{m})"/>')
    if label:
        out.append(f'<text x="{lx_}" y="{ly_}" text-anchor="middle" font-size="22" font-weight="600" fill="#0f172a" paint-order="stroke" stroke="#ffffff" stroke-width="6">{esc(label)}</text>')


def v(bid):  # vertical chain inside a column
    chains = {}
    for col, b, *_ in BOXES:
        chains.setdefault(col, []).append(b)
    for col, ids in chains.items():
        for a, b in zip(ids, ids[1:]):
            # S2->S3 dilewati: S2 bercabang ke S3 (setuju) — digambar eksplisit di bawah
            if (a, b) == ("S2", "S3"):
                continue
            xa, ya, wa, ha = geom[a]
            xb, yb, *_ = geom[b]
            edge([(xa + wa / 2, ya + ha), (xb + wa / 2, yb)])


v(None)

# L2 -> M1 (siku via koridor, label vertikal agar tak menabrak kotak)
xa, ya, wa, ha = geom["L2"]
xb, yb, _wb, hb = geom["M1"]
midL2 = ya + ha / 2
midM1 = yb + hb / 2
gapx01 = COLXS[0] + COLW + GAP // 2
edge([(xa + wa, midL2), (gapx01, midL2), (gapx01, midM1), (xb, midM1)])
vlabel(gapx01, (midL2 + midM1) / 2, "catat surat masuk")

# M3 -> D1 (siku via koridor, label vertikal)
xa, ya, wa, ha = geom["M3"]
xb, yb, _wb, hb = geom["D1"]
midM3 = ya + ha / 2
midD1 = yb + hb / 2
gapx12 = COLXS[1] + COLW + GAP // 2
edge([(xa + wa, midM3), (gapx12, midM3), (gapx12, midD1), (xb, midD1)])
vlabel(gapx12, (midM3 + midD1) / 2, "notifikasi pimpinan")

# Bypass biru: L1 -> S1 (buat surat keluar), lewat zona bebas di atas header
_, yL1, _, hL1 = geom["L1"]
midL1 = yL1 + hL1 / 2
xL1r = geom["L1"][0] + geom["L1"][2]
xS1, yS1, wS1, _ = geom["S1"]
trunkx = COLXS[2] + COLW + GAP // 2
edge([(xL1r, midL1), (gapx01, midL1), (gapx01, 332), (trunkx, 332), (trunkx, midM1), (xS1, midM1)],
     "buat surat keluar", 1000, 322, blue=True)

# S2 -> S3: YA disetujui (hijau), label tepat di celah antar kotak
xS2, yS2, wS2, hS2 = geom["S2"]
xS3, yS3, wS3, _ = geom["S3"]
cxS = xS2 + wS2 / 2
edge([(cxS, yS2 + hS2), (xS3 + wS3 / 2, yS3)], "YA, setujui", cxS, yS2 + hS2 + 17, color="green")

# Label panah vertikal S1 -> S2 (panahnya sudah digambar rantai v())
xS1c, yS1c, wS1c, hS1c = geom["S1"]
out.append(f'<text x="{xS1c + wS1c / 2}" y="{yS1c + hS1c + 19}" text-anchor="middle" font-size="22" font-weight="600" fill="#0f172a" paint-order="stroke" stroke="#ffffff" stroke-width="6">ajukan</text>')

# S2 loop validasi: isi belum lengkap -> lengkapi dulu (merah, kanan kotak)
xS2r = xS2 + wS2
midS2 = yS2 + hS2 / 2
edge([(xS2r, midS2 - 32), (xS2r + 17, midS2 - 32), (xS2r + 17, midS2 + 32), (xS2r, midS2 + 32)], color="red")
out.append(f'<text x="{cxS + 170}" y="{yS2 + hS2 + 33}" text-anchor="middle" font-size="19" font-weight="600" fill="#dc2626" paint-order="stroke" stroke="#ffffff" stroke-width="6">isi kurang → lengkapi</text>')

# Koridor kiri kolom 4: tiga jalur paralel —
# merah=TIDAK S2->S4, hijau=selesai-langsung D2->D4, biru=revisi bus->S1
X_RED = trunkx - 13
X_ALT = trunkx
X_REV = trunkx + 13
xS2l = geom["S2"][0]
xS4, yS4, _wS4, hS4 = geom["S4"]
midS4 = yS4 + hS4 / 2
midS1 = yS1 + geom["S1"][3] / 2
edge([(xS2l, midS2), (X_RED, midS2), (X_RED, midS4), (xS4, midS4)], color="red")
vlabel(X_RED, midS2 + 115, "TIDAK, tolak + catatan")
xD2, yD2, wD2, hD2 = geom["D2"]
midD2 = yD2 + hD2 / 2
xD4e, yD4e, wD4e, hD4e = geom["D4"]
midD4 = yD4e + hD4e / 2
edge([(xD2 + wD2, midD2), (X_ALT, midD2), (X_ALT, midD4), (xD4e + wD4e, midD4)], color="green")
vlabel(X_ALT, midD4 - 95, "selesai langsung")
edge([(X_REV, BUS_Y), (X_REV, midS1), (xS1, midS1)],
     "revisi & ajukan ulang", (X_REV + COLXS[4] - GAP // 2) / 2 + 60, BUS_Y - 16, color="blue")

# Bus arsip bawah: D4 selesai -> A1, S3 terkirim -> A1
xD4, yD4, wD4, hD4 = geom["D4"]
cxD4 = xD4 + wD4 / 2
xA1, yA1, _wA1, hA1 = geom["A1"]
midA1 = yA1 + hA1 / 2
riserx = COLXS[4] - GAP // 2
edge([(cxD4, yD4 + hD4), (cxD4, BUS_Y), (riserx, BUS_Y), (riserx, midA1), (xA1, midA1)],
     "selesai → arsip", (cxD4 + trunkx) / 2, BUS_Y - 16)
xS3r = xS3 + wS3
midS3 = yS3 + geom["S3"][3] / 2
edge([(xS3r, midS3), (riserx, midS3)])
vlabel(riserx + 4, midS3 - 256, "terkirim → arsipkan")

# A1 -> A2 -> A3
for a, b in [("A1", "A2"), ("A2", "A3")]:
    xa, ya, wa, ha = geom[a]
    xb, yb, wb, _ = geom[b]
    edge([(xa + wa / 2, ya + ha), (xb + wb / 2, yb)])

# ---- Kaki ----
out.append(f'<line x1="40" y1="{FOOT_Y}" x2="{W - 40}" y2="{FOOT_Y}" stroke="#cbd5e1" stroke-width="2"/>')
out.append(f'<text x="40" y="{FOOT_Y + 42}" font-size="23" fill="#334155">Penomoran otomatis per tahun · File tersimpan di Dropbox · Soft delete, log aktivitas &amp; notifikasi WA tercatat sistem.</text>')
out.append(f'<text x="40" y="{FOOT_Y + 78}" font-size="23" fill="#334155">Status disposisi: baru → diproses → selesai · Status surat keluar: draft → menunggu persetujuan → terkirim / ditolak.</text>')
out.append(f'<text x="{W - 40}" y="{FOOT_Y + 42}" text-anchor="end" font-size="23" font-weight="700" fill="#0f172a">SIPERSA · SOP v1.0 · 7 September 2026</text>')
out.append(f'<text x="{W - 40}" y="{FOOT_Y + 78}" text-anchor="end" font-size="22" fill="#64748b">Sumber editable: docs/sop-alur-lengkap.mmd</text>')

out.append("</svg>")
(ROOT / "public" / "sop-alur-lengkap.svg").write_text("\n".join(out), encoding="utf-8")
print(f"OK svg {W}x{H} -> public/sop-alur-lengkap.svg")
