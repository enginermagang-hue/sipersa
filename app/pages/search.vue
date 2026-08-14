<script setup lang="ts">
const q = ref('')
const { data } = await useFetch('/api/search', { query: { q }, watch: false })

const searched = ref(false)
async function cari() {
  if (q.value.length < 2) return
  const res: any = await $fetch(`/api/search?q=${encodeURIComponent(q.value)}`)
  data.value = res
  searched.value = true
}
</script>

<template>
  <div>
    <h1 class="text-xl font-bold mb-4">Pencarian Global</h1>
    <UForm class="flex gap-2 mb-4" @submit="cari">
      <UInput v-model="q" placeholder="No surat, perihal, pengirim, tujuan, dokumen..." class="max-w-md" />
      <UButton type="submit" icon="i-lucide-search">Cari</UButton>
    </UForm>

    <div v-if="searched" class="space-y-4">
      <UCard>
        <template #header><span class="font-semibold">Surat Masuk ({{ data?.surat_masuk?.length || 0 }})</span></template>
        <ul class="text-sm space-y-1">
          <li v-for="s in data?.surat_masuk || []" :key="s.id">
            <NuxtLink :to="`/surat-masuk/${s.id}`" class="hover:underline">{{ s.no_surat }} — {{ s.perihal }} ({{ s.pengirim }})</NuxtLink>
          </li>
          <li v-if="!data?.surat_masuk?.length" class="text-muted">Tidak ada</li>
        </ul>
      </UCard>
      <UCard>
        <template #header><span class="font-semibold">Surat Keluar ({{ data?.surat_keluar?.length || 0 }})</span></template>
        <ul class="text-sm space-y-1">
          <li v-for="s in data?.surat_keluar || []" :key="s.id">
            <NuxtLink :to="`/surat-keluar/${s.id}`" class="hover:underline">{{ s.no_surat }} — {{ s.perihal }} ({{ s.tujuan }})</NuxtLink>
          </li>
          <li v-if="!data?.surat_keluar?.length" class="text-muted">Tidak ada</li>
        </ul>
      </UCard>
      <UCard>
        <template #header><span class="font-semibold">Arsip ({{ data?.arsip?.length || 0 }})</span></template>
        <ul class="text-sm space-y-1">
          <li v-for="a in data?.arsip || []" :key="a.id">{{ a.nama_dokumen }} — {{ a.lokasi }} ({{ a.tahun }})</li>
          <li v-if="!data?.arsip?.length" class="text-muted">Tidak ada</li>
        </ul>
      </UCard>
    </div>
  </div>
</template>
