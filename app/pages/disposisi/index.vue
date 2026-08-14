<script setup lang="ts">
const { data, refresh } = await useFetch('/api/disposisi/me')

const statusOptions = [
  { label: 'Baru', value: 'baru' },
  { label: 'Diproses', value: 'diproses' },
  { label: 'Selesai', value: 'selesai' }
]

async function updateStatus(id: number, status: string) {
  await $fetch(`/api/disposisi/${id}`, { method: 'PUT', body: { status } })
  await refresh()
}
</script>

<template>
  <div>
    <h1 class="text-xl font-bold mb-4">Disposisi Saya</h1>
    <UCard>
      <ul class="divide-y divide-default">
        <li v-for="d in data || []" :key="d.id" class="py-3 flex items-center justify-between gap-3">
          <div>
            <NuxtLink :to="`/surat-masuk/${d.surat_masuk_id}`" class="font-medium hover:underline">
              {{ d.no_surat }}
            </NuxtLink>
            <div class="text-xs text-muted">Dari: {{ d.dari_nama }} — {{ d.perihal }}</div>
            <div class="text-xs">{{ d.instruksi }}</div>
          </div>
          <USelect
            :model-value="d.status"
            :items="statusOptions"
            class="w-36"
            @update:model-value="(v: string) => updateStatus(d.id, v)"
          />
        </li>
        <li v-if="!data?.length" class="py-4 text-center text-muted">Tidak ada disposisi</li>
      </ul>
    </UCard>
  </div>
</template>
