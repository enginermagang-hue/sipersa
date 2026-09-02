import { readMultipartFormData, type MultiPartData } from 'h3'

export interface UploadedFile {
  data: Buffer
  filename: string
  type: string
}

export async function readFormWithFile(event: any): Promise<{ fields: Record<string, string>, file: UploadedFile | null }> {
  const parts = await readMultipartFormData(event)
  const fields: Record<string, string> = {}
  let file: UploadedFile | null = null
  if (parts) {
    for (const p of parts as MultiPartData[]) {
      if (p.filename) {
        file = { data: Buffer.from(p.data), filename: p.filename, type: p.type || 'application/octet-stream' }
      } else if (p.name) {
        fields[p.name] = p.data.toString('utf8')
      }
    }
  }
  return { fields, file }
}

export const MAX_UPLOAD_SIZE = 25 * 1024 * 1024
export function assertFileSize(file: UploadedFile | null, max = MAX_UPLOAD_SIZE) {
  if (file && file.data.length > max) throw createError({ statusCode: 413, statusMessage: `Ukuran file terlalu besar (maks. ${Math.round(max/1024/1024)} MB)` })
}

export function toIntOrNull(v: string | undefined): number | null {
  if (v === undefined || v === '' || v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
