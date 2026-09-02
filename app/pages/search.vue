<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints, useLocalStorage, watchDebounced } from '@vueuse/core'
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'

const route = useRoute()
const router = useRouter()

const initial = typeof route.query.q === 'string' ? route.query.q.trim() : ''
const qInput = ref(initial)
const q = ref(initial)
const jenisTab = ref<'semua' | 'masuk' | 'keluar' | 'arsip'>('semua')
const sort = ref<'relevance' | 'newest'>('relevance')
const sifats = ref<string[]>([])
const statuses = ref<string[]>([])
const history = useLocalStorage<string[]>('sipersa.search.history', [])
const page = ref(1)
const perPage = ref(15)

// Rentang Waktu — date range picker (UCalendar range + UPopover)
const tz = getLocalTimeZone()
const df = new DateFormatter('id-ID', { dateStyle: 'medium' })
const breakpoints = useBreakpoints(breakpointsTailwind)
const isDesktop = breakpoints.greaterOrEqual('sm')
type RangeValue = { start?: CalendarDate, end?: CalendarDate }
const dateRange = ref<RangeValue>({ start: undefined, end: undefined })

const presetRanges = [
  { label: 'Hari ini', value: 'hari_ini' },
  { label: '7 hari terakhir', value: '7hari' },
  { label: '30 hari terakhir', value: '30hari' },
  { label: `Tahun ${new Date().getFullYear()}`, value: 'tahun' }
]

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function calToIso(c?: CalendarDate | null) {
  return c ? `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}` : ''
}
const range = computed(() => ({ from: calToIso(dateRange.value.start), to: calToIso(dateRange.value.end) }))
const rangeLabel = computed(() => {
  const { start, end } = dateRange.value
  if (!start && !end) return 'Semua waktu'
  if (start && !end) return df.format(start.toDate(tz))
  if (start && end) return `${df.format(start.toDate(tz))} - ${df.format(end.toDate(tz))}`
  return 'Semua waktu'
})
function buildRange(preset: string) {
  const now = new Date()
  const toCal = (d: Date) => new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const todayCal = toCal(now)
  if (preset === 'hari_ini') return { start: todayCal, end: todayCal }
  if (preset === '7hari') { const f = new Date(now); f.setDate(f.getDate() - 6); return { start: toCal(f), end: todayCal } }
  if (preset === '30hari') { const f = new Date(now); f.setDate(f.getDate() - 29); return { start: toCal(f), end: todayCal } }
  if (preset === 'tahun') return { start: new CalendarDate(now.getFullYear(), 1, 1), end: new CalendarDate(now.getFullYear(), 12, 31) }
  return { start: undefined, end: undefined }
}
function isRangeSelected(preset: string) {
  const cur = buildRange(preset)
  const a = dateRange.value; const b = cur
  if (!a.start || !a.end || !b.start || !b.end) return false
  return a.start.compare(b.start) === 0 && a.end.compare(b.end) === 0
}
function selectPreset(preset: string) {
  dateRange.value = buildRange(preset)
}

watchDebounced(qInput, (v) => {
  q.value = v
  const t = v.trim()
  if (t.length >= 2) {
    history.value = [t, ...history.value.filter((h) => h !== t)].slice(0, 5)
  }
}, { debounce: 300 })

watch(q, (v) => {
  if (import.meta.server) return
  const cur = typeof route.query.q === 'string' ? route.query.q : ''
  if (v === cur) return
  router.replace({ query: { ...route.query, ...(v ? { q: v } : { q: undefined }) } })
})

// Reset ke halaman 1 saat kriteria pencarian berubah
watch([q, jenisTab, sort, dateRange, sifats, statuses], () => {
  page.value = 1
}, { deep: true })
watch(perPage, () => { page.value = 1 })

const hasFilter = computed(() =>
  q.value.trim().length >= 2 || !!range.value.from || !!range.value.to || sifats.value.length > 0 || statuses.value.length > 0
)

const { data, pending } = await useFetch('/api/search', {
  query: {
    q,
    jenis: computed(() => (jenisTab.value === 'semua' ? 'masuk,keluar,arsip' : jenisTab.value)),
    sifat: computed(() => sifats.value.join(',')),
    status: computed(() => statuses.value.join(',')),
    date_from: computed(() => range.value.from),
    date_to: computed(() => range.value.to),
    sort,
    page,
    limit: perPage
  }
})

const d = computed(() => (data.value as any) || {})
const rows = computed<any[]>(() => d.value.rows || [])
const totalCount = computed(() => d.value.count ?? 0)
const rangeStart = computed(() => totalCount.value ? (page.value - 1) * perPage.value + 1 : 0)
const rangeEnd = computed(() => (page.value - 1) * perPage.value + rows.value.length)

const typeMeta: Record<string, { label: string; base: string; icon: string }> = {
  surat_masuk: { label: 'Surat Masuk', base: '/surat-masuk', icon: 'i-lucide-inbox' },
  surat_keluar: { label: 'Surat Keluar', base: '/surat-keluar', icon: 'i-lucide-send' },
  arsip: { label: 'Arsip', base: '', icon: 'i-lucide-archive' }
}

const jenisOptions = [
  { value: 'semua', label: 'Semua' },
  { value: 'masuk', label: 'Surat Masuk' },
  { value: 'keluar', label: 'Surat Keluar' },
  { value: 'arsip', label: 'Arsip' }
]

const waktuOptions = [
  { value: '', label: 'Semua waktu' },
  { value: 'hari_ini', label: 'Hari ini' },
  { value: '7hari', label: '7 hari terakhir' },
  { value: '30hari', label: '30 hari terakhir' },
  { value: 'tahun', label: `Tahun ${new Date().getFullYear()}` },
  { value: 'kustom', label: 'Kustom (pilih di kalender)' }
]

const sifatOptions = [
  { value: 'biasa', label: 'Biasa' },
  { value: 'segera', label: 'Segera' },
  { value: 'penting', label: 'Penting' },
  { value: 'rahasia', label: 'Rahasia' }
]

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'menunggu_persetujuan', label: 'Menunggu Persetujuan' },
  { value: 'diterima', label: 'Diterima' },
  { value: 'didisposisikan', label: 'Didisposisikan' },
  { value: 'ditolak', label: 'Ditolak' },
  { value: 'terkirim', label: 'Terkirim' },
  { value: 'selesai', label: 'Selesai' }
]

const statusMeta: Record<string, { label: string; color: 'neutral' | 'info' | 'success' | 'primary' | 'warning' | 'error' }> = {
  draft: { label: 'Draft', color: 'neutral' },
  menunggu_persetujuan: { label: 'Menunggu Persetujuan', color: 'warning' },
  diterima: { label: 'Diterima', color: 'success' },
  didisposisikan: { label: 'Didisposisikan', color: 'info' },
  ditolak: { label: 'Ditolak', color: 'error' },
  terkirim: { label: 'Terkirim', color: 'success' },
  selesai: { label: 'Selesai', color: 'primary' },
  diarsipkan: { label: 'Diarsipkan', color: 'primary' }
}

const sifatColor: Record<string, 'neutral' | 'warning' | 'info' | 'error'> = {
  biasa: 'neutral',
  segera: 'warning',
  penting: 'info',
  rahasia: 'error'
}

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function hl(text?: string | null) {
  const t = stripHtml(text ?? '')
  const needle = q.value.trim()
  if (!needle) return esc(t)
  const re = new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return esc(t).replace(re, '<mark class="rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/30">$1</mark>')
}

function excerpt(r: any) {
  return stripHtml(r.ringkasan || r.judul || r.perihal || '')
}

function fmtTgl(s?: string | null) {
  if (!s) return '—'
  const dt = new Date(s.length === 10 ? `${s}T00:00:00` : s)
  if (Number.isNaN(dt.getTime())) return s
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function cariLangsung(term: string) {
  qInput.value = term
  q.value = term
}

function resetFilter() {
  dateRange.value = { start: undefined, end: undefined }
  sifats.value = []
  statuses.value = []
  qInput.value = ''
  q.value = ''
}

function unduh(fileDriveId?: string | null) {
  if (fileDriveId) window.open(`/api/files/${fileDriveId}`, '_blank')
}

function buka(r: any) {
  const meta = typeMeta[r._type]
  if (meta?.base) navigateTo(`${meta.base}/${r.id}`)
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    document.getElementById('global-search')?.focus()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Pencarian Global</h1>
      <p class="text-sm text-muted mt-1">Cari surat masuk, surat keluar, dan berkas arsip dalam satu tempat</p>
    </div>

    <UCard :ui="{ body: 'p-4' }">
      <UInput
        id="global-search"
        v-model="qInput"
        icon="i-lucide-search"
        size="xl"
        placeholder="Cari surat, arsip, disposisi, atau lampiran..."
        class="w-full"
      >
        <template #trailing>
          <UKbd value="control-k" variant="subtle">⌘K</UKbd>
        </template>
      </UInput>

      <div v-if="history.length" class="flex flex-wrap items-center gap-2 mt-3">
        <span class="text-xs text-muted">Pencarian terakhir:</span>
        <UButton
          v-for="h in history"
          :key="h"
          :label="h"
          size="xs"
          color="neutral"
          variant="soft"
          @click="cariLangsung(h)"
        />
      </div>
    </UCard>

    <div class="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Jenis dokumen" class="inline-flex rounded-md border border-default bg-default p-0.5">
        <UButton
          v-for="j in jenisOptions"
          :key="j.value"
          :label="j.label"
          size="sm"
          :color="jenisTab === j.value ? 'primary' : 'neutral'"
          :variant="jenisTab === j.value ? 'solid' : 'ghost'"
          @click="jenisTab = j.value as any"
        />
      </div>
      <div class="flex-1" />
      <div role="group" aria-label="Urutan hasil" class="inline-flex rounded-md border border-default bg-default p-0.5">
        <UButton
          label="Paling Relevan"
          size="sm"
          :color="sort === 'relevance' ? 'primary' : 'neutral'"
          :variant="sort === 'relevance' ? 'soft' : 'ghost'"
          @click="sort = 'relevance'"
        />
        <UButton
          label="Terbaru"
          size="sm"
          :color="sort === 'newest' ? 'primary' : 'neutral'"
          :variant="sort === 'newest' ? 'soft' : 'ghost'"
          @click="sort = 'newest'"
        />
      </div>
    </div>

    <div v-if="!hasFilter" class="py-16 text-center">
      <UIcon name="i-lucide-search" class="w-10 h-10 mx-auto text-muted" />
      <p class="mt-3 text-sm text-muted">Ketik minimal 2 karakter untuk mulai mencari, atau gunakan filter di samping.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-5 md:grid-cols-[260px_1fr] items-start">
      <UCard class="md:sticky md:top-4 md:self-start md:max-h-[calc(100dvh-3.5rem-2rem)] md:overflow-y-auto custom-scrollbar-sidebar" :ui="{ body: 'p-4 space-y-5' }">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <span class="font-semibold text-sm">Filter</span>
            <UButton label="Reset" size="xs" variant="ghost" color="neutral" icon="i-lucide-rotate-ccw" @click="resetFilter" />
          </div>
        </template>

        <fieldset>
          <legend class="text-xs font-medium uppercase text-muted mb-2">Rentang Waktu</legend>
          <UPopover :content="{ align: 'center' }">
            <UButton color="neutral" variant="subtle" icon="i-lucide-calendar" block class="justify-start">
              {{ rangeLabel }}
            </UButton>
            <template #content>
              <div class="flex items-stretch divide-x divide-(--ui-border)">
                <div class="hidden sm:flex flex-col justify-center py-2">
                  <UButton label="Semua waktu" color="neutral" variant="ghost" class="rounded-none px-4" :class="[!dateRange.start && !dateRange.end ? 'bg-elevated' : '']" truncate @click="dateRange = { start: undefined, end: undefined }" />
                  <UButton v-for="pr in presetRanges" :key="pr.value" :label="pr.label" color="neutral" variant="ghost" class="rounded-none px-4" :class="[isRangeSelected(pr.value) ? 'bg-elevated' : 'hover:bg-elevated/50']" truncate @click="selectPreset(pr.value)" />
                  <UButton label="Hapus" icon="i-lucide-x" color="neutral" variant="ghost" class="rounded-none px-4 mt-1" @click="dateRange = { start: undefined, end: undefined }" />
                </div>
                <UCalendar v-model="dateRange" range :number-of-months="isDesktop ? 2 : 1" class="p-2" />
              </div>
              <div class="sm:hidden flex flex-wrap gap-1.5 p-2 border-t border-default">
                <UButton label="Semua" size="xs" color="neutral" :variant="!dateRange.start && !dateRange.end ? 'solid' : 'ghost'" @click="dateRange = { start: undefined, end: undefined }" />
                <UButton v-for="pr in presetRanges" :key="pr.value+'-m'" :label="pr.label" size="xs" color="neutral" :variant="isRangeSelected(pr.value) ? 'solid' : 'ghost'" @click="selectPreset(pr.value)" />
              </div>
            </template>
          </UPopover>
          <div v-if="range.from || range.to" class="mt-2 flex flex-wrap gap-1.5">
            <UBadge :label="`${range.from || '?'} → ${range.to || '?'}`" variant="subtle" color="primary" trailing-icon="i-lucide-x" size="sm" class="cursor-pointer" @click="dateRange = { start: undefined, end: undefined }" />
          </div>
        </fieldset>

        <fieldset>
          <legend class="text-xs font-medium uppercase text-muted mb-2">Sifat</legend>
          <div class="space-y-1.5">
            <label v-for="s in sifatOptions" :key="s.value" class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="sifats" type="checkbox" :value="s.value" class="accent-primary">
              {{ s.label }}
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend class="text-xs font-medium uppercase text-muted mb-2">Status</legend>
          <div class="space-y-1.5">
            <label v-for="s in statusOptions" :key="s.value" class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="statuses" type="checkbox" :value="s.value" class="accent-primary">
              {{ s.label }}
            </label>
          </div>
        </fieldset>

        <div class="rounded-md bg-muted/40 p-3 text-xs text-muted">
          <span class="font-medium">Tips:</span> gunakan tanda kutip untuk frase persis.
        </div>
      </UCard>

      <div class="space-y-4 min-w-0" aria-live="polite">
        <div v-if="pending && !data" class="space-y-3">
          <div v-for="i in 3" :key="i" class="h-24 rounded-xl border border-default animate-pulse bg-muted/30" />
        </div>

        <template v-else>
          <p class="text-sm text-muted">
            Menampilkan <span class="font-semibold text-default">{{ totalCount }}</span> hasil
            <template v-if="q.trim()"> untuk '<span class="font-semibold text-default">{{ q }}</span>'</template>
            <template v-if="d.took_ms != null"> • {{ d.took_ms }} ms</template>
          </p>

          <UCard v-if="d.best_match && page === 1" :ui="{ body: 'p-4 sm:p-5' }">
            <div class="flex items-center gap-2 mb-2">
              <UBadge label="Hasil Terbaik" color="primary" variant="subtle" icon="i-lucide-sparkles" />
              <UBadge :label="typeMeta[d.best_match._type]?.label || d.best_match._type" variant="subtle" />
            </div>
            <div class="cursor-pointer" @click="buka(d.best_match)">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-semibold" v-html="hl(d.best_match.nomor || d.best_match.judul)" />
                  <div class="text-sm font-medium mt-0.5 line-clamp-1" v-html="hl(d.best_match.judul)" />
                </div>
                <div class="flex gap-1 shrink-0" @click.stop>
                  <UButton
                    v-if="typeMeta[d.best_match._type]?.base"
                    icon="i-lucide-eye"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    aria-label="Lihat Detail"
                    @click="buka(d.best_match)"
                  />
                  <UButton
                    v-if="d.best_match.file_drive_id"
                    icon="i-lucide-download"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    aria-label="Unduh File"
                    @click="unduh(d.best_match.file_drive_id)"
                  />
                </div>
              </div>
              <p class="text-sm text-muted mt-1 line-clamp-2" v-html="hl(excerpt(d.best_match))" />
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted">
                <UIcon :name="typeMeta[d.best_match._type]?.icon" class="w-3.5 h-3.5" />
                <span>{{ fmtTgl(d.best_match.tanggal) }}</span>
                <span v-if="d.best_match.entitas">{{ d.best_match.entitas }}</span>
                <span v-if="d.best_match.klasifikasi_kode">Klasifikasi {{ d.best_match.klasifikasi_kode }}</span>
                <span v-if="d.best_match.tahun">{{ d.best_match.tahun }}</span>
              </div>
              <div class="flex flex-wrap items-center gap-1.5 mt-3">
                <UBadge v-if="d.best_match.sifat" :label="d.best_match.sifat" :color="sifatColor[d.best_match.sifat] || 'neutral'" variant="subtle" size="sm" />
                <UBadge
                  v-if="d.best_match.status"
                  :label="statusMeta[d.best_match.status]?.label || d.best_match.status"
                  :color="statusMeta[d.best_match.status]?.color || 'neutral'"
                  variant="subtle"
                  size="sm"
                />
              </div>
            </div>
          </UCard>

          <UCard v-if="!rows.length" :ui="{ body: 'p-10' }">
            <div class="text-center">
              <UIcon name="i-lucide-search-x" class="w-8 h-8 mx-auto text-muted" />
              <p class="mt-3 text-sm text-muted">Tidak ada hasil<template v-if="q.trim()"> untuk '<span class="font-semibold">{{ q }}</span>'</template></p>
            </div>
          </UCard>

          <template v-else>
            <UCard v-for="r in rows" :key="`${r._type}-${r.id}`" :ui="{ body: 'p-4' }">
              <div :class="{ 'cursor-pointer': !!typeMeta[r._type]?.base }" @click="buka(r)">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <UBadge :label="typeMeta[r._type]?.label || r._type" variant="subtle" size="sm" :icon="typeMeta[r._type]?.icon" />
                      <div class="font-semibold text-sm truncate" v-html="hl(r.nomor || r.judul)" />
                    </div>
                    <div v-if="(r.judul || '').trim() && r.judul !== r.nomor" class="text-sm font-medium mt-1 line-clamp-1" v-html="hl(r.judul)" />
                  </div>
                  <div class="flex gap-1 shrink-0" @click.stop>
                    <UButton
                      v-if="typeMeta[r._type]?.base"
                      icon="i-lucide-eye"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      aria-label="Lihat Detail"
                      @click="buka(r)"
                    />
                    <UButton
                      v-if="r.file_drive_id"
                      icon="i-lucide-download"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      aria-label="Unduh File"
                      @click="unduh(r.file_drive_id)"
                    />
                  </div>
                </div>
                <p class="text-sm text-muted mt-1 line-clamp-2" v-html="hl(excerpt(r))" />
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted">
                  <span>{{ fmtTgl(r.tanggal) }}</span>
                  <span v-if="r.entitas">{{ r.entitas }}</span>
                  <span v-if="r.klasifikasi_kode">Klasifikasi {{ r.klasifikasi_kode }}</span>
                  <span v-if="r.tahun">{{ r.tahun }}</span>
                </div>
                <div class="flex flex-wrap items-center gap-1.5 mt-2">
                  <UBadge v-if="r.sifat" :label="r.sifat" :color="sifatColor[r.sifat] || 'neutral'" variant="subtle" size="sm" />
                  <UBadge
                    v-if="r.status"
                    :label="statusMeta[r.status]?.label || r.status"
                    :color="statusMeta[r.status]?.color || 'neutral'"
                    variant="subtle"
                    size="sm"
                  />
                </div>
              </div>
            </UCard>

            <div v-if="totalCount > 0" class="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="text-sm text-muted min-w-0 truncate text-center sm:text-left">
                Menampilkan {{ rangeStart.toLocaleString('id-ID') }}–{{ rangeEnd.toLocaleString('id-ID') }} dari {{ totalCount.toLocaleString('id-ID') }}
                <span v-if="d.took_ms != null" class="hidden sm:inline"> • {{ d.took_ms }} ms</span>
              </div>
              <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-end w-full sm:w-auto">
                <USelect v-model="perPage" :items="[10,15,20,50]" class="w-24 shrink-0" />
                <div class="overflow-x-auto max-w-full -mx-1 px-1">
                  <UPagination v-model:page="page" :items-per-page="perPage" :total="totalCount" :max="5" show-edges :sibling-count="1" size="sm" />
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>
