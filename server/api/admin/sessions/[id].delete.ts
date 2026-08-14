import { revokeSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  if (auth.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  const id = event.context.params?.id
  await revokeSession(id as string)
  return { ok: true }
})
