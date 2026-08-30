<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { h } from 'vue'

const { user } = useAuth()
const { confirm } = useConfirm()
const toast = useToast()

const { data, refresh, pending } = await useFetch('/api/disposisi/me')
const { data: stats } = await useFetch('/api/disposisi/stats')

const searchQuery = ref('')
const qDebounced = ref('')
let qTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, (v) => { if (qTimer) clearTimeout(qTimer); qTimer = setTimeout(() => { qDebounced.value = v; page.value = 1 }, 300) })
const activeStatus = ref<string | undefined>(undefined)
const activeSifat = ref<string | undefined>(undefined)
const bulan = ref('')
const sortBy = ref('terbaru')
type ViewMode = 'table' | 'grid' | 'compact'
const view = useLocalStorage<ViewMode>('sipersa.disposisi.view', 'table')
const filterOpen = ref(false)
const activeFilterCount = computed(() => [activeSifat.value, activeStatus.value, bulan.value].filter(Boolean).length)
function resetFilters() { activeSifat.value = undefined; activeStatus.value = undefined; bulan.value = ''; page.value = 1 }
const sifatLabel = computed(() => sifatOptions.find(o => o.value === activeSifat.value)?.label ?? activeSifat.value ?? '')
const statusLabel = computed(() => statusOptions.find(o => o.value === activeStatus.value)?.label ?? activeStatus.value ?? '')
function fmtBulan(v: string) {
  if (!v) return ''
  const [y, m] = v.split('-').map(Number)
  if (!y || !m) return v
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
}
const kpiExpanded = ref(false)

const statusOptions = [
  { label: 'Semua Status', value: undefined },
  { label: 'Baru', value: 'baru' },
  { label: 'Diproses', value: 'diproses' },
  { label: 'Selesai', value: 'selesai' }
]

const sifatOptions = [
  { label: 'Semua Sifat', value: undefined },
  { label: 'Biasa', value: 'biasa' },
  { label: 'Segera', value: 'segera' },
  { label: 'Sangat Segera', value: 'sangat_segera' },
  { label: 'Rahasia', value: 'rahasia' }
]

const sortOptions = [
  { label: 'Terbaru', value: 'terbaru' },
  { label: 'Batas Waktu Terdekat', value: 'batas_waktu' },
  { label: 'Sifat Mendesak', value: 'sifat' }
]

const prioritasLabel: Record<string, string> = { biasa: 'Biasa', segera: 'Segera', sangat_segera: 'Sangat Segera', rahasia: 'Rahasia' }
const prioritasColor: Record<string, string> = { biasa: 'neutral', segera: 'warning', sangat_segera: 'error', rahasia: 'error' }
const statusColor: Record<string, string> = { baru: 'warning', diproses: 'primary', selesai: 'success' }
const statusMeta: Record<string, { label: string; color: 'neutral' | 'warning' | 'primary' | 'success' }> = {
  baru: { label: 'Baru', color: 'warning' },
  diproses: { label: 'Diproses', color: 'primary' },
  selesai: { label: 'Selesai', color: 'success' }
}

const allowedTransitions: Record<string, string[]> = {
  baru: ['diproses', 'selesai'],
  diproses: ['selesai', 'baru'],
  selesai: []
}
function allowedStatus(current: string) {
  return statusOptions.filter((o) => o.value === current || allowedTransitions[current]?.includes(o.value))
}

function isOverdue(d: any) {
  return d.batas_waktu && d.status !== 'selesai' && d.batas_waktu < new Date().toISOString().slice(0, 10)
}

const kpiCards = computed(() => [
  { label: 'Total Disposisi', value: stats.value?.total ?? 0, sub: 'Semua yang ditujukan', icon: 'i-lucide-share-2', bg: 'bg-violet-50 dark:bg-violet-950/50', color: 'text-violet-600 dark:text-violet-400' },
  { label: 'Baru', value: stats.value?.baru ?? 0, sub: 'Perlu tindak lanjut', icon: 'i-lucide-inbox', bg: 'bg-amber-50 dark:bg-amber-950/50', color: 'text-amber-600 dark:text-amber-400' },
  { label: 'Diproses', value: stats.value?.diproses ?? 0, sub: 'Sedang dikerjakan', icon: 'i-lucide-hourglass', bg: 'bg-sky-50 dark:bg-sky-950/50', color: 'text-sky-600 dark:text-sky-400' },
  { label: 'Selesai', value: stats.value?.selesai ?? 0, sub: 'Selesai', icon: 'i-lucide-check-check', bg: 'bg-emerald-50 dark:bg-emerald-950/50', color: 'text-emerald-600 dark:text-emerald-400' }
])

const filteredData = computed(() => {
  let list = [...(data.value || [])]
  const q = qDebounced.value.trim().toLowerCase()
  if (q) {
    list = list.filter((d: any) =>
      d.perihal?.toLowerCase().includes(q) ||
      d.no_surat?.toLowerCase().includes(q) ||
      d.dari_nama?.toLowerCase().includes(q) ||
      d.kepada_nama?.toLowerCase().includes(q)
    )
  }
  if (activeStatus.value) list = list.filter((d: any) => d.status === activeStatus.value)
  if (activeSifat.value) list = list.filter((d: any) => d.sifat_disposisi === activeSifat.value)
  if (bulan.value) list = list.filter((d: any) => (d.batas_waktu || '').startsWith(bulan.value))
  if (sortBy.value === 'batas_waktu') {
    list.sort((a: any, b: any) => (a.batas_waktu || '9999').localeCompare(b.batas_waktu || '9999'))
  } else if (sortBy.value === 'sifat') {
    const order: Record<string, number> = { sangat_segera: 0, segera: 1, biasa: 2, rahasia: 3 }
    list.sort((a: any, b: any) => (order[a.sifat_disposisi] ?? 4) - (order[b.sifat_disposisi] ?? 4))
  } else {
    list.sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
  }
  return list
})

const perPage = ref(12)
const page = ref(1)
const paginatedData = computed(() => filteredData.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))
watch([activeStatus, activeSifat, bulan, sortBy], () => { page.value = 1 })

function tglWaktu(iso?: string) {
  if (!iso) return ''
  const d = new Date(String(iso).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(iso).slice(0, 16)
  const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `${tgl} ${jam}`
}
function tglSingkat(iso?: string) {
  if (!iso) return ''
  const d = new Date(String(iso).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}



async function selesaikan(d: any) {
  await confirm({ title: 'Selesaikan Disposisi', message: `Selesaikan disposisi ${d.no_surat}?`, okLabel: 'Selesaikan', loadingTitle: 'Menyelesaikan...' }, async () => {
    await $fetch(`/api/disposisi/${d.id}`, { method: 'PUT', body: { status: 'selesai' } })
    await refresh()
    toast.add({ title: 'Berhasil', description: 'Disposisi diselesaikan', color: 'success' })
  })
}

function exportExcel() {
  const p = new URLSearchParams()
  if (searchQuery.value) p.set('q', searchQuery.value)
  if (activeStatus.value) p.set('status', activeStatus.value)
  if (activeSifat.value) p.set('sifat', activeSifat.value)
  if (bulan.value) p.set('bulan', bulan.value)
  window.open(`/api/disposisi/export?${p.toString()}`, '_blank')
}

function getAksiItems(d: any) {
  const items: any[] = [
    { label: 'Lihat Detail', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/surat-masuk/${d.surat_masuk_id}`) },
    { label: 'Tindak Lanjuti', icon: 'i-lucide-corner-up-right', onSelect: () => navigateTo(`/surat-masuk/${d.surat_masuk_id}`) }
  ]
  if (d.status !== 'selesai') {
    items.push({ label: 'Selesaikan', icon: 'i-lucide-check', onSelect: () => selesaikan(d) })
  }
  return items
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Disposisi Saya</h1>
        <p class="text-sm text-muted mt-1">Daftar surat yang didisposisikan kepada Anda</p>
      </div>
      <UButton variant="soft" icon="i-lucide-file-spreadsheet" @click="exportExcel">Export Excel</UButton>
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
        <UBadge v-if="k.label === 'Baru' && (stats?.lewat_batas ?? 0) > 0" :label="`${stats?.lewat_batas} lewat batas`" color="error" variant="subtle" class="mt-2" size="xs" />
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
        <UBadge v-if="k.label === 'Baru' && (stats?.lewat_batas ?? 0) > 0" :label="`${stats?.lewat_batas} lewat batas`" color="error" variant="subtle" class="mt-2" size="xs" />
      </UCard>
    </div>
    <div class="flex justify-center lg:hidden">
      <UButton variant="ghost" size="xs" :trailing-icon="kpiExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" @click="kpiExpanded = !kpiExpanded">
        {{ kpiExpanded ? 'Sembunyikan' : `Lihat semua (${kpiCards.length})` }}
      </UButton>
    </div>

    <div class="flex gap-2 items-center">
      <UInput v-model="searchQuery" placeholder="Cari no. surat, perihal, pengirim..." icon="i-lucide-search" class="flex-1 min-w-0" :ui="{ trailing: 'pr-8' }">
        <template v-if="searchQuery" #trailing>
          <UButton variant="ghost" size="xs" color="neutral" icon="i-lucide-x" aria-label="Hapus pencarian" @click="searchQuery = ''" />
        </template>
      </UInput>
      <UButton class="lg:hidden shrink-0" icon="i-lucide-sliders-horizontal" variant="outline" aria-label="Buka filter" @click="filterOpen = true">
        Filter
        <UBadge v-if="activeFilterCount" :label="activeFilterCount" color="primary" variant="solid" size="xs" class="ml-1" />
      </UButton>
      <UFieldGroup class="border border-default p-1 rounded-lg shrink-0" size="sm">
        <UButton icon="i-lucide-rows-3" :color="view === 'table' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan tabel" :ui="{ base: 'px-2' }" @click="view = 'table'" />
        <UButton icon="i-lucide-layout-grid" :color="view === 'grid' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan grid" :ui="{ base: 'px-2' }" @click="view = 'grid'" />
        <UButton icon="i-lucide-list" :color="view === 'compact' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan ringkas" :ui="{ base: 'px-2' }" @click="view = 'compact'" />
      </UFieldGroup>
    </div>

    <div v-if="activeFilterCount" class="flex flex-wrap items-center gap-1.5 lg:hidden">
      <span class="text-xs text-muted mr-1">Filter aktif:</span>
      <UBadge v-if="activeStatus" :label="statusLabel" variant="subtle" color="primary" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="activeStatus = undefined" />
      <UBadge v-if="activeSifat" :label="sifatLabel" variant="subtle" color="neutral" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="activeSifat = undefined" />
      <UBadge v-if="bulan" :label="fmtBulan(bulan)" variant="subtle" color="neutral" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="bulan = ''" />
      <UButton v-if="activeFilterCount > 1" variant="link" size="xs" color="neutral" class="px-1" @click="resetFilters">Hapus semua</UButton>
    </div>

    <div class="hidden lg:grid lg:grid-cols-12 gap-2">
      <USelect v-model="activeStatus" :items="statusOptions" value-key="value" label-key="label" placeholder="Status" class="lg:col-span-3 w-full min-w-0" />
      <USelect v-model="activeSifat" :items="sifatOptions" value-key="value" label-key="label" placeholder="Sifat" class="lg:col-span-3 w-full min-w-0" />
      <UInput v-model="bulan" type="month" class="lg:col-span-3 w-full min-w-0" />
      <USelect v-model="sortBy" :items="sortOptions" value-key="value" label-key="label" placeholder="Urutkan" class="lg:col-span-3 w-full min-w-0" />
    </div>

    <USlideover v-model:open="filterOpen" title="Filter" description="Saring disposisi" side="right" :ui="{ content: 'max-w-sm' }">
      <template #body>
        <div class="space-y-4">
          <USelect v-model="activeStatus" :items="statusOptions" value-key="value" label-key="label" placeholder="Status" class="w-full" />
          <USelect v-model="activeSifat" :items="sifatOptions" value-key="value" label-key="label" placeholder="Sifat" class="w-full" />
          <UInput v-model="bulan" type="month" class="w-full" />
          <USelect v-model="sortBy" :items="sortOptions" value-key="value" label-key="label" placeholder="Urutkan" class="w-full" />
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
            <tr v-for="d in paginatedData" :key="d.id" class="border-b border-default last:border-0 hover:bg-muted/30 cursor-pointer" @click="navigateTo(`/surat-masuk/${d.surat_masuk_id}`)">
              <td class="px-4 py-3 font-medium whitespace-nowrap">{{ d.no_surat }}</td>
              <td class="px-4 py-3 max-w-[260px] truncate">{{ d.perihal }}</td>
              <td class="px-4 py-3">
                <div class="font-medium">{{ d.dari_nama }}</div>
                <div class="text-xs text-muted">→ {{ d.kepada_nama }}</div>
              </td>
              <td class="px-4 py-3">
                <UBadge :label="prioritasLabel[d.sifat_disposisi] || d.sifat_disposisi" variant="outline" :color="prioritasColor[d.sifat_disposisi] || 'neutral'" size="xs" />
              </td>
              <td class="px-4 py-3">
                <UBadge :label="statusMeta[d.status]?.label || d.status" :color="statusMeta[d.status]?.color || 'neutral'" variant="subtle" />
              </td>
              <td class="px-4 py-3 whitespace-nowrap" :class="isOverdue(d) ? 'text-error font-semibold' : ''">
                {{ tglSingkat(d.batas_waktu) }}<span v-if="isOverdue(d)" class="text-xs text-error"> (lewat)</span>
              </td>
              <td class="px-4 py-3 text-right" @click.stop>
                <UDropdownMenu :items="getAksiItems(d)">
                  <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" aria-label="Aksi" />
                </UDropdownMenu>
              </td>
            </tr>
            <tr v-if="!filteredData.length">
              <td colspan="7" class="px-4 py-12 text-center text-muted">Belum ada disposisi</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="view === 'grid'" class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="d in paginatedData" :key="d.id" class="rounded-xl border border-default p-4 transition-colors hover:bg-muted/30 cursor-pointer" @click="navigateTo(`/surat-masuk/${d.surat_masuk_id}`)">
          <div class="flex items-start justify-between gap-2">
            <div class="font-medium text-sm leading-tight">{{ d.no_surat }}</div>
            <div @click.stop>
              <UDropdownMenu :items="getAksiItems(d)">
                <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" aria-label="Aksi" />
              </UDropdownMenu>
            </div>
          </div>
          <h3 class="mt-2 text-sm font-semibold leading-snug">{{ d.perihal }}</h3>
          <div class="mt-2 flex items-center gap-1.5">
            <UBadge :label="statusMeta[d.status]?.label || d.status" :color="statusMeta[d.status]?.color || 'neutral'" variant="subtle" size="xs" />
            <UBadge :label="prioritasLabel[d.sifat_disposisi] || d.sifat_disposisi" variant="outline" :color="prioritasColor[d.sifat_disposisi] || 'neutral'" size="xs" />
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2 text-sm border-t border-default pt-3">
            <div class="min-w-0">
              <p class="text-xs text-muted">Dari:</p>
              <p class="font-medium truncate">{{ d.dari_nama }}</p>
            </div>
            <div class="min-w-0 text-right">
              <p class="text-xs text-muted">Kepada:</p>
              <p class="font-medium truncate">{{ d.kepada_nama }}</p>
            </div>
          </div>
          <div class="mt-2 text-xs" :class="isOverdue(d) ? 'text-error font-semibold' : 'text-muted'">
            Batas: {{ tglSingkat(d.batas_waktu) }}<span v-if="isOverdue(d)"> (lewat)</span>
          </div>
        </div>
        <div v-if="!filteredData.length" class="col-span-full py-12 text-center text-muted">Belum ada disposisi</div>
      </div>

      <div v-else class="divide-y divide-default">
        <div v-for="d in paginatedData" :key="d.id" class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 cursor-pointer" @click="navigateTo(`/surat-masuk/${d.surat_masuk_id}`)">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm whitespace-nowrap">{{ d.no_surat }}</span>
              <span class="text-xs text-muted whitespace-nowrap">{{ d.dari_nama }} → {{ d.kepada_nama }}</span>
            </div>
            <div class="truncate text-sm text-muted">{{ d.perihal }}</div>
          </div>
          <UBadge :label="statusMeta[d.status]?.label || d.status" :color="statusMeta[d.status]?.color || 'neutral'" variant="subtle" size="xs" />
          <span class="hidden text-xs text-muted whitespace-nowrap sm:inline">{{ tglSingkat(d.batas_waktu) }}</span>
          <div @click.stop>
            <UDropdownMenu :items="getAksiItems(d)">
              <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" aria-label="Aksi" />
            </UDropdownMenu>
          </div>
        </div>
        <div v-if="!filteredData.length" class="py-12 text-center text-muted">Belum ada disposisi</div>
      </div>

      <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm text-muted min-w-0 truncate text-center sm:text-left">
          Menampilkan {{ filteredData.length ? (page - 1) * perPage + 1 : 0 }}–{{ Math.min(page * perPage, filteredData.length) }} dari {{ filteredData.length }} disposisi
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-end w-full sm:w-auto">
          <USelect v-model="perPage" :items="[12,24,48]" class="w-24 shrink-0" />
          <div class="overflow-x-auto max-w-full -mx-1 px-1">
            <UPagination v-if="filteredData.length" v-model:page="page" :items-per-page="perPage" :total="filteredData.length" :sibling-count="1" size="sm" />
          </div>
        </div>
      </div>
    </UCard>


  </div>
</template>
