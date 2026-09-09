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

  // helper: Dropbox get_thumbnail for PDF/image
  async function getDropboxThumbnail(fileId: string, w: number, h: number): Promise<{ data: Buffer; ct: string } | null> {
    try {
      const mod = await import('../../utils/dropbox')
      const token = await (mod as any).getAccessToken?.() || ''
      if (!token) return null
      // map w to Dropbox size enum (w64h64 .. w2048h1536)
      const sizeMap: Record<number,string> = {64:'w64h64',128:'w128h128',160:'w320h240',200:'w320h240',240:'w480h320',320:'w640h480',400:'w1024h768',640:'w1024h768',800:'w2048h1536'}
      let best = 320
      for (const k of [64,128,160,200,240,320,400,640,800]) if (w>=k) best=k
      const sizeTag = sizeMap[best] || 'w640h480'
      const res = await fetch('https://content.dropboxapi.com/2/files/get_thumbnail_v2', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Dropbox-API-Arg': JSON.stringify({ resource: { '.tag': 'path', path: fileId }, format: { '.tag': 'jpeg' }, size: { '.tag': sizeTag }, mode: { '.tag': 'strict' } }) }
      })
      if (!res.ok) return null
      const buf = Buffer.from(await res.arrayBuffer())
      return { data: buf, ct: res.headers.get('content-type') || 'image/jpeg' }
    } catch { return null }
  }

  let driveRes: any = null
  let data: Buffer
  let ct: string
  // If PDF + thumb, try Dropbox thumbnail first (no need to download full PDF)
  const isPdfMeta = (meta.file_name || '').toLowerCase().endsWith('.pdf')
  if (wantThumb && isPdfMeta) {
    const thumb = await getDropboxThumbnail(id as string, w, h)
    if (thumb) {
      data = thumb.data
      ct = thumb.ct
      // keep PDF thumb as JPEG (Dropbox native), optionally transcode to webp only if wantWebp and image
      if (wantWebp && ct.startsWith('image/')) {
        try {
          const sharpMod: any = await import('sharp').catch(() => null)
          const sharp = sharpMod?.default || sharpMod
          if (sharp) {
            const out = await sharp(data).resize({ width: w || undefined, height: h || undefined, fit: 'inside', withoutEnlargement: true }).sharpen({ sigma: 0.5 }).webp({ quality: qQuality }).toBuffer()
            data = out as Buffer
            ct = 'image/webp'
          }
        } catch {}
      }
      setHeader(event, 'Content-Type', ct)
      setHeader(event, 'Content-Disposition', safeDisposition(meta.file_name, inline))
      setHeader(event, 'Content-Length', String(data.length))
      const etag = `W/"${id}-pdf-${w}x${h}-q${qQuality}-${wantWebp?'webp':'jpg'}"`
      setHeader(event, 'ETag', etag)
      setHeader(event, 'Cache-Control', 'public, max-age=604800, immutable')
      setHeader(event, 'Vary', 'Accept')
      const inm = getHeader(event, 'if-none-match')
      if (inm && inm === etag) { setResponseStatus(event, 304); return null as any }
      return data
    }
    // Dropbox thumb failed -> generate placeholder icon thumb so <img> still loads (avoid broken PDF as image)
    try {
      const sharpMod: any = await import('sharp').catch(() => null)
      const sharp = sharpMod?.default || sharpMod
      if (sharp) {
        const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fef2f2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(Math.min(w,h)/8)}" fill="#dc2626" font-weight="600">PDF</text></svg>`
        const out = await sharp(Buffer.from(svg)).webp({ quality: 70 }).toBuffer()
        setHeader(event, 'Content-Type', 'image/webp')
        setHeader(event, 'Content-Disposition', safeDisposition(meta.file_name, inline))
        setHeader(event, 'Content-Length', String(out.length))
        setHeader(event, 'Cache-Control', 'public, max-age=604800, immutable')
        setHeader(event, 'X-Thumb-Fallback', 'pdf-icon')
        return out as Buffer
      }
    } catch {}
    // if sharp not available, fall through to 404 placeholder (client onerror will show icon)
    throw createError({ statusCode: 404, statusMessage: 'Preview PDF tidak tersedia' })
  }

  driveRes = await getDriveFile(id as string, meta.file_name)
  data = driveRes.data as Buffer
  ct = (driveRes.headers['content-type'] as string) || 'application/octet-stream'

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
  if (wantThumb && (ct.startsWith('image/') || isPdfMeta)) {
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
