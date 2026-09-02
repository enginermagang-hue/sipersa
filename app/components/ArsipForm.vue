<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const props = withDefaults(defineProps<{
  mode: 'masuk' | 'keluar' | 'manual'
  surat?: any
  arsipId?: number
  arsip?: any
  inline?: boolean
}>(), {
  inline: false
})
const emit = defineEmits<{ saved: []; close: [] }>()

const isEdit = computed(() => !!props.arsipId)
const src = props.surat || {}
const a = props.arsip || {}

const state = reactive({
  nama_dokumen: a.nama_dokumen || src.perihal || '',
  klasifikasi_id: (isEdit.value ? a.klasifikasi_id : src.klasifikasi_id) ?? (null as number | null),
  lokasi: a.lokasi || '',
  tahun: (isEdit.value ? a.tahun : src.tgl_surat ? new Date(src.tgl_surat).getFullYear() : null) ?? (null as number | null)
})
const file = ref<File | null>(null)
const loading = ref(false)
const error = ref('')

const { data: klas } = await useFetch('/api/klasifikasi')
const klasOptions = computed(() =>
  (klas.value || []).map((k: any) => ({ label: `${k.kode} - ${k.nama}`, value: k.id }))
)

function validate(s: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []
  if (!s.nama_dokumen) errors.push({ name: 'nama_dokumen', message: 'Nama dokumen wajib diisi' })
  return errors
}

async function submit() {
  loading.value = true
  error.value = ''
  if (file.value && file.value.size > 25*1024*1024) { const m='Ukuran file terlalu besar (maks. 25 MB)'; error.value=m; useToast().add({title:m, color:'error'}); loading.value=false; return }
  const fd = new FormData()
  fd.append('nama_dokumen', state.nama_dokumen)
  fd.append('lokasi', state.lokasi)
  fd.append('tahun', state.tahun == null ? '' : String(state.tahun))
  fd.append('klasifikasi_id', state.klasifikasi_id == null ? '' : String(state.klasifikasi_id))
  if (props.mode === 'masuk') {
    fd.append('ref_masuk_id', String(src.id))
    if (src.file_drive_id) {
      fd.append('file_drive_id', src.file_drive_id)
      fd.append('file_name', src.file_name || '')
    }
  } else if (props.mode === 'keluar') {
    fd.append('ref_keluar_id', String(src.id))
    if (src.file_drive_id) {
      fd.append('file_drive_id', src.file_drive_id)
      fd.append('file_name', src.file_name || '')
    }
  }
  if (file.value) fd.append('file', file.value)
  try {
    const url = isEdit.value ? `/api/arsip/${props.arsipId}` : '/api/arsip'
    await $fetch(url, { method: isEdit.value ? 'PUT' : 'POST', body: fd })
    emit('saved')
  } catch (e: any) {
    const msg = e?.data?.statusMessage || 'Gagal menyimpan'; error.value = msg; useToast().add({ title: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UForm :state="state" :validate="validate" class="space-y-3" @submit="submit">
    <UFormField label="Nama Dokumen" name="nama_dokumen">
      <UInput v-model="state.nama_dokumen" class="w-full" />
    </UFormField>
    <UFormField label="Klasifikasi">
      <USelect v-model="state.klasifikasi_id" :items="klasOptions" class="w-full" :placeholder="'(tanpa)'" />
    </UFormField>
    <UFormField label="Lokasi">
      <UInput v-model="state.lokasi" class="w-full" placeholder="Rak B1" />
    </UFormField>
    <UFormField label="Tahun">
      <UInput v-model.number="state.tahun" type="number" class="w-full" />
    </UFormField>
    <FileUpload
      v-if="mode === 'manual' || isEdit"
      :label="isEdit ? 'Ganti File (opsional)' : 'File (opsional)'"
      description="Unggah dokumen (PDF/JPG/PNG, maks. 25 MB)"
      v-model:file="file"
    />
    <p v-if="error" class="text-sm text-error">{{ error }}</p>
    <div v-if="!inline" class="flex justify-end gap-2">
      <UButton variant="ghost" @click="emit('close')">Batal</UButton>
      <UButton type="submit" :loading="loading">{{ isEdit ? 'Perbarui' : 'Simpan' }}</UButton>
    </div>
    <UButton v-else type="submit" :loading="loading" color="primary" class="w-full h-12 rounded-xl">
      <UIcon name="i-lucide-archive" class="w-4 h-4" />
      Arsipkan Sekarang
    </UButton>
  </UForm>
</template>
