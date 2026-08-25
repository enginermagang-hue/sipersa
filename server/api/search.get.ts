import { getQuery } from 'h3'
import { useDb } from '../utils/db'

const ph = (n: number) => Array(n).fill('?').join(',')

export default defineEventHandler(async (event) => {
  const qp = getQuery(event)
  const q = ((qp.q as string) || '').trim()
  const jenis = new Set(
    (((qp.jenis as string) || 'masuk,keluar,arsip').split(',').map((s) => s.trim()).filter(Boolean))
  )
  const sifats = (((qp.sifat as string) || '').split(',').map((s) => s.trim()).filter(Boolean))
  const statuses = (((qp.status as string) || '').split(',').map((s) => s.trim()).filter(Boolean))
  const from = (qp.date_from as string) || ''
  const to = (qp.date_to as string) || ''
  const sort = (qp.sort as string) === 'newest' ? 'newest' : 'relevance'
  const page = Math.max(1, Number(qp.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(qp.limit) || 15))
  const offset = (page - 1) * limit

  const hasFilter = sifats.length > 0 || statuses.length > 0 || !!from || !!to
  if (q.length < 2 && !hasFilter) {
    return {
      q,
      took_ms: 0,
      count: 0,
      page,
      limit,
      counts: { surat_masuk: 0, surat_keluar: 0, arsip: 0 },
      best_match: null,
      rows: []
    }
  }

  const like = `%${q}%`
  const db = useDb()
  const started = Date.now()

  // Shared dynamic fragments; arg order: sifat, status, from, to
  const sifatFrag = (alias: string) => (sifats.length ? ` AND ${alias}.sifat IN (${ph(sifats.length)})` : '')
  const dateRange = (col: string) => `${from ? ` AND ${col} >= ?` : ''}${to ? ` AND ${col} <= ?` : ''}`
  const rangeArgs = [from, to].filter(Boolean)

  type Part = { sql: string; args: any[] }
  const parts: Part[] = []

  if (jenis.has('masuk')) {
    parts.push({
      sql: `SELECT 'surat_masuk' AS _type, m.id, m.no_surat AS nomor, m.perihal AS judul,
                   m.pengirim AS entitas, m.tgl_surat AS tanggal, m.ringkasan,
                   NULL AS tahun, m.sifat, m.status, m.file_drive_id, m.klasifikasi_id, m.created_at
            FROM surat_masuk m
            WHERE m.deleted_at IS NULL
              AND (m.no_surat LIKE ? OR m.perihal LIKE ? OR m.pengirim LIKE ? OR IFNULL(m.ringkasan,'') LIKE ?)
              ${sifatFrag('m')}
              ${statuses.length ? ` AND m.status IN (${ph(statuses.length)})` : ''}
              ${dateRange('m.tgl_surat')}`,
      args: [like, like, like, like, ...sifats, ...statuses, ...rangeArgs]
    })
  }

  if (jenis.has('keluar')) {
    parts.push({
      sql: `SELECT 'surat_keluar' AS _type, m.id, m.no_surat AS nomor, m.perihal AS judul,
                   m.tujuan AS entitas, m.tgl_surat AS tanggal, NULL AS ringkasan,
                   NULL AS tahun, m.sifat, m.status, m.file_drive_id, m.klasifikasi_id, m.created_at
            FROM surat_keluar m
            WHERE m.deleted_at IS NULL
              AND (m.no_surat LIKE ? OR m.perihal LIKE ? OR m.tujuan LIKE ?)
              ${sifatFrag('m')}
              ${statuses.length ? ` AND m.status IN (${ph(statuses.length)})` : ''}
              ${dateRange('m.tgl_surat')}`,
      args: [like, like, like, ...sifats, ...statuses, ...rangeArgs]
    })
  }

  if (jenis.has('arsip')) {
    parts.push({
      sql: `SELECT 'arsip' AS _type, a.id, '' AS nomor, a.nama_dokumen AS judul,
                   a.lokasi AS entitas, COALESCE(a.tgl_arsip, a.created_at) AS tanggal, NULL AS ringkasan,
                   a.tahun, a.sifat, 'diarsipkan' AS status, a.file_drive_id, a.klasifikasi_id, a.created_at
            FROM arsip a
            WHERE a.deleted_at IS NULL
              AND (a.nama_dokumen LIKE ? OR IFNULL(a.lokasi,'') LIKE ?)
              ${sifatFrag('a')}
              ${dateRange('COALESCE(a.tgl_arsip, a.created_at)')}`,
      args: [like, like, ...sifats, ...rangeArgs]
    })
  }

  if (!parts.length) {
    return { q, took_ms: Date.now() - started, count: 0, page, limit, counts: { surat_masuk: 0, surat_keluar: 0, arsip: 0 }, best_match: null, rows: [] }
  }

  const unionSql = parts.map((p) => p.sql).join('\nUNION ALL\n')
  const unionArgs = parts.flatMap((p) => p.args)

  // Per-type + total counts in one pass
  const cntRes = await db.execute({
    sql: `SELECT _type, COUNT(*) AS c FROM (${unionSql}) u GROUP BY _type`,
    args: unionArgs
  })
  const counts: Record<string, number> = { surat_masuk: 0, surat_keluar: 0, arsip: 0 }
  for (const r of cntRes.rows as any[]) counts[r._type] = Number(r.c || 0)
  const total = Object.values(counts).reduce((s, c) => s + c, 0)

  const order =
    sort === 'relevance'
      ? `ORDER BY (CASE WHEN u.nomor LIKE ? THEN 0 ELSE 1 END), u.tanggal DESC`
      : `ORDER BY u.tanggal DESC`
  const orderArgs = sort === 'relevance' ? [like] : []

  const rowsRes = await db.execute({
    sql: `SELECT u.*, k.kode AS klasifikasi_kode
          FROM (${unionSql}) u
          LEFT JOIN klasifikasi k ON k.id = u.klasifikasi_id
          ${order}
          LIMIT ${limit} OFFSET ${offset}`,
    args: [...unionArgs, ...orderArgs]
  })

  let best: any = null
  if (total > 0) {
    const bestRes = await db.execute({
      sql: `SELECT u.*, k.kode AS klasifikasi_kode
            FROM (${unionSql}) u
            LEFT JOIN klasifikasi k ON k.id = u.klasifikasi_id
            ORDER BY u.tanggal DESC
            LIMIT 1`,
      args: unionArgs
    })
    best = bestRes.rows[0] ?? null
  }

  return {
    q,
    took_ms: Date.now() - started,
    count: total,
    page,
    limit,
    counts,
    best_match: best,
    rows: rowsRes.rows
  }
})
