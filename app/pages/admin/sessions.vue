<script setup lang="ts">
import { h } from 'vue'
import { UBadge, UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'

const { data: users } = await useFetch('/api/admin/users', { query: { limit: 1000 } })

const pageSize = ref(50)
const page = ref(1)
const filters = reactive({ user_id: '', revoked: '', q: '' })
const qInput = ref('')
const q = ref('')

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

function commitSearch() {
  q.value = qInput.value.trim()
}

function resetFilters() {
  qInput.value = ''
  q.value = ''
  Object.assign(filters, { user_id: '', revoked: '', q: '' })
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
    cell: ({ row }) => h('span', null, [
      row.getValue('nama'),
      ' ',
      h('span', { class: 'text-muted' }, `(${row.original.username})`)
    ])
  },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'ip_address', header: 'IP' },
  {
    accessorKey: 'user_agent',
    header: 'User Agent',
    cell: ({ row }) => h('span', { class: 'max-w-xs truncate block' }, row.getValue('user_agent'))
  },
  { accessorKey: 'last_active', header: 'Last Active' },
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
            @keyup.enter="commitSearch"
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

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="rows" :columns="columns" empty="Tidak ada sesi" :loading="pending" />
      <template v-if="total > 0" #footer>
        <div class="flex flex-wrap items-center justify-between gap-2 px-2 py-1">
          <div class="flex items-center gap-2">
            <p class="text-sm text-muted">{{ total }} sesi</p>
            <USelect v-model="pageSize" :items="pageSizeOptions" class="w-36" size="sm" />
          </div>
          <UPagination v-model="page" :total="total" :items-per-page="pageSize" :max="5" show-edges />
        </div>
      </template>
    </UCard>
  </div>
</template>
