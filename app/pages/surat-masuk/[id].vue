<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const route = useRoute()
const id = route.params.id as string
const { data, refresh } = await useFetch(`/api/surat-masuk/${id}`)
const { data: users } = await useFetch('/api/users')
const { user } = useAuth()

const isPenerima = computed(() => (data.value?.disposisi || []).some((d: any) => d.kepada_user_id === user.value?.id))
const isPenerimaAktif = computed(() => (data.value?.disposisi || []).some((d: any) => d.kepada_user_id === user.value?.id && d.status !== 'selesai'))
const isPimpinan = computed(() => user.value?.role === 'pimpinan')
const hasDisposisiAwal = computed(() => (data.value?.disposisi || []).some((d: any) => d.parent_id === null))
const canDisposisi = computed(() => isPimpinan.value || isPenerimaAktif.value)
const disposisiDisabled = computed(() => isPimpinan.value && hasDisposisiAwal.value)
const disposisiLabel = computed(() => isPenerimaAktif.value ? 'Teruskan Disposisi' : 'Buat Disposisi')
const canDelete = computed(() => user.value?.role === 'admin' || user.value?.id === data.value?.surat.created_by)
const canArsip = computed(() => ['admin', 'staff'].includes(user.value?.role))
const isArchived = computed(() => !!data.value?.arsip)
const arsipOpen = ref(false)
const disposisiModalOpen = ref(false)
const extractingRingkasan = ref(false)
const extractionError = ref('')

const sifatLabel: Record<string, string> = { biasa: 'Biasa', segera: 'Segera', sangat_segera: 'Sangat Segera', rahasia: 'Rahasia' }

const ringkasanText = computed(() => data.value?.surat?.ringkasan || '')
const hasPdf = computed(() => !!data.value?.surat?.file_drive_id)
const needsExtraction = computed(() => hasPdf.value && !ringkasanText.value)

watch(needsExtraction, (val) => {
  if (val) {
    extractingRingkasan.value = true
    extractionError.value = ''
    const timer = setInterval(() => {
      if (data.value?.surat?.ringkasan) {
        extractingRingkasan.value = false
        clearInterval(timer)
      }
    }, 2000)
  }
})

const onRetryExtraction = async () => {
  extractingRingkasan.value = true
  extractionError.value = ''
  try {
    await $fetch(`/api/surat-masuk/${id}/ringkasan`, { method: 'POST' })
  } catch (e: any) {
    extractionError.value = e?.data?.statusMessage || 'Gagal memuat ringkasan'
  } finally {
    extractingRingkasan.value = false
    await refresh()
  }
}
const isNewSurat = (tglTerima?: string) => {
  if (!tglTerima) return false
  const d = new Date(tglTerima)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  return (now.getTime() - d.getTime()) < 1000 * 60 * 60 * 24 * 3
}
const fmtTgl = (iso?: string) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
const fmtTglWaktu = (iso?: string | null) => {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const formatNoAgenda = (no?: string | null, tgl?: string) => {
  const num = no == null ? '' : String(no).padStart(5, '0')
  const year = tgl ? new Date(tgl).getFullYear() : new Date().getFullYear()
  return num ? `AGD-${year}-${num}` : ''
}
const instruksiCharCount = computed(() => (dispForm.instruksi_tambahan || '').length)

function onInstruksiInput() {
  // gunakan untuk trigger validasi tambahan jika nanti dibutuhkan
}
const isUrgent = computed(() => ['segera', 'sangat_segera'].includes(dispForm.sifat_disposisi))
const isViewable = computed(() => {
  const n = (data.value?.surat?.file_name || '').toLowerCase()
  return n.endsWith('.pdf') || /\.(png|jpe?g|gif|webp)$/.test(n)
})
const safeSize = '1.2 MB'
const safePages = '3'
const stepperSteps = [
  { key: 'diterima', label: 'Diterima' },
  { key: 'didisposisikan', label: 'Didisposisikan' },
  { key: 'ditindaklanjuti', label: 'Ditindaklanjuti' },
  { key: 'selesai', label: 'Selesai' }
]

const isLineActive = (index: number) => {
  const steps = ['diterima', 'didisposisikan', 'ditindaklanjuti', 'selesai'] as const
  const currentStep = steps[index]
  const nextStep = steps[index + 1]
  if (!currentStep || !nextStep) return false
  return stepperState.value[currentStep as keyof typeof stepperState.value] && stepperState.value[nextStep as keyof typeof stepperState.value]
}

/* ---------- Form Disposisi ---------- */
const instruksiOptions = [
  'Tindak Lanjuti',
  'Pelajari & Konsep Balasan',
  'Koordinasikan',
  'Laporkan Hasilnya',
  'Arsipkan',
  'Untuk Diketahui'
]
const sifatOptions = [
  { label: 'Biasa', value: 'biasa' },
  { label: 'Segera', value: 'segera' },
  { label: 'Sangat Segera', value: 'sangat_segera' },
  { label: 'Rahasia', value: 'rahasia' }
]

const initialRecipientIds = computed(() => new Set((data.value?.disposisi || []).filter((d: any) => d.parent_id === null).map((d: any) => d.kepada_user_id)))

const recipientOptions = computed(() => {
  const all = (users.value || []) as any[]
  const blocked = initialRecipientIds.value
  return all
    .filter((u: any) => !['admin', 'pimpinan'].includes(u.role))
    .filter((u: any) => u.id !== user.value?.id)
    .filter((u: any) => !blocked.has(u.id))
    .map((u: any) => ({ label: u.nama, value: u.id }))
})

const dispForm = reactive({
  recipients: [] as number[],
  instruksi: [] as string[],
  instruksi_tambahan: '',
  sifat_disposisi: 'biasa',
  batas_waktu: '2026-08-18',
  catatan: ''
})
const dispDraftLoading = ref(false)
const dispLoading = ref(false)
const dispError = ref('')
const showSuccess = ref(false)
const successCount = ref(0)

function validate(): FormError[] {
  const errors: FormError[] = []
  if (!dispForm.recipients.length) errors.push({ name: 'recipients', message: 'Pilih minimal satu penerima' })
  return errors
}

async function submit(opts: { draft: boolean }) {
  if (isPimpinan.value && hasDisposisiAwal.value) {
    dispError.value = 'Disposisi sudah dibuat pimpinan'
    return
  }
  dispLoading.value = !opts.draft
  dispDraftLoading.value = opts.draft
  dispError.value = ''
  try {
    let res: any = null
    if (user.value?.role === 'pimpinan') {
      res = await $fetch('/api/disposisi', {
        method: 'POST',
        body: {
          surat_masuk_id: Number(id),
          kepada_user_ids: dispForm.recipients,
          instruksi_list: dispForm.instruksi,
          instruksi: dispForm.instruksi_tambahan,
          sifat_disposisi: dispForm.sifat_disposisi,
          batas_waktu: dispForm.batas_waktu || null,
          catatan: dispForm.catatan
        }
      })
    } else {
      const my = [...(data.value?.disposisi || [])].reverse().find((d: any) => d.kepada_user_id === user.value?.id && d.status !== 'selesai')
      if (!my) throw new Error('Anda bukan penerima disposisi surat ini')
      let count = 0
      for (const kepadaId of dispForm.recipients) {
        await $fetch(`/api/disposisi/${(my as any).id}/teruskan`, {
          method: 'POST',
          body: {
            kepada_user_ids: [kepadaId],
            instruksi: dispForm.instruksi_tambahan || dispForm.instruksi.join(', '),
            catatan: dispForm.catatan,
            sifat_disposisi: dispForm.sifat_disposisi,
            batas_waktu: dispForm.batas_waktu || null
          }
        })
        count++
      }
      res = { count }
    }
    dispForm.recipients = []
    dispForm.instruksi = []
    dispForm.instruksi_tambahan = ''
    dispForm.sifat_disposisi = 'biasa'
    dispForm.batas_waktu = '2026-08-18'
    dispForm.catatan = ''
    await refresh()
    if (!opts.draft) {
      successCount.value = res.count || 0
      disposisiModalOpen.value = false
      showSuccess.value = true
    }
  } catch (e: any) {
    dispError.value = e?.data?.statusMessage || 'Gagal menyimpan disposisi'
  } finally {
    dispLoading.value = false
    dispDraftLoading.value = false
  }
}

function printLembar() {
  window.open(`/surat-masuk/cetak-disposisi/${id}`, '_blank')
}

/* ---------- Riwayat / timeline ---------- */
const stepperState = computed(() => {
  const d = data.value?.disposisi || []
  const suratStatus = (data.value?.surat as any)?.status
  return {
    diterima: true,
    didisposisikan: d.some((x: any) => x.parent_id === null),
    ditindaklanjuti: suratStatus === 'ditindaklanjuti' || d.some((x: any) => x.status === 'diproses' || x.status === 'selesai'),
    selesai: d.some((x: any) => x.status === 'selesai')
  }
})

const timelineItems = computed(() =>
  (data.value?.disposisi || []).map((d: any) => {
    const nama = d.kepada_nama || d.dari_nama || '?'
    const parts = nama.split(' ')
    const initials = parts.map((w: string) => (w[0] || '').toUpperCase()).slice(0, 2).join('') || '??'
    const dateObj = d.created_at ? new Date(d.created_at) : null
    const timestamp = dateObj && !isNaN(dateObj.getTime())
      ? dateObj.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : ''
    const statusLabel = d.parent_id === null ? 'Didisposisikan' : 'Diteruskan'
    const sifatCap = d.sifat_disposisi && d.sifat_disposisi !== 'biasa'
      ? String(d.sifat_disposisi).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : ''
    const batasShort = d.batas_waktu
      ? new Date(d.batas_waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      : ''
    const batasLabel = batasShort ? `Batas ${batasShort}` : ''
    const isOverdue = !!d.batas_waktu && new Date(d.batas_waktu) < new Date(new Date().setHours(0, 0, 0, 0)) && d.status !== 'selesai'
    const description =
      d.parent_id === null
        ? `${d.dari_nama} mendisposisikan ke ${d.kepada_nama}`
        : `${d.dari_nama} meneruskan ke ${d.kepada_nama}`
    return {
      ...d,
      initials,
      timestamp,
      statusLabel,
      description,
      sifatTag: sifatCap,
      batasLabel,
      isOverdue
    }
  })
)

const statusBadgeColor: Record<string, string> = {
  BARU: 'warning',
  DIPROSES: 'primary',
  SELESAI: 'success',
  DITERIMA: 'primary',
  Didisposisikan: 'primary',
  DITINDAKLANJUTI: 'primary',
  Diteruskan: 'neutral'
}
const statusBadgeVariant: Record<string, string> = {
  BARU: 'subtle',
  DIPROSES: 'subtle',
  SELESAI: 'subtle',
  DITERIMA: 'subtle',
  Didisposisikan: 'solid',
  DITINDAKLANJUTI: 'subtle',
  Diteruskan: 'outline'
}
const { confirm } = useConfirm()
const toast = useToast()
const updatingId = ref<number | null>(null)
async function selesaikan(item: any) {
  await confirm({ title: 'Selesaikan Disposisi', message: 'Tandai disposisi ini sebagai selesai?', okLabel: 'Selesaikan', loadingTitle: 'Menyelesaikan...' }, async () => {
    updatingId.value = item.id
    try {
      await $fetch(`/api/disposisi/${item.id}`, { method: 'PUT', body: { status: 'selesai' } })
      await refresh()
      toast.add({ title: 'Berhasil', description: 'Disposisi diselesaikan', color: 'success' })
    } finally { updatingId.value = null }
  })
}
async function hapus() {
  await confirm({ title: 'Hapus Surat', message: 'Hapus surat ini?', okLabel: 'Hapus', loadingTitle: 'Menghapus...' }, async () => {
    await $fetch(`/api/surat-masuk/${id}`, { method: 'DELETE' })
  })
  await navigateTo('/surat-masuk')
}
</script>

<template>
  <div v-if="data" class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-2">
      <UButton :to="`/surat-masuk`" variant="ghost" size="sm" icon="i-lucide-arrow-left">Kembali</UButton>
      <h1 class="text-xl font-bold flex-1 min-w-40">{{ data.surat.no_surat }}</h1>
      <UButton v-if="!isArchived && canArsip" icon="i-lucide-archive" variant="soft" @click="arsipOpen = true">Arsipkan</UButton>
      <UBadge v-else label="Sudah diarsipkan" color="success" variant="subtle" size="lg" icon="i-lucide-archive"/>
      <UButton variant="outline" icon="i-lucide-printer" @click="printLembar">Cetak Disposisi</UButton>
      <UButton v-if="canDelete" color="error" variant="soft" size="sm" icon="i-lucide-trash" @click="hapus">Hapus</UButton>
    </div>

    <!-- Section: Main grid (mockup layout) -->
    <div class="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-5 md:gap-6 items-start">
      <!-- KOLOM KIRI -->
      <div class="space-y-4">
        <!-- Card Detail Surat -->
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge label="Surat Masuk" color="primary" variant="soft" size="md" />
              <UBadge
                v-if="data.surat.sifat && data.surat.sifat !== 'biasa'"
                :label="sifatLabel[data.surat.sifat] || data.surat.sifat"
                color="error"
                variant="subtle"
                size="md"
              />
              <span class="font-mono text-xs text-muted">{{ formatNoAgenda(data.surat.no_agenda, data.surat.tgl_terima) }}</span>
              <UTooltip v-if="canDisposisi" :text="disposisiDisabled ? 'Disposisi sudah dibuat' : undefined" :delay-duration="0">
                <UButton icon="i-lucide-send" size="sm" class="ml-auto rounded-full" :disabled="disposisiDisabled" @click="() => { if (!disposisiDisabled) disposisiModalOpen = true }">{{ disposisiLabel }}</UButton>
              </UTooltip>
            </div>
          </template>
            <dl class="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px] text-muted">
              <div>
                <dt class="text-muted text-xs mb-0.5">NO. SURAT</dt>
                <dd class="font-medium">{{ data.surat.no_surat }}</dd>
              </div>
              <div>
                <dt class="text-muted text-xs mb-0.5">ASAL SURAT</dt>
                <dd class="font-medium">{{ data.surat.pengirim }}</dd>
              </div>
              <div>
                <dt class="text-muted text-xs mb-0.5">TGL SURAT</dt>
                <dd class="font-medium">{{ fmtTgl(data.surat.tgl_surat) }}</dd>
              </div>
              <div>
                <dt class="text-muted text-xs mb-0.5">TGL DITERIMA</dt>
                <dd class="flex items-center gap-2 font-medium">
                  <span>{{ fmtTglWaktu(data.surat.tgl_terima) }}</span>
                  <UBadge v-if="isNewSurat(data.surat.tgl_terima)" label="Baru" color="success" variant="subtle" size="sm" />
                </dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-muted text-xs mb-0.5">HAL</dt>
                <dd class="font-medium">{{ data.surat.perihal }}</dd>
              </div>
              <div v-if="data.surat.klasifikasi_nama" class="sm:col-span-2">
                <dt class="text-muted text-xs mb-0.5">KLASIFIKASI</dt>
                <dd class="font-medium">{{ data.surat.klasifikasi_kode }} - {{ data.surat.klasifikasi_nama }}</dd>
              </div>
            </dl>

            <div v-if="ringkasanText" class="mt-4 bg-muted border border-default rounded-xl p-3.5 md:p-4 flex gap-3">
              <span class="text-muted mt-0.5">✨</span>
              <p class="text-[13px] text-muted leading-relaxed">{{ ringkasanText }}</p>
            </div>
            <div v-else-if="needsExtraction && extractingRingkasan" class="mt-4 bg-muted border border-default rounded-xl p-3.5 md:p-4">
              <p class="text-xs text-muted">Memuat ringkasan surat…</p>
            </div>
            <div v-else-if="needsExtraction && extractionError" class="mt-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3.5 md:p-4 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-red-500">⚠</span>
                <p class="text-xs text-red-600 dark:text-red-400">{{ extractionError }}</p>
              </div>
              <UButton size="xs" variant="soft" @click="onRetryExtraction">Coba lagi</UButton>
            </div>
        </UCard>

        <!-- Card Pratinjau Surat (pindah ke kiri) -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-inverted text-inverted text-xs">
                <UIcon name="i-lucide-file-text" class="h-4 w-4" />
              </span>
              <h3 class="font-semibold text-highlighted">Pratinjau Surat</h3>
              <UBadge v-if="hasPdf" :label="`PDF • ${safeSize}`" color="neutral" variant="subtle" size="sm" class="ml-auto" />
            </div>
          </template>
          <div v-if="data.surat.file_drive_id">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400">
                  <UIcon name="i-lucide-file-text" class="h-5 w-5" />
                </span>
                <div>
                  <p class="text-sm font-medium text-muted">{{ data.surat.file_name || 'Dokumen Surat' }}</p>
                  <p class="text-xs text-muted">{{ safePages }} halaman • dipindai {{ fmtTglWaktu(data.surat.tgl_terima) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <UButton v-if="isViewable" :href="`/api/files/${data.surat.file_drive_id}?inline=1`" target="_blank" size="xs" variant="ghost" icon="i-lucide-eye" />
                <UButton :href="`/api/files/${data.surat.file_drive_id}`" target="_blank" size="xs" variant="ghost" icon="i-lucide-download" />
              </div>
            </div>
            <div v-if="isViewable" class="mt-3 rounded-lg border border-default overflow-hidden">
              <FilePreview :file-id="data.surat.file_drive_id" :file-name="data.surat.file_name" :hide-actions="true" />
            </div>
          </div>
          <div v-else>
            <p class="text-sm text-muted">Tidak ada file terlampir.</p>
          </div>
        </UCard>
      </div>

      <!-- KOLOM KANAN (sticky) -->
      <div class="lg:sticky lg:top-4 lg:self-start space-y-4">

        <!-- Card Riwayat Disposisi -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-highlighted">Riwayat Disposisi</h3>
              <UBadge :label="`${timelineItems.length} aktivitas`" color="primary" variant="subtle" size="sm" />
            </div>
          </template>
            <!-- Stepper -->
            <ol class="flex items-center justify-between mb-5 w-full">
              <template v-for="(s, i) in stepperSteps" :key="s.key">
                <li class="flex flex-col items-center text-center relative z-10">
                  <span class="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors"
                    :class="stepperState[s.key as keyof typeof stepperState] ? 'bg-indigo-600 text-white' : 'bg-muted text-muted'">
                    {{ i + 1 }}
                  </span>
                  <span class="mt-1 text-[10px] font-medium whitespace-nowrap transition-colors"
                    :class="stepperState[s.key as keyof typeof stepperState] ? 'text-indigo-600 font-semibold' : 'text-muted'">
                    {{ s.label }}
                  </span>
                </li>
                <li v-if="i < stepperSteps.length - 1" class="flex-1 h-0.5 mx-2 bg-muted transition-colors"
                  :class="{ 'bg-indigo-600': isLineActive(i) }" />
              </template>
            </ol>

            <!-- Timeline entries -->
            <ul class="relative border-l border-default ml-3.5 space-y-4">
              <li v-for="item in timelineItems" :key="item.id" class="relative pl-6">
                <span class="absolute -left-[13px] top-1.5 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white dark:ring-gray-900 shadow-sm transition-colors"
                  :class="item.statusLabel === 'DIDISPOSISIKAN' ? 'bg-indigo-600 text-white' : 'bg-inverted text-inverted'">
                  {{ item.initials }}
                </span>
                <div class="rounded-xl border border-default bg-muted p-3">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-[11px] font-medium text-muted">{{ item.timestamp }}</span>
                    <UBadge :label="item.statusLabel" size="sm"
                      :color="statusBadgeColor[item.statusLabel] || 'neutral'"
                      :variant="statusBadgeVariant[item.statusLabel] || 'subtle'" />
                  </div>
                  <p class="text-sm font-medium text-highlighted">{{ item.description }}</p>
                  <div v-if="item.instruksi" class="mt-2 bg-default border border-default rounded-lg p-2 text-xs text-muted italic">
                    "{{ item.instruksi }}"
                  </div>
                  <div v-if="item.sifatTag || item.batasLabel" class="flex flex-wrap gap-1.5 mt-2">
                    <UBadge v-if="item.sifatTag" :label="item.sifatTag" size="sm" color="warning" variant="subtle" />
                    <UBadge v-if="item.batasLabel" :label="item.batasLabel" size="sm" :color="item.isOverdue ? 'error' : 'neutral'" variant="outline" icon="i-lucide-clock-3" />
                  </div>
                  <div v-if="item.kepada_user_id === user?.id && item.status !== 'selesai'" class="mt-2">
                    <UButton size="xs" color="success" variant="soft" icon="i-lucide-check" :loading="updatingId === item.id" @click="selesaikan(item)">Selesaikan</UButton>
                  </div>
                </div>
              </li>
              <li v-if="!timelineItems.length" class="text-sm text-muted pl-4">Belum ada disposisi.</li>
            </ul>

            <div class="mt-4">
              <UButton variant="outline" size="sm" class="w-full border-dashed" icon="i-lucide-clock">
                Lihat riwayat lengkap
              </UButton>
            </div>
        </UCard>
      </div>
    </div>

    <!-- Success modal -->
    <UModal v-model:open="showSuccess" title="Berhasil">
      <template #header><h3 class="font-semibold">Disposisi Terkirim</h3></template>
      <template #body>
        <p class="text-sm text-muted">Disposisi berhasil diteruskan ke {{ successCount }} penerima.</p>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton @click="showSuccess = false">OK</UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal Formulir Disposisi -->
    <UModal v-model:open="disposisiModalOpen" :ui="{ content: 'sm:max-w-2xl' }">
      <template #header>
        <div class="flex items-center gap-3 w-full">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
            <UIcon name="i-lucide-send" class="h-4 w-4" />
          </span>
          <h3 class="font-semibold">Formulir Disposisi</h3>
          <span v-if="dispForm.recipients.length" class="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Siap diteruskan
          </span>
        </div>
      </template>
      <template #body>
        <UForm :state="dispForm" :validate="validate" class="space-y-5" @submit="submit({ draft: false })">
          <UFormField label="DITERUSKAN KEPADA" name="recipients" :required="true">
            <USelectMenu v-model="dispForm.recipients" :items="recipientOptions" value-key="value" multiple placeholder="Cari dan pilih penerima..." :search-input="{ placeholder: 'Cari nama staf...', icon: 'i-lucide-search' }" clear class="w-full">
              <template #empty>Tidak ada staf ditemukan</template>
            </USelectMenu>
            <p class="text-xs text-muted mt-1.5">Bisa pilih lebih dari satu penerima — ketik untuk mencari</p>
          </UFormField>
          <UFormField label="INSTRUKSI / ARAHAN PIMPINAN">
            <div class="grid grid-cols-2 gap-2">
              <label v-for="opt in instruksiOptions" :key="opt" class="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
                <UCheckbox :model-value="dispForm.instruksi.includes(opt)" @update:model-value="(v: boolean) => dispForm.instruksi.includes(opt) ? dispForm.instruksi = dispForm.instruksi.filter((x: string) => x !== opt) : dispForm.instruksi.push(opt)" />
                {{ opt }}
              </label>
            </div>
            <div class="mt-2 relative">
              <UTextarea v-model="dispForm.instruksi_tambahan" class="w-full" :rows="4" placeholder="Tulis instruksi tambahan pimpinan di sini..." @input="onInstruksiInput" />
              <span class="absolute bottom-2 right-3 text-[11px] text-muted">{{ instruksiCharCount }}/500</span>
            </div>
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="SIFAT DISPOSISI">
              <USelect v-model="dispForm.sifat_disposisi" :items="sifatOptions" class="w-full" />
              <p v-if="isUrgent" class="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Butuh tindak lanjut &lt; 3 hari
              </p>
            </UFormField>
            <UFormField label="BATAS WAKTU">
              <UInput v-model="dispForm.batas_waktu" type="date" class="w-full" />
              <p class="mt-1 text-[11px] text-muted">Sistem akan mengirim pengingat H-1</p>
            </UFormField>
          </div>
          <UFormField label="CATATAN TAMBAHAN">
            <UTextarea v-model="dispForm.catatan" :rows="2" class="w-full" placeholder="Catatan tambahan..." />
          </UFormField>
          <p class="text-[11px] text-muted">Penerima otomatis mendapat notifikasi push dan WhatsApp saat disposisi dibuat/diteruskan.</p>
          <p v-if="dispError" class="text-sm text-error">{{ dispError }}</p>
        </UForm>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="soft" color="neutral" :loading="dispDraftLoading" icon="i-lucide-save" @click="submit({ draft: true })">Simpan Draft</UButton>
          <UButton :loading="dispLoading" icon="i-lucide-send" class="rounded-full" @click="submit({ draft: false })">Teruskan Disposisi</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="arsipOpen" title="Arsipkan Surat">
      <template #body>
        <ArsipForm v-if="arsipOpen" mode="masuk" :surat="data.surat" @saved="() => { arsipOpen = false; refresh() }" @close="arsipOpen = false" />
      </template>
    </UModal>
  </div>
</template>
