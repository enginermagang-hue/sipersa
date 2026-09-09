import { readMultipartFormData, type MultiPartData } from 'h3'

export interface UploadedFile {
  data: Buffer
  filename: string
  type: string
}

export async function readFormWithFile(event: any): Promise<{ fields: Record<string, string>, file: UploadedFile | null }> {
  const { fields, files } = await readFormWithFiles(event)
  return { fields, file: files[0] || null }
}

export async function readFormWithFiles(event: any): Promise<{ fields: Record<string, string>, files: UploadedFile[] }> {
  const parts = await readMultipartFormData(event)
  const fields: Record<string, string> = {}
  const files: UploadedFile[] = []
  if (parts) {
    for (const p of parts as MultiPartData[]) {
      if (p.filename) {
        // support multiple files under same or different field names
        files.push({ data: Buffer.from(p.data), filename: p.filename, type: p.type || 'application/octet-stream' })
      } else if (p.name) {
        // keep last value for duplicate field names (keep_file_ids may appear multiple times, we join with comma)
        if (fields[p.name] !== undefined) {
          fields[p.name] = `${fields[p.name]},${p.data.toString('utf8')}`
        } else {
          fields[p.name] = p.data.toString('utf8')
        }
      }
    }
  }
  return { fields, files }
}

export const MAX_UPLOAD_SIZE = 25 * 1024 * 1024
export function assertFileSize(file: UploadedFile | null, max = MAX_UPLOAD_SIZE) {
  if (file && file.data.length > max) throw createError({ statusCode: 413, statusMessage: `Ukuran file terlalu besar (maks. ${Math.round(max/1024/1024)} MB)` })
}

export function assertFilesSize(files: UploadedFile[], maxTotal = MAX_UPLOAD_SIZE) {
  let total = 0
  for (const f of files) {
    if (f.data.length > MAX_UPLOAD_SIZE) throw createError({ statusCode: 413, statusMessage: `File "${f.filename}" terlalu besar (maks. ${Math.round(MAX_UPLOAD_SIZE/1024/1024)} MB)` })
    total += f.data.length
  }
  if (total > maxTotal) throw createError({ statusCode: 413, statusMessage: `Total ukuran file terlalu besar (maks. ${Math.round(maxTotal/1024/1024)} MB, total ${ (total/1024/1024).toFixed(1)} MB)` })
}

export function parseKeepIds(v: string | undefined): number[] {
  if (!v) return []
  return v.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n > 0)
}

export function toIntOrNull(v: string | undefined): number | null {
  if (v === undefined || v === '' || v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
