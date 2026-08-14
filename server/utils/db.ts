import { createClient } from '@libsql/client'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

type DB = ReturnType<typeof createClient>

let _client: DB | null = null

export function useDb(): DB {
  if (!_client) {
    const config = useRuntimeConfig()
    const raw = (config.tursoUrl as string) || 'file:.data/local.db'
    let url = raw
    if (raw.startsWith('file:')) {
      const filePath = resolve(raw.slice(5))
      mkdirSync(dirname(filePath), { recursive: true })
      url = `file:${filePath}`
    }
    const authToken = (config.tursoAuthToken as string) || ''
    _client = createClient({ url, authToken })
  }
  return _client
}
