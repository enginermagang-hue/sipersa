import { createClient } from '@libsql/client'
import { config } from 'dotenv'
config({ path: 'D:/project/sipersa/.env' })
const db = createClient({ url: process.env.NUXT_TURSO_URL, authToken: process.env.NUXT_TURSO_AUTH_TOKEN })
;(async () => {
  const existing = await db.execute({
    sql: "SELECT id FROM disposisi WHERE kepada_user_id = 1 AND surat_masuk_id = 1 AND deleted_at IS NULL LIMIT 1"
  }).then(r => r.rows)
  if (existing.length) { console.log('exists', existing[0].id); return }
  const ins = await db.execute({
    sql: "INSERT INTO disposisi (surat_masuk_id, parent_id, dari_user_id, kepada_user_id, instruksi, catatan, status, sifat_disposisi, batas_waktu) VALUES (1, NULL, 2, 1, 'Mohon ditindaklanjuti sesuai aturan kearsipan dan laporkan hasilnya paling lambat 18 Agustus', 'Catatan sekretaris', 'baru', 'segera', '2026-08-18')"
  }).catch(e => { console.log('err', e.message) })
  console.log('inserted', ins?.lastInsertRowid)
})()