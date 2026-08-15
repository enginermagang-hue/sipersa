<script setup lang="ts">
import { h } from 'vue'
import { UBadge, UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'

const q = ref('')
const sifat = ref('')
const tahun = ref('')
const page = ref(1)
const addOpen = ref(false)

const { data, refresh, pending } = await useFetch('/api/surat-keluar', { query: { q, sifat, tahun, page } })

const sifatOptions = [
  { label: 'Semua', value: '' },
  { label: 'Biasa', value: 'biasa' },
  { label: 'Segera', value: 'segera' },
  { label: 'Rahasia', value: 'rahasia' },
  { label: 'Penting', value: 'penting' }
]

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'no_surat',
    header: 'No. Surat',
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('no_surat'))
  },
  { accessorKey: 'tgl_surat', header: 'Tgl' },
  { accessorKey: 'tujuan', header: 'Tujuan' },
  { accessorKey: 'perihal', header: 'Perihal' },
  {
    accessorKey: 'sifat',
    header: 'Sifat',
    cell: ({ row }) => h(UBadge, { label: row.getValue('sifat'), variant: 'subtle' })
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { td: 'text-right' } },
    cell: ({ row }) => h(UButton, { to: `/surat-keluar/${row.original.id}`, size: 'xs', variant: 'ghost' }, () => 'Detail')
  }
]

function onSaved() {
  addOpen.value = false
  refresh()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">Surat Keluar</h1>
      <UButton icon="i-lucide-plus" @click="addOpen = true">Tambah</UButton>
    </div>
    <div class="flex flex-wrap gap-2 mb-4">
      <UInput v-model="q" placeholder="Cari no/perihal/tujuan" icon="i-lucide-search" class="max-w-xs" />
      <select v-model="sifat" class="w-40 rounded-md border border-default bg-default px-2.5 py-1.5 text-sm">
        <option v-for="o in sifatOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <UInput v-model="tahun" placeholder="Tahun" type="number" class="w-28" />
    </div>
    <UCard>
      <UTable :data="data?.data || []" :columns="columns" :loading="pending" empty="Belum ada data" />
      <UPagination
        v-model="page"
        :page-count="data?.limit || 20"
        :total="data?.total || 0"
        class="mt-4 justify-end"
      />
    </UCard>
    <UModal v-model:open="addOpen" title="Tambah Surat Keluar">
      <template #body>
        <SuratForm v-if="addOpen" type="keluar" @close="onSaved" />
      </template>
    </UModal>
  </div>
</template>
