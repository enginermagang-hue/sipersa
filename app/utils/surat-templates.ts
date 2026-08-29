export interface TemplateCtx {
  instansiNama: string
  instansiUnit: string
  instansiSubUnit: string
  instansiAlamat: string
  logo: string
  noSurat: string
  tglSurat: string
  tujuan: string
  perihal: string
  isi: string
  penandatangan?: { nama: string; nip: string; jabatan?: string } | null
  denganTembusan: boolean
  denganParaf: boolean
}

export interface Tpl {
  id: string
  label: string
  title?: string
  bodyBefore?: string
  opening?: string
  closing: string
  hideYth?: boolean
}

export const SURAT_TEMPLATES: Tpl[] = [
  {
    id: 'surat-biasa',
    label: 'Surat Biasa',
    opening: 'Dengan hormat,',
    closing: 'Demikian kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.'
  },
  {
    id: 'undangan',
    label: 'Undangan Resmi',
    title: 'UNDANGAN',
    opening: 'Dengan hormat,',
    bodyBefore: '<p>Dalam rangka {perihal}, kami mengundang Bapak/Ibu/Saudara(i) untuk hadir pada:</p>{{undangan_kv}}',
    closing: 'Demikian undangan ini kami sampaikan. Atas perhatian dan kehadiran Bapak/Ibu, kami ucapkan terima kasih.'
  },
  {
    id: 'pengantar',
    label: 'Surat Pengantar',
    title: 'SURAT PENGANTAR',
    opening: 'Bersama ini kami kirimkan :',
    closing: 'Demikian kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.'
  },
  {
    id: 'klarifikasi',
    label: 'Surat Klarifikasi',
    title: 'SURAT KLARIFIKASI',
    opening: 'Menanggapi {perihal}, dengan ini kami sampaikan klarifikasi sebagai berikut :',
    closing: 'Demikian klarifikasi ini kami sampaikan untuk diketahui dan dipergunakan sebagaimana mestinya.'
  },
  {
    id: 'permohonan',
    label: 'Surat Permohonan',
    title: 'SURAT PERMOHONAN',
    opening: 'Sehubungan dengan {perihal}, dengan ini kami memohon kepada Bapak/Ibu untuk :',
    closing: 'Demikian permohonan ini kami sampaikan. Atas bantuan dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.'
  },
  {
    id: 'rekomendasi',
    label: 'Surat Rekomendasi',
    title: 'SURAT REKOMENDASI',
    opening: 'Berdasarkan hasil {perihal}, dengan ini kami merekomendasikan :',
    closing: 'Demikian rekomendasi ini kami buat untuk dipergunakan sebagaimana mestinya.'
  },
  {
    id: 'surat-tugas',
    label: 'Surat Tugas',
    title: 'SURAT TUGAS',
    hideYth: true,
    bodyBefore: '<p>Yang bertanda tangan di bawah ini :</p>{{stugas1}}<p style="margin:8px 0 4px;">dengan ini menugaskan :</p>{{stugas2}}<p style="margin:8px 0 0;">untuk melaksanakan :</p>',
    closing: 'Demikian surat tugas ini dibuat untuk dipergunakan sebagaimana mestinya.'
  }
]

function kopHtml(ctx: TemplateCtx): string {
  const logoCell = ctx.logo
    ? `<td width="75" style="vertical-align:middle;padding:0;">${ctx.logo}</td>`
    : ''
  const spacer = ctx.logo ? '<td width="75" style="padding:0;"></td>' : ''
  const alamatLine = ctx.instansiAlamat
    ? `<div style="font-size:10pt;margin-top:2px;line-height:1.2;">${ctx.instansiAlamat}</div>`
    : ''
  return `<div style="margin-bottom:14px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      ${logoCell}
      <td style="text-align:center;vertical-align:middle;padding:0;">
        <div style="font-size:12pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;line-height:1.2;">${ctx.instansiNama}</div>
        <div style="font-size:12pt;font-weight:bold;text-transform:uppercase;margin-top:2px;line-height:1.2;">${ctx.instansiUnit}</div>
        <div style="font-size:12pt;font-weight:bold;text-transform:uppercase;margin-top:2px;line-height:1.2;">${ctx.instansiSubUnit}</div>
        ${alamatLine}
      </td>
      ${spacer}
    </tr>
  </table>
  <div style="border-bottom:3px double #000;"></div>
</div>`
}

function esc(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

function kvTable(rows: [string, string][], opts?: { labelWidth?: string }): string {
  const lw = opts?.labelWidth || '130px'
  const trs = rows.map(([k, v]) =>
    `<tr><td style="border:none;padding:1px 0;vertical-align:top;white-space:nowrap;width:${lw};">${k}</td><td style="border:none;padding:1px 6px;vertical-align:top;text-align:center;width:12px;">:</td><td style="border:none;padding:1px 0;vertical-align:top;">${v}</td></tr>`
  ).join('')
  return `<table border="0" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;margin:0 0 2px;width:100%;">${trs}</table>`
}

function escAttr(s: string){ return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;') }

function headerBlock(ctx: TemplateCtx): string {
  return `<div style="margin-bottom:12px;">${kvTable([
    ['Nomor', `<b id="hdr-nomor">${esc(ctx.noSurat)}</b>`],
    ['Lampiran', '-'],
    ['Perihal', `<b id="hdr-perihal">${esc(ctx.perihal)}</b>`],
  ])}</div>`
}

export function tembusanBlock(): string {
  return `<div id="blok-tembusan" style="margin-top:18px;">
  <p style="margin:0 0 2px;">Tembusan :</p>
  <p style="margin:0 0 2px;">1. Arsip</p>
  <p style="margin:0;">2. Pertinggal</p>
</div>`
}

export function ttdBlock(ctx: TemplateCtx): string {
  const nama = ctx.penandatangan?.nama || '..........................................'
  const nip = ctx.penandatangan?.nip ? `NIP. ${ctx.penandatangan.nip}` : 'NIP. .............................'
  const jabatan = ctx.penandatangan?.jabatan || ('Kepala ' + ctx.instansiUnit)
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
  <td width="30%"></td>
  <td width="30%"></td>
  <td>
  <div id="blok-ttd" style="text-align:center;margin-top:26px;">
  <p style="margin:0;">${ctx.tglSurat}</p>
  <p style="margin:0;">Mengetahui,</p>
  <p style="margin:0 0 4px;">${jabatan}</p>
  <div style="height:66px;display:flex;align-items:center;justify-content:center;background:#ffffff;">{{%ttd%}}</div>
  <p style="margin:0;font-weight:bold;text-decoration:underline;">${nama}</p>
  <p style="margin:0;">${nip}</p>
  </div>
  </td>`
}

export function parafHirarkiBlock(): string {
  const row = '<tr><td style="border:1px solid #000;padding:2px 8px;width:200px;height:26px;">&nbsp;</td><td style="border:1px solid #000;padding:2px 8px;width:90px;text-align:center;">&nbsp;</td></tr>'
  return `<div id="blok-paraf-hirarki" style="margin-top:20px;">
  <p style="margin:0 0 4px;font-weight:bold;">Paraf Hirarki :</p>
  <table style="border-collapse:collapse;font-size:11pt;">
    <tbody>
      <tr><td style="border:1px solid #000;padding:2px 8px;width:200px;font-weight:bold;background:#f3f4f6;">Jabatan</td><td style="border:1px solid #000;padding:2px 8px;width:90px;text-align:center;font-weight:bold;background:#f3f4f6;">Paraf</td></tr>
      ${row}${row}${row}
    </tbody>
  </table>
  </div>`
}

export function getTemplateById(id: string): Tpl {
  return SURAT_TEMPLATES.find((t) => t.id === id) || SURAT_TEMPLATES[0]
}

export function assembleTemplate(id: string, ctx: TemplateCtx): string {
  const tpl = getTemplateById(id)
  const title = tpl.title ? `<p style="text-align:center;font-weight:bold;text-decoration:underline;margin:0 0 12px;">${tpl.title}</p>` : ''
  let bodyBefore = tpl.bodyBefore ? tpl.bodyBefore.replace(/\{perihal\}/g, esc(ctx.perihal)) : ''
  const dot = '..........................................'
  if (bodyBefore.includes('{{undangan_kv}}')) {
    bodyBefore = bodyBefore.replace('{{undangan_kv}}', kvTable([
      ['Hari/Tanggal', dot],
      ['Waktu', dot],
      ['Tempat', dot],
      ['Acara', `<span id="kv-acara">${esc(ctx.perihal) || dot}</span>`],
    ], { labelWidth: '110px' }))
  }
  if (bodyBefore.includes('{{stugas1}}')) {
    const kv = kvTable([['Nama', dot], ['NIP', dot], ['Jabatan', dot]], { labelWidth: '90px' })
    bodyBefore = bodyBefore.replace('{{stugas1}}', kv).replace('{{stugas2}}', kv)
  }
  let openingHtml = tpl.opening ? `<p style="margin:0 0 8px;">${esc(tpl.opening).replace(/\{perihal\}/g, `<span id="opening-perihal">${esc(ctx.perihal) || '...'}</span>`)}</p>` : ''
  // handle non-undangan templates where opening contains {perihal} placeholder
  const opening = openingHtml
  const isi = ctx.isi || '<p>&nbsp;</p>'
  const tembusan = ctx.denganTembusan ? tembusanBlock() : ''
  const parafHirarki = ctx.denganParaf ? parafHirarkiBlock() : ''
  const ythBlock = tpl.hideYth ? '' : `<p style="margin:0 0 4px;">Yth. <span id="hdr-tujuan">${esc(ctx.tujuan) || '..........................................'}</span></p><p style="margin:0 0 10px;">di -<br/>Tempat</p>`
  return [
    kopHtml(ctx),
    headerBlock(ctx),
    title,
    ythBlock,
    opening,
    bodyBefore ? `<div style="margin:8px 0;">${bodyBefore}</div>` : '',
    `<div>${isi}</div>`,
    `<p style="margin:10px 0 0;">${tpl.closing}</p>`,
    ttdBlock(ctx),
    tembusan,
    parafHirarki
  ].join('\n')
}
