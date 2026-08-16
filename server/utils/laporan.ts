import { useDb } from './db'

export interface LaporanFilter {
  tab: 'gabungan' | 'masuk' | 'keluar' | 'arsip'
  start: string
  end: string
  klasifikasiId: number | null
  q: string
}

const TABS = ['gabungan', 'masuk', 'keluar', 'arsip'] as const

export function parseLaporanQuery(query: any): LaporanFilter {
  const tab = TABS.includes(query.tab) ? query.tab : 'gabungan'
  const start = (query.start as string) || ''
  const end = (query.end as string) || ''
  const klasifikasiId = query.klasifikasi_id ? Number(query.klasifikasi_id) : null
  const q = (query.q as string) || ''
  return { tab, start, end, klasifikasiId, q }
}

export function validRange(f: LaporanFilter) {
  return !f.start || !f.end || f.start <= f.end
}

function between(alias: string, f: LaporanFilter) {
  const w: string[] = []
  const a: any[] = []
  if (f.start) { w.push(`${alias} >= ?`); a.push(f.start) }
  if (f.end) { w.push(`${alias} <= ?`); a.push(f.end) }
  return { sql: w.join(' AND '), args: a }
}

function masukSelect(f: LaporanFilter, withQ: boolean) {
  const b = between('sm.tgl_surat', f)
  const w = ['sm.deleted_at IS NULL']
  const a = [...b.args]
  if (b.sql) w.push(b.sql)
  if (f.klasifikasiId) { w.push('sm.klasifikasi_id = ?'); a.push(f.klasifikasiId) }
  if (withQ && f.q) {
    w.push('(sm.no_surat LIKE ? OR sm.perihal LIKE ? OR sm.pengirim LIKE ?)')
    a.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`)
  }
  return {
    sql: `SELECT 'masuk' AS jenis, sm.id AS id, sm.no_surat, sm.tgl_surat, sm.pengirim AS asal_tujuan, sm.perihal,
      COALESCE((SELECT d.status FROM disposisi d WHERE d.surat_masuk_id = sm.id AND d.deleted_at IS NULL ORDER BY d.created_at DESC LIMIT 1), 'Belum Disposisi') AS status,
      (SELECT a.lokasi FROM arsip a WHERE a.ref_masuk_id = sm.id AND a.deleted_at IS NULL LIMIT 1) AS lokasi,
      COALESCE(k.nama, '') AS klasifikasi_nama, k.id AS klasifikasi_id
    FROM surat_masuk sm
    LEFT JOIN klasifikasi k ON k.id = sm.klasifikasi_id
    WHERE ${w.join(' AND ')}`,
    args: a
  }
}

function keluarSelect(f: LaporanFilter, withQ: boolean) {
  const b = between('sk.tgl_surat', f)
  const w = ['sk.deleted_at IS NULL']
  const a = [...b.args]
  if (b.sql) w.push(b.sql)
  if (f.klasifikasiId) { w.push('sk.klasifikasi_id = ?'); a.push(f.klasifikasiId) }
  if (withQ && f.q) {
    w.push('(sk.no_surat LIKE ? OR sk.perihal LIKE ? OR sk.tujuan LIKE ?)')
    a.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`)
  }
  return {
    sql: `SELECT 'keluar' AS jenis, sk.id AS id, sk.no_surat, sk.tgl_surat, sk.tujuan AS asal_tujuan, sk.perihal,
      CASE WHEN EXISTS (SELECT 1 FROM arsip a WHERE a.ref_keluar_id = sk.id AND a.deleted_at IS NULL) THEN 'Diarsipkan' ELSE 'Terkirim' END AS status,
      (SELECT a.lokasi FROM arsip a WHERE a.ref_keluar_id = sk.id AND a.deleted_at IS NULL LIMIT 1) AS lokasi,
      COALESCE(k.nama, '') AS klasifikasi_nama, k.id AS klasifikasi_id
    FROM surat_keluar sk
    LEFT JOIN klasifikasi k ON k.id = sk.klasifikasi_id
    WHERE ${w.join(' AND ')}`,
    args: a
  }
}

function arsipSelect(f: LaporanFilter, withQ: boolean) {
  const b = between('a.tgl_arsip', f)
  const w = ['a.deleted_at IS NULL']
  const a = [...b.args]
  if (b.sql) w.push(b.sql)
  if (f.klasifikasiId) { w.push('a.klasifikasi_id = ?'); a.push(f.klasifikasiId) }
  if (withQ && f.q) {
    w.push('(COALESCE(sm.no_surat, sk.no_surat, a.nama_dokumen) LIKE ? OR COALESCE(sm.perihal, sk.perihal, a.nama_dokumen) LIKE ? OR COALESCE(sm.pengirim, sk.tujuan, a.nama_dokumen) LIKE ?)')
    a.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`)
  }
  return {
    sql: `SELECT 'arsip' AS jenis, a.id AS id,
      COALESCE(sm.no_surat, sk.no_surat, a.nama_dokumen) AS no_surat,
      COALESCE(a.tgl_arsip, sm.tgl_surat, sk.tgl_surat) AS tgl_surat,
      COALESCE(sm.pengirim, sk.tujuan, a.nama_dokumen) AS asal_tujuan,
      COALESCE(sm.perihal, sk.perihal, a.nama_dokumen) AS perihal,
      'Diarsipkan' AS status, a.lokasi, COALESCE(k.nama, '') AS klasifikasi_nama, a.klasifikasi_id
    FROM arsip a
    LEFT JOIN surat_masuk sm ON sm.id = a.ref_masuk_id
    LEFT JOIN surat_keluar sk ON sk.id = a.ref_keluar_id
    LEFT JOIN klasifikasi k ON k.id = a.klasifikasi_id
    WHERE ${w.join(' AND ')}`,
    args: a
  }
}

export async function queryLaporan(f: LaporanFilter, opts: { page: number; limit: number }) {
  const db = useDb()
  let base: string
  let args: any[]
  if (f.tab === 'arsip') {
    const sel = arsipSelect(f, true)
    base = sel.sql
    args = sel.args
  } else {
    const m = masukSelect(f, true)
    const k = keluarSelect(f, true)
    if (f.tab === 'masuk') { base = m.sql; args = m.args }
    else if (f.tab === 'keluar') { base = k.sql; args = k.args }
    else { base = `${m.sql} UNION ALL ${k.sql}`; args = [...m.args, ...k.args] }
  }

  const countRes = await db.execute({ sql: `SELECT COUNT(*) AS c FROM (${base})`, args })
  const total = (countRes.rows[0] as any).c as number
  const offset = (opts.page - 1) * opts.limit
  const rows = await db.execute({
    sql: `SELECT * FROM (${base}) ORDER BY tgl_surat DESC, id DESC LIMIT ? OFFSET ?`,
    args: [...args, opts.limit, offset]
  })
  return { total, page: opts.page, limit: opts.limit, data: rows.rows }
}

export async function laporanSummary(f: LaporanFilter) {
  const db = useDb()

  const range = (alias: string, col: string) => {
    const w: string[] = [`${alias}.deleted_at IS NULL`]
    const a: any[] = []
    if (f.start) { w.push(`${col} >= ?`); a.push(f.start) }
    if (f.end) { w.push(`${col} <= ?`); a.push(f.end) }
    if (f.klasifikasiId) { w.push(`${alias}.klasifikasi_id = ?`); a.push(f.klasifikasiId) }
    return { w: w.join(' AND '), a }
  }

  const masuk = range('sm', 'sm.tgl_surat')
  const keluar = range('sk', 'sk.tgl_surat')
  const arsip = range('a', 'a.tgl_arsip')

  const tindakW = ['d.deleted_at IS NULL', 'sm.deleted_at IS NULL', "d.status IN ('baru', 'diproses')"]
  const tindakA: any[] = []
  if (f.start) { tindakW.push('sm.tgl_surat >= ?'); tindakA.push(f.start) }
  if (f.end) { tindakW.push('sm.tgl_surat <= ?'); tindakA.push(f.end) }
  if (f.klasifikasiId) { tindakW.push('sm.klasifikasi_id = ?'); tindakA.push(f.klasifikasiId) }

  const [m, k, a, t] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) AS c FROM surat_masuk sm WHERE ${masuk.w}`, args: masuk.a }),
    db.execute({ sql: `SELECT COUNT(*) AS c FROM surat_keluar sk WHERE ${keluar.w}`, args: keluar.a }),
    db.execute({ sql: `SELECT COUNT(*) AS c FROM arsip a WHERE ${arsip.w}`, args: arsip.a }),
    db.execute({
      sql: `SELECT COUNT(DISTINCT d.surat_masuk_id) AS c
            FROM disposisi d
            JOIN surat_masuk sm ON sm.id = d.surat_masuk_id
            WHERE ${tindakW.join(' AND ')}`,
      args: tindakA
    })
  ])

  const distW = ['1=1']
  const distA: any[] = []
  if (f.start) { distW.push('x.tgl_surat >= ?'); distA.push(f.start) }
  if (f.end) { distW.push('x.tgl_surat <= ?'); distA.push(f.end) }
  if (f.klasifikasiId) { distW.push('x.klasifikasi_id = ?'); distA.push(f.klasifikasiId) }

  const klasRes = await db.execute({
    sql: `SELECT COALESCE(k.nama, 'Tanpa Klasifikasi') AS nama, COUNT(*) AS n
          FROM (
            SELECT klasifikasi_id, tgl_surat FROM surat_masuk WHERE deleted_at IS NULL
            UNION ALL
            SELECT klasifikasi_id, tgl_surat FROM surat_keluar WHERE deleted_at IS NULL
          ) x
          LEFT JOIN klasifikasi k ON k.id = x.klasifikasi_id
          WHERE ${distW.join(' AND ')}
          GROUP BY x.klasifikasi_id
          ORDER BY n DESC`,
    args: distA
  })
  const totalSurat = (m.rows[0] as any).c + (k.rows[0] as any).c
  const klasifikasi = (klasRes.rows as any[]).map((r) => ({
    nama: r.nama,
    n: r.n,
    percent: totalSurat ? Math.round((r.n / totalSurat) * 100) : 0
  }))

  return {
    kpi: {
      surat_masuk: (m.rows[0] as any).c,
      surat_keluar: (k.rows[0] as any).c,
      diarsipkan: (a.rows[0] as any).c,
      perlu_tindak_lanjut: (t.rows[0] as any).c
    },
    klasifikasi
  }
}

export async function laporanTrend() {
  const db = useDb()
  const rows = await db.execute({
    sql: `SELECT strftime('%Y-%m', tgl_surat) AS ym,
            SUM(CASE WHEN t = 'm' THEN 1 ELSE 0 END) AS masuk,
            SUM(CASE WHEN t = 'k' THEN 1 ELSE 0 END) AS keluar
          FROM (
            SELECT tgl_surat, 'm' AS t FROM surat_masuk WHERE deleted_at IS NULL AND tgl_surat <> ''
            UNION ALL
            SELECT tgl_surat, 'k' AS t FROM surat_keluar WHERE deleted_at IS NULL AND tgl_surat <> ''
          )
          WHERE tgl_surat >= strftime('%Y-%m-01', 'now', '-7 months')
          GROUP BY ym ORDER BY ym`
  })
  const byMonth = new Map<string, { masuk: number; keluar: number }>()
  for (const r of rows.rows as any[]) {
    byMonth.set(r.ym, { masuk: Number(r.masuk) || 0, keluar: Number(r.keluar) || 0 })
  }
  const out: { month: string; masuk: number; keluar: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const v = byMonth.get(ym) || { masuk: 0, keluar: 0 }
    out.push({ month: ym, ...v })
  }
  return out
}
