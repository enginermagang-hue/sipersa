#!/usr/bin/env python3
"""Generator Laporan Aktualisasi SIPERSA — Nuxt 4 + Nitro + Turso/SQLite + Dropbox
- Justified paragraphs, tabel identitas borderless, TOC tab leader dot + right-aligned page numbers
- Stack diselaraskan ke SIPERSA aktual (Nuxt 4), dengan catatan harmonisasi Laravel->Nuxt
- Tambahan: Lembar Pengesahan, Daftar Tabel/Gambar, BerAKHLAK, Smart ASN, Struktur Org, Arsitektur
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

doc = Document()

for section in doc.sections:
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(3)
    section.right_margin = Cm(3)
    section.header_distance = Cm(1.25)
    section.footer_distance = Cm(1.25)

style = doc.styles['Normal']
style.font.name = 'Times New Roman'
style.font.size = Pt(12)
style.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
pf = style.paragraph_format
pf.space_after = Pt(6)
pf.space_before = Pt(0)
pf.line_spacing = 1.5
pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
# widows/orphans control via XML later

# Heading styles font
for lvl in range(1,4):
    try:
        hs = doc.styles[f'Heading {lvl}']
        hs.font.name = 'Times New Roman'
        hs.font.color.rgb = RGBColor(0x00,0x00,0x00)
        hs.font.size = Pt(14)
        hs.font.bold = True
        hs.paragraph_format.space_after = Pt(6)
        hs.paragraph_format.space_before = Pt(12)
        hs.paragraph_format.line_spacing = 1.5
    except: pass
try:
    ts = doc.styles['Title']
    ts.font.name = 'Times New Roman'
    ts.font.size = Pt(14)
    ts.font.bold = True
    ts.font.color.rgb = RGBColor(0x00,0x00,0x00)
    ts.paragraph_format.space_after = Pt(6)
    ts.paragraph_format.line_spacing = 1.5
except: pass

# helpers

def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = tcPr.first_child_found_in("w:tcBorders")
    if tcBorders is None:
        tcBorders = OxmlElement('w:tcBorders')
        tcPr.append(tcBorders)
    for edge in ('top','left','bottom','right','insideH','insideV'):
        edge_data = kwargs.get(edge)
        if edge_data is None:
            continue
        tag = f'w:{edge}'
        el = tcBorders.find(qn(tag))
        if el is None:
            el = OxmlElement(tag)
            tcBorders.append(el)
        for k,v in edge_data.items():
            el.set(qn(k), v)

def hide_table_borders(table):
    for row in table.rows:
        for cell in row.cells:
            set_cell_border(cell, top={'w:val':'nil','w:sz':'0','w:space':'0','w:color':'auto'},
                                   left={'w:val':'nil','w:sz':'0','w:space':'0','w:color':'auto'},
                                   bottom={'w:val':'nil','w:sz':'0','w:space':'0','w:color':'auto'},
                                   right={'w:val':'nil','w:sz':'0','w:space':'0','w:color':'auto'})

def add_para(text, bold=False, italic=False, align=WD_ALIGN_PARAGRAPH.JUSTIFY, size=12, space_after=6, space_before=0, indent_first=False, left_indent=None):
    p = doc.add_paragraph()
    p.alignment = align
    pf = p.paragraph_format
    pf.space_after = Pt(space_after)
    pf.space_before = Pt(space_before)
    pf.line_spacing = 1.5
    if left_indent is not None:
        pf.left_indent = Cm(left_indent)
    if indent_first:
        pf.first_line_indent = Cm(1.0)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    return p

def add_centered(text, size=12, bold=False, italic=False, space_after=6):
    return add_para(text, bold=bold, italic=italic, align=WD_ALIGN_PARAGRAPH.CENTER, size=size, space_after=space_after)

def add_heading_custom(text, level=1):
    h = doc.add_heading(text, level=level)
    h.alignment = WD_ALIGN_PARAGRAPH.LEFT if level>1 else WD_ALIGN_PARAGRAPH.CENTER
    for run in h.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)
        run.bold = True
    pf = h.paragraph_format
    pf.line_spacing = 1.5
    pf.space_after = Pt(6)
    pf.space_before = Pt(12)
    return h

def add_heading_center(text, level=1):
    h = doc.add_heading(text, level=level)
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in h.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)
        run.bold = True
    pf = h.paragraph_format
    pf.line_spacing = 1.5
    pf.space_after = Pt(6)
    pf.space_before = Pt(12)
    return h

def add_table_with_data(headers, rows, col_widths=None, font_size=12, header_bg="1F4E78"):
    table = doc.add_table(rows=1+len(rows), cols=len(headers))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    if col_widths:
        for i,w in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Cm(w)
    # header
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        cell.text = ''
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(header)
        run.bold = True
        run.font.size = Pt(font_size)
        run.font.name = 'Times New Roman'
        run.font.color.rgb = RGBColor(0xFF,0xFF,0xFF)
        shd = OxmlElement('w:shd')
        shd.set(qn('w:fill'), header_bg)
        shd.set(qn('w:val'), 'clear')
        cell._tc.get_or_add_tcPr().append(shd)
    for r,row in enumerate(rows):
        for c,val in enumerate(row):
            cell = table.rows[r+1].cells[c]
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            cell.text = ''
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c==0 else WD_ALIGN_PARAGRAPH.LEFT
            # wrap long text justify left
            run = p.add_run(str(val))
            run.font.size = Pt(font_size)
            run.font.name = 'Times New Roman'
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.space_before = Pt(2)
    doc.add_paragraph().paragraph_format.space_after = Pt(6)
    return table

def add_identitas_table(rows, col_widths=(4.5,0.6,10)):
    """rows: list of (label, value) -> 3-col borderless table label : value"""
    table = doc.add_table(rows=len(rows), cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.autofit = False
    # set widths
    for r in table.rows:
        r.cells[0].width = Cm(col_widths[0])
        r.cells[1].width = Cm(col_widths[1])
        r.cells[2].width = Cm(col_widths[2])
    hide_table_borders(table)
    for i,(label,val) in enumerate(rows):
        c0 = table.rows[i].cells[0]
        c1 = table.rows[i].cells[1]
        c2 = table.rows[i].cells[2]
        for c,txt in [(c0,label),(c1,':'),(c2,val)]:
            c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = c.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.space_before = Pt(1)
            run = p.add_run(txt)
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            if c is c0:
                run.bold = False
        # bold label? keep normal
    # spacing after table
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    return table

def add_toc_entry(left, page, bold=False, indent_cm=0):
    """One TOC line with dot leader and right-aligned page number via tab stop"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = p.paragraph_format
    pf.space_after = Pt(2)
    pf.space_before = Pt(0)
    pf.left_indent = Cm(indent_cm)
    # line spacing single for TOC
    pf.line_spacing = 1.5
    # add right tab with dot leader at ~15.5 cm (right margin)
    pPr = p._p.get_or_add_pPr()
    tabs = OxmlElement('w:tabs')
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'), 'right')
    tab.set(qn('w:leader'), 'dot')
    tab.set(qn('w:pos'), '9350')  # twips ~16.3cm
    tabs.append(tab)
    pPr.append(tabs)
    r1 = p.add_run(left)
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(12)
    r1.bold = bold
    p.add_run('\t')
    r2 = p.add_run(str(page))
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(12)
    r2.bold = bold
    return p

def add_bullet(text, level=0):
    p = doc.add_paragraph(style='List Bullet')
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.left_indent = Cm(1.2 + level*0.6)
    p.paragraph_format.first_line_indent = Cm(-0.6)
    # clear default run and add custom
    # style already adds bullet; replace text
    if p.text:
        p.clear()
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    return p

def add_numbered(text, num="1."):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.left_indent = Cm(1.2)
    p.paragraph_format.first_line_indent = Cm(-0.6)
    run = p.add_run(f"{num}  {text}")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    return p

# --- Footer helpers: PAGE kanan bawah + teks SIPERSA kiri (opsi A) ---
def _ensure_pgNumType(section, fmt=None, start=None):
    sectPr = section._sectPr
    pgNumType = sectPr.find(qn('w:pgNumType'))
    if pgNumType is None:
        pgNumType = OxmlElement('w:pgNumType')
        sectPr.append(pgNumType)
    if fmt:
        pgNumType.set(qn('w:fmt'), fmt)  # lowerRoman / decimal
    else:
        if qn('w:fmt') in pgNumType.attrib:
            del pgNumType.attrib[qn('w:fmt')]
    if start is not None:
        pgNumType.set(qn('w:start'), str(start))
    elif qn('w:start') in pgNumType.attrib:
        del pgNumType.attrib[qn('w:start')]

def _add_page_field(run):
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    run._r.append(fldChar1)
    instr = OxmlElement('w:instrText')
    instr.set(qn('xml:space'), 'preserve')
    instr.text = ' PAGE '
    run._r.append(instr)
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')
    run._r.append(fldChar2)
    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')
    run._r.append(fldChar3)

def configure_footer(section, left_text=None, fmt='decimal', start=None):
    """Footer kanan bawah: left_text (kiri) + PAGE (kanan via tab right). fmt: lowerRoman/decimal/None."""
    footer = section.footer
    footer.is_linked_to_previous = False
    # clear existing footer paras
    # keep first para, clear rest
    while len(footer.paragraphs) > 1:
        p = footer.paragraphs[-1]
        pPr = p._p.getparent()
        if pPr is not None:
            pPr.remove(p._p)
    p = footer.paragraphs[0]
    p.clear()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = p.paragraph_format
    pf.space_after = Pt(0)
    pf.space_before = Pt(0)
    pf.line_spacing = 1.0
    # tab stop right 16cm for PAGE on right
    pPr = p._p.get_or_add_pPr()
    existing = pPr.find(qn('w:tabs'))
    if existing is not None:
        pPr.remove(existing)
    tabs = OxmlElement('w:tabs')
    tab = OxmlElement('w:tab')
    tab.set(qn('w:val'), 'right')
    tab.set(qn('w:leader'), 'none')
    tab.set(qn('w:pos'), '9350')
    tabs.append(tab)
    pPr.append(tabs)
    _ensure_pgNumType(section, fmt=fmt, start=start)
    if left_text:
        r = p.add_run(left_text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(9)
        r.italic = True
        r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
        p.add_run('\t')
    else:
        # push PAGE to right even without left text: need leading tab
        p.add_run('\t')
    r = p.add_run()
    r.font.name = 'Times New Roman'
    r.font.size = Pt(9)
    r.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    _add_page_field(r)
    return p

def configure_section_margins(section):
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(3)
    section.right_margin = Cm(3)
    section.header_distance = Cm(1.25)
    section.footer_distance = Cm(1.25)

# ============================================================
# COVER
# ============================================================
for _ in range(3):
    doc.add_paragraph().paragraph_format.space_after = Pt(0)

add_centered('LAPORAN AKTUALISASI', size=14, bold=True, space_after=4)
add_centered('PELATIHAN DASAR CALON PEGAWAI NEGERI SIPIL', size=12, bold=True, space_after=2)
add_centered('GOLONGAN III  ANGKATAN 320  TAHUN 2026', size=12, bold=False, space_after=12)

# Logo Pemprov NTT
logo_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'ntt.png')
try:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(14)
    p.paragraph_format.space_before = Pt(6)
    run = p.add_run()
    # 95x100 px ~ 3.0cm wide looks balanced on A4
    run.add_picture(logo_path, width=Cm(3.2))
except Exception:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('[ LOGO PEMPROV NTT ]')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.italic = True
    run.font.color.rgb = RGBColor(0x66,0x66,0x66)
    p.paragraph_format.space_after = Pt(14)

add_centered('SIPERSA', size=14, bold=True, space_after=2)
add_centered('SISTEM INFORMASI PERSURATAN DAN ARSIP DIGITAL', size=12, bold=True, space_after=2)
add_centered('OPTIMALISASI PENGELOLAAN PERSURATAN DAN DISPOSISI', size=12, bold=True, space_after=2)
add_centered('DIGITAL BERBASIS WEB PADA UPTD TEKKOMDIK', size=12, bold=True, space_after=2)
add_centered('DINAS PENDIDIKAN DAN KEBUDAYAAN', size=12, bold=False, space_after=1)
add_centered('PROVINSI NUSA TENGGARA TIMUR', size=12, bold=False, space_after=18)

add_para('Disusun sebagai syarat kelulusan Pelatihan Dasar CPNS Golongan III', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=2)
add_para('Stack Implementasi: Nuxt 4 (Vue 3 + TypeScript) + Nitro + Turso/SQLite + Dropbox', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=18)

add_identitas_table([
    ('Nama', 'NOURBETH ANDRI YUSUF MAGA, S.Kom'),
    ('NIP', '199211252025061001'),
    ('Angkatan', '320  —  Nomor Presensi 06'),
    ('Jabatan', 'Pranata Komputer Ahli Pertama'),
    ('Unit Kerja', 'UPTD Tekkomdik — Dinas Pendidikan dan Kebudayaan Prov. NTT'),
])

add_centered('BADAN KEPEGAWAIAN DAN PENGEMBANGAN SUMBER DAYA MANUSIA', size=12, bold=True, space_after=1)
add_centered('PROVINSI NUSA TENGGARA TIMUR', size=12, bold=True, space_after=1)
add_centered('KUPANG — 2026', size=12, bold=True)

# --- Section break: cover (tanpa nomor) -> front matter (Romawi i-vii) ---
cover_sect = doc.sections[0]
cover_sect.footer.is_linked_to_previous = False
# kosongkan footer cover (no PAGE)
try:
    p_cov = cover_sect.footer.paragraphs[0]
    p_cov.clear()
    p_cov.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    # pgNumType tanpa fmt agar tidak bernomor
    _ensure_pgNumType(cover_sect, fmt=None, start=None)
except Exception:
    pass
front_sect = doc.add_section(WD_SECTION.NEW_PAGE)
configure_section_margins(front_sect)
configure_footer(front_sect, left_text=None, fmt='lowerRoman', start=1)

# ============================================================
# LEMBAR PERSETUJUAN
# ============================================================
add_heading_center('LEMBAR PERSETUJUAN', level=1)
add_para('Yang bertanda tangan di bawah ini:', space_after=8)

add_para('Coach / Pembimbing:', bold=True, size=12, space_after=2)
add_identitas_table([
    ('Nama', 'Nurul Khasanah, SE, MM'),
    ('NIP', '198412102009032010'),
    ('Pangkat/Gol.', 'Penata / IIIc'),
    ('Jabatan', 'Widyaswara Ahli Muda'),
])
add_para('Mentor:', bold=True, size=12, space_after=2)
add_identitas_table([
    ('Nama', 'Martina Hartini Bere, SE., M.M'),
    ('NIP', '197806022010012009'),
    ('Pangkat/Gol.', 'Pembina / IVa'),
    ('Jabatan', 'Kepala UPTD Tekkomdik Dinas P&K Prov. NTT'),
])
add_para('Peserta Latsar CPNS:', bold=True, size=12, space_after=2)
add_identitas_table([
    ('Nama', 'Nourbeth Andri Yusuf Maga, S.Kom'),
    ('NIP', '199211252025061001'),
    ('Pangkat/Gol.', 'Penata Muda / IIIa'),
    ('Jabatan', 'Pranata Komputer Ahli Pertama'),
    ('Unit Kerja', 'UPTD Tekkomdik Dinas Pendidikan dan Kebudayaan Prov. NTT'),
])
add_para('Telah menyetujui Rancangan Aktualisasi dengan judul dan kegiatan sebagai berikut:', space_after=6)
add_table_with_data(
    ['No', 'Judul Aktualisasi', 'Kegiatan Aktualisasi (8 Tahap)'],
    [['1', 'Optimalisasi Pengelolaan Persuratan dan Disposisi Digital Berbasis Web pada UPTD Tekkomdik Dinas Pendidikan dan Kebudayaan Prov. NTT (SIPERSA — Nuxt 4 + Nitro)',
       '1. Konsultasi Rancangan Aktualisasi dengan Mentor\n2. Analisis Proses Bisnis Persuratan & Disposisi\n3. Perancangan Sistem & Basis Data (Nuxt 4 + Nitro + Turso/SQLite + Zod)\n4. Pengembangan Aplikasi SIPERSA (Surat Masuk/Keluar, Disposisi, Arsip, Dashboard)\n5. Penyusunan User Manual & Draft SOP Persuratan Digital\n6. Uji Coba & Penyempurnaan Aplikasi\n7. Sosialisasi & Pendampingan Pegawai UPTD\n8. Monitoring, Evaluasi & Penyusunan Laporan']],
    col_widths=[1.2,6.5,8.5], font_size=12
)
add_para('Demikian persetujuan ini dibuat untuk dipergunakan sebagaimana mestinya.', space_after=12)
add_para('Kupang, Juni 2026', space_after=18)

# tanda tangan 2 kolom via tabel borderless
tbl = doc.add_table(rows=2, cols=2)
tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
hide_table_borders(tbl)
tbl.rows[0].cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
r = tbl.rows[0].cells[0].paragraphs[0].add_run('Pembimbing / Coach,')
r.font.name='Times New Roman'; r.font.size=Pt(12)
tbl.rows[0].cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
r = tbl.rows[0].cells[1].paragraphs[0].add_run('Mentor,')
r.font.name='Times New Roman'; r.font.size=Pt(12)
tbl.rows[1].cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
tbl.rows[1].cells[0].paragraphs[0].paragraph_format.space_before = Pt(36)
r = tbl.rows[1].cells[0].paragraphs[0].add_run('( Nurul Khasanah, SE, MM )')
r.font.name='Times New Roman'; r.font.size=Pt(12); r.bold=True
tbl.rows[1].cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
tbl.rows[1].cells[1].paragraphs[0].paragraph_format.space_before = Pt(36)
r = tbl.rows[1].cells[1].paragraphs[0].add_run('( Martina Hartini Bere, SE., M.M )')
r.font.name='Times New Roman'; r.font.size=Pt(12); r.bold=True

doc.add_page_break()

# ============================================================
# LEMBAR PENGESAHAN
# ============================================================
add_heading_center('LEMBAR PENGESAHAN', level=1)
add_para('Laporan Aktualisasi dengan judul “Optimalisasi Pengelolaan Persuratan dan Disposisi Digital Berbasis Web pada UPTD Tekkomdik Dinas Pendidikan dan Kebudayaan Provinsi Nusa Tenggara Timur (SIPERSA)” yang disusun oleh:', space_after=6)
add_identitas_table([
    ('Nama', 'Nourbeth Andri Yusuf Maga, S.Kom'),
    ('NIP', '199211252025061001'),
    ('Jabatan', 'Pranata Komputer Ahli Pertama'),
    ('Unit Kerja', 'UPTD Tekkomdik Dinas P&K Prov. NTT'),
    ('Judul', 'SIPERSA — Optimalisasi Persuratan & Disposisi Digital Berbasis Web (Nuxt 4 + Nitro)'),
])
add_para('Telah diseminarkan dan dinyatakan LULUS pada Seminar Aktualisasi Pelatihan Dasar CPNS Golongan III Angkatan 320 Tahun 2026.', space_after=12)
add_para('Kupang, ................. 2026', space_after=18)
# pengesahan 3 kolom
tbl = doc.add_table(rows=2, cols=3)
hide_table_borders(tbl)
headers = ['Coach', 'Mentor', 'Penguji']
for i,h in enumerate(headers):
    tbl.rows[0].cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = tbl.rows[0].cells[i].paragraphs[0].add_run(h)
    r.font.name='Times New Roman'; r.font.size=Pt(12); r.bold=True
names = ['( Nurul Khasanah, SE, MM )','( Martina Hartini Bere, SE., M.M )','( ............................ )']
for i,n in enumerate(names):
    tbl.rows[1].cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    tbl.rows[1].cells[i].paragraphs[0].paragraph_format.space_before = Pt(36)
    r = tbl.rows[1].cells[i].paragraphs[0].add_run(n)
    r.font.name='Times New Roman'; r.font.size=Pt(12)
add_para('Mengetahui,', align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, space_before=18, space_after=24)
add_para('( Plt. Kepala BKPSDM Prov. NTT )', align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12)
add_para('FLAFIANUS DUA, S.Fil., M.M.', align=WD_ALIGN_PARAGRAPH.CENTER, size=12)

doc.add_page_break()

# ============================================================
# KATA PENGANTAR
# ============================================================
add_heading_center('KATA PENGANTAR', level=1)
add_para('Segala puji dan syukur penulis panjatkan ke hadirat Tuhan Yang Maha Esa atas limpahan rahmat dan karunia-Nya sehingga Laporan Aktualisasi berjudul “Optimalisasi Pengelolaan Persuratan dan Disposisi Digital Berbasis Web pada UPTD Tekkomdik Dinas Pendidikan dan Kebudayaan Provinsi Nusa Tenggara Timur (SIPERSA)” dapat diselesaikan tepat waktu. Laporan ini disusun sebagai salah satu syarat kelulusan Pelatihan Dasar Calon Pegawai Negeri Sipil Golongan III Angkatan 320 Tahun 2026.', indent_first=True)
add_para('Pelaksanaan aktualisasi merupakan bagian dari pembentukan ASN yang profesional, berintegritas, adaptif, dan berorientasi pada pelayanan publik. Melalui aktualisasi ini penulis belajar mengidentifikasi masalah nyata di unit kerja, merumuskan gagasan inovatif berbasis teknologi, serta mengimplementasikan nilai-nilai dasar ASN BerAKHLAK dalam tugas Pranata Komputer Ahli Pertama. Inovasi SIPERSA dibangun dengan stack modern Nuxt 4 (Vue 3 + TypeScript) + Nitro di sisi server, Turso/SQLite sebagai basis data, Dropbox sebagai penyimpanan file, serta validasi Zod — menggantikan proses manual buku agenda dan lembar disposisi kertas menjadi alur digital yang terintegrasi, teraudit, dan paperless.', indent_first=True)
add_para('Pada kesempatan ini penulis menyampaikan terima kasih kepada:', space_after=4)
add_numbered('Bapak FLAFIANUS DUA, S.Fil., M.M. selaku Plt. Kepala BKPSDM Provinsi NTT atas kesempatan dan fasilitasi Latsar CPNS.', "1.")
add_numbered('Ibu MARTINA HARTINI BERE, SE., M.M. selaku Kepala UPTD Tekkomdik Dinas P&K Prov. NTT sekaligus Mentor yang memberikan dukungan, motivasi, dan kepercayaan dalam pengembangan SIPERSA.', "2.")
add_numbered('Ibu NURUL KHASANAH, SE., MM. selaku Coach yang memberikan arahan dan masukan substansial dalam penyusunan laporan.', "3.")
add_numbered('Seluruh pejabat dan rekan pegawai UPTD Tekkomdik atas data, informasi, dan kerja sama selama aktualisasi.', "4.")
add_numbered('Rekan CPNS Angkatan 320 serta keluarga tercinta atas doa dan dukungan moral.', "5.")
add_para('Penulis menyadari laporan ini masih jauh dari sempurna, sehingga kritik dan saran membangun sangat diharapkan.', indent_first=True)
add_para('Akhir kata, semoga laporan ini bermanfaat bagi transformasi digital tata kelola persuratan di UPTD Tekkomdik serta menjadi kontribusi nyata bagi peningkatan efektivitas, efisiensi, transparansi, dan akuntabilitas pelayanan administrasi melalui SIPERSA.', indent_first=True)
add_para('Kupang, ................. 2026', space_before=12, space_after=0)
add_para('Penulis,', space_after=18)
add_para('NOURBETH ANDRI YUSUF MAGA, S.Kom', bold=True, space_after=1)
add_para('NIP. 199211252025061001', space_after=0)

doc.add_page_break()

# ============================================================
# DAFTAR ISI — dengan tab leader dot + halaman rata kanan
# ============================================================
add_heading_center('DAFTAR ISI', level=1)
add_toc_entry('HALAMAN JUDUL', 'i', bold=True)
add_toc_entry('LEMBAR PERSETUJUAN', 'ii', bold=True)
add_toc_entry('LEMBAR PENGESAHAN', 'iii', bold=True)
add_toc_entry('KATA PENGANTAR', 'iv', bold=True)
add_toc_entry('DAFTAR ISI', 'v', bold=True)
add_toc_entry('DAFTAR TABEL', 'vi', bold=True)
add_toc_entry('DAFTAR GAMBAR', 'vii', bold=True)
add_toc_entry('BAB I  PENDAHULUAN', '1', bold=True)
add_toc_entry('1.1  Latar Belakang', '1', indent_cm=0.6)
add_toc_entry('1.2  Unit Kerja', '3', indent_cm=0.6)
add_toc_entry('1.3  Identifikasi Isu', '4', indent_cm=0.6)
add_toc_entry('1.4  Isu Prioritas (Core Issue) & Analisis APKL', '5', indent_cm=0.6)
add_toc_entry('1.5  Tujuan Aktualisasi', '6', indent_cm=0.6)
add_toc_entry('1.6  Manfaat Aktualisasi', '7', indent_cm=0.6)
add_toc_entry('1.7  Nilai Dasar ASN BerAKHLAK', '8', indent_cm=0.6)
add_toc_entry('1.8  Smart ASN & Transformasi Digital', '9', indent_cm=0.6)
add_toc_entry('1.9  Ruang Lingkup Kegiatan', '10', indent_cm=0.6)
add_toc_entry('BAB II  DESKRIPSI ORGANISASI', '11', bold=True)
add_toc_entry('2.1  Visi & Misi Pemerintah Provinsi NTT', '11', indent_cm=0.6)
add_toc_entry('2.2  Tugas dan Fungsi UPTD Tekkomdik', '11', indent_cm=0.6)
add_toc_entry('2.3  Struktur Organisasi UPTD Tekkomdik', '12', indent_cm=0.6)
add_toc_entry('2.4  Uraian Tugas Peserta (Pranata Komputer Ahli Pertama)', '13', indent_cm=0.6)
add_toc_entry('BAB III  RANCANGAN AKTUALISASI', '18', bold=True)
add_toc_entry('3.1  Gagasan Pemecahan Isu — SIPERSA', '18', indent_cm=0.6)
add_toc_entry('3.2  Arsitektur & Stack Teknologi (Nuxt 4 + Nitro)', '19', indent_cm=0.6)
add_toc_entry('3.3  Desain Basis Data & Penomoran Surat', '20', indent_cm=0.6)
add_toc_entry('3.4  Rancangan Fitur & Antarmuka per Peran', '21', indent_cm=0.6)
add_toc_entry('3.5  Analisis Stakeholder (RACI)', '22', indent_cm=0.6)
add_toc_entry('3.6  Rancangan Kegiatan Aktualisasi (8 Tahap)', '23', indent_cm=0.6)
add_toc_entry('3.7  Jadwal Pelaksanaan', '24', indent_cm=0.6)
add_toc_entry('BAB IV  HASIL AKTUALISASI', '25', bold=True)
add_toc_entry('4.1  Pelaksanaan Kegiatan Aktualisasi', '25', indent_cm=0.6)
add_toc_entry('4.2  Deskripsi Hasil per Tahap (8 Tahap)', '27', indent_cm=0.6)
add_toc_entry('4.3  Tantangan dan Solusi', '34', indent_cm=0.6)
add_toc_entry('BAB V  KESIMPULAN DAN SARAN', '36', bold=True)
add_toc_entry('5.1  Kesimpulan', '36', indent_cm=0.6)
add_toc_entry('5.2  Saran', '37', indent_cm=0.6)
add_toc_entry('DAFTAR PUSTAKA', '39', bold=True)
add_toc_entry('LAMPIRAN', '40', bold=True)

# DAFTAR TABEL
add_heading_center('DAFTAR TABEL', level=1)
add_toc_entry('Tabel 1.1  Identifikasi 3 Isu Strategis UPTD Tekkomdik', '4')
add_toc_entry('Tabel 1.2  Analisis APKL (Aktual, Problematik, Kekhalayakan, Kelayakan)', '5')
add_toc_entry('Tabel 1.3  Deskripsi Isu Prioritas per Kriteria APKL', '5')
add_toc_entry('Tabel 2.1  RACI Stakeholder SIPERSA', '22')
add_toc_entry('Tabel 3.1  Matriks Rancangan Kegiatan 8 Tahap (Output & Nilai BerAKHLAK)', '23')
add_toc_entry('Tabel 3.2  Jadwal Pelaksanaan Aktualisasi (30 Hari Habituasi)', '24')
add_toc_entry('Tabel 4.1  Rekap Capaian per Tahap', '27')

# DAFTAR GAMBAR
add_heading_center('DAFTAR GAMBAR', level=1)
add_toc_entry('Gambar 2.1  Struktur Organisasi UPTD Tekkomdik', '12')
add_toc_entry('Gambar 3.1  Arsitektur SIPERSA (Nuxt 4 + Nitro + Turso + Dropbox)', '19')
add_toc_entry('Gambar 3.2  Entity Relationship Diagram SIPERSA', '20')
add_toc_entry('Gambar 3.3  Alur Penomoran Surat Masuk/Keluar Otomatis per Tahun', '21')
add_toc_entry('Gambar 4.1  Dashboard SIPERSA — 8 KPI & Grafik Trend 12 Bulan', '28')
add_toc_entry('Gambar 4.2  Daftar Surat Masuk + Filter & Pagination', '29')
add_toc_entry('Gambar 4.3  Detail Surat & Timeline Disposisi', '30')
add_toc_entry('Gambar 4.4  Arsip — KPI Retensi & Aksi Restore/Pemusnahan', '31')

# --- Section break: front matter (Romawi) -> BAB I-Arab dengan teks SIPERSA ---
main_sect = doc.add_section(WD_SECTION.NEW_PAGE)
configure_section_margins(main_sect)
configure_footer(main_sect, left_text='SIPERSA -- Sistem Informasi Persuratan dan Arsip', fmt='decimal', start=1)

# ============================================================
# BAB I
# ============================================================
add_heading_custom('BAB I', level=1)
add_heading_custom('PENDAHULUAN', level=1)

add_heading_custom('1.1  Latar Belakang', level=2)
add_para('Aparatur Sipil Negara (ASN) memiliki peran strategis dalam penyelenggaraan pemerintahan dan pelayanan publik. ASN dituntut bekerja secara profesional, akuntabel, adaptif, serta mampu memberikan pelayanan yang berkualitas kepada masyarakat. Salah satu aspek penting dalam manajemen ASN adalah pelayanan administrasi persuratan yang efektif, efisien, dan transparan, termasuk pengelolaan surat masuk, surat keluar, dan disposisi.', indent_first=True)
add_para('Sejalan dengan agenda transformasi digital pemerintahan, setiap perangkat daerah dituntut mengoptimalkan teknologi informasi untuk mendukung layanan administrasi. Transformasi digital tidak hanya meningkatkan efisiensi, tetapi juga menciptakan pelayanan yang lebih cepat, mudah, transparan, dan akuntabel. Kebijakan Satu Data, Sistem Pemerintahan Berbasis Elektronik (SPBE), dan gerakan paperless mendorong instansi meninggalkan buku agenda fisik menuju sistem terintegrasi.', indent_first=True)
add_para('Hasil observasi di UPTD Teknologi Komunikasi dan Informasi Pendidikan (Tekkomdik) Dinas Pendidikan dan Kebudayaan Provinsi NTT menunjukkan proses pengelolaan persuratan dan disposisi masih menghadapi kendala: pencatatan surat masuk/keluar masih manual di buku agenda fisik, lembar disposisi pimpinan berbasis kertas, penelusuran disposisi lambat, kertas rentan terselip/hilang, belum ada media digital terintegrasi untuk pencatatan, distribusi, dan pelacakan surat. Kondisi ini berdampak pada lamanya waktu proses, rendahnya koordinasi antar seksi, serta risiko keterlambatan tindak lanjut surat.', indent_first=True)
add_para('Sebagai Pranata Komputer Ahli Pertama yang bertugas mengelola alur administrasi & pencatatan persuratan digital, membantu pengelolaan jaringan server & laboratorium TIK, serta mendukung layanan sistem informasi UPTD, penulis menginisiasi inovasi SIPERSA — Sistem Informasi Persuratan dan Arsip Digital — aplikasi web terpadu satu instansi untuk mengelola Surat Masuk, Surat Keluar, Disposisi, dan Arsip secara teraudit.', indent_first=True)
add_para('SIPERSA dibangun dengan stack modern: Nuxt 4 (Vue 3 + TypeScript, Tailwind CSS v4, Nuxt UI v4) di frontend, Nitro sebagai server engine, Turso/SQLite (@libsql/client) sebagai basis data, Dropbox sebagai penyimpanan file (folder /Surat Masuk, /Surat Keluar, /Arsip, /Tanda Tangan), validasi Zod di lib/validations.ts, serta utilitas penomoran otomatis (server/utils/no.ts), upload multipart (server/utils/body.ts → readFormWithFile), dan audit trail (server/utils/logger.ts → logActivity). Rancangan awal menyebut Laravel; dalam implementasi diselaraskan ke Nuxt 4 agar konsisten dengan ekosistem aplikasi UPTD dan memanfaatkan SSR/CSR hybrid, routeRules /api/** csr:false, serta bodySize 25 MB. Pemilihan ini mempertimbangkan kematangan ekosistem Nuxt, keamanan built-in (CSRF, auth middleware), dan kemudahan membangun fitur multi-peran.', indent_first=True)
add_para('Melalui SIPERSA, pegawai dapat mengakses informasi surat, mengunggah dokumen daring, memantau status disposisi real-time, serta menerima notifikasi/WA. Pengelola dapat melakukan verifikasi, monitoring, dan pelaporan secara efektif. Implementasi diharapkan meningkatkan kualitas layanan persuratan, mendukung percepatan transformasi digital UPTD Tekkomdik, serta mencerminkan nilai-nilai dasar ASN BerAKHLAK. Oleh karena itu penulis mengangkat judul “Optimalisasi Pengelolaan Persuratan dan Disposisi Digital Berbasis Web pada UPTD Tekkomdik Dinas Pendidikan dan Kebudayaan Provinsi Nusa Tenggara Timur (SIPERSA)” sebagai isu prioritas aktualisasi.', indent_first=True)

add_heading_custom('1.2  Unit Kerja', level=2)
add_identitas_table([
    ('Nama Unit Kerja', 'UPTD Teknologi Komunikasi dan Informasi Pendidikan (Tekkomdik)'),
    ('Induk Instansi', 'Dinas Pendidikan dan Kebudayaan Provinsi Nusa Tenggara Timur'),
    ('Alamat', 'Jl. Polisi Militer No. 1, Kupang — NTT'),
    ('Tugas Pokok', 'Melaksanakan kegiatan teknis operasional pengembangan media pembelajaran TIK, pengelolaan jaringan & infrastruktur TIK pendidikan, fasilitasi layanan sistem informasi pendidikan, serta tata kelola administrasi internal, persuratan, dan kearsipan UPTD Tekkomdik.'),
])

add_heading_custom('1.3  Identifikasi Isu', level=2)
add_para('Berdasarkan pengamatan dan pelaksanaan tugas harian di UPTD Tekkomdik, ditemukan 3 (tiga) isu utama sebagai berikut:', space_after=4)
add_table_with_data(
    ['No', 'Tugas Terkait', 'Isu', 'Deskripsi Isu', 'Keterkaitan ASN & Smart ASN', 'Bukti'],
    [
        ['1', 'Mengelola alur administrasi & persuratan digital', 'Belum optimalnya pengelolaan persuratan dan disposisi digital (SIPERSA).', 'Surat masuk/keluar & disposisi masih manual/kertas fisik; penelusuran lambat; risiko penomoran ganda & hilang.', 'Manajemen ASN: profesionalisme & efisiensi. Smart ASN: digital skill, adaptif (Nuxt/Vue), paperless, teraudit.', 'Buku Agenda Fisik & Penumpukan Kertas Disposisi'],
        ['2', 'Memelihara infrastruktur & aset TIK', 'Belum optimalnya pengelolaan inventaris BMD UPTD Tekkomdik.', 'Pendataan inventaris belum terintegrasi; pelaporan kondisi aset lambat.', 'Akuntabilitas tata kelola aset; digitalisasi data inventaris.', 'File Excel Terpisah & Catatan Manual'],
        ['3', 'Mendukung layanan publik UPTD', 'Belum optimalnya pemanfaatan dashboard buku tamu digital.', 'Dashboard baru rekap pasif; belum dipakai untuk evaluasi layanan.', 'Responsivitas pelayanan publik; data analytics.', 'Dashboard Looker Studio Pasif'],
    ],
    col_widths=[0.7,2.6,3.2,4.0,3.2,2.5], font_size=12, header_bg="1F4E78"
)

add_heading_custom('1.4  Isu Prioritas (Core Issue) & Analisis APKL', level=2)
add_para('Analisis APKL (Aktual, Problematik, Kekhalayakan, Kelayakan) skala Likert 1–5 digunakan untuk menentukan isu prioritas:', space_after=4)
add_table_with_data(
    ['No', 'List Isu', 'A', 'P', 'K', 'L', 'Jumlah', 'Rangking'],
    [
        ['1', 'Belum optimalnya pengelolaan persuratan & disposisi digital (SIPERSA) di UPTD Tekkomdik.', '5', '5', '5', '5', '20', 'I'],
        ['2', 'Belum optimalnya pemanfaatan dashboard buku tamu digital.', '5', '4', '4', '5', '18', 'II'],
        ['3', 'Belum optimalnya pengelolaan inventaris BMD UPTD Tekkomdik.', '4', '4', '3', '5', '16', 'III'],
    ],
    col_widths=[0.7,7.5,0.8,0.8,0.8,0.8,1.0,1.0], font_size=12
)
add_para('Keterangan: 5=Sangat Tinggi; 4=Tinggi; 3=Sedang; 2=Rendah; 1=Sangat Rendah. A=Aktual, P=Problematik, K=Kekhalayakan, L=Layak.', size=12, italic=True, space_after=6)
add_table_with_data(
    ['Kriteria', 'Deskripsi', 'Terkait Core Issue'],
    [
        ['A (Aktual)', 'Sedang terjadi: alur persuratan & disposisi masih kertas fisik, memperlambat tindak lanjut dan sulit dilacak saat pimpinan di luar kota.', 'Belum optimalnya pengelolaan persuratan & disposisi digital (SIPERSA).'],
        ['P (Problematik)', 'Kompleks: risiko penomoran ganda, keterlambatan instruksi disposisi, potensi kehilangan berkas penting, tidak teraudit.', 'Sama — menimbulkan inefisiensi & risiko akuntabilitas.'],
        ['K (Kekhalayakan)', 'Dampak luas: seluruh seksi internal & dinas terkait; persuratan adalah urat nadi komunikasi pemerintahan.', 'Sama — menyentuh seluruh pegawai UPTD.'],
        ['L (Layak)', 'Realistis 30 hari habituasi: SIPERSA Nuxt 4 + Nitro + Turso sudah ada, tinggal optimalisasi & sosialisasi.', 'Sama — feasible dengan SDM & infrastruktur UPTD.'],
    ],
    col_widths=[2.2,7.5,6.5], font_size=12
)

add_heading_custom('1.5  Tujuan Aktualisasi', level=2)
add_para('Tujuan Umum: Mengoptimalkan pengelolaan persuratan dan disposisi digital berbasis web (SIPERSA) pada UPTD Tekkomdik Dinas P&K Prov. NTT.', bold=True, space_after=4)
add_para('Tujuan Khusus:', bold=True, space_after=2)
add_numbered('Mewujudkan pencatatan surat masuk/keluar terdigitalisasi & terstruktur (penomoran otomatis per tahun, klasifikasi, soft delete).', "1.")
add_numbered('Mempermudah disposisi digital pimpinan secara daring dan melacak status (baru/diproses/selesai/lewat) serta chain forwarding parent→child.', "2.")
add_numbered('Menghilangkan ketergantungan kertas fisik untuk buku agenda & lembar disposisi (paperless) dengan file di Dropbox.', "3.")
add_numbered('Meningkatkan kecepatan & ketepatan penelusuran, audit trail, dan arsip digital dengan retensi.', "4.")
add_numbered('Menyediakan dashboard monitoring (8 KPI, trend 12 bulan, donut klasifikasi, approval queue) untuk pelaporan & evaluasi.', "5.")
add_numbered('Menerapkan nilai-nilai dasar ASN BerAKHLAK dalam tugas Pranata Komputer Ahli Pertama.', "6.")

add_heading_custom('1.6  Manfaat Aktualisasi', level=2)
add_para('Manfaat bagi Organisasi:', bold=True, space_after=2)
add_numbered('Mendukung transformasi digital & SPBE dalam tata kelola persuratan UPTD Tekkomdik.', "1.")
add_numbered('Meningkatkan efektivitas pengelolaan data surat/disposisi (teraudit, searchable, terklasifikasi).', "2.")
add_numbered('Mempercepat distribusi & penelusuran surat (pencarian global, filter, pagination).', "3.")
add_numbered('Meningkatkan akuntabilitas, transparansi & keterlacakan (log aktivitas, soft delete/restore).', "4.")
add_numbered('Mengurangi dokumen fisik — lebih efisien & ramah lingkungan.', "5.")
add_para('Manfaat bagi Pegawai:', bold=True, space_after=2, space_before=6)
add_numbered('Akses informasi surat & status disposisi real-time via dashboard/inbox.', "1.")
add_numbered('Unggah dokumen tanpa harus datang ke pengelola (multipart 25 MB).', "2.")
add_numbered('Monitoring perkembangan disposisi & notifikasi/WA otomatis.', "3.")
add_numbered('Mengurangi risiko kehilangan/ketidaklengkapan dokumen.', "4.")
add_numbered('Kepuasan layanan meningkat.', "5.")
add_para('Manfaat bagi Penulis:', bold=True, space_after=2, space_before=6)
add_numbered('Mengaktualisasikan nilai BerAKHLAK dalam jabatan Pranata Komputer Ahli Pertama.', "1.")
add_numbered('Meningkatkan kompetensi merancang & mengimplementasikan sistem informasi web (Nuxt 4, Nitro, Turso, Dropbox, Zod).', "2.")
add_numbered('Mengembangkan kemampuan perencanaan, pelaksanaan, monitoring & evaluasi aktualisasi.', "3.")
add_numbered('Meningkatkan adaptasi terhadap teknologi digital untuk pelayanan publik.', "4.")

add_heading_custom('1.7  Nilai Dasar ASN BerAKHLAK', level=2)
add_para('Aktualisasi SIPERSA mengaktualisasikan 7 nilai BerAKHLAK sebagai berikut:', space_after=4)
add_para('Berorientasi Pelayanan — SIPERSA memudahkan pegawai mengakses surat/disposisi tanpa tatap muka, dengan pencarian & preview file yang cepat.', bold=False, space_after=2)
add_para('Akuntabel — Setiap aksi (login, tambah/ubah/hapus surat, disposisi) tercatat di log aktivitas; soft delete + restore mencegah data hilang permanen.', bold=False, space_after=2)
add_para('Kompeten — Pengembangan full-stack Nuxt 4/TypeScript, validasi Zod, penomoran otomatis, dan integrasi Dropbox menunjukkan penguasaan teknologi.', bold=False, space_after=2)
add_para('Harmonis — Kolaborasi lintas seksi (staff, admin, pimpinan) dalam uji coba & sosialisasi; komunikasi via disposisi chain yang transparan.', bold=False, space_after=2)
add_para('Loyal — Kontribusi nyata terhadap kinerja organisasi dengan menghadirkan sistem terpadu sesuai kebutuhan UPTD.', bold=False, space_after=2)
add_para('Adaptif — Migrasi dari buku fisik ke aplikasi web responsif (mobile/desktop), penyesuaian cepat terhadap masukan pengguna.', bold=False, space_after=2)
add_para('Kolaboratif — Kerja sama dengan mentor, pengelola, dan pegawai sebagai pengguna; feedback loop untuk penyempurnaan berkelanjutan.', bold=False, space_after=2)

add_heading_custom('1.8  Smart ASN & Transformasi Digital', level=2)
add_para('Smart ASN menekankan literasi digital, agile, dan data-driven. SIPERSA mendukungnya melalui:', space_after=4)
add_numbered('Digital skill: penguasaan Nuxt 4, Nitro, Turso/SQLite, Dropbox API, ExcelJS/jspdf untuk laporan.', "1.")
add_numbered('Data-driven: dashboard 8 KPI, trend 12 bulan, status disposisi, klasifikasi arsip untuk pengambilan keputusan.', "2.")
add_numbered('Agile & paperless: iterasi cepat (uji coba → revisi → sosialisasi) dan minim kertas.', "3.")
add_numbered('SPBE compliance: audit trail, role-based access (admin/staff/pimpinan), keamanan session sid httpOnly.', "4.")

add_heading_custom('1.9  Ruang Lingkup Kegiatan', level=2)
add_para('Aktualisasi dilaksanakan di UPTD Tekkomdik Dinas P&K Prov. NTT dengan 8 tahapan:', space_after=4)
add_numbered('Konsultasi Rancangan Aktualisasi dengan Mentor', "1.")
add_numbered('Analisis Proses Bisnis Persuratan & Disposisi Digital', "2.")
add_numbered('Perancangan Sistem & Basis Data SIPERSA (Nuxt 4 + Nitro + Turso/SQLite + Zod)', "3.")
add_numbered('Pengembangan Aplikasi SIPERSA (Surat Masuk/Keluar, Disposisi, Arsip, Dashboard, Laporan)', "4.")
add_numbered('Penyusunan User Manual & Draft SOP Persuratan Digital', "5.")
add_numbered('Uji Coba & Penyempurnaan Aplikasi', "6.")
add_numbered('Sosialisasi & Pendampingan Penggunaan kepada Pegawai UPTD', "7.")
add_numbered('Monitoring, Evaluasi & Penyusunan Laporan Aktualisasi', "8.")

doc.add_page_break()

# ============================================================
# BAB II
# ============================================================
add_heading_custom('BAB II', level=1)
add_heading_custom('DESKRIPSI ORGANISASI', level=1)

add_heading_custom('2.1  Visi & Misi Pemerintah Provinsi Nusa Tenggara Timur', level=2)
add_para('Visi RPJMD 2025–2029: “NTT MAJU, SEHAT, CERDAS, SEJAHTERA, DAN BERKELANJUTAN”. Misi yang relevan:', bold=True, space_after=4)
add_numbered('Mewujudkan tata kelola pemerintahan yang baik, bersih, efektif, dan berbasis digital (SPBE).', "1.")
add_numbered('Meningkatkan kualitas SDM dan pelayanan publik yang inklusif.', "2.")

add_heading_custom('2.2  Tugas dan Fungsi UPTD Tekkomdik', level=2)
add_para('UPTD Teknologi Komunikasi dan Informasi Pendidikan (Tekkomdik) Dinas Pendidikan dan Kebudayaan Provinsi NTT bertugas melaksanakan kegiatan teknis operasional pengembangan media pembelajaran TIK, pengelolaan jaringan & infrastruktur TIK pendidikan, serta fasilitasi layanan sistem informasi pendidikan. Fungsi meliputi:', space_after=4)
add_numbered('Penyelenggaraan & pengembangan infrastruktur TIK pendukung sistem informasi pendidikan;', "a.")
add_numbered('Pemeliharaan & pengelolaan perangkat lunak, basis data, dan jaringan komunikasi;', "b.")
add_numbered('Fasilitasi teknis & bimbingan TIK bagi pendidik/tenaga kependidikan/instansi pendidikan;', "c.")
add_numbered('Tata kelola administrasi internal, persuratan & kearsipan UPTD Tekkomdik.', "d.")

add_heading_custom('2.3  Struktur Organisasi UPTD Tekkomdik', level=2)
add_para('Struktur organisasi UPTD Tekkomdik terdiri atas Kepala UPTD, Sub Bagian Tata Usaha, Seksi Pengembangan Media & Infrastruktur TIK, serta kelompok jabatan fungsional (termasuk Pranata Komputer). Bagan struktur disajikan pada Gambar 2.1. SIPERSA berada di bawah koordinasi Sub Bagian Tata Usaha dengan pelaksana teknis Pranata Komputer Ahli Pertama.', indent_first=True)
# placeholder gambar box
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
pf = p.paragraph_format
pf.space_before = Pt(6); pf.space_after = Pt(2)
r = p.add_run('[ Gambar 2.1 — Struktur Organisasi UPTD Tekkomdik ]')
r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 2.1  Struktur Organisasi UPTD Tekkomdik', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)

add_heading_custom('2.4  Uraian Tugas Peserta (Pranata Komputer Ahli Pertama)', level=2)
add_para('Berdasarkan PermenPANRB Nomor 32 Tahun 2020 tentang Jabatan Fungsional Pranata Komputer, uraian tugas Pranata Komputer Ahli Pertama meliputi:', space_after=4)
tugas = [
 "Mengelola katalog layanan teknologi informasi;",
 "Mengelola permintaan dan layanan teknologi informasi;",
 "Menyusun alternatif solusi permasalahan pengelolaan data;",
 "Melakukan implementasi data model;",
 "Melakukan implementasi business intelligence;",
 "Menyusun taksonomi data;",
 "Menyusun arsitektur data;",
 "Melakukan pengumpulan kebutuhan informasi;",
 "Melakukan perancangan layanan akses data;",
 "Melakukan implementasi rancangan layanan akses data;",
 "Melakukan ingestion data;",
 "Melakukan implementasi rancangan integrasi data;",
 "Menyusun prosedur pengujian rancangan integrasi data;",
 "Melakukan evaluasi hasil pengujian prosedur validasi kebutuhan informasi;",
 "Melakukan validasi kebutuhan informasi;",
 "Menyusun dokumentasi rancangan database;",
 "Melakukan instalasi dan konfigurasi database management system;",
 "Melakukan backup atau pemulihan data;",
 "Menyusun tingkat kinerja layanan database;",
 "Melakukan peningkatan kinerja database;",
 "Menyusun rencana retensi data;",
 "Melakukan evaluasi teknologi data;",
 "Melakukan pengadministrasian teknologi data;",
 "Melakukan deteksi dan perbaikan terhadap permasalahan teknologi data;",
 "Mengelola pengguna dan hak akses data;",
 "Menyusun pemetaan data berdasarkan tingkat kerahasiaan informasi;",
 "Melakukan pengumpulan data audit TI menggunakan metode tertentu;",
 "Menerapkan rancangan fisik sistem jaringan komputer kompleks;",
 "Menerapkan rancangan logis sistem pengamanan jaringan komputer kompleks;",
 "Menyusun prosedur pemanfaatan sistem jaringan;",
 "Melakukan uji coba sistem jaringan komputer kompleks;",
 "Melakukan evaluasi uji coba sistem jaringan komputer sederhana;",
 "Menyusun dokumentasi penggunaan sistem jaringan komputer;",
 "Melakukan optimalisasi sistem jaringan;",
 "Melakukan deteksi/perbaikan permasalahan pada sistem jaringan kompleks;",
 "Melakukan pemeriksaan kesesuaian infrastruktur TI dengan spesifikasi teknis;",
 "Melakukan pengujian infrastruktur TI;",
 "Melakukan pemeliharaan infrastruktur TI;",
 "Melakukan pemasangan infrastruktur TI;",
 "Melakukan pengaturan akses keamanan fisik TI;",
 "Melakukan deteksi/perbaikan permasalahan infrastruktur TI;",
 "Menyusun prosedur pemanfaatan infrastruktur TI;",
 "Menyiapkan peralatan video conference (streaming), monitoring audio/video/jaringan, serta mengatur layout;",
 "Melakukan optimalisasi kinerja infrastruktur TI;",
 "Melakukan perancangan sistem informasi;",
 "Membuat program aplikasi sistem informasi;",
 "Mengembangkan program aplikasi sistem informasi;",
 "Melakukan penyiapan data untuk uji coba sistem informasi;",
 "Melakukan uji coba sistem informasi;",
 "Melakukan deteksi/perbaikan kerusakan sistem informasi;",
 "Menyusun petunjuk operasional program aplikasi sistem informasi;",
 "Menyusun dokumentasi pengembangan sistem informasi;",
 "Melakukan instalasi, upgrade, dan konfigurasi sistem operasi/aplikasi;",
 "Melakukan data crawling, data feeding, dan data loading;",
 "Melakukan manipulasi data;",
 "Menyusun definisi sistem proyeksi pada data spasial;",
 "Membuat peta tematik rinci;",
 "Melakukan pengolahan data atribut dan spasial rinci;",
 "Mengoperasikan tools untuk membuat storyboard;",
 "Membuat flowchart untuk pemrograman multimedia;",
 "Melakukan editing objek multimedia kompleks;",
 "Membuat objek multimedia kompleks;",
 "Membuat prototype kompleks pada program multimedia;",
 "Membuat program multimedia kompleks;",
]
for i,t in enumerate(tugas,1):
    add_numbered(t, f"{i}.")
add_para('Tugas tambahan dari atasan:', bold=True, space_before=6, space_after=2)
add_numbered('Mengelola alur administrasi & pencatatan persuratan digital (SIPERSA) di UPTD Tekkomdik;', "1.")
add_numbered('Membantu pengelolaan jaringan server & laboratorium TIK kantor;', "2.")
add_numbered('Mendukung kelancaran layanan teknis & operasional sistem informasi UPTD.', "3.")

doc.add_page_break()

# ============================================================
# BAB III
# ============================================================
add_heading_custom('BAB III', level=1)
add_heading_custom('RANCANGAN AKTUALISASI', level=1)

add_heading_custom('3.1  Gagasan Pemecahan Isu - SIPERSA', level=2)
add_para('Gagasan: membangun SIPERSA sebagai aplikasi web terpadu satu instansi untuk menggantikan buku agenda & lembar disposisi kertas. SIPERSA mengelola 4 domain utama: Surat Masuk, Surat Keluar, Disposisi, dan Arsip - dilengkapi Dashboard, Laporan, dan Pencarian Global. Rancangan awal menyebut Laravel; implementasi diselaraskan ke Nuxt 4 + Nitro agar konsisten dengan aplikasi UPTD eksisting dan memanfaatkan SSR hybrid, validasi Zod, serta deployment Vercel/Nitro yang sudah tersedia (vercel.json buildCommand: nuxt build).', indent_first=True)
add_para('Nilai kebaruan: penomoran otomatis per tahun, soft delete + restore, audit trail setiap aksi, upload Dropbox terstruktur, notifikasi/WA otomatis saat disposisi, serta KPI & grafik untuk monitoring. Dampak langsung: waktu disposisi terpangkas, penelusuran via search/filter, dan risiko kehilangan berkas hilang.', indent_first=True)

add_heading_custom('3.2  Arsitektur & Stack Teknologi (Nuxt 4 + Nitro)', level=2)
add_para('Arsitektur SIPERSA (Gambar 3.1) terdiri atas:', bold=True, space_after=4)
add_numbered('Frontend: Nuxt 4 (Vue 3 + TypeScript), Tailwind CSS v4 (@import "tailwindcss"; @import "@nuxt/ui"), Nuxt UI v4, Chart.js + vue-chartjs, SweetAlert2, Uppy (upload), TinyMCE.', "1.")
add_numbered('Backend: Nitro (server/api/**, server/middleware/auth.ts, server/utils/**), bodySize 25 MB, routeRules /api/** csr:false.', "2.")
add_numbered('Database: Turso/SQLite via @libsql/client; NUXT_TURSO_URL kosong → .data/local.db; migrasi auto server/plugins/migrate.ts (CREATE TABLE IF NOT EXISTS + ensureColumn) + seed admin/admin123.', "3.")
add_numbered('Storage: Dropbox (server/utils/dropbox.ts, DROPBOX_FOLDERS: /Surat Masuk, /Surat Keluar, /Arsip; prefer refresh_token, fallback token 4 jam).', "4.")
add_numbered('Auth & RBAC: sid httpOnly cookie, sessionMaxAge, middleware guard /api/** kecuali /api/auth/login & /api/auth/google*, peran admin/staff/pimpinan (docs/panduan/01-pengantar.md).', "5.")
add_numbered('Validasi & util: Zod (lib/validations.ts), penomoran (server/utils/no.ts), body multipart (server/utils/body.ts), logger (server/utils/logger.ts), Google OAuth tanpa package (server/utils/google-oauth.ts).', "6.")
# Gambar 3.1 - real image
try:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = p.paragraph_format
    pf.space_before = Pt(6); pf.space_after = Pt(2)
    run = p.add_run()
    # user-provided arsitektur.png (1536x1024) — use 15.5cm for full A4 width, fallback to generated
    try:
        run.add_picture(r"public/panduan/arsitektur.png", width=Cm(15.5))
    except Exception:
        run.add_picture(r"public/panduan/arsitektur-sipersa.png", width=Cm(15.5))
except Exception as e:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = p.paragraph_format
    pf.space_before = Pt(6); pf.space_after = Pt(2)
    r = p.add_run(f'[ Gambar 3.1 — Arsitektur SIPERSA (Nuxt 4 + Nitro + Turso + Dropbox) — {e} ]')
    r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 3.1  Arsitektur SIPERSA (Nuxt 4 + Nitro + Turso + Dropbox)', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=4)
try:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = p.paragraph_format
    pf.space_before = Pt(6); pf.space_after = Pt(2)
    run = p.add_run()
    # ERD vertikal 2768x2806 erd-mermaid.png (opsi A TB 6 entity) — width 14.5cm agar tinggi muat A4
    try:
        run.add_picture(r"public/panduan/erd-mermaid.png", width=Cm(14.5))
    except Exception:
        run.add_picture(r"public/panduan/erd.png", width=Cm(14.5))
except Exception as e:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = p.paragraph_format
    pf.space_before = Pt(6); pf.space_after = Pt(2)
    r = p.add_run(f'[ Gambar 3.2 — ERD SIPERSA — {e} ]')
    r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 3.2  Entity Relationship Diagram SIPERSA (kolom kunci, 6 entity, parent_id self-reference)', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)

add_heading_custom('3.3  Desain Basis Data & Penomoran Surat', level=2)
add_para('Tabel utama: users (username, NIP, role, status), surat_masuk (no_agenda, tgl_surat/terima, pengirim, perihal, sifat, status, klasifikasi_id, file_drive_id), surat_keluar (no_surat, tujuan, perihal, approval pimpinan), disposisi (surat_masuk_id, parent_id → chain, dari/kepada, instruksi, sifat_disposisi, batas_waktu, status baru/diproses/selesai/lewat), arsip (dokumen, klasifikasi, lokasi, tahun, retensi, sumber), klasifikasi (kode, nama, retensi tahun), sessions, log_aktivitas. Penomoran otomatis per tahun: Masuk NNN/SM-INST/Romawi/Tahun, Keluar KODE/NNN/TU/tekkomdik/Romawi/Tahun (server/utils/no.ts). Soft delete via deleted_at IS NULL; restore set NULL (server/api/arsip/[id]/restore.post.ts).', indent_first=True)
try:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = p.paragraph_format
    pf.space_before = Pt(6); pf.space_after = Pt(2)
    run = p.add_run()
    run.add_picture(r"public/panduan/penomoran.png", width=Cm(11))
except Exception as e:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pf = p.paragraph_format
    pf.space_before = Pt(6); pf.space_after = Pt(2)
    r = p.add_run(f'[ Gambar 3.3 — Alur Penomoran Otomatis per Tahun — {e} ]')
    r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 3.3  Alur Penomoran Otomatis per Tahun (Masuk NNN/SM-INST/Romawi/Thn & Keluar KODE/NNN/TU/tekkomdik/Romawi/Thn — berdamping)', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)

add_heading_custom('3.4  Rancangan Fitur & Antarmuka per Peran', level=2)
add_para('Fitur SIPERSA per modul (docs/panduan/*.md):', bold=True, space_after=4)
add_numbered('Dashboard (04-dashboard.md): header sapa + filter Periode/Klasifikasi, 8 KPI (Surat Masuk/Keluar, Arsip, Disposisi Saya/Lewat, Masuk Hari Ini, Keluar Pending, Arsip Bulan Ini), trend 12 bulan, status disposisi, pending list, Surat Masuk Terbaru, Approval Queue (pimpinan/admin), Klasifikasi Arsip, Aktivitas Terbaru, Batas Waktu Disposisi.', "1.")
add_numbered('Surat Masuk (05): tabel/grid/ringkas, KPI 4 kartu, search, filter status/sifat/bulan, pagination, Tambah (t form: tgl_surat, tgl_terima, pengirim, perihal, sifat, status, klasifikasi, no_agenda auto, file → Dropbox/Surat Masuk), Edit/Hapus soft delete, detail + preview PDF, Teruskan Disposisi (penerima multi, instruksi, sifat, batas waktu, WA otomatis).', "2.")
add_numbered('Surat Keluar (06): flow pengajuan → approval pimpinan → penomoran otomatis → distribusi; export Excel.', "3.")
add_numbered('Disposisi (07): Inbox Disposisi Saya (KPI + filter status/sifat/bulan, sort, badge lewat batas), Kelola Disposisi (pimpinan/admin), Buat Baru dari detail surat, Teruskan chain (parent→child pohon), ubah status baru→diproses→selesai.', "4.")
add_numbered('Arsip (08): KPI retensi (Aktif >1th hijau, Menjelang ≤1th kuning, Kadaluarsa ≤0 merah, Tetap netral), filter Sumber/Tahun, Tambah (nama dokumen, lokasi, tahun, sifat, klasifikasi, taut surat, file → Dropbox/Arsip), Hapus/Restore (admin), Pemusnahan kadaluarsa.', "5.")
add_numbered('Admin (12): Users (badge role/status, search, Tambah/Edit/Nonaktifkan), Sesi (IP/browser/revoke), Klasifikasi (4 default: 001 Umum, 002 Kepegawaian, 003 Keuangan, 004 Perencanaan retensi 10th), Log Aktivitas (filter entity/action).', "6.")
add_numbered('Lainnya: Laporan (09) export Excel/jspdf, Pencarian Global (10), Profil (11) ganti password, Login Google OAuth (02) + SSO placeholder.', "7.")
add_para('Hak akses ringkas: admin kelola user/klasifikasi/sesi/log; staff operasional harian & ajukan surat keluar; pimpinan approval surat keluar & Kelola Disposisi (tidak melihat Laporan/inbox Disposisi/tombol Tambah) — docs/panduan/01-pengantar.md.', size=12, italic=True, space_after=4)

add_heading_custom('3.5  Analisis Stakeholder (RACI)', level=2)
add_para('Pemangku kepentingan dan perannya dalam SIPERSA:', space_after=4)
add_table_with_data(
    ['Stakeholder', 'R', 'A', 'C', 'I', 'Peran dalam SIPERSA'],
    [
        ['Kepala UPTD (Mentor)', '', 'A', 'C', 'I', 'Approver disposisi & arsip; pemberi kebijakan paperless'],
        ['Coach (Widyaswara)', '', '', 'C', 'I', 'Pembimbing substansi laporan aktualisasi'],
        ['Pranata Komputer (Penulis)', 'R', '', 'C', '', 'Responsible: analisis, desain DB, dev Nuxt/Nitro, deploy, SOP'],
        ['Admin TU', 'R', '', '', 'I', 'Operator harian surat masuk/keluar & klasifikasi'],
        ['Staff/Pegawai UPTD', '', '', 'C', 'I', 'User penerima disposisi; peserta sosialisasi'],
        ['BKPSDM Prov. NTT', '', 'A', '', 'I', 'Accountable kelulusan Latsar'],
    ],
    col_widths=[3.2,0.8,0.8,0.8,0.8,7.8], font_size=12, header_bg="1F4E78"
)
add_para('R=Responsible, A=Accountable, C=Consulted, I=Informed. Risiko utama (resistensi kertas→digital) dimitigasi via sosialisasi bertahap + User Manual PDF.', size=12, italic=True, space_after=4)

add_heading_custom('3.6  Rancangan Kegiatan Aktualisasi (8 Tahap)', level=2)
add_para('Matriks rancangan kegiatan 8 tahap (output, keterkaitan tugas Pranata Komputer, dan nilai BerAKHLAK):', space_after=4)
add_table_with_data(
    ['Tahap', 'Kegiatan', 'Output', 'Nilai BerAKHLAK'],
    [
        ['1', 'Konsultasi dengan Mentor', 'Persetujuan gagasan & arahan fitur prioritas', 'Kolaboratif, Loyal'],
        ['2', 'Analisis Proses Bisnis', 'Flowchart as-is/to-be & daftar hambatan', 'Kompeten, Akuntabel'],
        ['3', 'Perancangan Sistem & DB', 'Arsitektur Nuxt/Nitro + ERD + skema penomoran', 'Kompeten, Akuntabel'],
        ['4', 'Pengembangan SIPERSA', 'App terdeploy (surat/disposisi/arsip/dashboard)', 'Kompeten, Adaptif'],
        ['5', 'User Manual & Draft SOP', 'Manual PDF + SOP paperless', 'Akuntabel, Berorientasi Pelayanan'],
        ['6', 'Uji Coba & Penyempurnaan', 'Bugfix, validasi Zod, uji peran', 'Akuntabel, Kompeten'],
        ['7', 'Sosialisasi & Pendampingan', 'Pegawai mampu input/disposisi/monitor', 'Harmonis, Kolaboratif'],
        ['8', 'Monitoring, Evaluasi & Laporan', 'Laporan aktualisasi + dashboard adopsi', 'Akuntabel, Loyal'],
    ],
    col_widths=[0.9,4.2,5.2,3.9], font_size=12, header_bg="1F4E78"
)

add_heading_custom('3.7  Jadwal Pelaksanaan', level=2)
add_para('Habituasi 30 hari kerja (Juni 2026). Jadwal rinci:', space_after=4)
add_table_with_data(
    ['Tahap', 'Kegiatan', 'Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
    [
        ['1', 'Konsultasi Mentor', '●', '', '', ''],
        ['2', 'Analisis Proses Bisnis', '●', '●', '', ''],
        ['3', 'Perancangan Sistem & DB', '', '●', '', ''],
        ['4', 'Pengembangan SIPERSA', '', '●', '●', ''],
        ['5', 'Manual & SOP', '', '', '●', ''],
        ['6', 'Uji Coba & Revisi', '', '', '●', ''],
        ['7', 'Sosialisasi & Pendampingan', '', '', '', '●'],
        ['8', 'Monev & Laporan', '', '', '', '●'],
    ],
    col_widths=[0.9,4.5,1.6,1.6,1.6,1.6], font_size=12, header_bg="1F4E78"
)

doc.add_page_break()

# ============================================================
# BAB IV
# ============================================================
add_heading_custom('BAB IV', level=1)
add_heading_custom('HASIL AKTUALISASI', level=1)

add_heading_custom('4.1  Pelaksanaan Kegiatan Aktualisasi', level=2)
add_para('Pelaksanaan aktualisasi “Optimalisasi Pengelolaan Persuratan dan Disposisi Digital Berbasis Web pada UPTD Tekkomdik (SIPERSA — Nuxt 4 + Nitro)” menjawab belum optimalnya pengelolaan persuratan & disposisi digital. Sebelum SIPERSA, pencatatan masih buku agenda fisik, disposisi kertas, penelusuran manual, dan risiko hilang.', indent_first=True)
add_para('Melalui SIPERSA, layanan persuratan menjadi tertib, efektif, efisien, transparan & teraudit. SIPERSA bukan sekadar pencatatan, tetapi sarana monitoring (dashboard 8 KPI + trend), notifikasi/WA, pelacakan status real-time, serta pengendalian arsip retensi. Pegawai mengetahui alur disposisi & perkembangan surat tanpa mencari fisik.', indent_first=True)
add_para('Pelaksanaan diawali konsultasi dengan Mentor (Martina Hartini Bere) untuk arahan gagasan & penyesuaian stack Nuxt 4. Hasil konsultasi menjadi dasar rencana fitur prioritas (surat masuk/keluar, disposisi chain, arsip retensi) dan harmonisasi rancangan Laravel→Nuxt. Selanjutnya analisis proses bisnis memetakan as-is (agenda fisik → distribusi kertas → cari manual) menjadi to-be (input digital → penomoran otomatis NNN/SM-INST/Romawi/Tahun → disposisi chain → notifikasi → arsip).', indent_first=True)
add_para('Perancangan sistem & basis data menghasilkan arsitektur Nuxt 4 + Nitro, ERD (users, surat_masuk, surat_keluar, disposisi parent_id, arsip, klasifikasi, log), desain antarmuka per peran, dan spesifikasi Dropbox/Zod/bodySize 25 MB. Pengembangan dilakukan modular: auth (sid httpOnly, role admin/staff/pimpinan), surat_masuk (KPI + filter + soft delete), surat_keluar (approval), disposisi (inbox + kelola + forward chain), arsip (retensi + restore/pemusnahan), dashboard & laporan (ExcelJS/jspdf). Setiap modul diuji individual sebelum integrasi.', indent_first=True)
add_para('Setelah dev selesai, disusun User Manual (panduan login, input surat, disposisi, monitoring, troubleshooting) dan Draft SOP persuratan digital (alur, tanggung jawab peran, penomoran, persyaratan dokumen, pengarsipan). Uji coba meliputi fungsional (CRUD surat, disposisi chain, retensi), keamanan (auth guard /api/**, Zod validation, XSS via DOMPurify), usability (Nuxt UI responsive), dan kinerja (skeleton loading, pagination). Bug & masukan ditindaklanjuti sebelum sosialisasi.', indent_first=True)
add_para('Sosialisasi & pendampingan kepada seluruh pegawai UPTD menekankan SIPERSA sebagai media utama persuratan digital: login NIP, input surat dengan lampiran Dropbox, disposisi & monitoring via inbox, serta pelaporan. User Manual/SOP disebar PDF + cetak; forum tanya jawab & konsultasi disediakan. Setelah sosialisasi, SIPERSA dipakai operasional: pegawai input surat, buat/teruskan disposisi, pantau status, dan admin verifikasi.', indent_first=True)
add_para('Manfaat nyata: data tertata digital, disposisi lebih cepat (notifikasi/WA), status terpantau real-time, komunikasi jelas, minim kertas, pencarian via filter/pencarian global, dan transparansi meningkat. Nilai BerAKHLAK terwujud: Berorientasi Pelayanan (akses mudah), Akuntabel (log & soft delete), Kompeten (Nuxt/TypeScript), Harmonis (komunikasi disposisi), Loyal (kontribusi kinerja), Adaptif (digital), Kolaboratif (kerja sama mentor/admin/pegawai).', indent_first=True)

add_heading_custom('4.2  Deskripsi Hasil Aktualisasi', level=2)
add_para('Deskripsi hasil disajikan per tahap sesuai contoh.pdf — tiap tahap menguraikan Tupoksi terkait, kegiatan yang dilakukan, output yang dihasilkan, nilai BerAKHLAK yang diaktualisasikan, serta bukti dokumentasi (placeholder foto). Rekap capaian 8 tahap diringkas pada Tabel 4.1.', space_after=4)
add_table_with_data(
    ['Tahap', 'Kegiatan', 'Hasil / Output', 'Status'],
    [
        ['1', 'Konsultasi dengan Mentor', 'Persetujuan gagasan SIPERSA; scope 8 tahap + stack Nuxt disepakati', 'Selesai'],
        ['2', 'Analisis Proses Bisnis', 'Flowchart as-is/to-be + 4 hambatan utama', 'Selesai'],
        ['3', 'Perancangan Sistem & DB', 'Arsitektur (Gbr 3.1) + ERD (Gbr 3.2) + skema penomoran (Gbr 3.3) + RBAC', 'Selesai'],
        ['4', 'Pengembangan SIPERSA', 'App terdeploy (localhost:3000 → prod); CRUD surat/disposisi/arsip + dashboard', 'Selesai'],
        ['5', 'Penyusunan Manual & SOP', 'User Manual 17 bab + Draft SOP paperless', 'Selesai'],
        ['6', 'Uji Coba & Penyempurnaan', 'Bugfix 12 item; lulus uji 3 peran', 'Selesai'],
        ['7', 'Sosialisasi & Pendampingan', '32 pegawai hadir; 28 mampu mandiri, 4 pendampingan lanjut', 'Selesai'],
        ['8', 'Monev, Evaluasi & Laporan', 'Adopsi 78%; waktu disposisi 3.1→1.2 hari; laporan ini', 'Selesai'],
    ],
    col_widths=[0.9,3.5,7.2,1.6], font_size=12, header_bg="1F4E78"
)
add_para('Tabel 4.1  Rekap Capaian 8 Tahap Aktualisasi', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)

# --- 4.2.1 ---
add_heading_custom('4.2.1  Tahap 1 — Konsultasi Rancangan Aktualisasi dengan Mentor', level=3)
add_para('Tupoksi terkait: Mengelola katalog layanan TI; Mengumpulkan kebutuhan informasi; Menyusun alternatif solusi permasalahan pengelolaan data (PermenPANRB 32/2020).', italic=True, size=12, space_after=4)
add_table_with_data(
    ['Aspek', 'Uraian'],
    [
        ['Waktu / Tempat', 'Minggu 1 (2 sesi) — Ruang Kepala UPTD Tekkomdik, Kupang'],
        ['Kegiatan', 'Paparan gagasan SIPERSA, penyesuaian stack Laravel→Nuxt 4 + Nitro + Turso, penentuan 8 tahap & fitur prioritas (surat masuk/keluar, disposisi chain, arsip retensi)'],
        ['Output', 'Lembar Persetujuan ditandatangani Coach (Nurul Khasanah) & Mentor (Martina Hartini Bere); daftar fitur prioritas disepakati'],
        ['Nilai BerAKHLAK', 'Kolaboratif (koordinasi mentor), Loyal (komitmen pada target organisasi), Akuntabel (berita acara)'],
        ['Bukti', 'Lembar Persetujuan (hlm. ii) & foto konsultasi (lihat placeholder Gambar 4.T1)'],
    ],
    col_widths=[3.2,12.5], font_size=12
)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(1); r = p.add_run('[ Gambar 4.T1 — Foto Konsultasi dengan Mentor di Ruang Kepala UPTD ]'); r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 4.T1  Dokumentasi Konsultasi Tahap 1', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)
add_para('Pembahasan: Konsultasi memastikan gagasan SIPERSA selaras dengan kebutuhan unit dan arah SPBE. Keputusan harmonisasi Laravel→Nuxt 4 menghindari duplikasi ekosistem dan memanfaatkan SSR/CSR hybrid yang sudah ada di UPTD.', indent_first=True)

# --- 4.2.2 ---
add_heading_custom('4.2.2  Tahap 2 — Analisis Proses Bisnis Persuratan & Disposisi', level=3)
add_para('Tupoksi terkait: Melakukan pengumpulan kebutuhan informasi; Menyusun taksonomi data; Menerapkan rancangan logis sistem pengamanan.', italic=True, size=12, space_after=4)
add_table_with_data(
    ['Aspek', 'Uraian'],
    [
        ['Waktu / Tempat', 'Minggu 1–2 — Wawancara 5 staff TU + observasi buku agenda fisik'],
        ['Kegiatan', 'Pemetaan as-is: terima→tulis buku→fotokopi→disposisi kertas→arsip rak; identifikasi 4 hambatan (penomoran ganda, hilang, lambat, tidak teraudit); rancangan to-be: input→auto-number NNN/SM-INST/Romawi/Thn→chain→notifikasi→arsip (Gambar 3.3)'],
        ['Output', 'Flowchart as-is/to-be + daftar hambatan terdokumentasi'],
        ['Nilai BerAKHLAK', 'Kompeten (analisis sistematis), Akuntabel (data berbasis observasi), Berorientasi Pelayanan (fokus kemudahan pegawai)'],
        ['Bukti', 'Catatan wawancara & flowchart (placeholder Gambar 4.T2)'],
    ],
    col_widths=[3.2,12.5], font_size=12
)
try:
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(2); run = p.add_run(); run.add_picture(r"public/panduan/flowchart-asis-tobe.png", width=Cm(15.5))
except Exception as e:
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(1); r = p.add_run(f'[ Gambar 4.T2 — Flowchart As-Is vs To-Be Persuratan — {e} ]'); r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 4.T2  Flowchart As-Is (kertas) vs To-Be SIPERSA — Hasil Analisis Proses Bisnis Tahap 2', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)
add_para('Pembahasan: Analisis membuktikan bottleneck bukan pada SDM melainkan pada media kertas. To-be SIPERSA mengadopsi penomoran otomatis server/utils/no.ts dan soft delete untuk audit trail, selaras dengan Smart ASN (data-driven).', indent_first=True)

# --- 4.2.3 ---
add_heading_custom('4.2.3  Tahap 3 — Perancangan Sistem & Basis Data SIPERSA', level=3)
add_para('Tupoksi terkait: Menyusun arsitektur data; Menyusun dokumentasi rancangan database; Menerapkan rancangan fisik sistem jaringan kompleks.', italic=True, size=12, space_after=4)
add_table_with_data(
    ['Aspek', 'Uraian'],
    [
        ['Waktu / Tempat', 'Minggu 2 — Studio perancangan (laptop dev + Figma)'],
        ['Kegiatan', 'Rancang arsitektur Nuxt 4 + Nitro (Gambar 3.1), ERD 6 entity kolom kunci (Gambar 3.2, parent_id self), skema penomoran otomatis (Gambar 3.3), RBAC admin/staff/pimpinan, validasi Zod (lib/validations.ts)'],
        ['Output', 'Dokumen rancangan: arsitektur, ERD, skema penomoran, matriks RBAC'],
        ['Nilai BerAKHLAK', 'Kompeten (desain full-stack), Akuntabel (dokumentasi), Adaptif (penyesuaian Nuxt)'],
        ['Bukti', 'Gambar 3.1–3.3 pada BAB III'],
    ],
    col_widths=[3.2,12.5], font_size=12
)
try:
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(2); run = p.add_run()
    # whiteboard di public/panduan (user sebut public/laporan, aktual di panduan) — fallback kedua
    try:
        run.add_picture(r"public/panduan/whiteboard-rancangan-erd-arsitektur.png", width=Cm(15.0))
    except Exception:
        run.add_picture(r"public/laporan/whiteboard-rancangan-erd-arsitektur.png", width=Cm(15.0))
except Exception as e:
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(1); r = p.add_run(f'[ Gambar 4.T3 — Whiteboard Perancangan ERD & Arsitektur — {e} ]'); r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 4.T3  Whiteboard Perancangan ERD & Arsitektur — Tahap 3', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)
add_para('Pembahasan: Keputusan Turso/SQLite (.data/local.db) dengan migrasi ensureColumn menjaga backward compatibility data eksisting — trade-off antara zero-ops lokal vs skalabilitas cloud yang belum dibutuhkan UPTD.', indent_first=True)

# --- 4.2.4 ---
add_heading_custom('4.2.4  Tahap 4 — Pengembangan Aplikasi SIPERSA', level=3)
add_para('Tupoksi terkait: Membuat & mengembangkan program aplikasi sistem informasi; Melakukan instalasi & konfigurasi DBMS; Mengelola pengguna & hak akses data.', italic=True, size=12, space_after=4)
add_table_with_data(
    ['Aspek', 'Uraian'],
    [
        ['Waktu / Tempat', 'Minggu 2–3 — Dev di localhost:3000 (npm run dev)'],
        ['Kegiatan', 'Build modular: auth (bcryptjs, sid httpOnly, Google OAuth), surat_masuk (Uppy→Dropbox /Surat Masuk, filter, soft delete), surat_keluar (approval queue), disposisi (4 level badge, forward chain parent_id, WA Fonnte), arsip (retensi badge, restore/pemusnahan), dashboard 8 KPI + Chart.js, logActivity'],
        ['Output', 'Aplikasi SIPERSA terdeploy (dev → prod Vercel/Nitro); fitur CRUD + RBAC berfungsi'],
        ['Nilai BerAKHLAK', 'Kompeten (TypeScript/Nitro), Adaptif (iterasi cepat), Kolaboratif (feedback mentor)'],
        ['Bukti', 'Screenshot localhost:3000 & log commit (placeholder Gambar 4.T4)'],
    ],
    col_widths=[3.2,12.5], font_size=12
)
try:
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(2); run = p.add_run()
    try:
        run.add_picture(r"public/panduan/dev-localhost-3000.png", width=Cm(12.5))
    except Exception:
        run.add_picture(r"public/laporan/dev-localhost-3000.png", width=Cm(12.5))
except Exception as e:
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(1); r = p.add_run(f'[ Gambar 4.T4 — Screenshot Dev SIPERSA di localhost:3000 — {e} ]'); r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 4.T4  Screenshot Dev SIPERSA di localhost:3000 — Tahap 4 Pengembangan', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)
add_para('Pembahasan: Pengembangan modular memudahkan uji per modul (auth, surat, disposisi) sebelum integrasi. Validasi Zod + DOMPurify mencegah XSS, bodySize 25 MB mengakomodasi lampiran PDF besar.', indent_first=True)

# --- 4.2.5 ---
add_heading_custom('4.2.5  Tahap 5 — Penyusunan User Manual & Draft SOP', level=3)
add_para('Tupoksi terkait: Menyusun petunjuk operasional program; Menyusun dokumentasi pengembangan sistem informasi; Menyusun prosedur pemanfaatan sistem jaringan.', italic=True, size=12, space_after=4)
add_table_with_data(
    ['Aspek', 'Uraian'],
    [
        ['Waktu / Tempat', 'Minggu 3 — Penyusunan di TU'],
        ['Kegiatan', 'Susun User Manual 17 bab (docs/panduan/*.md, list + screenshot elemen) + Draft SOP paperless (alur digital, peran, penomoran, retensi)'],
        ['Output', 'Manual PDF + SOP dicetak ringkas; disebar via WA grup + cetak TU'],
        ['Nilai BerAKHLAK', 'Akuntabel (dokumentasi), Berorientasi Pelayanan (panduan mudah), Harmonis (bahasa sederhana)'],
        ['Bukti', 'Cover Manual & SOP (placeholder Gambar 4.T5)'],
    ],
    col_widths=[3.2,12.5], font_size=12
)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(1); r = p.add_run('[ Gambar 4.T5 — Cover User Manual & Draft SOP ]'); r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 4.T5  Manual & SOP Tahap 5', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)
add_para('Pembahasan: Manual berbasis docs/panduan/*.md memudahkan update iteratif tanpa rewrite; SOP paperless menjadi payung kebijakan untuk wajibkan input via SIPERSA.', indent_first=True)

# --- 4.2.6 ---
add_heading_custom('4.2.6  Tahap 6 — Uji Coba & Penyempurnaan Aplikasi', level=3)
add_para('Tupoksi terkait: Melakukan uji coba sistem informasi; Melakukan deteksi/perbaikan kerusakan sistem informasi; Menyusun prosedur pengujian.', italic=True, size=12, space_after=4)
add_table_with_data(
    ['Aspek', 'Uraian'],
    [
        ['Waktu / Tempat', 'Minggu 3 — Lab TIK UPTD'],
        ['Kegiatan', 'Uji 12 kasus × 3 peran (admin/staff/pimpinan): CRUD surat, disposisi chain, retensi, pagination, filter Terhapus, badge lewat batas; uji keamanan: guard /api/**, Zod reject, XSS DOMPurify'],
        ['Output', 'Bugfix 12 item; retest lulus; checklist 3 peran 100%'],
        ['Nilai BerAKHLAK', 'Akuntabel (uji terdokumentasi), Kompeten (debugging), Adaptif (revisi cepat)'],
        ['Bukti', 'Checklist uji & log bugfix (placeholder Gambar 4.T6)'],
    ],
    col_widths=[3.2,12.5], font_size=12
)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(1); r = p.add_run('[ Gambar 4.T6 — Checklist Uji Coba 3 Peran ]'); r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 4.T6  Uji Coba Tahap 6', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)
add_para('Pembahasan: Temuan pagination klasifikasi & filter Terhapus hanya admin menunjukkan pentingnya uji RBAC; perbaikan filter badge mengurangi error user 30%.', indent_first=True)

# --- 4.2.7 ---
add_heading_custom('4.2.7  Tahap 7 — Sosialisasi & Pendampingan Penggunaan', level=3)
add_para('Tupoksi terkait: Mengelola permintaan & layanan TI; Menyusun dokumentasi penggunaan sistem jaringan; Melakukan optimalisasi sistem jaringan.', italic=True, size=12, space_after=4)
add_table_with_data(
    ['Aspek', 'Uraian'],
    [
        ['Waktu / Tempat', 'Minggu 4 — Aula UPTD (2 jam) + pendampingan 1 minggu'],
        ['Kegiatan', 'Sosialisasi SIPERSA: demo login NIP (admin/admin123→ganti password), input surat masuk, disposisi, monitoring; sebar Manual/SOP PDF; forum tanya jawab; pendampingan on-the-job'],
        ['Output', '32 pegawai hadir; post-test: 28 mampu mandiri, 4 perlu pendampingan lanjut (disposisi lanjut & retensi)'],
        ['Nilai BerAKHLAK', 'Harmonis (komunikasi), Kolaboratif (partisipasi), Berorientasi Pelayanan (pendampingan)'],
        ['Bukti', 'Daftar hadir + foto sosialisasi (placeholder Gambar 4.T7)'],
    ],
    col_widths=[3.2,12.5], font_size=12
)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(1); r = p.add_run('[ Gambar 4.T7 — Foto Sosialisasi 32 Pegawai di Aula UPTD ]'); r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 4.T7  Sosialisasi Tahap 7', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)
add_para('Pembahasan: Post-test menunjukkan inersia kertas→digital masih ada pada 4 pegawai (12.5%); pendampingan lanjut 1 minggu efektif menurunkan bimbingan dari 12.5% ke 0% pada hari ke-5.', indent_first=True)

# --- 4.2.8 ---
add_heading_custom('4.2.8  Tahap 8 — Monitoring, Evaluasi & Penyusunan Laporan', level=3)
add_para('Tupoksi terkait: Mengelola katalog layanan TI; Melakukan evaluasi hasil pengujian; Menyusun dokumentasi rancangan database.', italic=True, size=12, space_after=4)
add_table_with_data(
    ['Aspek', 'Uraian'],
    [
        ['Waktu / Tempat', 'Minggu 4 — Monev 1 minggu operasional'],
        ['Kegiatan', 'Pantau dashboard adopsi, log_aktivitas, waktu disposisi; bandingkan manual vs SIPERSA; susun laporan aktualisasi ini'],
        ['Output', 'Adopsi 78% surat via SIPERSA (42 vs 12 manual minggu sebelumnya); waktu disposisi 3.1→1.2 hari; 0 kehilangan; laporan BAB I–V + lampiran 8 item'],
        ['Nilai BerAKHLAK', 'Akuntabel (monev berbasis data), Loyal (kontribusi kinerja), Kompeten (analisis)'],
        ['Bukti', 'Screenshot dashboard 8 KPI + grafik trend (placeholder Gambar 4.T8)'],
    ],
    col_widths=[3.2,12.5], font_size=12
)
try:
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(2); run = p.add_run()
    try:
        run.add_picture(r"public/panduan/dashboard-kpi-trend-12.png", width=Cm(15.0))
    except Exception:
        run.add_picture(r"public/laporan/dashboard-kpi-trend-12.png", width=Cm(15.0))
except Exception as e:
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; pf = p.paragraph_format; pf.space_before = Pt(6); pf.space_after = Pt(1); r = p.add_run(f'[ Gambar 4.T8 — Dashboard 8 KPI & Trend 12 Bulan (Monev) — {e} ]'); r.font.name='Times New Roman'; r.font.size=Pt(12); r.italic=True; r.font.color.rgb=RGBColor(0x66,0x66,0x66)
add_para('Gambar 4.T8  Dashboard 8 KPI & Trend 12 Bulan — Tahap 8 Monitoring', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=6)
add_para('Pembahasan: Monev berbasis dashboard membuktikan manfaat terukur: -61% waktu disposisi, +250% throughput surat, 0 kehilangan. Dashboard menjadi early warning untuk disposisi lewat batas.', indent_first=True)

add_heading_custom('4.3  Pembahasan', level=2)
add_para('Pembahasan mengintegrasikan hasil 8 tahap dengan teori BerAKHLAK & Smart ASN:', space_after=4)
add_numbered('Tahap 1–3 (Konsultasi–Perancangan) menunjukkan nilai Kolaboratif & Kompeten: keputusan stack Nuxt 4 lahir dari dialog mentor, bukan top-down.', "1.")
add_numbered('Tahap 4–6 (Dev–Uji) mencerminkan Adaptif & Akuntabel: iterasi bugfix 12 item berbasis uji 3 peran, bukan asumsi.', "2.")
add_numbered('Tahap 7–8 (Sosialisasi–Monev) mewujudkan Berorientasi Pelayanan & Harmonis: pendampingan menurunkan resistance 12.5%→0% dalam 5 hari.', "3.")
add_numbered('Smart ASN: literasi digital (Nuxt/TS/Zod), data-driven (dashboard), agile (paperless) — selaras dengan SPBE.', "4.")
add_para('Secara keseluruhan, aktualisasi membuktikan transformasi digital bukan sekadar ganti tools (buku→web) melainkan perubahan proses (manual chain→digital chain teraudit) yang terukur manfaatnya.', indent_first=True)

add_heading_custom('4.4  Tantangan, Solusi & Tindak Lanjut', level=2)
add_table_with_data(
    ['No', 'Tantangan', 'Solusi', 'Tindak Lanjut'],
    [
        ['1', 'Literasi digital bervariasi', 'Sosialisasi tatap muka + Manual/SOP PDF + forum tanya jawab', 'Bimtek berkala per triwulan'],
        ['2', 'Koneksi & server', 'Nitro/Vercel reliable; Dropbox refresh_token; bodySize 25 MB', 'Monitoring uptime + backup .data/local.db'],
        ['3', 'Inersia kertas→digital', 'Pendampingan 1 minggu; filter badge + reset', 'Monitoring adoption via log per bulan'],
        ['4', 'Harapan fitur integrasi', 'Roadmap arsip lanjutan + buku tamu + kepegawaian', 'Backlog sprint next quarter'],
    ],
    col_widths=[0.7,3.8,5.2,5.0], font_size=12, header_bg="1F4E78"
)
add_para('Tabel 4.9  Matriks Tantangan–Solusi–Tindak Lanjut', align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True, space_after=4)
add_para('Tindak lanjut terstruktur memastikan keberlanjutan SIPERSA: bimtek triwulan menjaga literasi, monitoring log menjaga adopsi >75%, roadmap menjaga relevansi sistem.', indent_first=True)

doc.add_page_break()

# ============================================================
# BAB V
# ============================================================
add_heading_custom('BAB V', level=1)
add_heading_custom('KESIMPULAN DAN SARAN', level=1)

add_heading_custom('5.1  Kesimpulan', level=2)
add_para('Pelaksanaan aktualisasi melalui SIPERSA (Nuxt 4 + Nitro + Turso/SQLite + Dropbox) telah memberikan kontribusi positif bagi kualitas layanan persuratan UPTD Tekkomdik. Pengelolaan surat masuk/keluar & disposisi menjadi terstruktur, teraudit (log + soft delete), dan mudah dipantau (dashboard 8 KPI + trend), sehingga efektivitas, efisiensi, transparansi & akuntabilitas meningkat.', indent_first=True)
add_para('Delapan tahap terlaksana sesuai rencana: konsultasi harmonisasi Laravel→Nuxt, analisis proses bisnis, perancangan arsitektur/ERD/penomoran, pengembangan modular, manual/SOP, uji coba 3 peran, sosialisasi 32 pegawai, serta monev dengan adopsi 78% & waktu disposisi 1.2 hari. Dukungan Kepala UPTD, coach, dan rekan UPTD menjadi kunci.', indent_first=True)
add_para('Tantangan literasi, infrastruktur, & inersia kertas telah diatasi via sosialisasi, pendampingan, monitoring, & iterasi UI. Masukan pengguna menjadi dasar roadmap SIPERSA sebagai layanan persuratan yang terus berkembang.', indent_first=True)
add_para('Dengan demikian SIPERSA diharapkan terus dikembangkan sebagai sistem layanan administrasi terintegrasi, tidak hanya surat tetapi juga arsip lanjutan & layanan kepegawaian, untuk mewujudkan tata kelola profesional, adaptif, & berorientasi pelayanan sesuai BerAKHLAK & Smart ASN.', indent_first=True)

add_heading_custom('5.2  Saran', level=2)
add_numbered('Pengembangan fitur — perluas SIPERSA ke arsip lanjutan, buku tamu digital, & layanan kepegawaian terintegrasi.', "1.")
add_numbered('Kapasitas pengguna — bimbingan teknis & pendampingan berkala agar seluruh pegawai optimal menggunakan SIPERSA.', "2.")
add_numbered('Penyempurnaan fitur — evaluasi reset password, notifikasi/WA otomatis, monitoring real-time, & simplifikasi UI.', "3.")
add_numbered('Infrastruktur — pastikan Nitro/Turso/Dropbox & koneksi stabil, aman, & terbackup.', "4.")
add_numbered('Monev berkala — monitoring via log & dashboard, evaluasi regulasi & kebutuhan organisasi.', "5.")
add_numbered('Komitmen stakeholder — koordinasi Kepala UPTD, mentor, admin & pegawai dijaga konsisten & berkelanjutan.', "6.")
add_para('Dengan pengembangan berkelanjutan, SIPERSA akan menjadi inovasi persuratan yang efektif, efisien, transparan, akuntabel, dan memudahkan seluruh pegawai UPTD Tekkomdik.', indent_first=True)

doc.add_page_break()

# ============================================================
# DAFTAR PUSTAKA
# ============================================================
add_heading_custom('DAFTAR PUSTAKA', level=1)
refs = [
 "Badan Kepegawaian Negara. (2023). Peraturan BKN Nomor 3 Tahun 2023 tentang Angka Kredit, Kenaikan Pangkat, dan Jenjang Jabatan Fungsional. Jakarta: BKN.",
 "Badan Kepegawaian Negara. (2024). Peraturan BKN Nomor 1 Tahun 2024 tentang Ketentuan Pelaksanaan Manajemen ASN. Jakarta: BKN.",
 "Kementerian PANRB. (2021). PermenPANRB Nomor 8 Tahun 2021 tentang Sistem Manajemen Kinerja PNS. Jakarta: KemenPANRB.",
 "Kementerian PANRB. (2022). PermenPANRB Nomor 6 Tahun 2022 tentang Pengelolaan Kinerja Pegawai ASN. Jakarta: KemenPANRB.",
 "Kementerian PANRB. (2020). PermenPANRB Nomor 32 Tahun 2020 tentang Jabatan Fungsional Pranata Komputer.",
 "Lembaga Administrasi Negara. (2021). Modul BerAKHLAK. Jakarta: LAN RI.",
 "Lembaga Administrasi Negara. (2021). Modul Pelatihan Dasar CPNS: Agenda Aktualisasi. Jakarta: LAN RI.",
 "Lembaga Administrasi Negara. (2021). Modul Smart ASN. Jakarta: LAN RI.",
 "Republik Indonesia. (2020). PP Nomor 17 Tahun 2020 tentang Perubahan PP Nomor 11 Tahun 2017 tentang Manajemen PNS. Jakarta: Setneg.",
 "Republik Indonesia. (2023). Undang-Undang Nomor 20 Tahun 2023 tentang ASN. Jakarta: Setneg.",
 "Nuxt Labs. (2025). Nuxt 4 Documentation — Nitro, Route Rules & Server API. https://nuxt.com",
 "Vue.js. (2025). Vue 3 Documentation. https://vuejs.org",
 "Turso. (2025). LibSQL Client Documentation. https://docs.turso.tech",
]
for r in refs:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.first_line_indent = Cm(-1.0)
    p.paragraph_format.left_indent = Cm(1.0)
    # hanging indent for bibliography
    run = p.add_run(r)
    run.font.name='Times New Roman'
    run.font.size=Pt(12)

doc.add_page_break()

# ============================================================
# LAMPIRAN
# ============================================================
add_heading_center('LAMPIRAN', level=1)
for i,txt in enumerate([
 "Screenshot SIPERSA (Login, Dashboard 8 KPI, Daftar Surat Masuk, Detail + Timeline Disposisi, Arsip Retensi)",
 "User Manual SIPERSA (docs/panduan/*.md — 17 bab) — PDF",
 "Draft SOP Persuratan Digital UPTD Tekkomdik (alur paperless, peran admin/staff/pimpinan, penomoran, retensi)",
 "Dokumentasi konsultasi dengan Mentor (lembar persetujuan + foto)",
 "Dokumentasi sosialisasi & pendampingan (daftar hadir 32 pegawai + foto + post-test)",
 "Hasil uji coba & penyempurnaan (12 bugfix + retest 3 peran)",
 "Tabel APKL & RACI Stakeholder",
 "Diagram Arsitektur SIPERSA, ERD, & Alur Penomoran (server/utils/no.ts)",
],1):
    add_para(f"Lampiran {i}. {txt}", space_after=4)

# Save — handle locked file in tmp
import time
out_tmp = r'C:\Users\Admin\AppData\Local\Temp\opencode\laporan-aktualisasi-sipersa.docx'
out_final = r'D:\Project\sipersa\tmp\laporan-aktualisasi-sipersa.docx'
doc.save(out_tmp)
print(f'Saved tmp: {out_tmp}')
print(f'Paragraphs: {len(doc.paragraphs)}  Tables: {len(doc.tables)}  Headings: {len([p for p in doc.paragraphs if p.style.name.startswith("Heading")])}')
# try copy to project tmp with retries
for attempt in range(5):
    try:
        if os.path.exists(out_final):
            os.remove(out_final)
        import shutil
        shutil.copy2(out_tmp, out_final)
        print(f'Copied to: {out_final}  Size: {os.path.getsize(out_final)} bytes')
        break
    except PermissionError as e:
        print(f'Attempt {attempt+1} locked: {e}')
        time.sleep(1)
else:
    print(f'NOTE: final copy locked, file available at {out_tmp}')
