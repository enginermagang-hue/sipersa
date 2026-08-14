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

export function toIntOrNull(v: string | undefined): number | null {
  if (v === undefined || v === '' || v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
