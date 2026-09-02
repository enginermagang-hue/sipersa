import { defineNitroPlugin } from 'nitropack/runtime'
import { migrate } from '../utils/migrate'

export default defineNitroPlugin(async () => {
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await migrate()
      if (attempt > 1) console.log(`[migrate] succeeded on attempt ${attempt}`)
      return
    } catch (e: any) {
      const isTimeout = e?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || e?.message?.includes('fetch failed')
      if (isTimeout && attempt < maxRetries) {
        const delay = attempt * 2000
        console.warn(`[migrate] attempt ${attempt} timeout, retrying in ${delay}ms...`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      console.error('[migrate] failed:', e)
      return
    }
  }
})
