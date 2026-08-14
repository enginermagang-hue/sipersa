<script setup lang="ts">
const { user } = useAuth()
const { data } = await useFetch('/api/stats')

const cards = computed(() => [
  { label: 'Surat Masuk', value: data.value?.masuk ?? 0, to: '/surat-masuk', icon: 'i-lucide-inbox', color: 'text-sky-500' },
  { label: 'Surat Keluar', value: data.value?.keluar ?? 0, to: '/surat-keluar', icon: 'i-lucide-send', color: 'text-emerald-500' },
  { label: 'Arsip', value: data.value?.arsip ?? 0, to: '/arsip', icon: 'i-lucide-archive', color: 'text-amber-500' },
  { label: 'Disposisi Saya', value: data.value?.disposisiSaya ?? 0, to: '/disposisi', icon: 'i-lucide-share-2', color: 'text-rose-500' }
])
</script>

<template>
  <div>
    <h1 class="text-xl font-bold mb-1">Selamat datang, {{ user?.nama }}</h1>
    <p class="text-muted mb-4">Ringkasan persuratan instansi.</p>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink v-for="c in cards" :key="c.label" :to="c.to" class="block">
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-muted">{{ c.label }}</div>
              <div class="text-2xl font-bold">{{ c.value }}</div>
            </div>
            <UIcon :name="c.icon" :class="c.color" class="text-3xl" />
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>
