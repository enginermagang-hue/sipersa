import { useDb } from '../utils/db'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  const db = useDb()
  const count = async (sql: string, args: any[] = []) => {
    const r = await db.execute({ sql, args })
    return (r.rows[0] as any).c as number
  }
  const masuk = await count('SELECT COUNT(*) as c FROM surat_masuk WHERE deleted_at IS NULL')
  const keluar = await count('SELECT COUNT(*) as c FROM surat_keluar WHERE deleted_at IS NULL')
  const arsip = await count('SELECT COUNT(*) as c FROM arsip WHERE deleted_at IS NULL')
  const disposisiSaya = await count(
    'SELECT COUNT(*) as c FROM disposisi WHERE kepada_user_id = ? AND deleted_at IS NULL AND status != \'selesai\'',
    [auth.userId]
  )
  return { masuk, keluar, arsip, disposisiSaya }
})
