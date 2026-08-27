<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { UBadge, UButton, UDropdownMenu } from '#components'
import type { TableColumn } from '@nuxt/ui'

const { confirm } = useConfirm()

const q = ref('')
const tahun = ref('')
const status = ref('')
const refType = ref('')
const deleted = ref(false)
const page = ref(1)

const { data, refresh, pending } = await useFetch('/api/arsip', {
  query: { q, tahun, status, ref_type: refType, deleted, page }
})

const formOpen = ref(false)
const editOpen = ref(false)
const editTarget = ref<any>(null)
const previewTarget = ref<any>(null)
const destroyTarget = ref<any>(null)
const destroyReason = ref('')
const destroyLoading = ref(false)

const statusOptions = [
  { label: 'Semua Status', value: '' },
  { label: 'Aktif', value: 'aktif' },
  { label: 'Menjelang', value: 'menjelang' },
  { label: 'Kadaluarsa', value: 'kadaluarsa' }
]
const refTypeOptions = [
  { label: 'Semua Sumber', value: '' },
  { label: 'Dari Surat Masuk', value: 'masuk' },
  { label: 'Dari Surat Keluar', value: 'keluar' },
  { label: 'Mandiri (upload)', value: 'manual' }
]

const retensiColor: Record<string, string> = { aktif: 'success', menjelang: 'warning', kadaluarsa: 'error' }
const retensiLabel: Record<string, string> = { aktif: 'Aktif', menjelang: 'Menjelang', kadaluarsa: 'Kadaluarsa' }

async function hapus(row: any) {
  await confirm({ title: 'Hapus Arsip', message: `Hapus arsip "${row.nama_dokumen}"?`, okLabel: 'Hapus', loadingTitle: 'Menghapus...' }, async () => {
    await $fetch(`/api/arsip/${row.id}`, { method: 'DELETE' })
  })
  await refresh()
}

async function restore(row: any) {
  await $fetch(`/api/arsip/${row.id}/restore`, { method: 'POST' })
  await refresh()
}

async function musnahkan() {
  if (!destroyTarget.value) return
  destroyLoading.value = true
  try {
    await $fetch(`/api/arsip/${destroyTarget.value.id}/destroy`, { method: 'POST', body: { alasan: destroyReason.value } })
    destroyTarget.value = null
    destroyReason.value = ''
    await refresh()
  } finally {
    destroyLoading.value = false
  }
}

function sumber(row: any): { label: string; to: string } | null {
  if (row.no_surat_masuk) return { label: row.no_surat_masuk, to: `/surat-masuk/${row.ref_masuk_id}` }
  if (row.no_surat_keluar) return { label: row.no_surat_keluar, to: `/surat-keluar/${row.ref_keluar_id}` }
  return null
}

const columns: TableColumn<any>[] = [
  { accessorKey: 'nama_dokumen', header: 'Dokumen' },
  {
    accessorKey: 'klasifikasi_kode',
    header: 'Klasifikasi',
    cell: ({ row }) => (row.original.klasifikasi_kode ? `${row.original.klasifikasi_kode} - ${row.original.klasifikasi_nama}` : '-')
  },
  { accessorKey: 'lokasi', header: 'Lokasi', cell: ({ row }) => row.getValue('lokasi') || '-' },
  { accessorKey: 'tahun', header: 'Tahun', cell: ({ row }) => row.getValue('tahun') || '-' },
  {
    accessorKey: 'sumber',
    header: 'Sumber',
    cell: ({ row }) => {
      const s = sumber(row.original)
      if (!s) return h('span', { class: 'text-muted' }, '-')
      return h(resolveComponent('NuxtLink'), { to: s.to, class: 'hover:underline' }, s.label)
    }
  },
  {
    accessorKey: 'status',
    header: 'Retensi',
    cell: ({ row }) => {
      const r = row.original
      const sisa = r.sisa_tahun
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UBadge, { label: retensiLabel[r.status] || r.status, color: retensiColor[r.status] || 'neutral', variant: 'subtle' }),
        sisa != null ? h('span', { class: 'text-xs text-muted' }, `${Math.abs(sisa)} th`) : h('span', { class: 'text-xs text-muted' }, 'tetap')
      ])
    }
  },
  {
    accessorKey: 'file',
    header: 'File',
    cell: ({ row }) => {
      const r = row.original
      if (!r.file_drive_id) return h('span', { class: 'text-muted' }, '-')
      return h('div', { class: 'flex gap-1' }, [
        h(UButton, { href: `/api/files/${r.file_drive_id}`, target: '_blank', size: 'xs', variant: 'soft', icon: 'i-lucide-download' }, () => 'Unduh'),
        h(UButton, { size: 'xs', variant: 'ghost', icon: 'i-lucide-eye', onClick: () => { previewTarget.value = r } })
      ])
    }
  },
  {
    id: 'actions',
    header: '',
    enableHiding: false,
    meta: { class: { td: 'text-right' } },
    cell: ({ row }) => {
      const r = row.original
      if (deleted.value) {
        return h(UButton, { size: 'xs', variant: 'soft', color: 'primary', icon: 'i-lucide-rotate-ccw', onClick: () => restore(r) }, () => 'Restore')
      }
      const items: any[] = [
        { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => { editTarget.value = r; editOpen.value = true } },
        { type: 'separator' },
        ...(r.status === 'kadaluarsa'
          ? [{ label: 'Pemusnahan', icon: 'i-lucide-flame', color: 'error', onSelect: () => { destroyTarget.value = r; destroyReason.value = '' } }]
          : []),
        { label: 'Hapus', icon: 'i-lucide-trash', color: 'error', onSelect: () => hapus(r) }
      ]
      return h(UDropdownMenu, {
        content: { align: 'end' },
        items,
        'aria-label': 'Aksi'
      }, () => h(UButton, {
        icon: 'i-lucide-ellipsis-vertical',
        color: 'neutral',
        variant: 'ghost',
        'aria-label': 'Aksi'
      }))
    }
  }
]
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">Arsip</h1>
      <UButton v-if="!deleted" icon="i-lucide-plus" @click="formOpen = true">Tambah</UButton>
    </div>
    <div class="flex flex-wrap gap-2 mb-4 items-center">
      <UInput v-model="q" placeholder="Cari dokumen/lokasi" icon="i-lucide-search" class="max-w-xs" />
      <UInput v-model="tahun" placeholder="Tahun" type="number" class="w-28" />
      <select v-model="status" class="w-40 rounded-md border border-default bg-default px-2.5 py-1.5 text-sm">
        <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-model="refType" class="w-48 rounded-md border border-default bg-default px-2.5 py-1.5 text-sm">
        <option v-for="o in refTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <UToggle v-model="deleted" label="Tampilkan terhapus" />
    </div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div v-if="pending" class="h-0.5 w-full overflow-hidden bg-muted"><div class="h-full w-1/3 bg-primary animate-[shimmer_1.2s_ease-in-out_infinite]" /></div>
      <UTable :data="data?.data || []" :columns="columns" :loading="pending" empty="Belum ada data" />
      <div class="p-4 border-t border-default">
        <UPagination
          v-model:page="page"
          :items-per-page="data?.limit || 20"
          :total="data?.total || 0"
          class="mt-0 justify-end"
        />
      </div>
    </UCard>

    <UModal v-model:open="formOpen" title="Tambah Arsip">
      <template #body>
        <ArsipForm v-if="formOpen" mode="manual" @saved="() => { formOpen = false; refresh() }" @close="formOpen = false" />
      </template>
    </UModal>

    <UModal v-model:open="editOpen" :title="`Edit Arsip: ${editTarget?.nama_dokumen || ''}`">
      <template #body>
        <ArsipForm v-if="editOpen" mode="manual" :arsip-id="editTarget?.id" :arsip="editTarget" @saved="() => { editOpen = false; refresh() }" @close="editOpen = false" />
      </template>
    </UModal>

    <UModal v-model:open="previewTarget" title="Preview File">
      <template #body>
        <FilePreview v-if="previewTarget" :file-id="previewTarget.file_drive_id" :file-name="previewTarget.file_name" />
      </template>
    </UModal>

    <UModal v-model:open="destroyTarget" title="Pemusnahan Arsip">
      <template #body>
        <p class="text-sm mb-3">
          Arsip "{{ destroyTarget?.nama_dokumen }}" akan dimusnahkan karena masa retensinya telah habis.
        </p>
        <UFormField label="Alasan Pemusnahan">
          <UTextarea v-model="destroyReason" class="w-full" placeholder="Alasan (opsional)" />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="destroyTarget = null">Batal</UButton>
          <UButton color="error" :loading="destroyLoading" @click="musnahkan">Musnahkan</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
