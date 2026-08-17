import { generateNo } from '../../utils/no'

export default defineEventHandler(async () => {
  const year = new Date().getFullYear()
  return generateNo('surat_keluar', 'SK-INST', year)
})
