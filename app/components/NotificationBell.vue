<script setup lang="ts">
const { items, unread, loading, deleting, load, markRead, removeMany } = useNotifications()
const toast = useToast()
const open = ref(false)
const selected = ref<Set<number>>(new Set())
const confirmOpen = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  load()
  timer = setInterval(() => load(), 30000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
watch(open, (v) => {
  if (v) load()
  else selected.value = new Set()
})
watch(items, () => {
  const ids = new Set(items.value.map((n: any) => n.id))
  for (const id of [...selected.value]) if (!ids.has(id)) selected.value.delete(id)
})

const selectedCount = computed(() => selected.value.size)
const allChecked = computed(() => !!items.value.length && selected.value.size === items.value.length)
const indeterminate = computed(() => selectedCount.value > 0 && selectedCount.value < items.value.length)

function toggle(id: number, v: boolean) {
  const next = new Set(selected.value)
  if (v) next.add(id); else next.delete(id)
  selected.value = next
}
function toggleAll(v: boolean) {
  selected.value = v ? new Set(items.value.map((n: any) => n.id)) : new Set()
}
async function doDeleteSelected() {
  if (!selectedCount.value) return
  const ids = [...selected.value]
  try {
    await removeMany(ids)
    selected.value = new Set()
    confirmOpen.value = false
    toast.add({ title: `${ids.length} notifikasi dihapus`, color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.statusMessage || 'Gagal menghapus', color: 'error' })
  }
}
async function markSelectedRead() {
  for (const id of [...selected.value]) await markRead(id)
  toast.add({ title: 'Ditandai dibaca', color: 'success' })
}

function entityLink(n: any): string | null {
  if (!n?.entity || !n?.entity_id) return null
  const map: Record<string, string> = {
    disposisi: `/disposisi/${n.entity_id}`,
    surat_masuk: `/surat-masuk/${n.entity_id}`,
    surat_keluar: `/surat-keluar/${n.entity_id}`,
    arsip: `/arsip`,
  }
  return map[n.entity] || null
}
async function handleClick(n: any) {
  await markRead(n.id)
  const link = entityLink(n)
  if (link) { open.value = false; await navigateTo(link) }
}
function timeAgo(s: string) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}
</script>

<template>
  <UButton icon="i-lucide-bell" color="neutral" variant="ghost" aria-label="Notifikasi" @click="open = true">
    <template v-if="unread" #trailing>
      <UBadge :label="String(unread)" color="error" size="xs" />
    </template>
  </UButton>

  <USlideover v-model:open="open" title="Notifikasi" description="Daftar notifikasi terbaru" side="right" :ui="{ content: 'max-w-sm' }">
    <template #header>
      <div class="flex flex-col gap-2 w-full">
        <div class="flex items-center justify-between gap-2">
          <span class="font-semibold text-sm">Notifikasi</span>
          <div class="flex items-center gap-1">
            <UButton v-if="unread" size="xs" variant="ghost" @click="markRead()">Tandai semua dibaca</UButton>
            <UButton size="xs" variant="ghost" icon="i-lucide-refresh-cw" aria-label="Muat ulang" :loading="loading" @click="load()" />
          </div>
        </div>
        <div v-if="items.length" class="flex items-center justify-between gap-2 border-t border-default pt-2">
          <div class="flex items-center gap-2">
            <UCheckbox :model-value="allChecked" :indeterminate="indeterminate" @update:model-value="(v:boolean)=> toggleAll(v)" />
            <span class="text-xs">{{ selectedCount ? `${selectedCount} dipilih` : 'Pilih semua' }}</span>
          </div>
          <div class="flex items-center gap-1">
            <UButton v-if="selectedCount" size="xs" variant="ghost" @click="markSelectedRead()">Tandai dibaca</UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" :disabled="!selectedCount" :loading="deleting" @click="confirmOpen = true">Hapus ({{ selectedCount }})</UButton>
          </div>
        </div>
      </div>
    </template>
    <template #body>
      <div v-if="loading && !items.length" class="space-y-2">
        <USkeleton v-for="i in 4" :key="i" class="h-16 w-full" />
      </div>
      <ul v-else class="space-y-1">
        <li
          v-for="n in items"
          :key="n.id"
          class="p-3 rounded-lg cursor-pointer flex gap-3 hover:bg-elevated/70 transition-colors"
          :class="[!n.read ? 'bg-elevated' : 'border border-default', selected.has(n.id) ? 'ring-1 ring-primary/30' : '']"
          @click="handleClick(n)"
        >
          <UCheckbox :model-value="selected.has(n.id)" @update:model-value="(v:boolean)=> toggle(n.id, v)" @click.stop />
          <span class="mt-1.5 size-2 rounded-full shrink-0" :class="!n.read ? 'bg-primary' : 'bg-transparent'" />
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium leading-tight truncate">{{ n.title }}</div>
            <div class="text-xs text-muted line-clamp-2">{{ n.message }}</div>
            <div class="text-[11px] text-muted mt-1">{{ timeAgo(n.created_at) }}</div>
          </div>
          <UIcon v-if="entityLink(n)" name="i-lucide-chevron-right" class="size-4 text-muted shrink-0 mt-1" />
        </li>
        <li v-if="!items.length" class="flex flex-col items-center gap-2 py-10 text-muted">
          <UIcon name="i-lucide-bell-off" class="size-8" />
          <span class="text-sm">Tidak ada notifikasi</span>
        </li>
      </ul>
    </template>
    <template #footer>
      <div class="flex justify-between w-full items-center">
        <span class="text-xs text-muted">{{ unread ? `${unread} belum dibaca` : 'Semua sudah dibaca' }}{{ selectedCount ? ` • ${selectedCount} dipilih` : '' }}</span>
        <div class="flex gap-1">
          <UButton v-if="unread" size="xs" variant="soft" @click="markRead()">Tandai semua dibaca</UButton>
          <UButton size="xs" color="error" variant="soft" :disabled="!selectedCount" :loading="deleting" @click="confirmOpen = true">Hapus terpilih</UButton>
        </div>
      </div>
    </template>
  </USlideover>

  <UModal v-model:open="confirmOpen" title="Hapus notifikasi">
    <template #body>
      <p class="text-sm">Hapus {{ selectedCount }} notifikasi terpilih? Tidak dapat dibatalkan.</p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="confirmOpen=false">Batal</UButton>
        <UButton color="error" :loading="deleting" @click="doDeleteSelected()">Hapus</UButton>
      </div>
    </template>
  </UModal>
</template>
