<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const props = defineProps<{ type: 'masuk' | 'keluar'; suratId?: number; surat?: any }>()
const emit = defineEmits<{ close: [] }>()

const isEdit = computed(() => !!props.suratId)

const { data: klas } = await useFetch('/api/klasifikasi')
const klasOptions = computed(() =>
  (klas.value || []).map((k: any) => ({ label: `${k.kode} - ${k.nama}`, value: k.id }))
)

const s = props.surat || {}
const state = reactive({
  tgl_surat: s.tgl_surat || '',
  tgl_terima: s.tgl_terima || '',
  pengirim: s.pengirim || '',
  tujuan: s.tujuan || '',
  perihal: s.perihal || '',
  sifat: s.sifat || 'biasa',
  klasifikasi_id: s.klasifikasi_id ?? null as number | null,
  no_agenda: s.no_agenda ?? null as number | null
})
const file = ref<File | null>(null)
const loading = ref(false)
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

function validate(s: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []
  if (!s.tgl_surat) errors.push({ name: 'tgl_surat', message: 'Wajib diisi' })
  const pihakVal = props.type === 'masuk' ? s.pengirim : s.tujuan
  if (!pihakVal) errors.push({ name: 'pihak', message: 'Wajib diisi' })
  if (!s.perihal) errors.push({ name: 'perihal', message: 'Wajib diisi' })
  return errors
}

async function submit() {
  loading.value = true
  error.value = ''
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
    error.value = e?.data?.statusMessage || 'Gagal menyimpan'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UForm :state="state" :validate="validate" class="space-y-3" @submit="submit">
    <UFormField label="Tanggal Surat" name="tgl_surat">
      <UInput v-model="state.tgl_surat" type="date" class="w-full" />
    </UFormField>
    <UFormField v-if="type === 'masuk'" label="Tanggal Terima">
      <UInput v-model="state.tgl_terima" type="date" class="w-full" />
    </UFormField>
    <UFormField :label="type === 'masuk' ? 'Pengirim' : 'Tujuan'" name="pihak">
      <UInput v-model="pihak" class="w-full" />
    </UFormField>
    <UFormField label="Perihal" name="perihal">
      <UInput v-model="state.perihal" class="w-full" />
    </UFormField>
    <UFormField label="Sifat">
      <USelect v-model="state.sifat" :items="sifatOptions" class="w-full" />
    </UFormField>
    <UFormField label="Klasifikasi">
      <USelect v-model="state.klasifikasi_id" :items="klasOptions" class="w-full" :placeholder="'(tanpa)'" />
    </UFormField>
    <UFormField v-if="type === 'masuk'" label="No. Agenda">
      <UInput v-model.number="state.no_agenda" type="number" class="w-full" />
    </UFormField>
    <UFormField label="File Surat">
      <FileUpload v-model:file="file" />
    </UFormField>
    <p v-if="error" class="text-sm text-error">{{ error }}</p>
    <div class="flex justify-end gap-2">
      <UButton variant="ghost" @click="emit('close')">Batal</UButton>
      <UButton type="submit" :loading="loading">{{ isEdit ? 'Perbarui' : 'Simpan' }}</UButton>
    </div>
  </UForm>
</template>
