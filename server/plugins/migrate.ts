import { defineNitroPlugin } from 'nitropack/runtime'
import { migrate } from '../utils/migrate'

export default defineNitroPlugin(async () => {
  try {
    await migrate()
  } catch (e) {
    console.error('[migrate] failed:', e)
  }
})
