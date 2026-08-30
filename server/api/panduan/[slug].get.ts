import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getBab, getPrevNext, extractHeadings } from '../../utils/panduan'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') as string
  const bab = getBab(slug)
  if (!bab) {
    throw createError({ statusCode: 404, statusMessage: 'Halaman panduan tidak ditemukan' })
  }

  const root = process.cwd()
  const filePath = join(root, 'docs', 'panduan', bab.file)
  let markdown = ''
  try {
    markdown = await readFile(filePath, 'utf-8')
  } catch {
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
