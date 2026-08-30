<script setup lang="ts">
const { user } = useAuth()
const config = useRuntimeConfig()
const appConfig = useAppConfig()
const route = useRoute()

const currentYear = new Date().getFullYear()

// Untuk header: link dinamis login/dashboard
const isPanduan = computed(() => route.path.startsWith('/panduan'))
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <!-- Navbar -->
    <header class="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-slate-900/80 border-b border-default">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-14 gap-4">
          <!-- Left: brand -->
          <NuxtLink to="/" class="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="logo" class="size-8 shrink-0">
            <span class="font-bold text-sm tracking-[0.2em] truncate hidden sm:inline">{{ config.public.appName || 'SIPERSA' }}</span>
            <span class="hidden lg:inline-flex items-center gap-1.5 text-xs text-muted border-l border-default pl-3 ml-1">
              <UIcon name="i-lucide-book-open" class="w-3.5 h-3.5" />
              Panduan
            </span>
          </NuxtLink>

          <!-- Right: actions -->
          <nav class="flex items-center gap-1 sm:gap-2 shrink-0">
            <UButton
              to="/tentang"
              variant="ghost"
              color="neutral"
              size="sm"
              icon="i-lucide-info"
              :class="{ 'bg-elevated': route.path.startsWith('/tentang') }"
            >
              <span class="hidden sm:inline">Tentang</span>
            </UButton>
            <UButton
              to="/panduan"
              variant="ghost"
              color="neutral"
              size="sm"
              icon="i-lucide-book-open"
              :class="{ 'bg-elevated': isPanduan }"
            >
              <span class="hidden sm:inline">Panduan</span>
            </UButton>
            <USeparator orientation="vertical" class="h-6 hidden sm:block" />
            <UColorModeButton size="sm" />
            <template v-if="user">
              <UButton to="/" icon="i-lucide-layout-dashboard" size="sm" color="primary" variant="solid">
                <span class="hidden sm:inline">Dashboard</span>
              </UButton>
            </template>
            <template v-else>
              <UButton to="/login" icon="i-lucide-log-in" size="sm" color="primary" variant="solid">
                <span class="hidden sm:inline">Masuk</span>
              </UButton>
            </template>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="flex-1">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="shrink-0 border-t border-default px-4 py-3">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
        <div>© {{ currentYear }} {{ config.public.appName || 'SIPERSA' }} — Sistem Informasi Persuratan dan Arsip</div>
        <div class="flex items-center gap-2">
          <span>v{{ appConfig.app.version }}</span>
          <span class="hidden sm:inline">•</span>
          <NuxtLink to="/tentang" class="hover:text-default hover:underline">Tentang</NuxtLink>
          <span>•</span>
          <NuxtLink to="/" class="hover:text-default hover:underline">Dashboard</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
