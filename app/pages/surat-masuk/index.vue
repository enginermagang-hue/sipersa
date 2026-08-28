<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { h } from 'vue'

const { user } = useAuth()
const { confirm } = useConfirm()
const toast = useToast()

const q = ref('')
const sifat = ref('')
const status = ref('')
const bulan = ref('')
const page = ref(1)
const perPage = ref(20)
type ViewMode = 'table' | 'grid' | 'compact'
const view = useLocalStorage<ViewMode>('sipersa.sm.view', 'table')
const addOpen = ref(false)
const addLoading = ref(false)
const editOpen = ref(false)
const editSurat = ref<any>(null)
const editLoading = ref(false)

const { data, refresh, pending } = await useFetch('/api/surat-masuk', { query: { q, sifat, status, bulan, page, perPage } })
const { data: stats } = await useFetch('/api/surat-masuk/stats')

const sifatOptions = [
  { label: 'Semua Sifat', value: '' },
  { label: 'Biasa', value: 'biasa' },
  { label: 'Segera', value: 'segera' },
  { label: 'Rahasia', value: 'rahasia' },
  { label: 'Penting', value: 'penting' }
]

const statusOptions = [
  { label: 'Semua Disposisi', value: '' },
  { label: 'Baru', value: 'baru' },
  { label: 'Diproses', value: 'diproses' },
  { label: 'Selesai', value: 'selesai' }
]

const statusMeta: Record<string, { label: string; color: 'neutral' | 'warning' | 'primary' | 'success' }> = {
  baru: { label: 'Baru', color: 'warning' },
  diproses: { label: 'Diproses', color: 'primary' },
  selesai: { label: 'Selesai', color: 'success' }
}

const kpiCards = computed(() => [
  { label: 'Total Surat Masuk', value: stats.value?.total ?? 0, sub: 'Sejak Januari 2026', icon: 'i-lucide-inbox', bg: 'bg-violet-50 dark:bg-violet-950/50', color: 'text-violet-600 dark:text-violet-400' },
  { label: 'Baru (3 Hari)', value: stats.value?.baru ?? 0, sub: 'Diterima baru-baru ini', icon: 'i-lucide-sparkles', bg: 'bg-amber-50 dark:bg-amber-950/50', color: 'text-amber-600 dark:text-amber-400' },
  { label: 'Belum Disposisi', value: stats.value?.belum_disposisi ?? 0, sub: 'Perlu ditindaklanjuti', icon: 'i-lucide-clock-3', bg: 'bg-slate-100 dark:bg-slate-800', color: 'text-slate-600 dark:text-slate-300' },
  { label: 'Disposisi Bulan Ini', value: stats.value?.didisposisi_bulan_ini ?? 0, sub: 'Bulan ini (WITA)', icon: 'i-lucide-send', bg: 'bg-emerald-50 dark:bg-emerald-950/50', color: 'text-emerald-600 dark:text-emerald-400' }
])

function fmtTgl(s: string) {
  if (!s) return '—'
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function canManage(row: any) {
  return user.value?.role === 'admin' || user.value?.id === row.created_by
}

function hapus(row: any) {
  confirm({ title: 'Hapus Surat', message: `Hapus surat "${row.no_surat}"?`, okLabel: 'Hapus', loadingTitle: 'Menghapus...' }, async () => {
    await $fetch(`/api/surat-masuk/${row.id}`, { method: 'DELETE' })
  }).then(() => refresh())
}

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

function exportExcel() {
  const p = new URLSearchParams()
  if (q.value) p.set('q', q.value)
  if (sifat.value) p.set('sifat', sifat.value)
  if (status.value) p.set('status', status.value)
  if (bulan.value) p.set('bulan', bulan.value)
  window.open(`/api/surat-masuk/export?${p.toString()}`, '_blank')
}

function getAksiItems(row: any) {
  const items = [
    { label: 'Lihat Detail', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/surat-masuk/${row.id}`) }
  ]
  if (row.file_drive_id) {
    items.push({ label: 'Unduh File', icon: 'i-lucide-download', onSelect: () => window.open(`/api/files/${row.file_drive_id}`) })
  }
  if (canManage(row)) {
    items.push({ label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => { editSurat.value = row; editOpen.value = true } })
    items.push({ label: 'Hapus', icon: 'i-lucide-trash', color: 'error' as const, onSelect: () => hapus(row) })
  }
  return items
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Surat Masuk</h1>
        <p class="text-sm text-muted mt-1">Kelola dan pantau semua surat masuk instansi</p>
      </div>
      <UButton icon="i-lucide-plus" @click="addOpen = true">Tambah Surat Masuk</UButton>
    </div>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <UCard v-for="k in kpiCards" :key="k.label" :ui="{ body: 'p-4' }" class="hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ k.label }}</div>
            <div class="text-3xl font-bold mt-1">{{ k.value.toLocaleString('id-ID') }}</div>
            <div class="text-xs text-muted mt-1">{{ k.sub }}</div>
          </div>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="[k.bg, k.color]">
            <UIcon :name="k.icon" class="w-5 h-5" />
          </div>
        </div>
      </UCard>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UInput v-model="q" placeholder="Cari no. surat, pengirim, perihal..." icon="i-lucide-search" class="max-w-xs" />
      <select v-model="status" class="h-9 w-44 rounded-md border border-default bg-default px-2.5 text-sm">
        <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-model="sifat" class="h-9 w-36 rounded-md border border-default bg-default px-2.5 text-sm">
        <option v-for="o in sifatOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <UInput v-model="bulan" type="month" class="w-40" />
      <div class="flex-1" />
      <div role="group" aria-label="Mode tampilan" class="inline-flex rounded-md border border-default bg-default p-0.5">
        <UButton icon="i-lucide-rows-3" :color="view === 'table' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan tabel" :ui="{ base: 'px-2' }" @click="view = 'table'" />
        <UButton icon="i-lucide-layout-grid" :color="view === 'grid' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan grid" :ui="{ base: 'px-2' }" @click="view = 'grid'" />
        <UButton icon="i-lucide-list" :color="view === 'compact' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan ringkas" :ui="{ base: 'px-2' }" @click="view = 'compact'" />
      </div>
      <UButton variant="soft" icon="i-lucide-file-spreadsheet" @click="exportExcel">Export Excel</UButton>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div v-if="pending" class="h-0.5 w-full overflow-hidden bg-muted"><div class="h-full w-1/3 bg-primary animate-[shimmer_1.2s_ease-in-out_infinite]" /></div>
      <div v-if="view === 'table'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default text-left text-xs uppercase text-muted">
              <th class="px-4 py-3 font-medium">No. Surat</th>
              <th class="px-4 py-3 font-medium">Tgl Surat</th>
              <th class="px-4 py-3 font-medium">Pengirim</th>
              <th class="px-4 py-3 font-medium">Perihal</th>
              <th class="px-4 py-3 font-medium">Sifat</th>
              <th class="px-4 py-3 font-medium">Disposisi</th>
              <th class="px-4 py-3 font-medium">Arsip</th>
              <th class="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data?.data || []" :key="r.id" class="border-b border-default last:border-0 hover:bg-muted/30 cursor-pointer" @click="navigateTo(`/surat-masuk/${r.id}`)">
              <td class="px-4 py-3 font-medium whitespace-nowrap">{{ r.no_surat }}</td>
              <td class="px-4 py-3 whitespace-nowrap">{{ fmtTgl(r.tgl_surat) }}</td>
              <td class="px-4 py-3">
                <div class="font-medium">{{ r.pengirim }}</div>
                <div v-if="r.klasifikasi_nama" class="text-xs text-muted">{{ r.klasifikasi_nama }}</div>
              </td>
              <td class="px-4 py-3 max-w-[280px] truncate">{{ r.perihal }}</td>
              <td class="px-4 py-3">
                <UBadge :label="r.sifat" variant="subtle" />
              </td>
              <td class="px-4 py-3">
                <UBadge v-if="r.disposisi_status" :label="statusMeta[r.disposisi_status]?.label || r.disposisi_status" :color="statusMeta[r.disposisi_status]?.color || 'neutral'" variant="subtle" />
                <span v-else class="text-muted">—</span>
              </td>
              <td class="px-4 py-3">
                <UBadge v-if="r.is_arsip" label="Diarsipkan" color="success" variant="subtle" />
                <span v-else class="text-muted">—</span>
              </td>
              <td class="px-4 py-3 text-right" @click.stop>
                <UDropdownMenu :items="getAksiItems(r)">
                  <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" aria-label="Aksi" />
                </UDropdownMenu>
              </td>
            </tr>
            <tr v-if="!pending && !(data?.data || []).length">
              <td colspan="8" class="px-4 py-12 text-center text-muted">Belum ada data</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="view === 'grid'" class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="r in data?.data || []" :key="r.id" class="rounded-xl border border-default p-4 transition-colors hover:bg-muted/30 cursor-pointer" @click="navigateTo(`/surat-masuk/${r.id}`)">
          <div class="flex items-start justify-between gap-2">
            <div class="font-medium text-sm leading-tight">{{ r.no_surat }}</div>
            <div @click.stop>
              <UDropdownMenu :items="getAksiItems(r)">
                <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" aria-label="Aksi" />
              </UDropdownMenu>
            </div>
          </div>
          <div class="mt-3 text-sm font-medium">{{ r.pengirim }}</div>
          <div class="mt-1 text-sm line-clamp-2 text-muted">{{ r.perihal }}</div>
          <div v-if="r.klasifikasi_nama" class="mt-1 text-xs text-muted">{{ r.klasifikasi_nama }}</div>
          <div class="mt-3 flex items-center justify-between border-t border-default pt-3">
            <span class="text-xs text-muted">{{ fmtTgl(r.tgl_surat) }}</span>
            <div class="flex items-center gap-1.5">
              <UBadge :label="r.sifat" variant="subtle" />
              <UBadge v-if="r.disposisi_status" :label="statusMeta[r.disposisi_status]?.label || r.disposisi_status" :color="statusMeta[r.disposisi_status]?.color || 'neutral'" variant="subtle" />
              <UBadge v-if="r.is_arsip" label="Diarsipkan" color="success" variant="subtle" />
            </div>
          </div>
        </div>
        <div v-if="!pending && !(data?.data || []).length" class="col-span-full py-12 text-center text-muted">Belum ada data</div>
      </div>

      <div v-else class="divide-y divide-default">
        <div v-for="r in data?.data || []" :key="r.id" class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 cursor-pointer" @click="navigateTo(`/surat-masuk/${r.id}`)">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm whitespace-nowrap">{{ r.no_surat }}</span>
              <span class="text-xs text-muted whitespace-nowrap">{{ r.pengirim }}</span>
            </div>
            <div class="truncate text-sm text-muted">{{ r.perihal }}</div>
          </div>
          <span class="hidden text-xs text-muted whitespace-nowrap sm:inline">{{ fmtTgl(r.tgl_surat) }}</span>
          <UBadge v-if="r.disposisi_status" :label="statusMeta[r.disposisi_status]?.label || r.disposisi_status" :color="statusMeta[r.disposisi_status]?.color || 'neutral'" variant="subtle" />
          <UBadge v-if="r.is_arsip" label="Diarsipkan" color="success" variant="subtle" />
          <div @click.stop>
            <UDropdownMenu :items="getAksiItems(r)">
              <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" aria-label="Aksi" />
            </UDropdownMenu>
          </div>
        </div>
        <div v-if="!pending && !(data?.data || []).length" class="py-12 text-center text-muted">Belum ada data</div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 p-4">
        <div class="text-sm text-muted">
          Menampilkan {{ data?.data?.length ? ((data!.page - 1) * (data!.limit) + 1).toLocaleString('id-ID') : 0 }}–{{ ((data!.page - 1) * data!.limit + (data?.data || []).length).toLocaleString('id-ID') }} dari {{ (data?.total ?? 0).toLocaleString('id-ID') }}
        </div>
        <div class="flex items-center gap-2">
          <select v-model="perPage" class="h-8 w-20 rounded-md border border-default bg-default px-2 text-sm">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
          <UPagination v-model:page="page" :items-per-page="data?.limit || perPage" :total="data?.total || 0" />
        </div>
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
