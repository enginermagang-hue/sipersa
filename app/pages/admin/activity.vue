<script setup lang="ts">
import { h } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'

const { data: users } = await useFetch('/api/admin/users', { query: { limit: 1000 } })

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  CREATE_SURAT_MASUK: 'Buat Surat Masuk',
  UPDATE_SURAT_MASUK: 'Ubah Surat Masuk',
  DELETE_SURAT_MASUK: 'Hapus Surat Masuk',
  CREATE_SURAT_KELUAR: 'Buat Surat Keluar',
  UPDATE_SURAT_KELUAR: 'Ubah Surat Keluar',
  DELETE_SURAT_KELUAR: 'Hapus Surat Keluar',
  CREATE_KLASIFIKASI: 'Buat Klasifikasi',
  UPDATE_KLASIFIKASI: 'Ubah Klasifikasi',
  DELETE_KLASIFIKASI: 'Hapus Klasifikasi',
  CREATE_DISPOSISI: 'Buat Disposisi',
  UPDATE_DISPOSISI: 'Ubah Disposisi',
  FORWARD_DISPOSISI: 'Teruskan Disposisi',
  CREATE_ARSIP: 'Buat Arsip',
  UPDATE_ARSIP: 'Ubah Arsip',
  DELETE_ARSIP: 'Hapus Arsip',
  CREATE_USER: 'Buat User',
  UPDATE_USER: 'Ubah User',
  DELETE_USER: 'Hapus User'
}

const ENTITY_LABELS: Record<string, string> = {
  surat_masuk: 'Surat Masuk',
  surat_keluar: 'Surat Keluar',
  disposisi: 'Disposisi',
  arsip: 'Arsip',
  klasifikasi: 'Klasifikasi',
  users: 'User'
}

const actionOptions = Object.entries(ACTION_LABELS).map(([value, label]) => ({ label, value }))
const entityOptions = Object.entries(ENTITY_LABELS).map(([value, label]) => ({ label, value }))
const userOptions = computed(() =>
  (users.value?.data || []).map((u: any) => ({ label: `${u.nama} (${u.username})`, value: String(u.id) }))
)

type ViewMode='table'|'grid'|'compact'
const view = useLocalStorage<ViewMode>('sipersa.activity.view','table')
const pageSize = 50
const page = ref(1)
const filters = reactive({ user_id: '', action: '', entity: '', from: '', to: '' })
const qInput = ref('')
const q = ref('')
let searchTimer: ReturnType<typeof setTimeout>
watch(qInput, (v) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { q.value = v.trim() }, 300) })

const query = computed(() => {
  const p: Record<string, any> = { page: page.value, pageSize }
  if (q.value) p.q = q.value
  for (const [k, v] of Object.entries(filters)) {
    if (v) p[k] = v
  }
  return p
})

const { data, pending, refresh } = await useFetch('/api/admin/activity', { query })

const rows = computed(() => data.value?.rows || [])
const total = computed(() => data.value?.total || 0)

watch(filters, () => { page.value = 1 })
watch(q, () => { page.value = 1 })

const filterOpen = ref(false)
const activeFilterCount = computed(() => [filters.user_id, filters.action, filters.entity, filters.from, filters.to].filter(Boolean).length)
function resetFilters() {
  qInput.value = ''
  q.value = ''
  Object.assign(filters, { user_id: '', action: '', entity: '', from: '', to: '' })
  page.value = 1
}

function fmtDate(s: string | null) {
  if (!s) return '-'
  const d = new Date(s.replace(' ', 'T') + 'Z')
  return isNaN(d.getTime()) ? s : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

const selected = ref<any>(null)
const detailOpen = ref(false)

function openDetail(row: any) {
  selected.value = row
  detailOpen.value = true
}

function detailText(raw: string | null) {
  if (!raw) return ''
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function detailPreview(raw: string | null) {
  const t = detailText(raw)
  if (!t) return ''
  const oneline = t.replace(/\s+/g, ' ').trim()
  return oneline.length > 120 ? `${oneline.slice(0, 120)}…` : oneline
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'created_at',
    header: 'Waktu',
    meta: { class: { td: 'whitespace-nowrap' } },
    cell: ({ row }) => fmtDate(row.getValue('created_at'))
  },
  {
    accessorKey: 'user_nama',
    header: 'User',
    meta: { class: { th: 'max-w-[160px]', td: 'max-w-[160px] whitespace-normal' } },
    cell: ({ row }) => h('span', { class: 'break-words whitespace-normal line-clamp-3 leading-snug block max-w-[150px]', title: String(row.getValue('user_nama')||'-') }, row.getValue('user_nama') || '-')
  },
  {
    accessorKey: 'action',
    header: 'Aksi',
    meta: { class: { td: 'whitespace-nowrap' } },
    cell: ({ row }) => h(UBadge, {
      label: ACTION_LABELS[row.getValue('action')] || row.getValue('action'),
      variant: 'subtle',
      size: 'xs'
    })
  },
  {
    accessorKey: 'entity',
    header: 'Entity',
    meta: { class: { td: 'whitespace-nowrap' } },
    cell: ({ row }) => ENTITY_LABELS[row.getValue('entity')] || row.getValue('entity') || '-'
  },
  {
    accessorKey: 'detail',
    header: 'Detail',
    meta: { class: { th: 'max-w-[320px]', td: 'max-w-[320px] whitespace-normal' } },
    cell: ({ row }) => row.getValue('detail')
      ? h('button', {
          class: 'break-words whitespace-normal line-clamp-3 leading-snug block max-w-[300px] text-left text-muted hover:text-primary underline decoration-dashed underline-offset-4',
          onClick: () => openDetail(row.original)
        }, detailPreview(row.getValue('detail')))
      : '-'
  }
]
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">Log Aktivitas</h1>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-refresh-cw" variant="ghost" color="neutral" :loading="pending" @click="refresh" />
        <UButton icon="i-lucide-eraser" variant="ghost" color="neutral" @click="resetFilters">Reset</UButton>
      </div>
    </div>

    <div class="flex gap-2 items-center mb-4">
      <UInput
        v-model="qInput"
        placeholder="Cari aksi / entity / detail…"
        icon="i-lucide-search"
        class="flex-1 min-w-0 max-w-[480px]"
      />
      <UButton class="shrink-0" icon="i-lucide-sliders-horizontal" variant="outline" @click="filterOpen = true">
        Filter
        <UBadge v-if="activeFilterCount" :label="activeFilterCount" color="primary" variant="solid" size="xs" class="ml-1" />
      </UButton>
      <UFieldGroup class="border border-default p-1 rounded-lg shrink-0 ml-auto" size="sm">
        <UButton icon="i-lucide-rows-3" :color="view === 'table' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan tabel" :ui="{ base: 'px-2' }" @click="view = 'table'" />
        <UButton icon="i-lucide-layout-grid" :color="view === 'grid' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan grid" :ui="{ base: 'px-2' }" @click="view = 'grid'" />
        <UButton icon="i-lucide-list" :color="view === 'compact' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan ringkas" :ui="{ base: 'px-2' }" @click="view = 'compact'" />
      </UFieldGroup>
    </div>

    <div v-if="activeFilterCount" class="flex flex-wrap items-center gap-1.5 mb-3">
      <span class="text-xs text-muted mr-1">Filter aktif:</span>
      <UBadge v-if="filters.user_id" :label="userOptions.find(o=>String(o.value)===String(filters.user_id))?.label || String(filters.user_id)" variant="subtle" color="primary" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="filters.user_id=''" />
      <UBadge v-if="filters.action" :label="ACTION_LABELS[String(filters.action)] || String(filters.action)" variant="subtle" color="primary" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="filters.action=''" />
      <UBadge v-if="filters.entity" :label="ENTITY_LABELS[String(filters.entity)] || String(filters.entity)" variant="subtle" color="neutral" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="filters.entity=''" />
      <UBadge v-if="filters.from" :label="`Dari ${filters.from}`" variant="subtle" color="neutral" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="filters.from=''" />
      <UBadge v-if="filters.to" :label="`Sampai ${filters.to}`" variant="subtle" color="neutral" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="filters.to=''" />
      <UButton v-if="activeFilterCount > 1" variant="link" size="xs" color="neutral" class="px-1" @click="resetFilters">Hapus semua</UButton>
    </div>

    <USlideover v-model:open="filterOpen" title="Filter" description="Saring log aktivitas" side="right" :ui="{ content: 'max-w-sm' }">
      <template #body>
        <div class="space-y-4">
          <UFormField label="User"><USelect v-model="filters.user_id" :items="userOptions" value-key="value" label-key="label" placeholder="Semua user" class="w-full" /></UFormField>
          <UFormField label="Aksi"><USelect v-model="filters.action" :items="actionOptions" value-key="value" label-key="label" placeholder="Semua aksi" class="w-full" /></UFormField>
          <UFormField label="Entity"><USelect v-model="filters.entity" :items="entityOptions" value-key="value" label-key="label" placeholder="Semua entity" class="w-full" /></UFormField>
          <UFormField label="Dari Tanggal"><UInput v-model="filters.from" type="date" class="w-full" /></UFormField>
          <UFormField label="Sampai Tanggal"><UInput v-model="filters.to" type="date" class="w-full" /></UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 w-full">
          <UButton variant="ghost" block @click="resetFilters">Reset</UButton>
          <UButton block @click="filterOpen = false">Terapkan</UButton>
        </div>
      </template>
    </USlideover>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div v-if="pending" class="h-0.5 w-full overflow-hidden bg-muted"><div class="h-full w-1/3 bg-primary animate-[shimmer_1.2s_ease-in-out_infinite]" /></div>
      <template v-if="view==='table'">
        <UTable :data="rows" :columns="columns" empty="Tidak ada log" :ui="{ root: 'custom-scrollbar-table' }" />
      </template>
      <div v-else-if="view==='grid'" class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="r in rows" :key="r.id" class="rounded-xl border border-default p-4 hover:bg-muted/30 cursor-pointer" @click="openDetail(r)">
          <div class="flex items-center gap-1.5 flex-wrap">
            <UBadge :label="ACTION_LABELS[r.action]||r.action" variant="subtle" size="xs" />
            <UBadge :label="ENTITY_LABELS[r.entity]||r.entity||'-'" variant="subtle" size="xs" color="neutral" />
            <span class="ml-auto text-xs text-muted">{{ fmtDate(r.created_at) }}</span>
          </div>
          <p class="font-medium text-sm mt-2 truncate">{{ r.user_nama || '-' }}</p>
          <p class="text-xs text-muted break-words whitespace-normal line-clamp-3 leading-snug mt-1" :title="detailPreview(r.detail)">{{ detailPreview(r.detail) || '-' }}</p>
        </div>
        <div v-if="!pending && !rows.length" class="col-span-full py-12 text-center text-muted">Tidak ada log</div>
      </div>
      <div v-else class="divide-y divide-default">
        <div v-for="r in rows" :key="r.id" class="flex gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer" @click="openDetail(r)">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-medium text-sm">{{ r.user_nama || '-' }}</span>
              <UBadge :label="ACTION_LABELS[r.action]||r.action" variant="subtle" size="xs" />
              <span class="text-xs text-muted">{{ ENTITY_LABELS[r.entity]||r.entity||'-' }}</span>
            </div>
            <p class="text-xs text-muted break-words whitespace-normal line-clamp-1 leading-snug truncate">{{ detailPreview(r.detail) }}</p>
          </div>
          <span class="text-xs text-muted whitespace-nowrap shrink-0">{{ fmtDate(r.created_at) }}</span>
        </div>
        <div v-if="!pending && !rows.length" class="py-12 text-center text-muted text-sm">Tidak ada log</div>
      </div>
      <template v-if="total > 0" #footer>
        <div class="flex items-center justify-between px-2 py-1">
          <p class="text-sm text-muted">{{ total }} log</p>
          <UPagination v-model:page="page" :total="total" :items-per-page="pageSize" :max="5" show-edges />
        </div>
      </template>
    </UCard>

    <UModal v-model:open="detailOpen" title="Detail Log">
      <template #body>
        <dl v-if="selected" class="space-y-2 text-sm">
          <div class="grid grid-cols-3 gap-2">
            <dt class="text-muted">Waktu</dt>
            <dd class="col-span-2">{{ fmtDate(selected.created_at) }}</dd>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <dt class="text-muted">User</dt>
            <dd class="col-span-2">{{ selected.user_nama || '-' }}</dd>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <dt class="text-muted">Aksi</dt>
            <dd class="col-span-2">{{ ACTION_LABELS[selected.action] || selected.action }}</dd>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <dt class="text-muted">Entity</dt>
            <dd class="col-span-2">{{ ENTITY_LABELS[selected.entity] || selected.entity || '-' }}</dd>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <dt class="text-muted">ID</dt>
            <dd class="col-span-2">{{ selected.entity_id ?? '-' }}</dd>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <dt class="text-muted">IP</dt>
            <dd class="col-span-2">{{ selected.ip_address || '-' }}</dd>
          </div>
          <div v-if="selected.detail" class="pt-2">
            <dt class="text-muted mb-1">Detail</dt>
            <pre class="col-span-3 whitespace-pre-wrap rounded bg-elevated p-3 text-xs">{{ detailText(selected.detail) }}</pre>
          </div>
        </dl>
      </template>
    </UModal>
  </div>
</template>
