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
  penandatangan?: { nama: string; nip: string } | null
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
    bodyBefore: '<p>Dalam rangka {perihal}, kami mengundang Bapak/Ibu/Saudara(i) untuk hadir pada:</p><p>Hari/Tanggal : ..........................................<br/>Waktu&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ..........................................<br/>Tempat&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ..........................................<br/>Acara&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {perihal}</p>',
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
    bodyBefore: '<p>Yang bertanda tangan di bawah ini :</p><p>Nama&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ..........................................<br/>NIP&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ..........................................<br/>Jabatan&nbsp;&nbsp;&nbsp;&nbsp;: ..........................................</p><p>dengan ini menugaskan :</p><p>Nama&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ..........................................<br/>NIP&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ..........................................<br/>Jabatan&nbsp;&nbsp;&nbsp;&nbsp;: ..........................................</p><p>untuk melaksanakan :</p>',
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
        <div style="font-size:14pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;line-height:1.2;">${ctx.instansiNama}</div>
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

function headerBlock(ctx: TemplateCtx): string {
  return `<div style="margin-bottom:12px;">
  <div>Nomor : <b>${ctx.noSurat}</b></div>
  <div>Lampiran : -</div>
  <div>Perihal : <b>${ctx.perihal}</b></div>
</div>`
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
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
  <td width="30%"></td>
  <td width="30%"></td>
  <td>
  <div id="blok-ttd" style="text-align:center;margin-top:26px;">
  <p style="margin:0;">${ctx.tglSurat}</p>
  <p style="margin:0;">Mengetahui,</p>
  <p style="margin:0 0 4px;">Kepala ${ctx.instansiUnit}</p>
  <div style="height:66px;"></div>
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
  const bodyBefore = tpl.bodyBefore ? tpl.bodyBefore.replace(/\{perihal\}/g, ctx.perihal) : ''
  const opening = tpl.opening ? `<p style="margin:0 0 8px;">${tpl.opening}</p>` : ''
  const isi = ctx.isi || '<p>&nbsp;</p>'
  const tembusan = ctx.denganTembusan ? tembusanBlock() : ''
  const parafHirarki = ctx.denganParaf ? parafHirarkiBlock() : ''
  return [
    kopHtml(ctx),
    headerBlock(ctx),
    title,
    `<p style="margin:0 0 4px;">Yth. ${ctx.tujuan}</p><p style="margin:0 0 10px;">di -<br/>Tempat</p>`,
    bodyBefore,
    opening,
    `<div>${isi}</div>`,
    `<p style="margin:10px 0 0;">${tpl.closing}</p>`,
    ttdBlock(ctx),
    tembusan,
    parafHirarki
  ].join('\n')
}
