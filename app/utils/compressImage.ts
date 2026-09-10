export function isImageFile(f: File): boolean {
  const t = (f.type || '').toLowerCase()
  const n = (f.name || '').toLowerCase()
  return t.startsWith('image/') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png') || n.endsWith('.webp') || n.endsWith('.heic') || n.endsWith('.heif')
}

async function loadBitmap(file: File): Promise<{ bmp: ImageBitmap; w: number; h: number }> {
  const bmp = await createImageBitmap(file)
  return { bmp, w: bmp.width, h: bmp.height }
}

async function canvasToFile(
  bmp: ImageBitmap,
  w: number,
  h: number,
  quality: number,
  name: string
): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0, w, h)
  const blob: Blob = await new Promise((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob null'))), 'image/jpeg', quality)
  })
  const outName = name.replace(/\.(png|webp|heic|heif)$/i, '.jpg')
  return new File([blob], outName, { type: 'image/jpeg' })
}

export async function compressTo1MB(
  file: File,
  opts: { maxWidth?: number; maxSizeMB?: number } = {}
): Promise<{ file: File; originalSize: number; compressedSize: number }> {
  const maxWidth = opts.maxWidth ?? 1920
  const maxBytes = (opts.maxSizeMB ?? 1) * 1024 * 1024
  const originalSize = file.size
  if (!isImageFile(file)) return { file, originalSize, compressedSize: originalSize }
  if (file.size <= maxBytes && !file.name.toLowerCase().endsWith('.png')) {
    // still try to ensure within 1MB via lightweight check, but skip if already small jpg
    if (file.size <= maxBytes) {
      // quick path, but still need to ensure width
      try {
        const { bmp, w, h } = await loadBitmap(file)
        if (w <= maxWidth && h <= maxWidth) {
          bmp.close?.()
          return { file, originalSize, compressedSize: originalSize }
        }
        bmp.close?.()
      } catch { return { file, originalSize, compressedSize: originalSize } }
    }
  }

  let bmp: ImageBitmap | null = null
  try {
    const loaded = await loadBitmap(file)
    bmp = loaded.bmp
    let w = loaded.w
    let h = loaded.h
    if (w > maxWidth || h > maxWidth) {
      const scale = Math.min(maxWidth / w, maxWidth / h)
      w = Math.round(w * scale)
      h = Math.round(h * scale)
    }
    // try qualities
    for (const q of [0.75, 0.65, 0.55, 0.45, 0.35]) {
      const out = await canvasToFile(bmp, w, h, q, file.name)
      if (out.size <= maxBytes) {
        bmp.close?.()
        return { file: out, originalSize, compressedSize: out.size }
      }
      // if still too big, reduce dimension further on next loop
      if (q === 0.35 && out.size > maxBytes) {
        // shrink further
        w = Math.round(w * 0.85)
        h = Math.round(h * 0.85)
        if (w < 800 || h < 600) {
          bmp.close?.()
          return { file: out, originalSize, compressedSize: out.size }
        }
      }
    }
    // fallback last
    const fallback = await canvasToFile(bmp, w, h, 0.35, file.name)
    bmp.close?.()
    return { file: fallback, originalSize, compressedSize: fallback.size }
  } catch {
    bmp?.close?.()
    return { file, originalSize, compressedSize: originalSize }
  }
}
