import { getBab, getPrevNext, extractHeadings } from '../../utils/panduan'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') as string
  const bab = getBab(slug)
  if (!bab) {
    throw createError({ statusCode: 404, statusMessage: 'Halaman panduan tidak ditemukan' })
  }

  // Try assets:panduan (nitro serverAssets) then assets:server (server/assets/panduan)
  let markdown: string | null = null
  for (const base of ['assets:panduan', 'assets:server'] as const) {
    const storage = useStorage(base as any)
    const key = base === 'assets:server' ? `panduan/${bab.file}` : bab.file
    markdown = (await storage.getItem(key)) as string | null
    if (markdown) break
  }
  if (!markdown) {
    throw createError({ statusCode: 404, statusMessage: 'File panduan tidak ditemukan' })
  }

  const headings = extractHeadings(markdown, 3, 3)
  const { prev, next } = getPrevNext(slug)

  const etag = `W/"${slug}-${Buffer.byteLength(markdown).toString(16)}-${headings.length}"`
  const ifNoneMatch = getHeader(event, 'if-none-match')
  if (ifNoneMatch === etag) {
    setResponseStatus(event, 304)
    return ''
  }
  setHeader(event, 'ETag', etag)
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  return {
    bab,
    markdown,
    headings,
    prev,
    next,
    file: `/docs/panduan/${bab.file}`,
  }
})
