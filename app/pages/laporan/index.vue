<script setup lang="ts">
const jenis = ref<'masuk' | 'keluar'>('masuk')
const start = ref('')
const end = ref('')
const loading = ref(false)

async function download() {
  loading.value = true
  try {
    const blob = await $fetch('/api/laporan/export', {
      method: 'POST',
      body: { jenis: jenis.value, start: start.value, end: end.value },
      responseType: 'blob'
    })
    const url = URL.createObjectURL(blob as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-${jenis.value}-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-xl font-bold mb-4">Laporan</h1>
    <UCard class="max-w-lg">
      <div class="space-y-3">
        <UFormField label="Jenis Surat">
          <USelect v-model="jenis" :items="[{ label: 'Surat Masuk', value: 'masuk' }, { label: 'Surat Keluar', value: 'keluar' }]" class="w-full" />
        </UFormField>
        <UFormField label="Dari Tanggal"><UInput v-model="start" type="date" class="w-full" /></UFormField>
        <UFormField label="Sampai Tanggal"><UInput v-model="end" type="date" class="w-full" /></UFormField>
        <div class="flex gap-2">
          <UButton :loading="loading" icon="i-lucide-download" @click="download">Export Excel</UButton>
        </div>
        <p class="text-xs text-muted">Untuk PDF, buka salah satu daftar surat lalu gunakan fitur cetak browser (Ctrl/Cmd+P).</p>
      </div>
    </UCard>
  </div>
</template>
