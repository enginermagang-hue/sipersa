import { processOutboxBatch } from '../utils/fonnte'
export default defineNitroPlugin(() => {
  const enabled = (useRuntimeConfig() as any).fonnteEnabled === true || (useRuntimeConfig() as any).fonnteEnabled === 'true'
  if (!enabled) return
  setInterval(() => processOutboxBatch().catch(e => console.error('[WA queue]', e)), 15000)
})
