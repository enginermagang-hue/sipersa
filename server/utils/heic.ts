export function isHeicFilename(name?: string) {
  if (!name) return false
  return /\.(heic|heif)$/i.test(name.trim())
}

export function isHeicMime(type?: string) {
  if (!type) return false
  const t = type.toLowerCase()
  return t.includes('heic') || t.includes('heif') || t === 'image/heic' || t === 'image/heif'
}

export function isHeicFile(file: { filename: string; type?: string }) {
  return isHeicFilename(file.filename) || isHeicMime(file.type)
}

function replaceExtToJpg(name: string) {
  return name.replace(/\.(heic|heif)$/i, '.jpg')
}

/**
 * Convert HEIC buffer to JPEG buffer.
 * Tries sharp first (with resize if >4000px), fallback to heic-convert.
 * Returns { data, filename, type }
 */
export async function convertHeicToJpeg(file: { data: Buffer; filename: string; type: string }): Promise<{ data: Buffer; filename: string; type: string }> {
  const outName = replaceExtToJpg(file.filename)
  // Try sharp
  try {
    const sharp = (await import('sharp').catch(() => null) as any)?.default || (await import('sharp').catch(() => null) as any)
    if (sharp) {
      let img = sharp(file.data)
      const meta = await img.metadata().catch(() => null as any)
      // downscale if large side >4000
      if (meta && (meta.width || 0) > 4000 || (meta.height || 0) > 4000) {
        img = img.resize({ width: 4000, height: 4000, fit: 'inside', withoutEnlargement: true })
      }
      const out = await img.jpeg({ quality: 92 }).toBuffer()
      return { data: out as Buffer, filename: outName, type: 'image/jpeg' }
    }
  } catch (e) {
    console.warn('[heic] sharp convert failed, fallback heic-convert', (e as any)?.message || e)
  }
  // Fallback heic-convert (pure JS)
  try {
    const mod: any = await import('heic-convert').catch(() => null)
    const fn = mod?.default || mod
    if (fn) {
      const out = await fn({ buffer: file.data, format: 'JPEG', quality: 0.92 })
      return { data: Buffer.from(out), filename: outName, type: 'image/jpeg' }
    }
  } catch (e) {
    console.warn('[heic] heic-convert failed', (e as any)?.message || e)
  }
  throw createError({ statusCode: 422, statusMessage: `Gagal konversi HEIC "${file.filename}" ke JPEG. Pastikan file valid atau upload JPEG manual.` })
}

export async function convertHeicFilesIfNeeded(files: { data: Buffer; filename: string; type: string }[]): Promise<{ data: Buffer; filename: string; type: string }[]> {
  const out: typeof files = []
  for (const f of files) {
    if (isHeicFile(f)) {
      const conv = await convertHeicToJpeg(f)
      out.push(conv)
    } else {
      out.push(f)
    }
  }
  return out
}
