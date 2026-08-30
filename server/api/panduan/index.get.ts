import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PANDUAN_BABS, extractHeadings } from '../../utils/panduan'

export default defineEventHandler(async (event) => {
  const root = process.cwd()

  const babs = await Promise.all(
    PANDUAN_BABS.map(async (bab) => {
      const filePath = join(root, 'docs', 'panduan', bab.file)
      let md = ''
      try {
        md = await readFile(filePath, 'utf-8')
      } catch {
        md = ''
      }
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
