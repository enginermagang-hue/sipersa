<script setup lang="ts">
import { h } from 'vue'
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
  (users.value?.data || []).map((u: any) => ({ label: u.nama, value: u.id }))
)

const pageSize = 50
const page = ref(1)
const filters = reactive({ user_id: '', action: '', entity: '', from: '', to: '' })
const qInput = ref('')
const q = ref('')

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

function commitSearch() {
  q.value = qInput.value.trim()
}

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
    cell: ({ row }) => fmtDate(row.getValue('created_at'))
  },
  {
    accessorKey: 'user_nama',
    header: 'User',
    cell: ({ row }) => row.getValue('user_nama') || '-'
  },
  {
    accessorKey: 'action',
    header: 'Aksi',
    cell: ({ row }) => h(UBadge, {
      label: ACTION_LABELS[row.getValue('action')] || row.getValue('action'),
      variant: 'subtle',
      size: 'xs'
    })
  },
  {
    accessorKey: 'entity',
    header: 'Entity',
    cell: ({ row }) => ENTITY_LABELS[row.getValue('entity')] || row.getValue('entity') || '-'
  },
  {
    accessorKey: 'detail',
    header: 'Detail',
    cell: ({ row }) => row.getValue('detail')
      ? h('button', {
          class: 'max-w-xs truncate block text-left text-muted hover:text-primary underline decoration-dashed underline-offset-4',
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

    <UCard class="mb-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
        <UFormField label="Pencarian">
          <UInput
            v-model="qInput"
            placeholder="Cari aksi / entity / detail…"
            icon="i-lucide-search"
            class="w-full"
            @keyup.enter="commitSearch"
          />
        </UFormField>
        <UFormField label="User">
          <USelect v-model="filters.user_id" :items="userOptions" placeholder="Semua user" class="w-full" />
        </UFormField>
        <UFormField label="Aksi">
          <USelect v-model="filters.action" :items="actionOptions" placeholder="Semua aksi" class="w-full" />
        </UFormField>
        <UFormField label="Entity">
          <USelect v-model="filters.entity" :items="entityOptions" placeholder="Semua entity" class="w-full" />
        </UFormField>
        <UFormField label="Dari Tanggal">
          <UInput v-model="filters.from" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Sampai Tanggal">
          <UInput v-model="filters.to" type="date" class="w-full" />
        </UFormField>
      </div>
    </UCard>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="rows" :columns="columns" empty="Tidak ada log" :loading="pending" />
      <template v-if="total > 0" #footer>
        <div class="flex items-center justify-between px-2 py-1">
          <p class="text-sm text-muted">{{ total }} log</p>
          <UPagination v-model="page" :total="total" :items-per-page="pageSize" :max="5" show-edges />
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
