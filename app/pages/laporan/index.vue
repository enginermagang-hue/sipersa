<script setup lang="ts">
import { h } from 'vue'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/vue-table'

const toast = useToast()

const tab = ref<'gabungan' | 'masuk' | 'keluar' | 'arsip'>('gabungan')
const start = ref('')
const end = ref('')
const klasifikasiId = ref<number | null>(null)
const qInput = ref('')
const q = ref('')
const page = ref(1)
const limit = 20
const loading = ref(false)
let searchTimer: any = null

const { data: klasifikasi } = await useFetch('/api/klasifikasi')
const klasifikasiOptions = computed(() => [
  { label: 'Semua Klasifikasi', value: null },
  ...(klasifikasi.value || []).map((k: any) => ({ label: `${k.kode} - ${k.nama}`, value: k.id }))
])

const sumQuery = computed(() => ({ start: start.value || undefined, end: end.value || undefined, klasifikasi_id: klasifikasiId.value ?? undefined }))
const { data: overview, pending: ovPending } = await useFetch('/api/laporan/summary', { query: sumQuery })

const itemsQuery = computed(() => ({
  tab: tab.value,
  start: start.value || undefined,
  end: end.value || undefined,
  klasifikasi_id: klasifikasiId.value ?? undefined,
  q: q.value || undefined,
  page: page.value,
  limit
}))
const { data: items, pending, refresh } = await useFetch('/api/laporan/items', { query: itemsQuery })

watch(qInput, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    q.value = qInput.value.trim()
    page.value = 1
  }, 300)
})

function setTab(t: typeof tab.value) {
  tab.value = t
  page.value = 1
}
function onStartChange(v: string) {
  start.value = v
  if (v && end.value && end.value < v) {
    end.value = v
    toast.add({ title: 'Perhatian', description: 'Tanggal akhir disesuaikan ke tanggal awal', color: 'warning' })
  }
}
function onEndChange(v: string) {
  end.value = v
  if (v && start.value && start.value > v) {
    start.value = v
    toast.add({ title: 'Perhatian', description: 'Tanggal awal disesuaikan ke tanggal akhir', color: 'warning' })
  }
}

const kpiCards = computed(() => [
  { label: 'Surat Masuk', value: overview.value?.kpi?.surat_masuk ?? 0, icon: 'i-lucide-inbox', bg: 'bg-violet-50 dark:bg-violet-950/50', color: 'text-violet-600 dark:text-violet-400' },
  { label: 'Surat Keluar', value: overview.value?.kpi?.surat_keluar ?? 0, icon: 'i-lucide-send', bg: 'bg-emerald-50 dark:bg-emerald-950/50', color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Total Diarsipkan', value: overview.value?.kpi?.diarsipkan ?? 0, icon: 'i-lucide-archive', bg: 'bg-sky-50 dark:bg-sky-950/50', color: 'text-sky-600 dark:text-sky-400' },
  { label: 'Perlu Tindak Lanjut', value: overview.value?.kpi?.perlu_tindak_lanjut ?? 0, icon: 'i-lucide-triangle-alert', bg: 'bg-amber-50 dark:bg-amber-950/50', color: 'text-amber-600 dark:text-amber-400' }
])

const trend = computed(() => overview.value?.trend || [])
const trendMax = computed(() => Math.max(1, ...trend.value.flatMap((t) => [t.masuk, t.keluar])))
const isCurrentMonth = (ym: string) => {
  const now = new Date()
  return ym === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(ym: string) {
  return new Date(`${ym}-01`).toLocaleDateString('id-ID', { month: 'short' })
}

const klasColors = ['#6366f1', '#10b981', '#f59e0b', '#94a3b8', '#ec4899', '#06b6d4', '#84cc16', '#f97316']
const klasifikasiDist = computed(() => overview.value?.klasifikasi || [])
const klasTotal = computed(() => klasifikasiDist.value.reduce((s, k) => s + k.n, 0))
const donutSegments = computed(() => {
  let c = 0
  return klasifikasiDist.value.map((k, i) => {
    const pct = klasTotal.value ? (k.n / klasTotal.value) * 100 : 0
    const seg = { pct, dash: `${pct} ${100 - pct}`, offset: -c, color: klasColors[i % klasColors.length], nama: k.nama, n: k.n }
    c += pct
    return seg
  })
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'jenis',
    header: 'Jenis',
    cell: ({ row }: { row: Row<any> }) => {
      const j = row.getValue('jenis')
      const cls = j === 'masuk'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : j === 'keluar'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-700 border-slate-200'
      return h('span', { class: `inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}` }, j)
    }
  },
  { accessorKey: 'no_surat', header: 'No. Surat', cell: ({ row }: { row: Row<any> }) => h('span', { class: 'font-medium' }, row.getValue('no_surat')) },
  { accessorKey: 'tgl_surat', header: 'Tgl', cell: ({ row }: { row: Row<any> }) => h('span', { class: 'whitespace-nowrap' }, String(row.getValue('tgl_surat')).slice(0, 10)) },
  { accessorKey: 'asal_tujuan', header: 'Asal / Tujuan' },
  { accessorKey: 'perihal', header: 'Perihal' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }: { row: Row<any> }) => {
      const st = row.getValue('status') as string
      const color = ({ baru: 'warning', diproses: 'primary', selesai: 'success', 'Belum Disposisi': 'neutral', Diarsipkan: 'neutral', Terkirim: 'success' } as const)[st] ?? 'neutral'
      return h(UBadge, { label: st, variant: 'subtle', color })
    }
  },
  { accessorKey: 'lokasi', header: 'Lokasi Arsip' }
]

const periodeLabel = computed(() => {
  if (start.value && end.value) return `${start.value} s/d ${end.value}`
  if (start.value) return `Dari ${start.value}`
  if (end.value) return `Sampai ${end.value}`
  return 'Semua Periode'
})

const titleLabel = computed(() => ({
  gabungan: 'Laporan Gabungan - Semua Surat',
  masuk: 'Laporan Surat Masuk',
  keluar: 'Laporan Surat Keluar',
  arsip: 'Laporan Arsip - Telah Diarsipkan'
}[tab.value]))

async function exportExcel() {
  loading.value = true
  try {
    const blob = await $fetch('/api/laporan/export', {
      method: 'POST',
      body: {
        tab: tab.value,
        start: start.value,
        end: end.value,
        klasifikasi_id: klasifikasiId.value,
        q: q.value
      },
      responseType: 'blob'
    })
    const url = URL.createObjectURL(blob as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-${tab.value}-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    toast.add({ title: 'Berhasil', description: 'Laporan Excel berhasil diunduh', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Gagal', description: e?.data?.statusMessage || 'Gagal mengunduh laporan', color: 'error' })
  } finally {
    loading.value = false
  }
}

function cetak() {
  const p = new URLSearchParams()
  if (tab.value !== 'gabungan') p.set('tab', tab.value)
  if (start.value) p.set('start', start.value)
  if (end.value) p.set('end', end.value)
  if (klasifikasiId.value) p.set('klasifikasi_id', String(klasifikasiId.value))
  if (q.value) p.set('q', q.value)
  window.open(`/laporan/cetak?${p.toString()}`, '_blank')
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold">Laporan Persuratan &amp; Arsip</h1>
        <p class="text-sm text-muted">Rekap Surat Masuk, Surat Keluar, dan Arsip - {{ periodeLabel }}</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-file-spreadsheet" variant="outline" :loading="loading" @click="exportExcel">Export Excel</UButton>
        <UButton icon="i-lucide-printer" @click="cetak">Cetak / PDF</UButton>
      </div>
    </div>

    <UCard :ui="{ body: 'p-4' }">
      <div class="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div class="space-y-1.5">
          <UFormField label="Periode">
            <div class="flex flex-col sm:flex-row gap-2">
              <UInput type="date" :value="start" class="flex-1" @update:model-value="onStartChange($event as string)" />
              <UInput type="date" :value="end" class="flex-1" @update:model-value="onEndChange($event as string)" />
            </div>
          </UFormField>
          <p class="text-xs text-muted">Kosongkan untuk semua periode.</p>
        </div>
        <div class="space-y-1.5">
          <UFormField label="Klasifikasi">
            <USelect
              v-model="klasifikasiId"
              :items="klasifikasiOptions"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </UCard>

    <div v-if="ovPending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <USkeleton v-for="i in 4" :key="i" class="h-24 rounded-xl" />
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="c in kpiCards" :key="c.label" :ui="{ body: 'p-4' }" class="hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ c.label }}</p>
            <p class="text-3xl font-bold mt-1">{{ c.value }}</p>
          </div>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="[c.bg, c.color]">
            <UIcon :name="c.icon" class="w-5 h-5" />
          </div>
        </div>
      </UCard>
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      <UButton
        v-for="t in (['gabungan', 'masuk', 'keluar', 'arsip'] as const)"
        :key="t"
        size="sm"
        variant="soft"
        :color="tab === t ? 'primary' : 'neutral'"
        @click="setTab(t)"
      >
        {{ { gabungan: 'Gabungan', masuk: 'Surat Masuk', keluar: 'Surat Keluar', arsip: 'Arsip' }[t] }}
      </UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
      <UCard>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold">Tren Bulanan Surat</h2>
          <div class="flex items-center gap-3 text-[11px]">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-primary-400"></span>Masuk</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>Keluar</span>
          </div>
        </div>
        <div class="flex items-end gap-2 h-[160px]">
          <div v-for="t in trend" :key="t.month" class="flex-1 flex flex-col items-center gap-2">
            <div class="w-full flex gap-1 justify-center items-end h-[120px]">
              <div class="w-[42%] rounded-t-md bg-primary-400" :style="{ height: `${Math.round((t.masuk / trendMax) * 100)}%` }" :title="`${t.masuk} masuk`"></div>
              <div class="w-[42%] rounded-t-md bg-emerald-400" :style="{ height: `${Math.round((t.keluar / trendMax) * 100)}%` }" :title="`${t.keluar} keluar`"></div>
            </div>
            <span class="text-[11px] font-medium" :class="isCurrentMonth(t.month) ? 'text-primary-600' : 'text-muted'">{{ monthLabel(t.month) }}</span>
          </div>
        </div>
      </UCard>

      <UCard>
        <h2 class="text-sm font-semibold mb-4">Klasifikasi Surat</h2>
        <div class="flex items-center gap-6">
          <div class="relative w-[132px] h-[132px] shrink-0">
            <svg viewBox="0 0 42 42" class="w-full h-full -rotate-90">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" stroke-width="6"></circle>
              <circle v-for="s in donutSegments" :key="s.nama" cx="21" cy="21" r="15.915" fill="transparent" :stroke="s.color" stroke-width="6" :stroke-dasharray="s.dash" :stroke-dashoffset="s.offset"></circle>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-[22px] font-bold leading-none">{{ klasTotal }}</span>
              <span class="text-[10px] text-muted uppercase tracking-wide font-semibold mt-0.5">Total Surat</span>
            </div>
          </div>
          <div class="space-y-3 flex-1 min-w-0">
            <div v-for="k in klasifikasiDist" :key="k.nama" class="flex items-center justify-between">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: klasColors[klasifikasiDist.indexOf(k) % klasColors.length] }"></span>
                <span class="text-[13px] truncate">{{ k.nama }}</span>
              </div>
              <span class="text-[13px] font-semibold shrink-0">{{ k.n }} ({{ k.percent }}%)</span>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-default">
        <h2 class="text-sm font-semibold">
          {{ titleLabel }}
          <span class="ml-2 text-xs font-normal text-muted">({{ items?.total || 0 }} data)</span>
        </h2>
        <UInput v-model="qInput" placeholder="Cari no. surat, perihal, asal..." icon="i-lucide-search" class="w-full md:w-72" />
      </div>
      <div v-if="pending" class="h-0.5 w-full overflow-hidden bg-muted"><div class="h-full w-1/3 bg-primary animate-[shimmer_1.2s_ease-in-out_infinite]" /></div>
      <UTable :data="items?.data || []" :columns="columns" :loading="pending" empty="Tidak ada data untuk filter ini." />
      <div class="p-4 flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs text-muted">
          Menampilkan {{ items?.data?.length || 0 }} dari {{ items?.total || 0 }} surat • {{ periodeLabel }}
        </p>
        <UPagination v-model:page="page" :items-per-page="limit" :total="items?.total || 0" />
      </div>
    </UCard>

    <p class="text-xs text-muted text-center py-2">
      Laporan otomatis SIPAS • Data terverifikasi • Dicetak sistem pada {{ new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
    </p>
  </div>
</template>
