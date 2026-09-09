type UploadedFile = { data: Buffer; filename: string; type: string }

function isImageFile(f: UploadedFile): boolean {
  return (f.type || '').toLowerCase().startsWith('image/')
}

function replaceExtToJpg(name: string): string {
  const i = name.lastIndexOf('.')
  if (i === -1) return `${name}.jpg`
  return `${name.slice(0, i)}.jpg`
}

export function getScanUrl(): string | null {
  const cfg = useRuntimeConfig() as any
  const v = (cfg.docscanUrl || process.env.NUXT_DOCSCAN_URL || '').trim()
  if (!v) return null
  return v.replace(/\/$/, '')
}

export function isImageFilename(name?: string): boolean {
  return /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(name || '')
}
export function isImageMime(mime?: string): boolean {
  return String(mime || '').toLowerCase().startsWith('image/')
}
export function isImageLike(name?: string, mime?: string): boolean {
  return isImageMime(mime) || isImageFilename(name)
}

export async function scanImageBuffer(data: Buffer, filename: string, mime: string): Promise<Buffer> {
  const scanUrl = getScanUrl()
  if (!scanUrl) throw createError({ statusCode: 503, statusMessage: 'Layanan scan dokumen belum dikonfigurasi (NUXT_DOCSCAN_URL kosong)' })
  const fd = new FormData()
  fd.append('file', new Blob([data], { type: mime || 'image/jpeg' }), filename)
  let res: Response
  try {
    res = await fetch(`${scanUrl}/api/scan`, { method: 'POST', body: fd, signal: AbortSignal.timeout(30_000) })
  } catch (e: any) {
    throw createError({ statusCode: 502, statusMessage: `Gagal menghubungi layanan scan dokumen: ${e?.message || e}` })
  }
  if (!res.ok) {
    let msg = `Kertas tidak terdeteksi pada file "${filename}" — foto ulang dengan kertas memenuhi frame dan background kontras`
    try {
      const j = await res.json() as any
      if (j?.detail) msg = String(j.detail)
    } catch { try { const t = await res.text(); if (t) msg = t.slice(0, 400) } catch {} }
    throw createError({ statusCode: res.status === 422 ? 422 : 502, statusMessage: msg })
  }
  return Buffer.from(await res.arrayBuffer())
}

export async function straightenImageFiles(files: UploadedFile[]): Promise<UploadedFile[]> {
  const scanUrl = getScanUrl()
  if (!scanUrl) return files
  const out: UploadedFile[] = []
  for (const f of files) {
    if (!isImageFile(f)) { out.push(f); continue }
    const buf = await scanImageBuffer(f.data, f.filename, f.type)
    out.push({ data: buf, filename: replaceExtToJpg(f.filename), type: 'image/jpeg' })
  }
  return out
}
