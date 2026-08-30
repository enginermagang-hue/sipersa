<script setup lang="ts">
definePageMeta({ layout: 'panduan' })

const config = useRuntimeConfig()
const appConfig = useAppConfig()

useSeoMeta({
  title: `Panduan Pengguna - ${config.public.appName || 'SIPERSA'}`,
  description: 'Daftar panduan SIPERSA per bab: login, surat masuk/keluar, disposisi, arsip, laporan, profil, admin & appendix.'
})

const breadcrumbItems = computed(() => [
  { label: 'Beranda', to: '/' },
  { label: 'Panduan' }
])

const { data, pending, error } = await useFetch('/api/panduan')

const babs = computed(() => ((data.value as any)?.babs as Array<any>) || [])

const search = ref('')
const filteredBabs = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return babs.value
  return babs.value.filter((b: any) => `${b.title} ${b.desc} ${b.slug}`.toLowerCase().includes(q))
})
</script>

<template>
  <div class="space-y-4">
    <UBreadcrumb :items="breadcrumbItems" />

    <!-- Hero -->
    <UCard class="overflow-hidden">
      <div class="relative -m-6 p-6 sm:p-8 bg-gradient-to-br from-violet-50 via-indigo-50 to-sky-50 dark:from-slate-900 dark:via-violet-950/20 dark:to-indigo-950/30">
        <div aria-hidden="true" class="pointer-events-none absolute -top-12 -right-12 h-56 w-56 rounded-full bg-gradient-to-br from-violet-400/20 to-indigo-400/20 blur-2xl" />
        <div class="relative flex flex-col gap-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Panduan Pengguna</h1>
                <UBadge color="primary" variant="subtle" size="sm" class="rounded-full">v{{ appConfig.app.version }}</UBadge>
              </div>
              <p class="mt-2 text-sm text-muted max-w-2xl leading-relaxed">
                Panduan SIPERSA kini per halaman — pilih bab di bawah. Halaman publik, bisa dibaca tanpa login. Tiap bab punya daftar sub-bab (TOC) dan navigasi Sebelumnya/Berikutnya.
              </p>
              <p class="mt-2 text-xs text-muted">
                Sumber: <span class="font-mono">docs/panduan/*.md</span> (16 file fisik) · Bahasa Indonesia · Digital only
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UButton to="/tentang" variant="outline" size="sm" icon="i-lucide-info">Tentang</UButton>
              <UButton to="/" variant="ghost" size="sm" icon="i-lucide-layout-dashboard">Dashboard</UButton>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <UBadge icon="i-lucide-book-open" variant="subtle" color="primary" size="md" class="rounded-full">16 halaman</UBadge>
            <UBadge icon="i-lucide-layers" variant="subtle" color="neutral" size="md" class="rounded-full">13 bab + 3 appendix</UBadge>
            <UBadge icon="i-lucide-users" variant="subtle" color="neutral" size="md" class="rounded-full">Untuk admin · staff_tu · pimpinan</UBadge>
          </div>

          <UInput v-model="search" placeholder="Cari bab... mis. disposisi, arsip, laporan" icon="i-lucide-search" size="md" class="max-w-xl" />
        </div>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" title="Gagal memuat daftar panduan" :description="(error as any)?.statusMessage || 'Coba muat ulang halaman.'" />

    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <USkeleton v-for="i in 6" :key="i" class="h-40" />
    </div>

    <template v-else-if="data">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="b in filteredBabs"
          :key="b.slug"
          :ui="{ body: 'p-4' }"
          class="hover:shadow-sm transition-shadow group"
        >
          <NuxtLink :to="`/panduan/${b.slug}`" class="flex flex-col gap-3">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                <UIcon :name="b.icon" class="w-5 h-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold leading-snug line-clamp-2">{{ b.title }}</div>
                <div class="text-xs text-muted mt-1 line-clamp-2">{{ b.desc }}</div>
              </div>
            </div>
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="inline-flex items-center gap-1 text-muted">
                <UIcon name="i-lucide-list-tree" class="w-3.5 h-3.5" />
                {{ b.headings?.length || 0 }} sub-bab
              </span>
              <span class="inline-flex items-center gap-1 font-medium text-primary">
                Buka <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="flex flex-wrap gap-1">
              <UBadge v-for="h in (b.headings || []).slice(0, 3)" :key="h.slug" variant="outline" color="neutral" size="xs" class="font-normal truncate max-w-[160px]">{{ h.text }}</UBadge>
              <span v-if="(b.headings || []).length > 3" class="text-[11px] text-muted">+{{ (b.headings || []).length - 3 }} lagi</span>
            </div>
          </NuxtLink>
        </UCard>
      </div>

      <p v-if="!filteredBabs.length" class="text-sm text-muted text-center py-8">Tidak ada hasil untuk “{{ search }}”</p>

      <UCard class="border-dashed">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="text-sm">
            <p class="font-semibold">Butuh bantuan cepat?</p>
            <p class="text-xs text-muted mt-1">Buka Tentang untuk alur 4 langkah & info instansi, atau kembali ke Dashboard.</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <UButton to="/tentang" variant="outline" icon="i-lucide-info" size="sm">Tentang</UButton>
            <UButton to="/" icon="i-lucide-layout-dashboard" size="sm" color="primary">Dashboard</UButton>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
