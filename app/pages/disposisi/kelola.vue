<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { h } from 'vue'

const { user } = useAuth()
const { confirm } = useConfirm()
const toast = useToast()

const canManage = computed(() => ['pimpinan', 'admin'].includes(user.value?.role))

const q = ref('')
const status = ref('')
const sifat = ref('')
const bulan = ref('')
const page = ref(1)
const perPage = ref(20)
type ViewMode = 'table' | 'grid' | 'compact'
const view = useLocalStorage<ViewMode>('sipersa.disposisi.kelola.view', 'table')

const { data, refresh, pending } = await useFetch('/api/disposisi', { query: { q, status, sifat, bulan, page, perPage } })
const { data: stats } = await useFetch('/api/disposisi/stats')

const statusOptions = [
  { label: 'Semua Status', value: '' },
  { label: 'Baru', value: 'baru' },
  { label: 'Diproses', value: 'diproses' },
  { label: 'Selesai', value: 'selesai' }
]

const sifatOptions = [
  { label: 'Semua Sifat', value: '' },
  { label: 'Biasa', value: 'biasa' },
  { label: 'Segera', value: 'segera' },
  { label: 'Sangat Segera', value: 'sangat_segera' },
  { label: 'Rahasia', value: 'rahasia' }
]

const statusMeta: Record<string, { label: string; color: 'neutral' | 'warning' | 'primary' | 'success' }> = {
  baru: { label: 'Baru', color: 'warning' },
  diproses: { label: 'Diproses', color: 'primary' },
  selesai: { label: 'Selesai', color: 'success' }
}

const sifatLabel: Record<string, string> = { biasa: 'Biasa', segera: 'Segera', sangat_segera: 'Sangat Segera', rahasia: 'Rahasia' }
const sifatColor: Record<string, string> = { biasa: 'neutral', segera: 'warning', sangat_segera: 'error', rahasia: 'error' }

const kpiCards = computed(() => [
  { label: 'Total Disposisi', value: stats.value?.total ?? 0, sub: 'Semua disposisi', icon: 'i-lucide-share-2', bg: 'bg-violet-50 dark:bg-violet-950/50', color: 'text-violet-600 dark:text-violet-400' },
  { label: 'Baru', value: stats.value?.baru ?? 0, sub: 'Perlu tindak lanjut', icon: 'i-lucide-inbox', bg: 'bg-amber-50 dark:bg-amber-950/50', color: 'text-amber-600 dark:text-amber-400' },
  { label: 'Diproses', value: stats.value?.diproses ?? 0, sub: 'Sedang dikerjakan', icon: 'i-lucide-hourglass', bg: 'bg-sky-50 dark:bg-sky-950/50', color: 'text-sky-600 dark:text-sky-400' },
  { label: 'Selesai', value: stats.value?.selesai ?? 0, sub: 'Selesai', icon: 'i-lucide-check-check', bg: 'bg-emerald-50 dark:bg-emerald-950/50', color: 'text-emerald-600 dark:text-emerald-400' }
])

function isOverdue(d: any) {
  return d.batas_waktu && d.status !== 'selesai' && d.batas_waktu < new Date().toISOString().slice(0, 10)
}

function fmtTgl(s: string) {
  if (!s) return '—'
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function exportExcel() {
  const p = new URLSearchParams()
  if (q.value) p.set('q', q.value)
  if (status.value) p.set('status', status.value)
  if (sifat.value) p.set('sifat', sifat.value)
  if (bulan.value) p.set('bulan', bulan.value)
  window.open(`/api/disposisi/export?${p.toString()}`, '_blank')
}

function getAksiItems(r: any) {
  return [
    { label: 'Lihat Detail', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/surat-masuk/${r.surat_masuk_id}`) }
  ]
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Kelola Disposisi</h1>
        <p class="text-sm text-muted mt-1">Pantau seluruh disposisi instansi</p>
      </div>
      <UButton variant="soft" icon="i-lucide-file-spreadsheet" @click="exportExcel">Export Excel</UButton>
    </div>

    <div v-if="!canManage" class="text-sm text-error">Hanya pimpinan/admin yang dapat mengakses halaman ini.</div>

    <template v-else>
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
          <UBadge v-if="k.label === 'Baru' && (stats?.lewat_batas ?? 0) > 0" :label="`${stats?.lewat_batas} lewat batas`" color="error" variant="subtle" class="mt-2" size="xs" />
        </UCard>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UInput v-model="q" placeholder="Cari no. surat, perihal, user..." icon="i-lucide-search" class="max-w-xs" />
        <select v-model="status" class="h-9 w-40 rounded-md border border-default bg-default px-2.5 text-sm">
          <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select v-model="sifat" class="h-9 w-44 rounded-md border border-default bg-default px-2.5 text-sm">
          <option v-for="o in sifatOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <UInput v-model="bulan" type="month" class="w-40" />
        <div class="flex-1" />
        <div role="group" aria-label="Mode tampilan" class="inline-flex rounded-md border border-default bg-default p-0.5">
          <UButton icon="i-lucide-rows-3" :color="view === 'table' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan tabel" :ui="{ base: 'px-2' }" @click="view = 'table'" />
          <UButton icon="i-lucide-layout-grid" :color="view === 'grid' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan grid" :ui="{ base: 'px-2' }" @click="view = 'grid'" />
          <UButton icon="i-lucide-list" :color="view === 'compact' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan ringkas" :ui="{ base: 'px-2' }" @click="view = 'compact'" />
        </div>
      </div>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div v-if="pending" class="h-0.5 w-full overflow-hidden bg-muted"><div class="h-full w-1/3 bg-primary animate-[shimmer_1.2s_ease-in-out_infinite]" /></div>
        <div v-if="view === 'table'" class="overflow-x-auto custom-scrollbar-table">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default text-left text-xs uppercase text-muted">
                <th class="px-4 py-3 font-medium">No. Surat</th>
                <th class="px-4 py-3 font-medium">Perihal</th>
                <th class="px-4 py-3 font-medium">Dari → Kepada</th>
                <th class="px-4 py-3 font-medium">Sifat</th>
                <th class="px-4 py-3 font-medium">Status</th>
                <th class="px-4 py-3 font-medium">Batas</th>
                <th class="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in data?.data || []" :key="r.id" class="border-b border-default last:border-0 hover:bg-muted/30 cursor-pointer" @click="navigateTo(`/surat-masuk/${r.surat_masuk_id}`)">
                <td class="px-4 py-3 font-medium whitespace-nowrap">{{ r.no_surat }}</td>
                <td class="px-4 py-3 max-w-[260px] truncate">{{ r.perihal }}</td>
                <td class="px-4 py-3">
                  <div class="font-medium">{{ r.dari_nama }}</div>
                  <div class="text-xs text-muted">→ {{ r.kepada_nama }}</div>
                </td>
                <td class="px-4 py-3">
                  <UBadge :label="sifatLabel[r.sifat_disposisi] || r.sifat_disposisi" variant="outline" :color="sifatColor[r.sifat_disposisi] || 'neutral'" size="xs" />
                </td>
                <td class="px-4 py-3">
                  <UBadge :label="statusMeta[r.status]?.label || r.status" :color="statusMeta[r.status]?.color || 'neutral'" variant="subtle" />
                </td>
                <td class="px-4 py-3 whitespace-nowrap" :class="isOverdue(r) ? 'text-error font-semibold' : ''">
                  {{ fmtTgl(r.batas_waktu) }}<span v-if="isOverdue(r)" class="text-xs text-error"> (lewat)</span>
                </td>
                <td class="px-4 py-3 text-right" @click.stop>
                  <UDropdownMenu :items="getAksiItems(r)">
                    <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" aria-label="Aksi" />
                  </UDropdownMenu>
                </td>
              </tr>
              <tr v-if="!pending && !(data?.data || []).length">
                <td colspan="7" class="px-4 py-12 text-center text-muted">Belum ada disposisi</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="view === 'grid'" class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="r in data?.data || []" :key="r.id" class="rounded-xl border border-default p-4 transition-colors hover:bg-muted/30 cursor-pointer" @click="navigateTo(`/surat-masuk/${r.surat_masuk_id}`)">
            <div class="flex items-start justify-between gap-2">
              <div class="font-medium text-sm leading-tight">{{ r.no_surat }}</div>
              <div @click.stop>
                <UDropdownMenu :items="getAksiItems(r)">
                  <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" aria-label="Aksi" />
                </UDropdownMenu>
              </div>
            </div>
            <h3 class="mt-2 text-sm font-semibold leading-snug">{{ r.perihal }}</h3>
            <div class="mt-2 flex items-center gap-1.5">
              <UBadge :label="statusMeta[r.status]?.label || r.status" :color="statusMeta[r.status]?.color || 'neutral'" variant="subtle" size="xs" />
              <UBadge :label="sifatLabel[r.sifat_disposisi] || r.sifat_disposisi" variant="outline" :color="sifatColor[r.sifat_disposisi] || 'neutral'" size="xs" />
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-sm border-t border-default pt-3">
              <div class="min-w-0">
                <p class="text-xs text-muted">Dari:</p>
                <p class="font-medium truncate">{{ r.dari_nama }}</p>
              </div>
              <div class="min-w-0 text-right">
                <p class="text-xs text-muted">Kepada:</p>
                <p class="font-medium truncate">{{ r.kepada_nama }}</p>
              </div>
            </div>
            <div class="mt-2 text-xs" :class="isOverdue(r) ? 'text-error font-semibold' : 'text-muted'">
              Batas: {{ fmtTgl(r.batas_waktu) }}<span v-if="isOverdue(r)"> (lewat)</span>
            </div>
          </div>
          <div v-if="!pending && !(data?.data || []).length" class="col-span-full py-12 text-center text-muted">Belum ada disposisi</div>
        </div>

        <div v-else class="divide-y divide-default">
          <div v-for="r in data?.data || []" :key="r.id" class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 cursor-pointer" @click="navigateTo(`/surat-masuk/${r.surat_masuk_id}`)">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm whitespace-nowrap">{{ r.no_surat }}</span>
                <span class="text-xs text-muted whitespace-nowrap">{{ r.dari_nama }} → {{ r.kepada_nama }}</span>
              </div>
              <div class="truncate text-sm text-muted">{{ r.perihal }}</div>
            </div>
            <UBadge :label="statusMeta[r.status]?.label || r.status" :color="statusMeta[r.status]?.color || 'neutral'" variant="subtle" size="xs" />
            <span class="hidden text-xs text-muted whitespace-nowrap sm:inline">{{ fmtTgl(r.batas_waktu) }}</span>
            <div @click.stop>
              <UDropdownMenu :items="getAksiItems(r)">
                <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" aria-label="Aksi" />
              </UDropdownMenu>
            </div>
          </div>
          <div v-if="!pending && !(data?.data || []).length" class="py-12 text-center text-muted">Belum ada disposisi</div>
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
    </template>
  </div>
</template>
