<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import { CalendarDate } from '@internationalized/date'

const props = defineProps<{ type: 'masuk' | 'keluar'; suratId?: number; surat?: any }>()
const emit = defineEmits<{ close: []; busy: [boolean] }>()

const { openPopup } = useKlasifikasiPopup()

const { data: klas } = await useFetch('/api/klasifikasi')
const klasOptions = computed(() => (klas.value || []).map((k: any) => ({ label: `${k.kode} - ${k.nama}`, value: k.id })))

const todayIso = new Date().toISOString().slice(0, 10)
const s = props.surat || {}
const state = reactive({
  tgl_surat: s.tgl_surat || todayIso,
  tgl_terima: s.tgl_terima || (props.type === 'masuk' ? todayIso : ''),
  pengirim: s.pengirim || '',
  tujuan: s.tujuan || '',
  perihal: s.perihal || '',
  sifat: s.sifat || 'biasa',
  status: s.status || 'draft',
  penandatangan: s.penandatangan || '',
  klasifikasi_kode: s.klasifikasi_kode ?? s.klasifikasiKode ?? '',
  klasifikasi_id: (s.klasifikasi_id ?? null) as number | null,
  no_agenda: s.no_agenda ?? null as string | null,
  no_surat: s.no_surat || '',
  ringkasan: s.ringkasan || ''
})
function isoToCal(iso: string): CalendarDate | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new CalendarDate(y, m, d)
}
function calToIso(c: CalendarDate | null): string {
  return c ? `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}` : ''
}
const tglSuratCal = computed({
  get: () => isoToCal(state.tgl_surat),
  set: (v: CalendarDate | null) => { state.tgl_surat = calToIso(v) }
})
const tglTerimaCal = computed({
  get: () => isoToCal(state.tgl_terima),
  set: (v: CalendarDate | null) => { state.tgl_terima = calToIso(v) }
})
const inputSuratRef = useTemplateRef('inputSuratRef')
const inputTerimaRef = useTemplateRef('inputTerimaRef')

const pengirimItems = ref<string[]>([])
const tujuanItems = ref<string[]>([])
const pengirimLoading = ref(false)
const tujuanLoading = ref(false)

async function loadPengirim(q: string) {
  pengirimLoading.value = true
  try {
    const res: any = await $fetch('/api/surat-masuk/pengirim', { query: { q, limit: 20 } })
    pengirimItems.value = Array.isArray(res) ? res : []
  } catch { pengirimItems.value = [] } finally { pengirimLoading.value = false }
}
async function loadTujuan(q: string) {
  tujuanLoading.value = true
  try {
    const res: any = await $fetch('/api/surat-keluar/tujuan', { query: { q, limit: 20 } })
    tujuanItems.value = Array.isArray(res) ? res : []
  } catch { tujuanItems.value = [] } finally { tujuanLoading.value = false }
}
if (props.type === 'masuk') loadPengirim('')
else loadTujuan('')
let pengirimDebounce: any = null
let tujuanDebounce: any = null
function onPengirimSearchTerm(v: string) {
  clearTimeout(pengirimDebounce)
  pengirimDebounce = setTimeout(() => loadPengirim(v || ''), 250)
}
function onTujuanSearchTerm(v: string) {
  clearTimeout(tujuanDebounce)
  tujuanDebounce = setTimeout(() => loadTujuan(v || ''), 250)
}

const files = ref<File[]>([])
const error = ref('')
const errorDetails = ref('')
const uploading = ref(false)
const uploadProgress = ref<number | null>(null)
const uploadStatus = ref('')
const existingFiles = ref<any[]>([])
const keepIds = ref<Set<number>>(new Set())

// load existing files untuk edit
if (props.suratId) {
  // preload from props.surat.files jika ada, else fetch
  if (Array.isArray(s.files) && s.files.length) {
    existingFiles.value = s.files
    keepIds.value = new Set(s.files.map((f:any)=>f.id))
  } else if (props.surat?.files) {
    existingFiles.value = props.surat.files
    keepIds.value = new Set(props.surat.files.map((f:any)=>f.id))
  }
  // jika props tidak bawa files, fetch via API sudah di parent, tapi fallback fetch sendiri
  if (!existingFiles.value.length && props.suratId) {
    $fetch(`/api/surat-${props.type === 'masuk' ? 'masuk' : 'keluar'}/${props.suratId}`).then((res:any)=>{
      const arr = res?.files || res?.surat?.files || []
      if (arr.length) { existingFiles.value = arr; keepIds.value = new Set(arr.map((f:any)=>f.id)) }
    }).catch(()=>{})
  }
}
function toggleKeep(id:number, keep:boolean) {
  if (keep) keepIds.value.add(id); else keepIds.value.delete(id)
}

const pihak = computed({
  get: () => (props.type === 'masuk' ? state.pengirim : state.tujuan),
  set: (v: string) => {
    if (props.type === 'masuk') state.pengirim = v
    else state.tujuan = v
  }
})
// kept for backward compat but not used for input binding directly

const sifatOptions = [
  { label: 'Biasa', value: 'biasa' },
  { label: 'Segera', value: 'segera' },
  { label: 'Rahasia', value: 'rahasia' },
  { label: 'Penting', value: 'penting' }
]

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Menunggu Persetujuan', value: 'menunggu_persetujuan' },
  { label: 'Ditolak', value: 'ditolak' },
  { label: 'Terkirim', value: 'terkirim' },
  { label: 'Selesai', value: 'selesai' }
]

const previewNo = ref('')
watch(() => [state.tgl_surat, state.klasifikasi_kode] as const, async ([tgl, kode]) => {
  if (props.type !== 'keluar' || !kode?.trim() || !tgl) { previewNo.value = ''; return }
  try {
    const r: any = await $fetch('/api/surat-keluar/next-no', { query: { kode: kode.trim(), tgl_surat: tgl } })
    previewNo.value = r.no_surat
  } catch { previewNo.value = '' }
}, { immediate: true })

function validate(s: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []
  if (!s.tgl_surat) errors.push({ name: 'tgl_surat', message: 'Wajib diisi' })
  const pihakVal = props.type === 'masuk' ? s.pengirim : s.tujuan
  if (!pihakVal) errors.push({ name: 'pihak', message: 'Wajib diisi' })
  if (!s.perihal) errors.push({ name: 'perihal', message: 'Wajib diisi' })
  if (props.type === 'keluar' && !s.klasifikasi_kode?.trim()) errors.push({ name: 'klasifikasi_kode', message: 'Kode klasifikasi wajib diisi' })
  return errors
}

function isHeicFileClient(f: File) {
  const name = (f.name || '').toLowerCase()
  const type = (f.type || '').toLowerCase()
  return name.endsWith('.heic') || name.endsWith('.heif') || type.includes('heic') || type.includes('heif')
}
async function convertHeicClientFiles(list: File[]): Promise<File[]> {
  const out: File[] = []
  for (const f of list) {
    if (!isHeicFileClient(f)) { out.push(f); continue }
    try {
      // heic2any is browser-only, dynamic import
      const mod: any = await import('heic2any').catch(() => null)
      const heic2any = mod?.default || mod
      if (!heic2any) throw new Error('heic2any not available')
      const blob = await heic2any({ blob: f, toType: 'image/jpeg', quality: 0.92 })
      const outBlob = Array.isArray(blob) ? blob[0] as Blob : blob as Blob
      const newName = f.name.replace(/\.(heic|heif)$/i, '.jpg')
      out.push(new File([outBlob], newName, { type: 'image/jpeg' }))
      useToast().add({ title: `HEIC dikonversi: ${f.name} → ${newName}`, color: 'success' })
    } catch (e: any) {
      console.warn('[heic] client convert gagal, kirim as-is untuk server convert', e?.message || e)
      out.push(f)
    }
  }
  return out
}

async function submit() {
  emit('busy', true)
  error.value = ''
  errorDetails.value = ''
  const hasHeic = files.value.some(isHeicFileClient)
  if (hasHeic) {
    uploading.value = true
    uploadProgress.value = 5
    uploadStatus.value = 'Mengonversi HEIC…'
    try { files.value = await convertHeicClientFiles(files.value) } catch {}
    uploadProgress.value = 15
    uploadStatus.value = 'Konversi selesai'
  }
  const total = files.value.reduce((a,f)=>a+f.size,0)
  if (total > 25*1024*1024) {
    const m=`Total ukuran file terlalu besar (maks. 25 MB, total ${(total/1024/1024).toFixed(1)} MB)`
    error.value=m; errorDetails.value=m
    useToast().add({ title: 'File terlalu besar', description: m, color: 'error', duration: 6000 })
    uploading.value=false; uploadProgress.value=null; uploadStatus.value=''
    emit('busy', false); return
  }
  const fd = new FormData()
  const fields: Record<string, any> = { ...state }
  if (props.type === 'masuk') {
    fields.no_agenda = state.no_agenda ?? ''
    fields.no_surat = state.no_surat?.trim() ?? ''
  }
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v == null ? '' : String(v)))
  if (props.suratId && existingFiles.value.length) {
    fd.append('keep_file_ids', Array.from(keepIds.value).join(','))
  }
  for (const f of files.value) fd.append('file', f)
  try {
    uploading.value = true
    if (!hasHeic) { uploadProgress.value = 5; uploadStatus.value = 'Menyiapkan upload…' }
    const base = props.type === 'masuk' ? '/api/surat-masuk' : '/api/surat-keluar'
    const url = props.suratId ? `${base}/${props.suratId}` : base
    const method = props.suratId ? 'PUT' : 'POST'
    uploadStatus.value = 'Mengunggah file…'
    const { uploadFormDataWithProgress, mapUploadError } = await import('~/composables/useUploadProgress')
    // wrap to catch and map later
    try {
      await uploadFormDataWithProgress(url, fd, {
        method,
        onProgress: (pct, status) => { uploadProgress.value = pct; uploadStatus.value = status }
      })
      uploadProgress.value = 100
      uploadStatus.value = 'Berhasil'
      useToast().add({ title: 'Berhasil', description: props.suratId ? 'Surat diperbarui' : 'Surat berhasil disimpan', color: 'success' })
      emit('close')
    } catch (inner: any) {
      const mapped = mapUploadError(inner)
      error.value = mapped.title
      errorDetails.value = mapped.description
      useToast().add({ title: mapped.title, description: mapped.description, color: 'error', duration: 6000 })
    }
  } catch (e: any) {
    const m = e?.data?.statusMessage || e?.message || 'Gagal menyimpan'
    error.value = m; errorDetails.value = m
    useToast().add({ title: m, description: m, color: 'error', duration: 6000 })
  } finally {
    uploading.value = false
    // keep progress briefly for success feedback
    if (error.value) { uploadProgress.value = null; uploadStatus.value = '' }
    else setTimeout(()=>{ uploadProgress.value=null; uploadStatus.value='' }, 800)
    emit('busy', false)
  }
}
</script>

<template>
  <UForm id="surat-form" :state="state" :validate="validate" class="space-y-4" @submit="submit">
    <h3 class="font-semibold text-sm uppercase">Informasi Surat</h3>
    <div class="space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Tanggal Surat" name="tgl_surat">
          <UInputDate ref="inputSuratRef" v-model="tglSuratCal" locale="id-ID" class="w-full">
            <template #trailing>
              <UPopover>
                <UButton color="neutral" variant="link" size="sm" icon="i-lucide-calendar" aria-label="Pilih tanggal" class="px-0" />
                <template #content>
                  <UCalendar v-model="tglSuratCal" class="p-2" locale="id-ID" />
                </template>
              </UPopover>
            </template>
          </UInputDate>
        </UFormField>
        <UFormField v-if="type === 'masuk'" label="Tanggal Terima">
          <UInputDate ref="inputTerimaRef" v-model="tglTerimaCal" locale="id-ID" class="w-full">
            <template #trailing>
              <UPopover>
                <UButton color="neutral" variant="link" size="sm" icon="i-lucide-calendar" aria-label="Pilih tanggal" class="px-0" />
                <template #content>
                  <UCalendar v-model="tglTerimaCal" class="p-2" locale="id-ID" />
                </template>
              </UPopover>
            </template>
          </UInputDate>
        </UFormField>
      </div>
      <UFormField label="No. Surat" name="no_surat" v-if="type === 'masuk'" hint="Kosongkan untuk generate otomatis">
        <UInput v-model="state.no_surat" class="w-full" placeholder="mis. 123/UND/VI/2026 — kosongkan = auto NNN/SM-INST/..." />
      </UFormField>
      <UFormField v-if="type === 'masuk'" label="Pengirim" name="pihak">
        <UInputMenu v-model="state.pengirim" mode="autocomplete" :items="pengirimItems" :ignore-filter="true" :trailing-icon="false" :content="{ hideWhenEmpty: true }" placeholder="Ketik pengirim…" class="w-full" @update:search-term="onPengirimSearchTerm">
          <template #trailing>
            <div class="flex items-center gap-1 pr-1">
              <UIcon v-if="pengirimLoading" name="i-lucide-loader-circle" class="size-4 animate-spin text-muted" />
              <UButton v-else-if="state.pengirim" variant="ghost" color="neutral" size="xs" icon="i-lucide-x" aria-label="Clear" class="p-0.5 -m-0.5" @click.stop="state.pengirim=''" />
              <UIcon name="i-lucide-chevron-down" class="size-4 text-muted shrink-0" />
            </div>
          </template>
        </UInputMenu>
      </UFormField>
      <UFormField v-else label="Tujuan" name="pihak">
        <UInputMenu v-model="state.tujuan" mode="autocomplete" :items="tujuanItems" :ignore-filter="true" :trailing-icon="false" :content="{ hideWhenEmpty: true }" placeholder="Ketik tujuan…" class="w-full" @update:search-term="onTujuanSearchTerm">
          <template #trailing>
            <div class="flex items-center gap-1 pr-1">
              <UIcon v-if="tujuanLoading" name="i-lucide-loader-circle" class="size-4 animate-spin text-muted" />
              <UButton v-else-if="state.tujuan" variant="ghost" color="neutral" size="xs" icon="i-lucide-x" aria-label="Clear" class="p-0.5 -m-0.5" @click.stop="state.tujuan=''" />
              <UIcon name="i-lucide-chevron-down" class="size-4 text-muted shrink-0" />
            </div>
          </template>
        </UInputMenu>
      </UFormField>
      <UFormField label="Perihal" name="perihal">
        <UInput v-model="state.perihal" class="w-full" />
      </UFormField>
    </div>

    <p v-if="type === 'keluar' && previewNo" class="text-xs text-muted">Pratinjau nomor: <span
        class="font-mono font-medium">{{ previewNo }}</span></p>
    <h3 class="font-semibold text-sm uppercase mt-8">Meta Data</h3>
    <div class="space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Sifat">
          <USelect v-model="state.sifat" class="w-full" :items="sifatOptions" />
        </UFormField>
        <UFormField v-if="type === 'masuk'" label="Klasifikasi">
          <USelect v-model="state.klasifikasi_id" :items="klasOptions" class="w-full" :placeholder="'(tanpa)'" />
        </UFormField>
        <UFormField v-else label="Klasifikasi" name="klasifikasi_kode">
          <UInput v-model="state.klasifikasi_kode" class="w-full" placeholder="mis. 800.1" />
          <a href="#" class="text-xs text-primary underline mt-1 inline-block" @click.prevent="openPopup()">Lihat daftar
            kode klasifikasi</a>
        </UFormField>
      </div>
      <div v-if="type === 'keluar'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Status">
          <USelect v-model="state.status" class="w-full" :items="statusOptions" />
        </UFormField>
        <UFormField label="Penandatangan">
          <UInput v-model="state.penandatangan" class="w-full" />
        </UFormField>
      </div>
      <UFormField v-if="type === 'masuk'" label="No. Agenda">
        <UInput v-model="state.no_agenda" />
      </UFormField>
      <UFormField v-if="type === 'masuk'" label="Ringkasan">
        <UTextarea v-model="state.ringkasan" class="w-full" :rows="4" placeholder="Ringkasan isi surat (opsional)" />
      </UFormField>
    </div>

    <div class="space-y-2">
      <div v-if="existingFiles.length && suratId" class="space-y-2">
        <p class="text-sm font-medium">File existing (centang untuk pertahankan, total maks. 25 MB)</p>
        <div v-for="ef in existingFiles" :key="ef.id" class="flex items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm">
          <input type="checkbox" :checked="keepIds.has(ef.id)" @change="toggleKeep(ef.id, ($event.target as HTMLInputElement).checked)" class="accent-primary" />
          <span class="flex-1 truncate">{{ ef.file_name }} <span class="text-muted text-xs">({{ ef.file_drive_id }})</span></span>
          <a :href="`/api/files/${ef.file_drive_id}`" target="_blank" class="text-primary text-xs underline">Unduh</a>
        </div>
      </div>
      <FileUpload label="Unggah File Surat (multiple, total maks. 25 MB)" description="Format: PDF, JPG, PNG, HEIC (auto JPEG)." :multiple="true" v-model:files="files" :progress="uploadProgress" :uploading="uploading" :status-text="uploadStatus" />
    </div>

    <UAlert v-if="error" color="error" variant="soft" :title="error" :description="errorDetails" class="whitespace-pre-wrap" />
    <div v-else-if="uploading" class="space-y-1.5">
      <UProgress :model-value="uploadProgress ?? undefined" size="sm" />
      <p v-if="uploadStatus" class="text-xs text-muted">{{ uploadStatus }}<span v-if="uploadProgress !== null"> — {{ uploadProgress }}%</span></p>
    </div>
    <slot name="footer" :close="() => emit('close')" />
  </UForm>
</template>
