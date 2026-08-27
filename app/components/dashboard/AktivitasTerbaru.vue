<script setup lang="ts">
defineProps<{ items: any[]; pending?: boolean }>()
function metaFor(action: string, entity: string) {
  const a = (action||'').toUpperCase()
  const e = (entity||'').toLowerCase()
  const byAction: Record<string, {icon:string, bg:string, color:string}> = {
    LOGIN: {icon:'i-lucide-log-in', bg:'bg-success/10 dark:bg-success/20', color:'text-success'},
    LOGOUT: {icon:'i-lucide-log-out', bg:'bg-elevated dark:bg-neutral-800', color:'text-muted'},
    CREATE_SURAT_MASUK: {icon:'i-lucide-inbox', bg:'bg-sky-500/10 dark:bg-sky-500/20', color:'text-sky-500'},
    UPDATE_SURAT_MASUK: {icon:'i-lucide-pencil', bg:'bg-amber-500/10 dark:bg-amber-500/20', color:'text-amber-500'},
    DELETE_SURAT_MASUK: {icon:'i-lucide-trash-2', bg:'bg-red-500/10 dark:bg-red-500/20', color:'text-red-500'},
    CREATE_SURAT_KELUAR: {icon:'i-lucide-send', bg:'bg-emerald-500/10 dark:bg-emerald-500/20', color:'text-emerald-500'},
    UPDATE_SURAT_KELUAR: {icon:'i-lucide-pencil', bg:'bg-amber-500/10 dark:bg-amber-500/20', color:'text-amber-500'},
    SUBMIT_SURAT_KELUAR: {icon:'i-lucide-send-horizontal', bg:'bg-sky-500/10 dark:bg-sky-500/20', color:'text-sky-500'},
    APPROVE_SURAT_KELUAR: {icon:'i-lucide-check', bg:'bg-success/10 dark:bg-success/20', color:'text-success'},
    REJECT_SURAT_KELUAR: {icon:'i-lucide-x', bg:'bg-red-500/10 dark:bg-red-500/20', color:'text-red-500'},
    CREATE_DISPOSISI: {icon:'i-lucide-share-2', bg:'bg-amber-500/10 dark:bg-amber-500/20', color:'text-amber-500'},
    TERUSKAN_DISPOSISI: {icon:'i-lucide-forward', bg:'bg-violet-500/10 dark:bg-violet-500/20', color:'text-violet-500'},
    UPDATE_DISPOSISI: {icon:'i-lucide-pencil', bg:'bg-amber-500/10 dark:bg-amber-500/20', color:'text-amber-500'},
    CREATE_ARSIP: {icon:'i-lucide-archive', bg:'bg-violet-500/10 dark:bg-violet-500/20', color:'text-violet-500'},
    DELETE_ARSIP: {icon:'i-lucide-trash-2', bg:'bg-red-500/10 dark:bg-red-500/20', color:'text-red-500'},
    RESTORE_ARSIP: {icon:'i-lucide-archive-restore', bg:'bg-success/10 dark:bg-success/20', color:'text-success'},
    DESTROY_ARSIP: {icon:'i-lucide-trash-2', bg:'bg-red-500/10 dark:bg-red-500/20', color:'text-red-500'},
    CREATE_USER: {icon:'i-lucide-user-plus', bg:'bg-violet-500/10 dark:bg-violet-500/20', color:'text-violet-500'},
    UPDATE_USER: {icon:'i-lucide-user-pen', bg:'bg-amber-500/10 dark:bg-amber-500/20', color:'text-amber-500'},
    DELETE_USER: {icon:'i-lucide-user-x', bg:'bg-red-500/10 dark:bg-red-500/20', color:'text-red-500'},
    UPDATE_PROFILE: {icon:'i-lucide-user-pen', bg:'bg-violet-500/10 dark:bg-violet-500/20', color:'text-violet-500'},
    UPLOAD_TTD: {icon:'i-lucide-signature', bg:'bg-violet-500/10 dark:bg-violet-500/20', color:'text-violet-500'},
  }
  if (byAction[a]) return byAction[a]
  if (a.startsWith('CREATE_')) return {icon:'i-lucide-plus', bg:'bg-success/10 dark:bg-success/20', color:'text-success'}
  if (a.startsWith('UPDATE_')) return {icon:'i-lucide-pencil', bg:'bg-amber-500/10 dark:bg-amber-500/20', color:'text-amber-500'}
  if (a.startsWith('DELETE_')) return {icon:'i-lucide-trash-2', bg:'bg-red-500/10 dark:bg-red-500/20', color:'text-red-500'}
  if (a.startsWith('EXPORT')) return {icon:'i-lucide-download', bg:'bg-elevated dark:bg-neutral-800', color:'text-muted'}
  if (a.includes('LOGIN')) return {icon:'i-lucide-log-in', bg:'bg-success/10 dark:bg-success/20', color:'text-success'}
  const byEntity: Record<string, {icon:string, bg:string, color:string}> = {
    surat_masuk: {icon:'i-lucide-inbox', bg:'bg-sky-500/10 dark:bg-sky-500/20', color:'text-sky-500'},
    surat_keluar: {icon:'i-lucide-send', bg:'bg-emerald-500/10 dark:bg-emerald-500/20', color:'text-emerald-500'},
    disposisi: {icon:'i-lucide-share-2', bg:'bg-amber-500/10 dark:bg-amber-500/20', color:'text-amber-500'},
    arsip: {icon:'i-lucide-archive', bg:'bg-violet-500/10 dark:bg-violet-500/20', color:'text-violet-500'},
    users: {icon:'i-lucide-users', bg:'bg-violet-500/10 dark:bg-violet-500/20', color:'text-violet-500'},
  }
  return byEntity[e] || {icon:'i-lucide-activity', bg:'bg-elevated dark:bg-neutral-800', color:'text-muted'}
}
function detailText(d: any) {
  if (!d) return ''
  try { const o = JSON.parse(d); return typeof o === 'string' ? o : JSON.stringify(o) } catch { return String(d) }
}
</script>
<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold">Aktivitas Terbaru</span>
        <UButton to="/admin/activity" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">Lihat semua</UButton>
      </div>
    </template>
    <div v-if="pending" class="divide-y divide-default"><div v-for="i in 5" :key="i" class="p-3 flex gap-3"><USkeleton class="size-8 rounded-full" /><div class="flex-1 space-y-2"><USkeleton class="h-3 w-3/4" /><USkeleton class="h-3 w-1/2" /></div></div></div>
    <div v-else-if="!items?.length" class="p-8 text-center text-sm text-muted"><UIcon name="i-lucide-scroll-text" class="text-2xl mb-2" /><p>Belum ada aktivitas.</p></div>
    <div v-else class="divide-y divide-default">
      <UTooltip v-for="a in items" :key="a.id" :text="detailText(a.detail) || `${a.action} ${a.entity||''}`" :delay-duration="300">
        <div class="flex gap-3 p-3 hover:bg-elevated/50 transition-colors cursor-default">
          <div :class="['size-8 rounded-full flex items-center justify-center shrink-0', metaFor(a.action, a.entity).bg]"><UIcon :name="metaFor(a.action, a.entity).icon" :class="metaFor(a.action, a.entity).color" /></div>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate"><span class="font-medium">{{ a.action }}</span> <span class="text-muted">{{ a.entity }}</span></div>
            <div class="text-xs text-muted truncate">{{ detailText(a.detail) }}</div>
            <div class="text-xs text-muted">{{ a.user_nama || 'Sistem' }} • {{ a.created_at?.slice(0,19).replace('T',' ') }}</div>
          </div>
        </div>
      </UTooltip>
    </div>
  </UCard>
</template>
