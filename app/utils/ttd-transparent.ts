export async function toTransparentPng(dataUrl: string, threshold = 240): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth; c.height = img.naturalHeight
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const d = ctx.getImageData(0, 0, c.width, c.height)
        for (let i = 0; i < d.data.length; i += 4) {
          const avg = (d.data[i] + d.data[i+1] + d.data[i+2]) / 3
          if (avg > threshold) d.data[i+3] = 0
          else if (avg > threshold - 20) d.data[i+3] = Math.round(255 * (1 - (avg - (threshold-20))/20) * 0.3)
        }
        ctx.putImageData(d, 0, 0)
        resolve(c.toDataURL('image/png'))
      } catch { resolve(dataUrl) }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
