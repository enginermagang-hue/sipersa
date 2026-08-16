<script setup lang="ts">
import { h } from 'vue'
import { UBadge, UButton, UDropdownMenu } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/vue-table'

const { user } = useAuth()
const { confirm } = useConfirm()

const q = ref('')
const sifat = ref('')
const tahun = ref('')
const page = ref(1)
const addOpen = ref(false)
const editOpen = ref(false)
const editSurat = ref<any>(null)
const addLoading = ref(false)
const editLoading = ref(false)

const { data, refresh, pending } = await useFetch('/api/surat-masuk', {
  query: { q, sifat, tahun, page }
})

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
  { accessorKey: 'pengirim', header: 'Pengirim' },
  { accessorKey: 'perihal', header: 'Perihal' },
  {
    accessorKey: 'sifat',
    header: 'Sifat',
    cell: ({ row }) => h(UBadge, { label: row.getValue('sifat'), variant: 'subtle' })
  },
  {
    accessorKey: 'disposisi_status',
    header: 'Disposisi',
    cell: ({ row }) => {
      const st = row.getValue('disposisi_status') as string | null
      if (!st) return h('span', { class: 'text-muted' }, '—')
      const color = ({ baru: 'warning', diproses: 'primary', selesai: 'success' } as const)[st] ?? 'neutral'
      return h(UBadge, { label: st, variant: 'subtle', color })
    }
  },
  {
    accessorKey: 'is_arsip',
    header: 'Arsip',
    cell: ({ row }) => row.getValue('is_arsip')
      ? h(UBadge, { label: 'Diarsipkan', variant: 'subtle', color: 'success' })
      : h('span', { class: 'text-muted' }, '—')
  },
  {
    id: 'actions',
    header: '',
    enableHiding: false,
    meta: { class: { td: 'text-right' } },
    cell: ({ row }) => h(UDropdownMenu, {
      content: { align: 'end' },
      items: getRowItems(row),
      'aria-label': 'Aksi'
    }, () => h(UButton, {
      icon: 'i-lucide-ellipsis-vertical',
      color: 'neutral',
      variant: 'ghost',
      'aria-label': 'Aksi'
    }))
  }
]

function canManage(row: any) {
  return user.value?.role === 'admin' || user.value?.id === row.created_by
}

function getRowItems(row: Row<any>) {
  const r = row.original
  const items: any[] = [
    { label: 'Lihat Detail', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/surat-masuk/${r.id}`) }
  ]
  if (r.file_drive_id) {
    items.push({ label: 'Unduh File', icon: 'i-lucide-download', onSelect: () => window.open(`/api/files/${r.file_drive_id}`) })
  }
  if (canManage(r)) {
    items.push(
      { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => { editSurat.value = r; editOpen.value = true } },
      { type: 'separator' },
      { label: 'Hapus', icon: 'i-lucide-trash', color: 'error', onSelect: () => hapus(r) }
    )
  }
  return items
}

const toast = useToast()

function onSaved() {
  addOpen.value = false
  refresh()
  toast.add({ title: 'Berhasil', description: 'Surat masuk berhasil ditambahkan', color: 'success' })
}

function onEditSaved() {
  editOpen.value = false
  editSurat.value = null
  refresh()
  toast.add({ title: 'Berhasil', description: 'Surat masuk berhasil diperbarui', color: 'success' })
}

async function hapus(row: any) {
  await confirm({ title: 'Hapus Surat', message: `Hapus surat ${row.no_surat}?`, okLabel: 'Hapus', loadingTitle: 'Menghapus...' }, async () => {
    await $fetch(`/api/surat-masuk/${row.id}`, { method: 'DELETE' })
  })
  refresh()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">Surat Masuk</h1>
      <UButton icon="i-lucide-plus" @click="addOpen = true">Tambah</UButton>
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <UInput v-model="q" placeholder="Cari no/perihal/pengirim" icon="i-lucide-search" class="max-w-xs" />
      <select v-model="sifat" class="w-40 rounded-md border border-default bg-default px-2.5 py-1.5 text-sm">
        <option v-for="o in sifatOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <UInput v-model="tahun" placeholder="Tahun" type="number" class="w-28" />
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="data?.data || []" :columns="columns" :loading="pending" empty="Belum ada data" />
      <div class="p-4">
        <UPagination
          v-model="page"
          :page-count="data?.limit || 20"
          :total="data?.total || 0"
          class="mt-0 justify-end"
        />
      </div>
    </UCard>

    <UModal v-model:open="addOpen" title="Tambah Surat Masuk" :ui="{ footer: 'justify-end' }">
      <template #body>
        <SuratForm v-if="addOpen" type="masuk" @close="onSaved" @busy="addLoading = $event" />
      </template>
      <template #footer="{ close }">
        <UButton variant="ghost" @click="close">Batal</UButton>
        <UButton type="submit" form="surat-form" :loading="addLoading">Simpan</UButton>
      </template>
    </UModal>

    <UModal v-model:open="editOpen" :title="`Edit Surat Masuk: ${editSurat?.no_surat || ''}`" :ui="{ footer: 'justify-end' }">
      <template #body>
        <SuratForm v-if="editOpen" type="masuk" :surat-id="editSurat?.id" :surat="editSurat" @close="onEditSaved" @busy="editLoading = $event" />
      </template>
      <template #footer="{ close }">
        <UButton variant="ghost" @click="close">Batal</UButton>
        <UButton type="submit" form="surat-form" :loading="editLoading">Perbarui</UButton>
      </template>
    </UModal>
  </div>
</template>
