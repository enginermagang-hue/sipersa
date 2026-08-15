<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const route = useRoute()
const id = route.params.id as string
const { data, refresh } = await useFetch(`/api/surat-masuk/${id}`)
const { data: users } = await useFetch('/api/users')
const { user } = useAuth()

const canDisposisi = computed(() => ['pimpinan', 'admin'].includes(user.value?.role))
const canDelete = computed(() => user.value?.role === 'admin' || user.value?.id === data.value?.surat.created_by)

const userOptions = computed(() =>
  (users.value || []).map((u: any) => ({ label: u.nama, value: u.id }))
)

const showDispModal = ref(false)
const dispForm = reactive({ kepada_user_id: null as number | null, instruksi: '', catatan: '', prioritas: 'normal', batas_waktu: '' })
const dispLoading = ref(false)
const dispError = ref('')

const prioritasOptions = [
  { label: 'Normal', value: 'normal' },
  { label: 'Segera', value: 'segera' },
  { label: 'Penting', value: 'penting' }
]

function validate(s: Partial<typeof dispForm>): FormError[] {
  const errors: FormError[] = []
  if (!s.kepada_user_id) errors.push({ name: 'kepada_user_id', message: 'Pilih penerima disposisi' })
  return errors
}

async function addDisposisi() {
  dispLoading.value = true
  dispError.value = ''
  try {
    await $fetch('/api/disposisi', {
      method: 'POST',
      body: { surat_masuk_id: Number(id), ...dispForm }
    })
    showDispModal.value = false
    dispForm.kepada_user_id = null
    dispForm.instruksi = ''
    dispForm.catatan = ''
    dispForm.prioritas = 'normal'
    dispForm.batas_waktu = ''
    await refresh()
  } catch (e: any) {
    dispError.value = e?.data?.statusMessage || 'Gagal'
  } finally {
    dispLoading.value = false
  }
}

const { confirm } = useConfirm()
async function hapus() {
  const ok = await confirm({ title: 'Hapus Surat', message: 'Hapus surat ini?', okLabel: 'Hapus' })
  if (!ok) return
  await $fetch(`/api/surat-masuk/${id}`, { method: 'DELETE' })
  await navigateTo('/surat-masuk')
}
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <UButton :to="`/surat-masuk`" variant="ghost" size="sm" icon="i-lucide-arrow-left">Kembali</UButton>
      <h1 class="text-xl font-bold flex-1 min-w-40">{{ data.surat.no_surat }}</h1>
      <UButton v-if="canDisposisi" icon="i-lucide-pen-line" @click="showDispModal = true">Buat Disposisi</UButton>
      <UButton v-if="canDelete" color="error" variant="soft" size="sm" icon="i-lucide-trash" @click="hapus">Hapus</UButton>
    </div>

    <div class="grid lg:grid-cols-4 gap-4">
      <UCard class="lg:col-span-3">
        <template #header><h3 class="font-semibold">File</h3></template>
        <FilePreview v-if="data.surat.file_drive_id" :file-id="data.surat.file_drive_id" :file-name="data.surat.file_name" />
        <p v-else class="text-sm text-muted">Tidak ada file</p>
      </UCard>

      <UCard>
        <template #header><h3 class="font-semibold">Detail</h3></template>
        <dl class="text-sm space-y-2">
          <div><span class="text-muted">Pengirim:</span><br>{{ data.surat.pengirim }}</div>
          <div><span class="text-muted">Tgl Surat:</span><br>{{ data.surat.tgl_surat }}</div>
          <div><span class="text-muted">Tgl Terima:</span><br>{{ data.surat.tgl_terima }}</div>
          <div><span class="text-muted">Perihal:</span><br>{{ data.surat.perihal }}</div>
          <div><span class="text-muted">Sifat:</span><br>{{ data.surat.sifat }}</div>
          <div v-if="data.surat.klasifikasi_nama">
            <span class="text-muted">Klasifikasi:</span><br>{{ data.surat.klasifikasi_kode }} - {{ data.surat.klasifikasi_nama }}
          </div>
        </dl>
      </UCard>
    </div>

    <UCard class="mt-4">
      <template #header><h3 class="font-semibold">Disposisi</h3></template>
      <DispositionTimeline :items="data.disposisi" />
    </UCard>

    <UModal v-model:open="showDispModal" title="Buat Disposisi">
      <template #body>
        <UForm id="disp-form" :state="dispForm" :validate="validate" class="space-y-3" @submit="addDisposisi">
          <UFormField label="Kepada" name="kepada_user_id">
            <USelect v-model="dispForm.kepada_user_id" :items="userOptions" class="w-full" placeholder="Pilih user" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Prioritas">
              <USelect v-model="dispForm.prioritas" :items="prioritasOptions" class="w-full" />
            </UFormField>
            <UFormField label="Batas Waktu">
              <UInput v-model="dispForm.batas_waktu" type="date" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Instruksi">
            <UTextarea v-model="dispForm.instruksi" class="w-full" />
          </UFormField>
          <UFormField label="Catatan">
            <UTextarea v-model="dispForm.catatan" class="w-full" />
          </UFormField>
          <p v-if="dispError" class="text-sm text-error">{{ dispError }}</p>
        </UForm>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showDispModal = false">Batal</UButton>
          <UButton type="submit" form="disp-form" :loading="dispLoading">Kirim</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
