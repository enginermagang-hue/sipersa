import { PDFParse } from 'pdf-parse'

export async function extractPdfText(buffer: Buffer, maxChars = 500): Promise<string> {
  let parser: any = null
  try {
    parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    const raw = (result.text || '').replace(/\s+/g, ' ').trim()
    if (!raw) return ''

    if (raw.length <= maxChars) return raw

    const truncated = raw.substring(0, maxChars)
    const lastBoundary = Math.max(
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('? '),
      truncated.lastIndexOf('! ')
    )
    if (lastBoundary > maxChars * 0.4) {
      return truncated.substring(0, lastBoundary + 1)
    }
    return truncated.trimEnd() + '…'
  } catch (e: any) {
    console.error('[pdf-extract] gagal:', e?.message || e)
    return ''
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      await parser.destroy().catch(() => {})
    }
  }
}