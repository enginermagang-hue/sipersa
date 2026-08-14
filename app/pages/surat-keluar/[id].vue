<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string
const { data } = await useFetch(`/api/surat-keluar/${id}`)

const { confirm } = useConfirm()
async function hapus() {
  const ok = await confirm({ title: 'Hapus Surat', message: 'Hapus surat ini?', okLabel: 'Hapus' })
  if (!ok) return
  await $fetch(`/api/surat-keluar/${id}`, { method: 'DELETE' })
  await navigateTo('/surat-keluar')
}
</script>

<template>
  <div v-if="data">
    <UButton :to="`/surat-keluar`" variant="ghost" size="sm" icon="i-lucide-arrow-left" class="mb-2">Kembali</UButton>
    <div class="grid lg:grid-cols-2 gap-4">
      <UCard>
        <template #header><h2 class="font-bold">{{ data.no_surat }}</h2></template>
        <dl class="text-sm space-y-1">
          <div><span class="text-muted">Tujuan:</span> {{ data.tujuan }}</div>
          <div><span class="text-muted">Tgl Surat:</span> {{ data.tgl_surat }}</div>
          <div><span class="text-muted">Perihal:</span> {{ data.perihal }}</div>
          <div><span class="text-muted">Sifat:</span> {{ data.sifat }}</div>
          <div v-if="data.klasifikasi_nama">
            <span class="text-muted">Klasifikasi:</span> {{ data.klasifikasi_kode }} - {{ data.klasifikasi_nama }}
          </div>
        </dl>
        <div class="mt-3">
          <UButton color="error" variant="soft" size="sm" icon="i-lucide-trash" @click="hapus">Hapus</UButton>
        </div>
      </UCard>
      <UCard>
        <template #header><h3 class="font-semibold">File</h3></template>
        <FilePreview v-if="data.file_drive_id" :file-id="data.file_drive_id" :file-name="data.file_name" />
        <p v-else class="text-sm text-muted">Tidak ada file</p>
      </UCard>
    </div>
  </div>
</template>
