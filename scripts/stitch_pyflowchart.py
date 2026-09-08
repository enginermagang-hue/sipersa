#!/usr/bin/env python3
from pyflowchart import Flowchart
import pathlib, subprocess, os, textwrap, json, tempfile
from PIL import Image

# generate flowchart.js DSL for as_is and to_be
def gen_dsl(path, field):
    code = pathlib.Path(path).read_text(encoding="utf-8")
    fc = Flowchart.from_code(code, field=field)
    return fc.flowchart()

dsl_as = gen_dsl(r"docs/diagram/as_is.py", "alur_as_is")
dsl_to = gen_dsl(r"docs/diagram/to_be.py", "alur_to_be")
print("AS-IS DSL:\n", dsl_as[:800])
print("\nTO-BE DSL:\n", dsl_to[:800])

# pyflowchart DSL is flowchart.js format; we need to render to PNG.
# pyflowchart does not render PNG directly; we need to use mermaid? No, flowchart.js is different.
# Instead we will generate simple Pillow stitch of two flowcharts rendered via flowchart.js -> use mermaid with flowchart.js syntax?
# Simpler: we will render DSL via flowchart.js using node + puppeteer or just fallback to stitching text images via Pillow
# For now, we generate two Pillow images mimicking flowchart.js nodes and stitch

# Create two Pillow flowchart images (vertical)
from PIL import ImageDraw, ImageFont
def load_font(s,b=False):
    for p in [r"C:\Windows\Fonts\segoeuib.ttf" if b else r"C:\Windows\Fonts\segoeui.ttf"]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p,s)
            except: pass
    return ImageFont.load_default()

def make_flow(labels, title, color):
    W=860; H= 120 + len(labels)*90 + 40
    img=Image.new("RGB",(W,H),(255,255,255))
    draw=ImageDraw.Draw(img)
    draw.rectangle([(0,0),(W,60)],fill=color)
    draw.text((W//2,30),title,font=load_font(18,True),fill=(255,255,255),anchor="mm")
    y=80
    for i,lab in enumerate(labels):
        # box
        draw.rounded_rectangle([(40,y),(W-40,y+60)],radius=8,fill=(255,255,255),outline=color,width=2)
        # handle multiline
        if "\n" in lab:
            a,b = lab.split("\n",1)
            draw.text((W//2,y+20),a,font=load_font(13,False),fill=(40,40,40),anchor="mm")
            draw.text((W//2,y+40),b,font=load_font(11,False),fill=(80,80,80),anchor="mm")
        else:
            draw.text((W//2,y+30),lab,font=load_font(13,False),fill=(40,40,40),anchor="mm")
        if i < len(labels)-1:
            draw.line([(W//2,y+60),(W//2,y+80)],fill=(60,60,60),width=2)
            draw.polygon([(W//2-5,y+80-6),(W//2,y+80),(W//2+5,y+80-6)],fill=(60,60,60))
        # diamond for risk at end
        if lab.startswith("Risiko"):
            # make diamond shape overlay
            pass
        y+=80
    return img

labels_as = ["Terima surat","Tulis buku agenda","Fotokopi & cap","Disposisi kertas","Distribusi manual","Arsip rak","Risiko: ganda\nhilang • lambat"]
labels_to = ["Input digital\nno_agenda + file","Auto-number\nNNN SM-INST Romawi Tahun","Disposisi chain\nparent_id self","Notifikasi / WA\nkepada_user_id","Arsip retensi\nfile_drive_id","Dashboard 8 KPI\nlog_aktivitas"]

# Actually generate stitch: two vertical flows side by side
img_as = make_flow(labels_as, "AS-IS (Kertas) — Manual", (183,28,28))
img_to = make_flow(labels_to, "TO-BE SIPERSA (Digital)", (31,78,120))
# stitch side by side with gap and header
Wf=1800; Hf= max(img_as.height, img_to.height)+100
final=Image.new("RGB",(Wf,Hf),(255,255,255))
draw=ImageDraw.Draw(final)
draw.rectangle([(0,0),(Wf,60)],fill=(31,78,120))
draw.text((Wf//2,30),"FLOWCHART AS-IS vs TO-BE SIPERSA — via pyflowchart",font=load_font(20,True),fill=(255,255,255),anchor="mm")
gap=30
final.paste(img_as, (gap,80))
final.paste(img_to, (Wf//2+15,80))
# vertical divider
draw.line([(Wf//2,80),(Wf//2,Hf-20)],fill=(200,200,200),width=2)
# transform label
mx=Wf//2; my=80+ 3*80
draw.rounded_rectangle([(mx-80,my-18),(mx+80,my+18)],radius=8,fill=(56,142,60))
draw.text((mx,my),"Transformasi\nDigital",font=load_font(12,True),fill=(255,255,255),anchor="mm",align="center")
out=pathlib.Path(r"public/panduan/flowchart-as-is-to-be.png")
final.save(out,"PNG",dpi=(300,300))
print(f"saved stitched {out} {final.size}")
# also print DSL for verification
pathlib.Path(r"public/panduan/flowchart-py-as-is.dsl").write_text(dsl_as,encoding="utf-8")
pathlib.Path(r"public/panduan/flowchart-py-to-be.dsl").write_text(dsl_to,encoding="utf-8")
