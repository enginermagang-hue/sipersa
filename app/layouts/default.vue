<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

const { user, logout, loggingOut, fetchMe } = useAuth()

const open = ref(true)
const collapsed = ref(false)

const { data: stats, refresh: refreshStats } = await useFetch('/api/stats', {
  headers: useRequestHeaders(['cookie']) as Record<string, string>
})
onMounted(() => {
  setInterval(() => refreshStats(), 30000)
})
onMounted(() => {
  if (!user.value) fetchMe()
})

const mainGroups = computed<NavigationMenuItem[][]>(() => {
  const utama: NavigationMenuItem[] = [
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/' },
    { label: 'Surat Masuk', icon: 'i-lucide-inbox', to: '/surat-masuk' },
    { label: 'Surat Keluar', icon: 'i-lucide-send', to: '/surat-keluar', badge: (['pimpinan'].includes(user.value?.role) ? stats.value?.keluarMenungguPersetujuan : 0) || undefined }
  ]
  // Disposisi (inbox) — sembunyikan untuk pimpinan (pilihan B: hanya admin & staff_tu)
  if (['admin', 'staff_tu'].includes(user.value?.role)) {
    utama.push({ label: 'Disposisi', icon: 'i-lucide-share-2', to: '/disposisi', badge: (stats.value?.disposisiSaya || 0) || undefined })
  }
  const manajemen: NavigationMenuItem[] = [
    { label: 'Arsip', icon: 'i-lucide-archive', to: '/arsip' }
  ]
  // Pilihan B: Laporan hanya untuk admin & staff_tu — sembunyikan dari pimpinan & role lain agar tidak redirect senyap ke Dashboard
  if (['admin', 'staff_tu'].includes(user.value?.role)) {
    manajemen.push({ label: 'Laporan', icon: 'i-lucide-file-bar-chart', to: '/laporan' })
  }
  const operasional: NavigationMenuItem[] = []
  // Kelola Disposisi — sembunyikan untuk pimpinan (hanya admin) sesuai permintaan
  if (['admin'].includes(user.value?.role)) {
    operasional.push({ label: 'Kelola Disposisi', icon: 'i-lucide-list-checks', to: '/disposisi/kelola' })
  }
  const adminMenu: NavigationMenuItem[] = []
  if (user.value?.role === 'admin') {
    adminMenu.push({
      label: 'Admin',
      icon: 'i-lucide-settings',
      defaultOpen: true,
      children: [
        { label: 'Users', icon: 'i-lucide-users', to: '/admin/users' },
        { label: 'Session', icon: 'i-lucide-monitor-dot', to: '/admin/sessions' },
        { label: 'Log Aktivitas', icon: 'i-lucide-scroll-text', to: '/admin/activity' },
        { label: 'Klasifikasi', icon: 'i-lucide-tags', to: '/admin/klasifikasi' }
      ]
    })
  }
  const groups: NavigationMenuItem[][] = [utama, manajemen]
  if (operasional.length) groups.push(operasional)
  if (adminMenu.length) groups.push(adminMenu)
  return groups
})

const bottomGroups = computed<NavigationMenuItem[][]>(() => [[
  { label: 'Panduan', icon: 'i-lucide-book-open', to: '/panduan' },
  { label: 'Tentang', icon: 'i-lucide-info', to: '/tentang' }
]])

const appConfig = useAppConfig()
const config = useRuntimeConfig()
const route = useRoute()

const avatarUrl = computed(() => user.value
  ? `https://api.dicebear.com/10.x/initials/svg?seed=${encodeURIComponent(user.value.nama)}`
  : '')

const userItems = computed(() => [[
  { label: user.value?.nama ?? '', description: user.value?.email ?? user.value?.jabatan, type: 'label' as const, class: 'font-semibold', avatar: { src: avatarUrl.value, alt: user.value?.nama } },
  { type: 'separator' as const },
  { label: 'Profil', icon: 'i-lucide-user', to: '/profil' },
  { type: 'separator' as const },
  { label: 'Tentang', icon: 'i-lucide-info', to: '/tentang' },
  { type: 'separator' as const },
  { label: 'Keluar', icon: 'i-lucide-log-out', onSelect: () => logout() }
]])

const currentYear = new Date().getFullYear()

// Search palette
const showSearch = ref(false)
const topSearch = ref('')
function goSearch() {
  const q = topSearch.value.trim()
  if (!q) return
  showSearch.value = false
  navigateTo(`/search?q=${encodeURIComponent(q)}`)
}
defineShortcuts({
  meta_k: () => { showSearch.value = !showSearch.value },
  ctrl_k: () => { showSearch.value = !showSearch.value }
})

const quickActions = computed<DropdownMenuItem[][]>(() => {
  const acts: DropdownMenuItem[] = []
  if (user.value?.role === 'staff_tu') {
    acts.push({ label: 'Surat Masuk Baru', icon: 'i-lucide-inbox', to: '/surat-masuk' })
  }
  if (user.value?.role === 'staff_tu') {
    acts.push({ label: 'Surat Keluar Baru', icon: 'i-lucide-send', to: '/surat-keluar/tulis' })
  }
  if (['admin', 'staff_tu'].includes(user.value?.role)) {
    acts.push({ label: 'Arsip Baru', icon: 'i-lucide-archive', to: '/arsip' })
  }
  return [acts]
})
</script>

<template>
  <UDashboardGroup storage storage-key="sipersa-sidebar" unit="rem">
    <UDashboardSidebar
      v-model:open="open"
      v-model:collapsed="collapsed"
      collapsible resizable
      :min-size="14" :default-size="16" :max-size="22"
      :ui="{ body: 'custom-scrollbar-sidebar', footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed: c }">
        <div class="flex items-center gap-3 w-full">
          <img src="/logo.png" alt="logo" class="size-8 shrink-0">
          <span v-if="!c" class="font-bold text-sm tracking-[0.3em] truncate">{{ config.public.appName || 'SIPERSA' }}</span>
        </div>
      </template>

      <template #default="{ collapsed: c }">
        <UButton
          :label="c ? undefined : 'Cari...'"
          icon="i-lucide-search"
          color="neutral" variant="outline" block :square="c"
          @click="showSearch = true"
        >
          <template v-if="!c" #trailing>
            <div class="flex items-center gap-0.5 ms-auto">
              <UKbd value="meta" variant="subtle" />
              <UKbd value="K" variant="subtle" />
            </div>
          </template>
        </UButton>

        <UNavigationMenu :collapsed="c" :items="mainGroups" orientation="vertical" />
        <UNavigationMenu :collapsed="c" :items="bottomGroups" orientation="vertical" class="mt-auto" />
      </template>

      <template #footer="{ collapsed: c }">
        <UDropdownMenu v-if="user" :items="userItems" :content="{ align: c ? 'center' : 'end', side: 'top', collisionPadding: 12 }" :ui="{ content: 'min-w-52' }">
          <UButton color="neutral" variant="ghost" block :square="c" class="data-[state=open]:bg-elevated justify-start" aria-label="Menu pengguna">
            <template #leading><UAvatar :src="avatarUrl" :alt="user.nama" size="xs" /></template>
            <span v-if="!c" class="truncate text-left flex-1">{{ user.nama }}</span>
            <template v-if="!c" #trailing><UIcon name="i-lucide-chevrons-up-down" class="text-muted ms-auto" /></template>
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="main" :ui="{ body: 'custom-scrollbar-main' }">
      <template #header>
        <UDashboardNavbar :title="String(route.meta.title || 'Dashboard')" :ui="{ right: 'gap-3' }">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #right>
            <UColorModeButton />
            <NotificationBell />
            <UDropdownMenu v-if="quickActions[0]?.length" :items="quickActions" :content="{ align: 'end' }" :ui="{ content: 'min-w-48' }">
              <UButton icon="i-lucide-plus" size="md" class="rounded-full" aria-label="Aksi cepat" />
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="p-4">
          <slot />
        </div>
        <footer class="shrink-0 border-t border-default px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted mt-4">
          <div>© {{ currentYear }} {{ config.public.appName || 'SIPERSA' }}</div>
          <div class="flex items-center gap-2">
            <span>v{{ appConfig.app.version }}</span>
            <span class="hidden sm:inline">•</span>
            <span>Sistem Informasi Persuratan dan Arsip</span>
          </div>
        </footer>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>

  <UModal v-model:open="showSearch" title="Pencarian">
    <template #body>
      <form @submit.prevent="goSearch" class="flex gap-2">
        <UInput v-model="topSearch" icon="i-lucide-search" placeholder="Cari surat / arsip…" autofocus class="flex-1" />
        <UButton type="submit" icon="i-lucide-search">Cari</UButton>
      </form>
    </template>
  </UModal>

  <UModal v-model:open="loggingOut" :dismissible="false" :close="false" title="Keluar">
    <template #body>
      <div class="flex flex-col items-center gap-4 py-6">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-10 text-primary" />
        <div class="text-center"><p class="font-semibold">Sedang keluar...</p><p class="text-sm text-muted">Mohon tunggu sebentar</p></div>
      </div>
    </template>
  </UModal>
</template>
