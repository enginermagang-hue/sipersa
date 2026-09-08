#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import pathlib, os
W,H=1800,950
BLUE=(31,78,120)
GREEN=(46,125,50)
ORANGE=(239,108,0)
BG=(255,255,255)
LIGHT_BLUE=(232,240,248)
LIGHT_GREEN=(232,245,232)
LIGHT_ORANGE=(255,243,224)
out=pathlib.Path(r"D:\Project\sipersa\public\panduan\flowchart-as-is-to-be.png")
img=Image.new("RGB",(W,H),BG)
draw=ImageDraw.Draw(img)
def load_font(s,b=False):
    for p in [r"C:\Windows\Fonts\segoeuib.ttf" if b else r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arialbd.ttf" if b else r"C:\Windows\Fonts\arial.ttf"]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p,s)
            except: pass
    return ImageFont.load_default()
f_title=load_font(26,True)
f_sub=load_font(14,False)
f_col_title=load_font(18,True)
f_box=load_font(13,False)
f_box_b=load_font(13,True)
f_entity=load_font(11,False)
# header
draw.rectangle([(0,0),(W,80)],fill=BLUE)
draw.text((W//2,28),"FLOWCHART LENGKAP SIPERSA — Peran • Hak Akses • Entity • Alur",font=f_title,fill=(255,255,255),anchor="mm")
draw.text((W//2,58),"Gambar 4.T2 • kolom kunci • Nuxt 4 + Nitro + Turso + Dropbox",font=f_sub,fill=(210,220,235),anchor="mm")
gap=20
top=100
col_w=(W-gap*4)//3
col_h=H-top-90
cols=[
    ("ADMIN", "Hak: full", BLUE, LIGHT_BLUE, [
        ("Login\nsid httpOnly", "users, sessions"),
        ("Kelola User\nbadge role/status", "users: role, status"),
        ("Kelola Klasifikasi\n4 default retensi 10th", "klasifikasi: kode, retensi"),
        ("Kelola Sesi & Log\nIP / revoke / audit", "sessions, activity_log"),
        ("Restore / Pemusnahan\nArsip kadaluarsa", "arsip: deleted_at"),
        ("Laporan & Export\nExcelJS / jspdf", "—"),
    ]),
    ("STAFF", "Hak: operasional", GREEN, LIGHT_GREEN, [
        ("Login", "users"),
        ("Dashboard 8 KPI\ntrend 12 bln", "—"),
        ("Surat Masuk\n+ file → Dropbox", "surat_masuk: no_agenda, klasifikasi_id FK"),
        ("Surat Keluar\najukan → approval", "surat_keluar: status, file_drive_id"),
        ("Disposisi Inbox\nbaru→diproses→selesai", "disposisi: parent_id self, status"),
        ("Arsip Aktif\nTambah / Hapus", "arsip: ref_masuk_id FK"),
    ]),
    ("PIMPINAN", "Hak: approval", ORANGE, LIGHT_ORANGE, [
        ("Login", "users"),
        ("Dashboard\nApproval Queue", "—"),
        ("Kelola Disposisi\nsemua disposisi", "disposisi: kepada_user_id FK"),
        ("Approval Surat Keluar\napproved_at/by", "surat_keluar: approved_by FK"),
        ("Selesaikan Disposisi\nselesai_at", "disposisi: selesai_at"),
        ("Monitoring\nBatas Waktu", "—"),
    ]),
]
# draw swimlanes
for idx,(title, hak, col, light, steps) in enumerate(cols):
    x=gap + idx*(col_w+gap)
    y=top
    draw.rounded_rectangle([int(x),int(y),int(x+col_w),int(y+col_h)],radius=12,fill=light,outline=col,width=2)
    # column header
    draw.rounded_rectangle([int(x),int(y),int(x+col_w),int(y+44)],radius=12,fill=col)
    draw.rectangle([(x,y+22),(x+col_w,y+44)],fill=col)
    draw.text((x+col_w//2,y+16),title,font=f_col_title,fill=(255,255,255),anchor="mm")
    draw.text((x+col_w//2,y+32),hak,font=load_font(11,False),fill=(255,255,200),anchor="mm")
    # steps
    box_w=col_w-30
    box_h=62
    step_gap=18
    start_y=y+56
    for i,(txt, ent) in enumerate(steps):
        bx=x+15
        by=start_y+i*(box_h+step_gap)
        draw.rounded_rectangle([(bx,by),(bx+box_w,by+box_h)],radius=8,fill=(255,255,255),outline=col,width=2)
        # text centered, entity small below
        # split txt by \n
        lines=txt.split("\n")
        # draw txt lines
        ly=by+14 if ent else by+box_h//2+2
        for line in lines:
            is_bold = (idx==0 and i==0) or ("Dashboard" in line)
            font = f_box_b if is_bold and len(lines)==1 else f_box
            draw.text((bx+box_w//2,ly),line,font=font,fill=(40,40,40),anchor="mm")
            ly+=16
        if ent and ent!="—":
            draw.text((bx+box_w//2,by+box_h-10),ent,font=f_entity,fill=(90,90,90),anchor="mm")
        if i<len(steps)-1:
            # arrow
            ax=bx+box_w//2
            y1=by+box_h
            y2=y1+step_gap
            draw.line([(ax,y1),(ax,y2)],fill=(60,60,60),width=2)
            draw.polygon([(ax-5,y2-6),(ax,y2),(ax+5,y2-6)],fill=(60,60,60))
# bottom flow arrow across columns: after login, dashed connections
# draw central flow labels between columns at mid height
# add entity legend bottom
legend_y=H-62
draw.rounded_rectangle([(gap,legend_y),(W-gap,legend_y+44)],radius=8,fill=(248,248,248),outline=(200,200,200),width=1)
draw.text((W//2,legend_y+14),"Entity kolom kunci: users(PK) • surat_masuk(klasifikasi_id FK) • disposisi(parent_id self) • arsip(ref_masuk_id FK) • klasifikasi • sessions • activity_log",font=load_font(12,False),fill=(60,60,60),anchor="mm")
draw.text((W//2,legend_y+30),"Alur: Input → auto-number NNN/SM-INST/Romawi/Thn → disposisi chain → notifikasi/WA → arsip retensi → dashboard/log  •  Soft delete deleted_at IS NULL",font=load_font(11,False),fill=(90,90,90),anchor="mm")
# border
draw.rounded_rectangle([(2,2),(W-2,H-2)],radius=12,outline=(200,200,200),width=2)
img.save(out,"PNG",dpi=(300,300))
print(f"saved {out} {W}x{H}")
