<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const route = useRoute()
const id = route.params.id as string
const { data, refresh } = await useFetch(`/api/surat-masuk/${id}`)
const { data: users } = await useFetch('/api/users')

const userOptions = computed(() =>
  (users.value || []).map((u: any) => ({ label: u.nama, value: u.id }))
)

const dispForm = reactive({ kepada_user_id: null as number | null, instruksi: '', catatan: '' })
const dispLoading = ref(false)
const dispError = ref('')

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
    dispForm.kepada_user_id = null
    dispForm.instruksi = ''
    dispForm.catatan = ''
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
    <UButton :to="`/surat-masuk`" variant="ghost" size="sm" icon="i-lucide-arrow-left" class="mb-2">
      Kembali
    </UButton>
    <div class="grid lg:grid-cols-2 gap-4">
      <UCard>
        <template #header><h2 class="font-bold">{{ data.surat.no_surat }}</h2></template>
        <dl class="text-sm space-y-1">
          <div><span class="text-muted">Pengirim:</span> {{ data.surat.pengirim }}</div>
          <div><span class="text-muted">Tgl Surat:</span> {{ data.surat.tgl_surat }}</div>
          <div><span class="text-muted">Tgl Terima:</span> {{ data.surat.tgl_terima }}</div>
          <div><span class="text-muted">Perihal:</span> {{ data.surat.perihal }}</div>
          <div><span class="text-muted">Sifat:</span> {{ data.surat.sifat }}</div>
          <div v-if="data.surat.klasifikasi_nama">
            <span class="text-muted">Klasifikasi:</span> {{ data.surat.klasifikasi_kode }} - {{ data.surat.klasifikasi_nama }}
          </div>
        </dl>
        <div class="mt-3">
          <UButton color="error" variant="soft" size="sm" icon="i-lucide-trash" @click="hapus">Hapus</UButton>
        </div>
      </UCard>

      <UCard>
        <template #header><h3 class="font-semibold">File</h3></template>
        <FilePreview v-if="data.surat.file_drive_id" :file-id="data.surat.file_drive_id" :file-name="data.surat.file_name" />
        <p v-else class="text-sm text-muted">Tidak ada file</p>
      </UCard>
    </div>

    <div class="grid lg:grid-cols-2 gap-4 mt-4">
      <UCard>
        <template #header><h3 class="font-semibold">Disposisi</h3></template>
        <DispositionTimeline :items="data.disposisi" />
      </UCard>

      <UCard>
        <template #header><h3 class="font-semibold">Buat Disposisi</h3></template>
        <UForm :state="dispForm" :validate="validate" class="space-y-3" @submit="addDisposisi">
          <UFormField label="Kepada" name="kepada_user_id">
            <USelect v-model="dispForm.kepada_user_id" :items="userOptions" class="w-full" placeholder="Pilih user" />
          </UFormField>
          <UFormField label="Instruksi">
            <UTextarea v-model="dispForm.instruksi" class="w-full" />
          </UFormField>
          <UFormField label="Catatan">
            <UTextarea v-model="dispForm.catatan" class="w-full" />
          </UFormField>
          <p v-if="dispError" class="text-sm text-error">{{ dispError }}</p>
          <UButton type="submit" :loading="dispLoading">Kirim</UButton>
        </UForm>
      </UCard>
    </div>
  </div>
</template>
