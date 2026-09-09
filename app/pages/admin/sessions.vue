<script setup lang="ts">
import { h } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { UBadge, UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'

const { data: users } = await useFetch('/api/admin/users', { query: { limit: 1000 } })

type ViewMode='table'|'grid'|'compact'
const view = useLocalStorage<ViewMode>('sipersa.sessions.view','table')
const pageSize = ref(50)
const page = ref(1)
const filters = reactive({ user_id: '', revoked: '' })
const qInput = ref('')
const q = ref('')
let searchTimer: ReturnType<typeof setTimeout>
watch(qInput, (v) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { q.value = v.trim() }, 300) })

const pageSizeOptions = [25, 50, 100, 200].map(v => ({ label: `${v} / halaman`, value: v }))

const query = computed(() => {
  const p: Record<string, any> = { page: page.value, pageSize: pageSize.value }
  if (q.value) p.q = q.value
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') p[k] = v
  }
  return p
})

const { data, pending, refresh } = await useFetch('/api/admin/sessions', { query })

const rows = computed(() => data.value?.rows || [])
const total = computed(() => data.value?.total || 0)

watch(filters, () => { page.value = 1 })
watch(q, () => { page.value = 1 })
watch(pageSize, () => { page.value = 1 })

const userOptions = computed(() =>
  (users.value?.data || []).map((u: any) => ({ label: `${u.nama} (${u.username})`, value: u.id }))
)

const statusOptions = [
  { label: 'Aktif', value: '0' },
  { label: 'Revoked', value: '1' }
]

function resetFilters() {
  qInput.value = ''
  q.value = ''
  Object.assign(filters, { user_id: '', revoked: '' })
  page.value = 1
}

const { confirm } = useConfirm()
async function revoke(id: string) {
  await confirm({ title: 'Putus Sesi', message: 'Putus sesi ini (force logout)?', okLabel: 'Putus', loadingTitle: 'Memutuskan...' }, async () => {
    await $fetch(`/api/admin/sessions/${id}`, { method: 'DELETE' })
  })
  await refresh()
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'nama',
    header: 'User',
    meta: { class: { th: 'max-w-[180px]', td: 'max-w-[180px] whitespace-normal' } },
    cell: ({ row }) => h('span', { class: 'break-words whitespace-normal line-clamp-3 leading-snug block max-w-[170px]', title: `${row.getValue('nama')} (${row.original.username})` }, `${row.getValue('nama')} (${row.original.username})`)
  },
  { accessorKey: 'role', header: 'Role', meta: { class: { td: 'whitespace-nowrap' } } },
  { accessorKey: 'ip_address', header: 'IP', meta: { class: { td: 'whitespace-nowrap' } } },
  {
    accessorKey: 'user_agent',
    header: 'User Agent',
    meta: { class: { th: 'max-w-[280px]', td: 'max-w-[280px] whitespace-normal' } },
    cell: ({ row }) => h('span', { class: 'break-words whitespace-normal line-clamp-3 leading-snug block max-w-[260px]', title: String(row.getValue('user_agent')||'') }, row.getValue('user_agent') as string)
  },
  { accessorKey: 'last_active', header: 'Last Active', meta: { class: { td: 'whitespace-nowrap' } } },
  {
    accessorKey: 'revoked',
    header: 'Status',
    cell: ({ row }) => row.original.revoked
      ? h(UBadge, { label: 'Revoked', color: 'error', variant: 'subtle', size: 'xs' })
      : h(UBadge, { label: 'Aktif', color: 'success', variant: 'subtle', size: 'xs' })
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { td: 'text-right' } },
    cell: ({ row }) => row.original.revoked
      ? null
      : h(UButton, { size: 'xs', variant: 'ghost', color: 'error', icon: 'i-lucide-ban', onClick: () => revoke(row.original.id) }, () => 'Revoke')
  }
]
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">Session Manager</h1>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-refresh-cw" variant="ghost" color="neutral" :loading="pending" @click="refresh" />
        <UButton icon="i-lucide-eraser" variant="ghost" color="neutral" @click="resetFilters">Reset</UButton>
      </div>
    </div>

    <UCard class="mb-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <UFormField label="Pencarian">
          <UInput
            v-model="qInput"
            placeholder="Cari user / IP / user agent…"
            icon="i-lucide-search"
            class="w-full"
          />
        </UFormField>
        <UFormField label="User">
          <USelect v-model="filters.user_id" :items="userOptions" placeholder="Semua user" class="w-full" />
        </UFormField>
        <UFormField label="Status">
          <USelect v-model="filters.revoked" :items="statusOptions" placeholder="Semua status" class="w-full" />
        </UFormField>
      </div>
    </UCard>

    <div class="flex justify-end mb-2">
      <UFieldGroup class="border border-default p-1 rounded-lg shrink-0" size="sm">
        <UButton icon="i-lucide-rows-3" :color="view === 'table' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan tabel" :ui="{ base: 'px-2' }" @click="view = 'table'" />
        <UButton icon="i-lucide-layout-grid" :color="view === 'grid' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan grid" :ui="{ base: 'px-2' }" @click="view = 'grid'" />
        <UButton icon="i-lucide-list" :color="view === 'compact' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan ringkas" :ui="{ base: 'px-2' }" @click="view = 'compact'" />
      </UFieldGroup>
    </div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div v-if="pending" class="h-0.5 w-full overflow-hidden bg-muted"><div class="h-full w-1/3 bg-primary animate-[shimmer_1.2s_ease-in-out_infinite]" /></div>
      <template v-if="view==='table'">
        <UTable :data="rows" :columns="columns" empty="Tidak ada sesi" :ui="{ root: 'custom-scrollbar-table' }" />
      </template>
      <div v-else-if="view==='grid'" class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="r in rows" :key="r.id" class="rounded-xl border border-default p-4 flex flex-col hover:bg-muted/30">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm truncate">{{ r.nama }} <span class="text-muted">({{ r.username }})</span></span>
            <UBadge :label="r.role" variant="subtle" size="xs" />
            <UBadge :label="r.revoked ? 'Revoked' : 'Aktif'" :color="r.revoked?'error':'success'" variant="subtle" size="xs" class="ml-auto" />
          </div>
          <div class="text-xs text-muted mt-1">IP: {{ r.ip_address || '-' }} • {{ r.last_active || '-' }}</div>
          <div class="text-xs mt-2 break-words whitespace-normal line-clamp-3 leading-snug" :title="r.user_agent">{{ r.user_agent || '-' }}</div>
          <div class="mt-3 flex justify-end" v-if="!r.revoked"><UButton size="xs" variant="ghost" color="error" icon="i-lucide-ban" @click="revoke(r.id)">Revoke</UButton></div>
        </div>
        <div v-if="!pending && !rows.length" class="col-span-full py-12 text-center text-muted">Tidak ada sesi</div>
      </div>
      <div v-else class="divide-y divide-default">
        <div v-for="r in rows" :key="r.id" class="flex gap-3 px-4 py-3 hover:bg-muted/30">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-medium text-sm truncate">{{ r.nama }} ({{ r.username }})</span>
              <UBadge :label="r.revoked ? 'Revoked' : 'Aktif'" :color="r.revoked?'error':'success'" variant="subtle" size="xs" />
            </div>
            <div class="text-xs text-muted truncate">{{ r.ip_address }} • {{ r.role }} • {{ r.last_active }}</div>
            <div class="text-xs truncate" :title="r.user_agent">{{ r.user_agent }}</div>
          </div>
          <UButton v-if="!r.revoked" size="xs" variant="ghost" color="error" icon="i-lucide-ban" @click="revoke(r.id)" />
        </div>
        <div v-if="!pending && !rows.length" class="py-12 text-center text-muted text-sm">Tidak ada sesi</div>
      </div>
      <template v-if="total > 0" #footer>
        <div class="flex flex-wrap items-center justify-between gap-2 px-2 py-1">
          <div class="flex items-center gap-2">
            <p class="text-sm text-muted">{{ total }} sesi</p>
            <USelect v-model="pageSize" :items="pageSizeOptions" class="w-36" size="sm" />
          </div>
          <UPagination v-model:page="page" :total="total" :items-per-page="pageSize" :max="5" show-edges />
        </div>
      </template>
    </UCard>
  </div>
</template>
