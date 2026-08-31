import { PANDUAN_BABS, extractHeadings } from '../../utils/panduan'

export default defineEventHandler(async (event) => {
  const panduanStorage = useStorage('assets:panduan')
  const serverStorage = useStorage('assets:server')

  const babs = await Promise.all(
    PANDUAN_BABS.map(async (bab) => {
      let md = (await panduanStorage.getItem(bab.file)) as string | null
      if (!md) md = (await serverStorage.getItem(`panduan/${bab.file}`)) as string | null
      md = md || ''
      const headings = extractHeadings(md, 3, 3)
      return { ...bab, headings, file: `/docs/panduan/${bab.file}` }
    })
  )

  const totalHeadings = babs.reduce((s, b) => s + b.headings.length, 0)
  const etag = `W/"panduan-index-${babs.length}-${totalHeadings}"`
  const ifNoneMatch = getHeader(event, 'if-none-match')
  if (ifNoneMatch === etag) {
    setResponseStatus(event, 304)
    return ''
  }
  setHeader(event, 'ETag', etag)
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  return { babs, count: babs.length }
})
