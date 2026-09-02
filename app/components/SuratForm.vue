<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const props = defineProps<{ type: 'masuk' | 'keluar'; suratId?: number; surat?: any }>()
const emit = defineEmits<{ close: []; busy: [boolean] }>()

const { openPopup } = useKlasifikasiPopup()

const { data: klas } = await useFetch('/api/klasifikasi')
const klasOptions = computed(() => (klas.value || []).map((k: any) => ({ label: `${k.kode} - ${k.nama}`, value: k.id })))

const s = props.surat || {}
const state = reactive({
  tgl_surat: s.tgl_surat || '',
  tgl_terima: s.tgl_terima || '',
  pengirim: s.pengirim || '',
  tujuan: s.tujuan || '',
  perihal: s.perihal || '',
  sifat: s.sifat || 'biasa',
  status: s.status || 'draft',
  penandatangan: s.penandatangan || '',
  klasifikasi_kode: s.klasifikasi_kode ?? s.klasifikasiKode ?? '',
  klasifikasi_id: (s.klasifikasi_id ?? null) as number | null,
  no_agenda: s.no_agenda ?? null as string | null,
  ringkasan: s.ringkasan || ''
})
const file = ref<File | null>(null)
const error = ref('')

const pihak = computed({
  get: () => (props.type === 'masuk' ? state.pengirim : state.tujuan),
  set: (v: string) => {
    if (props.type === 'masuk') state.pengirim = v
    else state.tujuan = v
  }
})

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

async function submit() {
  emit('busy', true)
  error.value = ''
  if (file.value && file.value.size > 25*1024*1024) { const m='Ukuran file terlalu besar (maks. 25 MB)'; error.value=m; useToast().add({title:m, color:'error'}); emit('busy', false); return }
  const fd = new FormData()
  const fields: Record<string, any> = { ...state }
  if (props.type === 'masuk') fields.no_agenda = state.no_agenda ?? ''
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v == null ? '' : String(v)))
  if (file.value) fd.append('file', file.value)
  try {
    const base = props.type === 'masuk' ? '/api/surat-masuk' : '/api/surat-keluar'
    const url = props.suratId ? `${base}/${props.suratId}` : base
    await $fetch(url, { method: props.suratId ? 'PUT' : 'POST', body: fd })
    emit('close')
  } catch (e: any) {
    const msg = e?.data?.statusMessage || 'Gagal menyimpan'; error.value = msg; useToast().add({ title: msg, color: 'error' })
  } finally {
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
          <UInput v-model="state.tgl_surat" class="w-full" type="date" />
        </UFormField>
        <UFormField v-if="type === 'masuk'" label="Tanggal Terima">
          <UInput v-model="state.tgl_terima" class="w-full" type="date" />
        </UFormField>
      </div>
      <UFormField :label="type === 'masuk' ? 'Pengirim' : 'Tujuan'" name="pihak">
        <UInput v-model="pihak" class="w-full" />
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
      <FileUpload label="Unggah File Surat" description="Format: PDF, JPG, PNG. Maks. 25 MB." v-model:file="file" />
    </div>

    <p v-if="error" class="text-sm text-error">{{ error }}</p>
    <slot name="footer" :close="() => emit('close')" />
  </UForm>
</template>
