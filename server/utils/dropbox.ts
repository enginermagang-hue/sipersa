export async function uploadToDrive(fileName: string, mimeType: string, data: Buffer) {
  const token = (useRuntimeConfig().dropboxToken as string)
  if (!token) throw createError({ statusCode: 500, statusMessage: 'Dropbox token belum dikonfigurasi' })

  const safe = fileName.replace(/[\\/]/g, '-')
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path: `/${safe}`, mode: 'add', autorename: true }),
      'Content-Type': 'application/octet-stream'
    },
    body: data
  })
  if (!res.ok) {
    const text = await res.text()
    throw createError({ statusCode: 502, statusMessage: `Upload Dropbox gagal: ${text}` })
  }
  const json = await res.json() as any
  return { id: json.id, name: json.name }
}

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

function inferMime(fileName?: string): string | null {
  if (!fileName) return null
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext ? (EXT_MIME[ext] ?? null) : null
}

export async function getDriveFile(fileId: string, fileName?: string) {
  const token = (useRuntimeConfig().dropboxToken as string)
  const res = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path: fileId })
    }
  })
  if (!res.ok) {
    throw createError({ statusCode: 404, statusMessage: 'File tidak ditemukan di Dropbox' })
  }
  const buf = Buffer.from(await res.arrayBuffer())
  let ct = res.headers.get('content-type') || 'application/octet-stream'
  if (ct === 'application/octet-stream') {
    ct = inferMime(fileName) ?? ct
  }
  const cl = res.headers.get('content-length') || String(buf.length)
  return { headers: { 'content-type': ct, 'content-length': cl }, data: buf }
}

export async function deleteDriveFile(fileId: string) {
  const token = (useRuntimeConfig().dropboxToken as string)
  await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: fileId })
  })
}
