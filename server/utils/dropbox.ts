const TOKEN_ENDPOINT = 'https://api.dropboxapi.com/oauth2/token'
const TOKEN_EXPIRY_BUFFER_MS = 60_000

let cachedToken: { token: string; expiresAt: number } | null = null
let refreshing: Promise<string> | null = null

async function getAccessToken(): Promise<string> {
  const config = useRuntimeConfig()
  const refreshToken = (config.dropboxRefreshToken as string) || ''

  if (!refreshToken) {
    const staticToken = (config.dropboxToken as string) || ''
    if (!staticToken) throw createError({ statusCode: 500, statusMessage: 'Dropbox token belum dikonfigurasi' })
    return staticToken
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS) {
    return cachedToken.token
  }

  if (refreshing) return refreshing

  const appKey = (config.dropboxAppKey as string) || ''
  const appSecret = (config.dropboxAppSecret as string) || ''
  if (!appKey || !appSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Dropbox app key/secret belum dikonfigurasi (untuk refresh token)' })
  }

  refreshing = (async () => {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: appKey,
      client_secret: appSecret
    })
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[Dropbox] refresh token gagal', { status: res.status, body: text.slice(0, 300) })
      throw createError({ statusCode: 502, statusMessage: `Gagal refresh token Dropbox (${res.status}): ${text.slice(0, 200)}` })
    }
    const json = await res.json() as any
    cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in || 14400) * 1000 }
    return cachedToken.token
  })().finally(() => {
    refreshing = null
  })

  return refreshing
}

function extractDropboxTag(bodyText: string): string {
  try {
    const obj = JSON.parse(bodyText)
    const candidates: string[] = []
    if (obj?.error?.['.tag']) candidates.push(String(obj.error['.tag']))
    if (obj?.error?.path?.['.tag']) candidates.push(String(obj.error.path['.tag']))
    if (typeof obj?.error_summary === 'string') {
      candidates.push(obj.error_summary.split('/')[0])
    }
    if (typeof obj?.user_message?.text === 'string') {
      try {
        const inner = JSON.parse(obj.user_message.text)
        if (inner?.error?.['.tag']) candidates.push(String(inner.error['.tag']))
        if (typeof inner?.error_summary === 'string') candidates.push(inner.error_summary.split('/')[0])
      } catch { /* ignore nested parse */ }
    }
    return [...new Set(candidates)].join('|')
  } catch {
    return ''
  }
}

function mapDropboxError(status: number, tag: string, scopeFor: 'read' | 'write', summary: string) {
  const tokenErrs = ['expired_access_token', 'invalid_access_token', 'invalid_token', 'token_expired', 'expired']
  const scopeErrs = ['no_permission', 'missing_scope', 'insufficient_permissions', 'user_not_found', 'not_allowed']
  const notFoundErrs = ['not_found', 'path/not_found']

  if (status === 401 || tokenErrs.some((t) => tag.includes(t))) {
    return { statusCode: 401, statusMessage: 'Token Dropbox tidak valid atau kedaluwarsa. Perbarui NUXT_DROPBOX_TOKEN di .env.' }
  }
  if (status === 403 || scopeErrs.some((t) => tag.includes(t))) {
    return {
      statusCode: 403,
      statusMessage: scopeFor === 'read'
        ? 'Token Dropbox tidak memiliki izin baca file (scope files.content.read)'
        : 'Token Dropbox tidak memiliki izin tulis file (scope files.content.write)'
    }
  }
  if (status === 404 || notFoundErrs.some((t) => tag.includes(t))) {
    return { statusCode: 404, statusMessage: 'File tidak ditemukan di Dropbox' }
  }
  if (status === 429 || tag.includes('rate_limit') || tag.includes('too_many')) {
    return { statusCode: 429, statusMessage: 'Terlalu banyak permintaan ke Dropbox, coba lagi nanti' }
  }
  return { statusCode: 502, statusMessage: `Dropbox error (${status}): ${summary || tag || 'unknown'}` }
}

export const DROPBOX_FOLDERS = {
  SM: 'Surat Masuk',
  SK: 'Surat Keluar',
  ARSIP: 'Arsip',
  TT: 'Tanda Tangan'
} as const

export type DropboxFolder = typeof DROPBOX_FOLDERS[keyof typeof DROPBOX_FOLDERS]

export async function uploadToDrive(fileName: string, mimeType: string, data: Buffer, folder?: DropboxFolder) {
  const token = await getAccessToken()

  const safe = fileName.replace(/[\\/]/g, '-')
  const path = folder ? `/${folder}/${safe}` : `/${safe}`
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: true }),
      'Content-Type': 'application/octet-stream'
    },
    body: data
  })
  if (!res.ok) {
    const text = await res.text()
    const tag = extractDropboxTag(text)
    console.error('[Dropbox] upload gagal', { status: res.status, tag, body: text.slice(0, 300) })
    throw createError(mapDropboxError(res.status, tag, 'write', text.slice(0, 200)))
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
  const token = await getAccessToken()
  const res = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path: fileId })
    }
  })
  if (!res.ok) {
    const text = await res.text()
    const tag = extractDropboxTag(text)
    console.error('[Dropbox] download gagal', { fileId, status: res.status, tag, body: text.slice(0, 300) })
    throw createError(mapDropboxError(res.status, tag, 'read', text.slice(0, 200)))
  }
  const buf = Buffer.from(await res.arrayBuffer())
  let ct = res.headers.get('content-type') || 'application/octet-stream'
  if (ct === 'application/octet-stream') {
    ct = inferMime(fileName) ?? ct
  }
  const cl = res.headers.get('content-length') || String(buf.length)
  return { headers: { 'content-type': ct, 'content-length': cl }, data: buf }
}

export async function moveDriveFile(fileId: string, folder: DropboxFolder) {
  const token = await getAccessToken()

  const meta = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: fileId })
  })
  if (!meta.ok) {
    const text = await meta.text()
    const tag = extractDropboxTag(text)
    console.error('[Dropbox] get_metadata gagal', { fileId, status: meta.status, tag, body: text.slice(0, 300) })
    throw createError(mapDropboxError(meta.status, tag, 'read', text.slice(0, 200)))
  }
  const metaJson = await meta.json() as any
  const currentPath: string = metaJson.path_display || metaJson.path_lower || ''

  if (new RegExp(`^/${escapeRegExp(folder)}/`).test(currentPath)) {
    return { moved: false, path: currentPath }
  }

  const baseName = currentPath.split('/').pop() || ''
  const toPath = `/${folder}/${baseName}`
  const res = await fetch('https://api.dropboxapi.com/2/files/move_v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_path: currentPath, to_path: toPath })
  })
  if (!res.ok) {
    const text = await res.text()
    const tag = extractDropboxTag(text)
    console.error('[Dropbox] move gagal', { from: currentPath, to: toPath, status: res.status, tag, body: text.slice(0, 300) })
    throw createError(mapDropboxError(res.status, tag, 'write', text.slice(0, 200)))
  }
  return { moved: true, path: toPath }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function deleteDriveFile(fileId: string) {
  const token = await getAccessToken()
  await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: fileId })
  })
}
