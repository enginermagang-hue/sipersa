<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { UBadge, UButton, UDropdownMenu } from '#components'
import type { TableColumn } from '@nuxt/ui'

const { user } = useAuth()
const { confirm } = useConfirm()

const q = ref('')
const qDebounced = ref('')
let qTimer: ReturnType<typeof setTimeout> | null = null
watch(q, (v) => { if (qTimer) clearTimeout(qTimer); qTimer = setTimeout(() => { qDebounced.value = v; page.value = 1 }, 300) })
const tahun = ref('')
const status = ref<string | undefined>(undefined)
const refType = ref<string | undefined>(undefined)
const deleted = ref(false)
const page = ref(1)
const perPage = ref(20)
const filterOpen = ref(false)
const activeFilterCount = computed(() => [status.value, refType.value, tahun.value].filter(Boolean).length)
function resetFilters() { status.value = undefined; refType.value = undefined; tahun.value = ''; page.value = 1 }
watch([status, refType, tahun], () => { page.value = 1 })
const statusLabel = computed(() => statusOptions.find(o => o.value === status.value)?.label ?? status.value ?? '')
const refTypeLabel = computed(() => refTypeOptions.find(o => o.value === refType.value)?.label ?? refType.value ?? '')
const kpiExpanded = ref(false)

const { data, refresh, pending } = await useFetch('/api/arsip', {
  query: { q: qDebounced, tahun, status: computed(() => status.value ?? ''), ref_type: computed(() => refType.value ?? ''), deleted, page, limit: perPage }
})
const { data: stats } = await useFetch('/api/arsip/stats')

const formOpen = ref(false)
const editOpen = ref(false)
const editTarget = ref<any>(null)
const previewTarget = ref<any>(null)
const destroyTarget = ref<any>(null)
const destroyReason = ref('')
const destroyLoading = ref(false)

const statusOptions = [
  { label: 'Semua Status', value: undefined },
  { label: 'Aktif', value: 'aktif' },
  { label: 'Menjelang', value: 'menjelang' },
  { label: 'Kadaluarsa', value: 'kadaluarsa' }
]
const refTypeOptions = [
  { label: 'Semua Sumber', value: undefined },
  { label: 'Dari Surat Masuk', value: 'masuk' },
  { label: 'Dari Surat Keluar', value: 'keluar' },
  { label: 'Mandiri (upload)', value: 'manual' }
]

const kpiCards = computed(() => [
  { label: 'Total Arsip', value: (stats as any)?.value?.total ?? 0, sub: 'Semua dokumen', icon: 'i-lucide-archive', bg: 'bg-violet-50 dark:bg-violet-950/50', color: 'text-violet-600 dark:text-violet-400' },
  { label: 'Aktif', value: (stats as any)?.value?.aktif ?? 0, sub: 'Masih berlaku', icon: 'i-lucide-check-circle', bg: 'bg-emerald-50 dark:bg-emerald-950/50', color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Menjelang', value: (stats as any)?.value?.menjelang ?? 0, sub: 'Segera kadaluarsa', icon: 'i-lucide-clock', bg: 'bg-amber-50 dark:bg-amber-950/50', color: 'text-amber-600 dark:text-amber-400' },
  { label: 'Kadaluarsa', value: (stats as any)?.value?.kadaluarsa ?? 0, sub: 'Perlu pemusnahan', icon: 'i-lucide-flame', bg: 'bg-red-50 dark:bg-red-950/50', color: 'text-red-600 dark:text-red-400' }
])

function exportExcel() {
  const p = new URLSearchParams()
  if (q.value) p.set('q', q.value)
  if (tahun.value) p.set('tahun', tahun.value)
  if (status.value) p.set('status', status.value)
  if (refType.value) p.set('ref_type', refType.value)
  window.open(`/api/arsip/export?${p.toString()}`, '_blank')
}

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

function canManage(row: any) {
  return user.value?.role === 'admin' || user.value?.id === row.created_by
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
        if (user.value?.role !== 'admin') return null
        return h(UButton, { size: 'xs', variant: 'soft', color: 'primary', icon: 'i-lucide-rotate-ccw', onClick: () => restore(r) }, () => 'Restore')
      }
      if (!canManage(r)) {
        return h(UDropdownMenu, {
          content: { align: 'end' },
          items: [
            { label: 'Lihat Detail', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/arsip/${r.id}`) }
          ],
          'aria-label': 'Aksi'
        }, () => h(UButton, {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          'aria-label': 'Aksi'
        }))
      }
      const items: any[] = [
        { label: 'Lihat Detail', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/arsip/${r.id}`) },
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
        size: 'xs',
        'aria-label': 'Aksi'
      }))
    }
  }
]
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Arsip</h1>
        <p class="text-sm text-muted mt-1">Kelola arsip dan retensi dokumen</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton variant="soft" icon="i-lucide-file-spreadsheet" @click="exportExcel">Export Excel</UButton>
        <UButton v-if="!deleted" icon="i-lucide-plus" @click="formOpen = true">Tambah</UButton>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      <UCard v-for="(k, i) in kpiCards.slice(0, 2)" :key="k.label" :ui="{ body: 'p-3 sm:p-4' }" class="hover:shadow-sm">
        <div class="flex items-start justify-between gap-2 sm:gap-3">
          <div class="min-w-0">
            <div class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted truncate">{{ k.label }}</div>
            <div class="text-xl sm:text-3xl font-bold mt-1">{{ k.value.toLocaleString('id-ID') }}</div>
            <div class="hidden sm:block text-xs text-muted mt-1 truncate">{{ k.sub }}</div>
          </div>
          <div class="w-7 h-7 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0" :class="[k.bg, k.color]">
            <UIcon :name="k.icon" class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </UCard>
      <UCard v-for="k in kpiCards.slice(2)" :key="k.label" :ui="{ body: 'p-3 sm:p-4' }" :class="['hover:shadow-sm', kpiExpanded ? '' : 'hidden lg:block']">
        <div class="flex items-start justify-between gap-2 sm:gap-3">
          <div class="min-w-0">
            <div class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted truncate">{{ k.label }}</div>
            <div class="text-xl sm:text-3xl font-bold mt-1">{{ k.value.toLocaleString('id-ID') }}</div>
            <div class="hidden sm:block text-xs text-muted mt-1 truncate">{{ k.sub }}</div>
          </div>
          <div class="w-7 h-7 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0" :class="[k.bg, k.color]">
            <UIcon :name="k.icon" class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </UCard>
    </div>
    <div class="flex justify-center lg:hidden">
      <UButton variant="ghost" size="xs" :trailing-icon="kpiExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" @click="kpiExpanded = !kpiExpanded">
        {{ kpiExpanded ? 'Sembunyikan' : `Lihat semua (${kpiCards.length})` }}
      </UButton>
    </div>

    <div class="flex gap-2 items-center">
      <UInput v-model="q" placeholder="Cari dokumen/lokasi" icon="i-lucide-search" class="flex-1 min-w-0" :ui="{ trailing: 'pr-8' }">
        <template v-if="q" #trailing>
          <UButton variant="ghost" size="xs" color="neutral" icon="i-lucide-x" aria-label="Hapus pencarian" @click="q = ''" />
        </template>
      </UInput>
      <UButton class="lg:hidden shrink-0" icon="i-lucide-sliders-horizontal" variant="outline" aria-label="Buka filter" @click="filterOpen = true">
        Filter
        <UBadge v-if="activeFilterCount" :label="activeFilterCount" color="primary" variant="solid" size="xs" class="ml-1" />
      </UButton>
      <UToggle v-model="deleted" label="Terhapus" class="shrink-0 hidden sm:flex" />
      <UToggle v-model="deleted" class="shrink-0 sm:hidden" />
    </div>

    <div v-if="activeFilterCount" class="flex flex-wrap items-center gap-1.5 lg:hidden">
      <span class="text-xs text-muted mr-1">Filter aktif:</span>
      <UBadge v-if="status" :label="statusLabel" variant="subtle" color="primary" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="status = undefined" />
      <UBadge v-if="refType" :label="refTypeLabel" variant="subtle" color="neutral" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="refType = undefined" />
      <UBadge v-if="tahun" :label="tahun" variant="subtle" color="neutral" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="tahun = ''" />
      <UButton v-if="activeFilterCount > 1" variant="link" size="xs" color="neutral" class="px-1" @click="resetFilters">Hapus semua</UButton>
    </div>
    <div class="flex lg:hidden items-center gap-2">
      <UToggle v-model="deleted" label="Tampilkan terhapus" />
    </div>

    <div class="hidden lg:grid lg:grid-cols-12 gap-2 items-center">
      <USelect v-model="status" :items="statusOptions" value-key="value" label-key="label" placeholder="Status" class="lg:col-span-3 w-full min-w-0" />
      <USelect v-model="refType" :items="refTypeOptions" value-key="value" label-key="label" placeholder="Sumber" class="lg:col-span-5 w-full min-w-0" />
      <UInput v-model="tahun" placeholder="Tahun" type="number" class="lg:col-span-4 w-full min-w-0" />
    </div>

    <USlideover v-model:open="filterOpen" title="Filter" description="Saring arsip" side="right" :ui="{ content: 'max-w-sm' }">
      <template #body>
        <div class="space-y-4">
          <USelect v-model="status" :items="statusOptions" value-key="value" label-key="label" placeholder="Status" class="w-full" />
          <USelect v-model="refType" :items="refTypeOptions" value-key="value" label-key="label" placeholder="Sumber" class="w-full" />
          <UInput v-model="tahun" placeholder="Tahun" type="number" class="w-full" />
          <UToggle v-model="deleted" label="Tampilkan terhapus" />
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
      <UTable :data="data?.data || []" :columns="columns" :loading="pending" empty="Belum ada data" :ui="{ root: 'custom-scrollbar-table' }" />
      <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-t border-default">
        <div class="text-sm text-muted min-w-0 truncate text-center sm:text-left">
          Menampilkan {{ data?.data?.length ? ((data!.page - 1) * (data!.limit) + 1).toLocaleString('id-ID') : 0 }}–{{ ((data!.page - 1) * data!.limit + (data?.data || []).length).toLocaleString('id-ID') }} dari {{ (data?.total ?? 0).toLocaleString('id-ID') }}
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-end w-full sm:w-auto">
          <USelect v-model="perPage" :items="[10,20,50]" class="w-24 shrink-0" />
          <div class="overflow-x-auto max-w-full -mx-1 px-1">
            <UPagination v-model:page="page" :items-per-page="data?.limit || perPage" :total="data?.total || 0" :sibling-count="1" size="sm" />
          </div>
        </div>
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
