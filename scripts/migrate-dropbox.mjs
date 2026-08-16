// Skrip sekali-jalan: memindahkan file Dropbox lama (di root) ke folder yang sesuai.
//   node scripts/migrate-dropbox.mjs
// Id file Dropbox stabil saat dipindah, jadi isi tabel DB tidak perlu diubah.
// Idempotent — aman dijalankan ulang.

import { createClient } from '@libsql/client'

process.loadEnvFile('.env')

const FOLDERS = {
  SM: 'Surat Masuk',
  SK: 'Surat Keluar',
  ARSIP: 'Arsip'
}

let cachedToken = null
let refreshing = null

async function getAccessToken() {
  const refreshToken = process.env.NUXT_DROPBOX_REFRESH_TOKEN || ''
  if (!refreshToken) {
    const staticToken = process.env.NUXT_DROPBOX_TOKEN || ''
    if (!staticToken) throw new Error('NUXT_DROPBOX_TOKEN / NUXT_DROPBOX_REFRESH_TOKEN belum di-set di .env')
    return staticToken
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token
  if (refreshing) return refreshing
  const appKey = process.env.NUXT_DROPBOX_APP_KEY || ''
  const appSecret = process.env.NUXT_DROPBOX_APP_SECRET || ''
  if (!appKey || !appSecret) throw new Error('NUXT_DROPBOX_APP_KEY / NUXT_DROPBOX_APP_SECRET belum di-set di .env (untuk refresh token)')
  refreshing = (async () => {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: appKey,
      client_secret: appSecret
    })
    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Gagal refresh token Dropbox (${res.status}): ${text.slice(0, 200)}`)
    }
    const json = await res.json()
    cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in || 14400) * 1000 }
    return cachedToken.token
  })().finally(() => { refreshing = null })
  return refreshing
}

async function getMetadata(token, fileId) {
  const res = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: fileId })
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`get_metadata ${fileId} gagal (${res.status}): ${text.slice(0, 200)}`)
  }
  const json = await res.json()
  if (!json.path_display) throw new Error(`get_metadata ${fileId}: tidak ada path (mungkin folder/deleted?)`)
  return json.path_display
}

async function moveFile(token, fromPath, toPath) {
  const res = await fetch('https://api.dropboxapi.com/2/files/move_v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_path: fromPath, to_path: toPath })
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`move ${fromPath} -> ${toPath} gagal (${res.status}): ${text.slice(0, 200)}`)
  }
}

function isAlreadyInFolder(path, folder) {
  return path === `/${folder}` || path.startsWith(`/${folder}/`)
}

async function main() {
  const db = createClient({
    url: process.env.NUXT_TURSO_URL || 'file:.data/local.db',
    authToken: process.env.NUXT_TURSO_AUTH_TOKEN
  })

  const targets = []
  const tables = [
    { table: 'surat_masuk', folder: FOLDERS.SM },
    { table: 'surat_keluar', folder: FOLDERS.SK },
    { table: 'arsip', folder: FOLDERS.ARSIP }
  ]
  for (const { table, folder } of tables) {
    const res = await db.execute({
      sql: `SELECT id, file_drive_id FROM ${table} WHERE deleted_at IS NULL AND file_drive_id IS NOT NULL AND file_drive_id != ''`
    })
    for (const row of res.rows) targets.push({ table, id: row.id, fileId: row.file_drive_id, folder })
  }

  console.log(`Ditemukan ${targets.length} file yang terhubung ke DB.\n`)

  if (targets.length === 0) {
    console.log('Tidak ada file untuk dipindah.')
    return
  }

  const token = await getAccessToken()
  let moved = 0
  let already = 0
  let failed = 0

  for (const t of targets) {
    try {
      const current = await getMetadata(token, t.fileId)
      if (isAlreadyInFolder(current, t.folder)) {
        already++
        console.log(`[ok]   ${t.table} #${t.id}: sudah di folder "${t.folder}" (${current})`)
        continue
      }
      const baseName = current.split('/').pop()
      const toPath = `/${t.folder}/${baseName}`
      await moveFile(token, current, toPath)
      moved++
      console.log(`[pindah] ${t.table} #${t.id}: ${current} -> ${toPath}`)
    } catch (err) {
      failed++
      console.error(`[GAGAL] ${t.table} #${t.id} (${t.fileId}): ${err.message}`)
    }
  }

  console.log(`\nRingkasan: ${moved} dipindah, ${already} sudah benar, ${failed} gagal.`)
  if (failed > 0) console.log('File yang gagal tetap utuh di lokasi lama — jalankan ulang skrip setelah diperbaiki.')
}

main().catch((err) => {
  console.error('Migrasi gagal:', err.message)
  process.exit(1)
})
