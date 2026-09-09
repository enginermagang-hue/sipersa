import { useDb } from '../../utils/db'
import { getDriveFile } from '../../utils/dropbox'

function safeDisposition(fileName: string | null, inline: boolean) {
  const clean = (fileName || 'file').replace(/["\\\r\n]/g, '_')
  const encoded = encodeURIComponent(clean)
  return `${inline ? 'inline' : 'attachment'}; filename="${clean}"; filename*=UTF-8''${encoded}`
}

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const db = useDb()
  // cari file_drive_id dari surat masuk/keluar berdasar id file (legacy + multi)
  const res = await db.execute({
    sql: `SELECT file_drive_id, file_name FROM surat_masuk WHERE file_drive_id = ? AND deleted_at IS NULL
          UNION ALL
          SELECT file_drive_id, file_name FROM surat_keluar WHERE file_drive_id = ? AND deleted_at IS NULL
          UNION ALL
          SELECT file_drive_id, file_name FROM arsip WHERE file_drive_id = ? AND deleted_at IS NULL
          UNION ALL
          SELECT file_drive_id, file_name FROM surat_files WHERE file_drive_id = ?
          UNION ALL
          SELECT file_drive_id, file_name FROM arsip_files WHERE file_drive_id = ?
          LIMIT 1`,
    args: [id as string, id as string, id as string, id as string, id as string]
  })
  if (res.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'File tidak ditemukan' })
  const meta = res.rows[0] as any

  const inline = getQuery(event).inline === '1'
  const q = getQuery(event) as any
  const wantThumb = q.thumb === '1' || q.w || q.h
  let w = Math.min(800, Math.max(32, Number(q.w) || 0))
  let h = Math.min(800, Math.max(32, Number(q.h) || 0))
  if (wantThumb && !w && !h) { w = 320; h = 320 }
  const qQuality = Math.min(90, Math.max(30, Number(q.q) || 72))
  const wantWebp = String(q.format || 'webp').toLowerCase() === 'webp' || !q.format

  let driveRes = await getDriveFile(id as string, meta.file_name)
  let data: Buffer = driveRes.data as Buffer
  let ct: string = (driveRes.headers['content-type'] as string) || 'application/octet-stream'

  if (wantThumb && ct.startsWith('image/')) {
    try {
      const sharpMod: any = await import('sharp').catch(() => null)
      const sharp = sharpMod?.default || sharpMod
      if (sharp) {
        let pipeline = sharp(data).resize({ width: w || undefined, height: h || undefined, fit: 'inside', withoutEnlargement: true }).sharpen({ sigma: 0.6 })
        if (wantWebp) {
          const resized = await pipeline.webp({ quality: qQuality }).toBuffer()
          data = resized as Buffer
          ct = 'image/webp'
        } else {
          const resized = await pipeline.jpeg({ quality: qQuality, mozjpeg: true }).toBuffer()
          data = resized as Buffer
          ct = 'image/jpeg'
        }
      }
    } catch (e) {
      console.warn('[thumb] resize gagal', (e as any)?.message || e)
    }
  }

  setHeader(event, 'Content-Type', ct)
  setHeader(event, 'Content-Disposition', safeDisposition(meta.file_name, inline))
  setHeader(event, 'Content-Length', String(data.length))
  if (wantThumb && ct.startsWith('image/')) {
    const etag = `W/"${id}-${w}x${h}-q${qQuality}-${wantWebp?'webp':'jpg'}"`
    setHeader(event, 'ETag', etag)
    setHeader(event, 'Cache-Control', 'public, max-age=604800, immutable')
    setHeader(event, 'Vary', 'Accept')
    // handle If-None-Match
    const inm = getHeader(event, 'if-none-match')
    if (inm && inm === etag) {
      setResponseStatus(event, 304)
      return null as any
    }
  } else {
    setHeader(event, 'Cache-Control', 'no-store')
  }
  return data
})
