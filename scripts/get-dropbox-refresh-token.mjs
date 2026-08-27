// Skrip sekali-jalan: dapatkan Dropbox refresh token (offline) dan tulis ke .env.
//   node scripts/get-dropbox-refresh-token.mjs
// Refresh token hanya dikeluarkan bila authorize memakai token_access_type=offline.
// Skrip mengambil field `refresh_token` dari JSON respons secara otomatis agar
// tidak ada salah tempel (file id / access token).

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'

process.loadEnvFile('.env')

const APP_KEY = process.env.NUXT_DROPBOX_APP_KEY || ''
const APP_SECRET = process.env.NUXT_DROPBOX_APP_SECRET || ''

if (!APP_KEY || !APP_SECRET) {
  console.error('NUXT_DROPBOX_APP_KEY / NUXT_DROPBOX_APP_SECRET belum di-set di .env')
  process.exit(1)
}

const authorizeUrl =
  `https://www.dropbox.com/oauth2/authorize` +
  `?client_id=${encodeURIComponent(APP_KEY)}` +
  `&token_access_type=offline` +
  `&response_type=code`

console.log('\nBuka URL berikut di browser, login, lalu authorize app:')
console.log(`\n  ${authorizeUrl}\n`)
console.log('Dropbox akan menampilkan `code`. Copy seluruh nilai code tersebut.\n')

const rl = createInterface({ input: process.stdin, output: process.stdout })
const code = (await rl.question('Tempel code di sini: ')).trim()
rl.close()

if (!code) {
  console.error('Code kosong. Batal.')
  process.exit(1)
}

console.log('\nMenukar code dengan token...')

const body = new URLSearchParams({
  grant_type: 'authorization_code',
  code,
  client_id: APP_KEY,
  client_secret: APP_SECRET
})

const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: body.toString()
})

const json = await res.json()
if (!res.ok) {
  console.error('Gagal menukar code:', JSON.stringify(json))
  process.exit(1)
}

const refreshToken = json.refresh_token
const accessToken = json.access_token

if (!refreshToken) {
  console.error('Respons tidak mengandung `refresh_token`. Pastikan authorize URL memakai token_access_type=offline.')
  console.error('Respons:', JSON.stringify(json))
  process.exit(1)
}

// Verifikasi: pakai refresh token untuk dapat access token lalu cek account.
const vRes = await fetch('https://api.dropboxapi.com/oauth2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: APP_KEY,
    client_secret: APP_SECRET
  }).toString()
})
if (!vRes.ok) {
  console.error('Refresh token gagal diverifikasi:', await vRes.text())
  process.exit(1)
}
const vJson = await vRes.json()
const acc = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
  method: 'POST',
  headers: { Authorization: `Bearer ${vJson.access_token}` }
})
if (!acc.ok) {
  console.error('Verifikasi account gagal:', await acc.text())
  process.exit(1)
}
const me = await acc.json()
console.log(`Refresh token valid. account_id=${me.account_id}`)

// Tulis ke .env (ganti baris NUXT_DROPBOX_REFRESH_TOKEN, baris lain dipertahankan).
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env')
const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
let replaced = false
const out = lines.map((l) => {
  if (/^NUXT_DROPBOX_REFRESH_TOKEN=/.test(l)) {
    replaced = true
    return `NUXT_DROPBOX_REFRESH_TOKEN=${refreshToken}`
  }
  return l
})
if (!replaced) out.push(`NUXT_DROPBOX_REFRESH_TOKEN=${refreshToken}`)
writeFileSync(envPath, out.join('\n'))

console.log('\nBerhasil! NUXT_DROPBOX_REFRESH_TOKEN sudah ditulis ke .env.')
console.log('Restart `npm run dev` agar env baru terbaca, lalu uji download/preview surat.')
