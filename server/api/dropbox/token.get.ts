import { getAccessToken } from '../../utils/dropbox'

const rateMap = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (!auth || auth.role !== 'staff') {
    throw createError({ statusCode: 403, statusMessage: 'Hanya staff yang dapat upload langsung' })
  }
  const key = String(auth.userId)
  const now = Date.now()
  const entry = rateMap.get(key)
  if (entry && entry.resetAt > now) {
    if (entry.count >= 20) throw createError({ statusCode: 429, statusMessage: 'Terlalu banyak permintaan token, coba lagi' })
    entry.count++
  } else {
    rateMap.set(key, { count: 1, resetAt: now + 60_000 })
  }

  const token = await getAccessToken()
  return { token, expiresIn: 300 }
})
