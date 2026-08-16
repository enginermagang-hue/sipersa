<script setup lang="ts">
import { h } from 'vue'
import { UBadge, UButton, UDropdownMenu } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/vue-table'

const { user } = useAuth()
const canManage = computed(() => ['pimpinan', 'admin'].includes(user.value?.role))

const q = ref('')
const status = ref('')
const prioritas = ref('')
const page = ref(1)

const { data, refresh } = await useFetch('/api/disposisi', {
  query: { q, status, prioritas, page }
})

const statusOptions = [
  { label: 'Semua Status', value: '' },
  { label: 'Baru', value: 'baru' },
  { label: 'Diproses', value: 'diproses' },
  { label: 'Selesai', value: 'selesai' }
]
const prioritasOptions = [
  { label: 'Semua Prioritas', value: '' },
  { label: 'Normal', value: 'normal' },
  { label: 'Segera', value: 'segera' },
  { label: 'Penting', value: 'penting' }
]

const prioritasLabel: Record<string, string> = { normal: 'Normal', segera: 'Segera', penting: 'Penting' }
const prioritasColor: Record<string, string> = { normal: 'neutral', segera: 'warning', penting: 'error' }
const statusColor: Record<string, string> = { baru: 'warning', diproses: 'primary', selesai: 'success' }

function isOverdue(d: any) {
  return d.batas_waktu && d.status !== 'selesai' && d.batas_waktu < new Date().toISOString().slice(0, 10)
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'no_surat',
    header: 'No. Surat',
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('no_surat'))
  },
  {
    accessorKey: 'dari_kepada',
    header: 'Dari → Kepada',
    cell: ({ row }) => h('span', {}, `${row.original.dari_nama} → ${row.original.kepada_nama}`)
  },
  { accessorKey: 'perihal', header: 'Perihal', cell: ({ row }) => h('div', { class: 'max-w-60 truncate' }, row.getValue('perihal')) },
  {
    accessorKey: 'prioritas',
    header: 'Prioritas',
    cell: ({ row }) => h(UBadge, {
      label: prioritasLabel[row.getValue('prioritas') as string] || row.getValue('prioritas'),
      color: prioritasColor[row.getValue('prioritas') as string] || 'neutral',
      variant: 'subtle'
    })
  },
  {
    accessorKey: 'batas_waktu',
    header: 'Batas Waktu',
    cell: ({ row }) => {
      const v = row.getValue('batas_waktu') as string | null
      if (!v) return h('span', { class: 'text-muted' }, '—')
      const cls = isOverdue(row.original) ? 'text-error font-semibold' : ''
      return h('span', { class: cls }, `${v}${isOverdue(row.original) ? ' (lewat)' : ''}`)
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(UBadge, { label: row.getValue('status'), color: statusColor[row.getValue('status') as string] || 'neutral', variant: 'subtle' })
  },
  {
    id: 'actions',
    header: '',
    enableHiding: false,
    meta: { class: { td: 'text-right' } },
    cell: ({ row }) => h(UDropdownMenu, {
      content: { align: 'end' },
      items: [
        { label: 'Lihat Surat', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/surat-masuk/${row.original.surat_masuk_id}`) }
      ],
      'aria-label': 'Aksi'
    }, () => h(UButton, {
      icon: 'i-lucide-ellipsis-vertical',
      color: 'neutral',
      variant: 'ghost',
      'aria-label': 'Aksi'
    }))
  }
]
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">Kelola Disposisi</h1>
    </div>

    <div v-if="!canManage" class="text-sm text-error">Hanya pimpinan/admin yang dapat mengakses halaman ini.</div>

    <template v-else>
      <div class="flex flex-wrap gap-2 mb-4">
        <UInput v-model="q" placeholder="Cari no/perihal/user" icon="i-lucide-search" class="max-w-xs" />
        <select v-model="status" class="w-40 rounded-md border border-default bg-default px-2.5 py-1.5 text-sm">
          <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select v-model="prioritas" class="w-44 rounded-md border border-default bg-default px-2.5 py-1.5 text-sm">
          <option v-for="o in prioritasOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <UTable :data="data?.data || []" :columns="columns" empty="Belum ada disposisi" />
        <div class="p-4 border-t border-default">
          <UPagination
            v-model="page"
            :page-count="data?.limit || 20"
            :total="data?.total || 0"
            class="mt-0 justify-end"
          />
        </div>
      </UCard>
    </template>
  </div>
</template>
