import { useDb } from './db'

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export function bulanRomawi(bulan: number): string {
  return ROMAWI[(bulan - 1) % 12]
}

function pad(n: number): string {
  return n.toString().padStart(3, '0')
}

export async function generateNo(
  table: 'surat_masuk' | 'surat_keluar',
  prefix: string,
  year: number
): Promise<{ no_urut: number, no_surat: string }> {
  const db = useDb()
  const like = `%/${year}`
  const r = await db.execute({
    sql: `SELECT MAX(no_urut) as m FROM ${table} WHERE no_surat LIKE ?`,
    args: [like]
  })
  const max = (r.rows[0] as any).m as number | null
  const no_urut = (max ?? 0) + 1
  const no_surat = `${pad(no_urut)}/${prefix}/${bulanRomawi(new Date().getMonth() + 1)}/${year}`
  return { no_urut, no_surat }
}
