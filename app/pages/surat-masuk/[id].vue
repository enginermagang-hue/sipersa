<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const route = useRoute()
const id = route.params.id as string
const { data, refresh } = await useFetch(`/api/surat-masuk/${id}`)
const { data: users } = await useFetch('/api/users')
const { user } = useAuth()

const canDisposisi = computed(() => ['pimpinan', 'admin'].includes(user.value?.role))
const canDelete = computed(() => user.value?.role === 'admin' || user.value?.id === data.value?.surat.created_by)
const isArchived = computed(() => !!data.value?.arsip)
const arsipOpen = ref(false)
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

const recipientOptions = computed(() =>
  (users.value || []).map((u: any) => ({ label: u.nama, value: u.id }))
)

const dispForm = reactive({
  recipients: [] as number[],
  instruksi: [] as string[],
  instruksi_tambahan: '',
  sifat_disposisi: 'biasa',
  batas_waktu: '2026-08-18',
  catatan: '',
  notify: false
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
  dispLoading.value = !opts.draft
  dispDraftLoading.value = opts.draft
  dispError.value = ''
  try {
    const res: any = await $fetch('/api/disposisi', {
      method: 'POST',
      body: {
        surat_masuk_id: Number(id),
        kepada_user_ids: dispForm.recipients,
        instruksi_list: dispForm.instruksi,
        instruksi: dispForm.instruksi_tambahan,
        sifat_disposisi: dispForm.sifat_disposisi,
        batas_waktu: dispForm.batas_waktu || null,
        catatan: dispForm.catatan,
        notify: dispForm.notify
      }
    })
    dispForm.recipients = []
    dispForm.instruksi = []
    dispForm.instruksi_tambahan = ''
    dispForm.sifat_disposisi = 'biasa'
    dispForm.batas_waktu = '2026-08-18'
    dispForm.catatan = ''
    dispForm.notify = false
    await refresh()
    if (!opts.draft) {
      successCount.value = res.count || dispForm.recipients.length || 0
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
  return {
    diterima: true,
    didisposisikan: d.some((x: any) => x.parent_id === null),
    ditindaklanjuti: d.some((x: any) => x.status === 'diproses'),
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
      tags: [sifatCap, batasShort ? `Batas ${batasShort}` : ''].filter(Boolean) as string[]
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
      <UButton v-if="!isArchived" icon="i-lucide-archive" variant="soft" @click="arsipOpen = true">Arsipkan</UButton>
      <UBadge v-else label="Sudah diarsipkan" color="success" variant="subtle" />
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
              <span class="ml-auto font-mono text-xs text-slate-500">{{ formatNoAgenda(data.surat.no_agenda, data.surat.tgl_terima) }}</span>
            </div>
          </template>
            <dl class="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px] text-slate-700">
              <div>
                <dt class="text-slate-400 text-xs mb-0.5">NO. SURAT</dt>
                <dd class="font-medium">{{ data.surat.no_surat }}</dd>
              </div>
              <div>
                <dt class="text-slate-400 text-xs mb-0.5">ASAL SURAT</dt>
                <dd class="font-medium">{{ data.surat.pengirim }}</dd>
              </div>
              <div>
                <dt class="text-slate-400 text-xs mb-0.5">TGL SURAT</dt>
                <dd class="font-medium">{{ fmtTgl(data.surat.tgl_surat) }}</dd>
              </div>
              <div>
                <dt class="text-slate-400 text-xs mb-0.5">TGL DITERIMA</dt>
                <dd class="flex items-center gap-2 font-medium">
                  <span>{{ fmtTglWaktu(data.surat.tgl_terima) }}</span>
                  <UBadge v-if="isNewSurat(data.surat.tgl_terima)" label="Baru" color="success" variant="subtle" size="2xs" />
                </dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-slate-400 text-xs mb-0.5">HAL</dt>
                <dd class="font-medium">{{ data.surat.perihal }}</dd>
              </div>
              <div v-if="data.surat.klasifikasi_nama" class="sm:col-span-2">
                <dt class="text-slate-400 text-xs mb-0.5">KLASIFIKASI</dt>
                <dd class="font-medium">{{ data.surat.klasifikasi_kode }} - {{ data.surat.klasifikasi_nama }}</dd>
              </div>
            </dl>

            <div v-if="ringkasanText" class="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 md:p-4 flex gap-3">
              <span class="text-slate-400 mt-0.5">✨</span>
              <p class="text-[13px] text-slate-600 leading-relaxed">{{ ringkasanText }}</p>
            </div>
            <div v-else-if="needsExtraction && extractingRingkasan" class="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 md:p-4">
              <p class="text-xs text-slate-400">Memuat ringkasan surat…</p>
            </div>
            <div v-else-if="needsExtraction && extractionError" class="mt-4 bg-red-50 border border-red-200 rounded-xl p-3.5 md:p-4 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-red-500">⚠</span>
                <p class="text-xs text-red-600">{{ extractionError }}</p>
              </div>
              <UButton size="xs" variant="soft" @click="onRetryExtraction">Coba lagi</UButton>
            </div>
        </UCard>

        <!-- Card Formulir Disposisi -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <UIcon name="i-lucide-send" class="h-4 w-4" />
                </span>
                <h3 class="font-semibold text-slate-900">Formulir Disposisi</h3>
              </div>
              <span v-if="dispForm.recipients.length" class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Siap diteruskan
              </span>
            </div>
          </template>
            <UForm :state="dispForm" :validate="validate" class="space-y-5" @submit="submit({ draft: false })">
              <!-- Penerima -->
              <UFormField label="DITERUSKAN KEPADA" :required="true">
                <p class="text-xs text-slate-500 mb-2">Pilih satu atau lebih penerima disposisi</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="r in recipientOptions"
                    :key="r.value"
                    type="button"
                    @click="dispForm.recipients.includes(r.value)
                      ? dispForm.recipients = dispForm.recipients.filter((v: number) => v !== r.value)
                      : dispForm.recipients.push(r.value)"
                    class="group inline-flex items-center gap-2 h-9 rounded-full border px-3 text-[13px] font-medium transition-all"
                    :class="dispForm.recipients.includes(r.value)
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400'"
                  >
                    <span class="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold tracking-wide"
                      :class="dispForm.recipients.includes(r.value) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'"
                    >{{ String(r.label).charAt(0).toUpperCase() }}</span>
                    {{ r.label }}
                    <span class="h-3.5 w-3.5 rounded-full border"
                      :class="dispForm.recipients.includes(r.value) ? 'border-white/40' : 'border-slate-300 group-hover:border-indigo-400'" />
                  </button>
                  <span v-if="!recipientOptions.length" class="text-sm text-slate-400">Memuat penerima…</span>
                </div>
              </UFormField>

              <!-- Instruksi -->
              <UFormField label="INSTRUKSI / ARAHAN PIMPINAN">
                <div class="grid grid-cols-2 gap-2">
                  <label
                    v-for="opt in instruksiOptions"
                    :key="opt"
                    class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none"
                  >
                    <UCheckbox
                      :model-value="dispForm.instruksi.includes(opt)"
                      @update:model-value="(v: boolean) => dispForm.instruksi.includes(opt)
                        ? dispForm.instruksi = dispForm.instruksi.filter((x: string) => x !== opt)
                        : dispForm.instruksi.push(opt)"
                    />
                    {{ opt }}
                  </label>
                </div>
                <div class="mt-2 relative">
                  <UTextarea
                    v-model="dispForm.instruksi_tambahan"
                    class="w-full"
                    :rows="4"
                    placeholder="Tulis instruksi tambahan pimpinan di sini..."
                    @input="onInstruksiInput"
                  />
                  <span class="absolute bottom-2 right-3 text-[11px] text-slate-400">{{ instruksiCharCount }}/500</span>
                </div>
              </UFormField>

              <!-- Sifat + Batas -->
              <div class="grid grid-cols-2 gap-3">
                <UFormField label="SIFAT DISPOSISI">
                  <USelect v-model="dispForm.sifat_disposisi" :items="sifatOptions" class="w-full" />
                  <p v-if="isUrgent" class="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                    <span class="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Butuh tindak lanjut < 3 hari
                  </p>
                </UFormField>
                <UFormField label="BATAS WAKTU">
                  <UInput v-model="dispForm.batas_waktu" type="date" class="w-full" />
                  <p class="mt-1 text-[11px] text-slate-500">Sistem akan mengirim pengingat H-1</p>
                </UFormField>
              </div>

              <!-- Catatan -->
              <UFormField label="CATATAN TAMBAHAN">
                <UTextarea v-model="dispForm.catatan" :rows="2" class="w-full" placeholder="Catatan tambahan..." />
              </UFormField>

              <!-- Notify -->
              <UCheckbox v-model="dispForm.notify" label="Kirim notifikasi WhatsApp/Email ke penerima" />
              <p v-if="dispForm.notify" class="text-xs text-slate-500 -mt-3">
                Penerima akan mendapat notifikasi push, WhatsApp, dan email otomatis saat disposisi diteruskan.
              </p>

              <p v-if="dispError" class="text-sm text-error">{{ dispError }}</p>

              <div class="flex justify-end gap-2 pt-2">
                <UButton variant="soft" color="neutral" :loading="dispDraftLoading" icon="i-lucide-save" @click="submit({ draft: true })">Simpan Draft</UButton>
                <UButton type="submit" :loading="dispLoading" icon="i-lucide-send" class="rounded-full">Teruskan Disposisi</UButton>
              </div>
            </UForm>
        </UCard>
      </div>

      <!-- KOLOM KANAN (sticky) -->
      <div class="space-y-4 lg:sticky lg:top-[76px]">
        <!-- Card Pratinjau Surat -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white text-xs">
                <UIcon name="i-lucide-file-text" class="h-4 w-4" />
              </span>
              <h3 class="font-semibold text-slate-900">Pratinjau Surat</h3>
              <UBadge v-if="hasPdf" :label="`PDF • ${safeSize}`" color="neutral" variant="subtle" size="sm" class="ml-auto" />
            </div>
          </template>
          <div v-if="data.surat.file_drive_id">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 border border-red-200 text-red-600">
                  <UIcon name="i-lucide-file-text" class="h-5 w-5" />
                </span>
                <div>
                  <p class="text-sm font-medium text-slate-700">{{ data.surat.file_name || 'Dokumen Surat' }}</p>
                  <p class="text-xs text-slate-400">{{ safePages }} halaman • dipindai {{ fmtTglWaktu(data.surat.tgl_terima) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <UButton v-if="isViewable" :href="`/api/files/${data.surat.file_drive_id}?inline=1`" target="_blank" size="xs" variant="ghost" icon="i-lucide-eye" />
                <UButton :href="`/api/files/${data.surat.file_drive_id}`" target="_blank" size="xs" variant="ghost" icon="i-lucide-download" />
              </div>
            </div>
            <div v-if="isViewable" class="mt-3 rounded-lg border border-slate-200 overflow-hidden">
              <FilePreview :file-id="data.surat.file_drive_id" :file-name="data.surat.file_name" :hide-actions="true" />
            </div>
          </div>
          <div v-else>
            <p class="text-sm text-muted">Tidak ada file terlampir.</p>
          </div>
        </UCard>

        <!-- Card Riwayat Disposisi -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-slate-900">Riwayat Disposisi</h3>
              <UBadge :label="`${timelineItems.length} aktivitas`" color="primary" variant="subtle" size="sm" />
            </div>
          </template>
            <!-- Stepper -->
            <ol class="flex items-center justify-between mb-5 w-full">
              <template v-for="(s, i) in stepperSteps" :key="s.key">
                <li class="flex flex-col items-center text-center relative z-10">
                  <span class="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors"
                    :class="stepperState[s.key as keyof typeof stepperState] ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'">
                    {{ i + 1 }}
                  </span>
                  <span class="mt-1 text-[10px] font-medium whitespace-nowrap transition-colors"
                    :class="stepperState[s.key as keyof typeof stepperState] ? 'text-indigo-600 font-semibold' : 'text-slate-400'">
                    {{ s.label }}
                  </span>
                </li>
                <li v-if="i < stepperSteps.length - 1" class="flex-1 h-0.5 mx-2 bg-slate-200 transition-colors"
                  :class="{ 'bg-indigo-600': isLineActive(i) }" />
              </template>
            </ol>

            <!-- Timeline entries -->
            <ul class="relative border-l border-slate-200 ml-3.5 space-y-4">
              <li v-for="item in timelineItems" :key="item.id" class="relative pl-6">
                <span class="absolute -left-[13px] top-1.5 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white shadow-sm transition-colors"
                  :class="item.statusLabel === 'DIDISPOSISIKAN' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'">
                  {{ item.initials }}
                </span>
                <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-[11px] font-medium text-slate-500">{{ item.timestamp }}</span>
                    <UBadge :label="item.statusLabel" size="2xs"
                      :color="statusBadgeColor[item.statusLabel] || 'neutral'"
                      :variant="statusBadgeVariant[item.statusLabel] || 'subtle'" />
                  </div>
                  <p class="text-sm font-medium text-slate-800">{{ item.description }}</p>
                  <div v-if="item.instruksi" class="mt-2 bg-white border border-slate-100 rounded-lg p-2 text-xs text-slate-600 italic">
                    "{{ item.instruksi }}"
                  </div>
                  <div v-if="item.tags.length" class="flex flex-wrap gap-1.5 mt-2">
                    <UBadge v-for="tag in item.tags" :key="tag" :label="tag" size="2xs" variant="outline" color="neutral" />
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
        <p class="text-sm text-slate-600">Disposisi berhasil diteruskan ke {{ successCount }} penerima.</p>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton @click="showSuccess = false">OK</UButton>
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
