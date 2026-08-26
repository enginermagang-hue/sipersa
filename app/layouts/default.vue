<script setup lang="ts">
const { user, logout, fetchMe } = useAuth()

const open = ref(true)
onMounted(() => {
  const stored = localStorage.getItem('sidebar-open')
  if (stored !== null) open.value = stored === 'true'
  watch(open, value => localStorage.setItem('sidebar-open', String(value)))
})

const { data: stats, refresh: refreshStats } = await useFetch('/api/stats', {
  headers: useRequestHeaders(['cookie']) as Record<string, string>
})
onMounted(() => {
  setInterval(() => refreshStats(), 30000)
})

onMounted(() => {
  if (!user.value) fetchMe()
})

const items = computed<NavigationMenuItem[][]>(() => {
  const utama: NavigationMenuItem[] = [
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/' },
    { label: 'Surat Masuk', icon: 'i-lucide-inbox', to: '/surat-masuk' },
    { label: 'Surat Keluar', icon: 'i-lucide-send', to: '/surat-keluar' },
    { label: 'Disposisi', icon: 'i-lucide-share-2', to: '/disposisi', badge: (stats.value?.disposisiSaya || 0) || undefined }
  ]

  const manajemen: NavigationMenuItem[] = [
    { label: 'Arsip', icon: 'i-lucide-archive', to: '/arsip' },
    { label: 'Laporan', icon: 'i-lucide-file-bar-chart', to: '/laporan' }
  ]

  const operasional: NavigationMenuItem[] = []
  if (['pimpinan', 'admin'].includes(user.value?.role)) {
    operasional.push({ label: 'Kelola Disposisi', icon: 'i-lucide-list-checks', to: '/disposisi/kelola' })
  }

  const adminMenu: NavigationMenuItem[] = []
  if (user.value?.role === 'admin') {
    adminMenu.push({
      label: 'Admin',
      icon: 'i-lucide-settings',
      children: [
        { label: 'Users', icon: 'i-lucide-users', to: '/admin/users' },
        { label: 'Session', icon: 'i-lucide-monitor-dot', to: '/admin/sessions' },
        { label: 'Klasifikasi', icon: 'i-lucide-tags', to: '/admin/klasifikasi' },
        { label: 'Log Aktivitas', icon: 'i-lucide-scroll-text', to: '/admin/activity' }
      ]
    })
  }

  const groups: NavigationMenuItem[][] = [utama, manajemen]
  if (operasional.length) groups.push(operasional)
  if (adminMenu.length) groups.push(adminMenu)
  return groups
})

const appConfig = useAppConfig()
const config = useRuntimeConfig()

const avatarUrl = computed(() => user.value
  ? `https://api.dicebear.com/10.x/initial-face/svg?seed=${encodeURIComponent(user.value.nama)}&radius=50`
  : '')

const userItems = computed(() => [[
  { label: user.value?.nama ?? '', type: 'label', class: 'font-semibold' },
  { label: user.value?.email || user.value?.role || '', type: 'label', class: 'text-xs text-muted' },
  { type: 'separator' },
  { label: 'Profil', icon: 'i-lucide-user', to: '/profil' },
  { type: 'separator' },
  { label: 'Keluar', icon: 'i-lucide-log-out', onSelect: () => logout() }
]])

const topSearch = ref('')
function goSearch() {
  const q = topSearch.value.trim()
  if (!q) return
  navigateTo(`/search?q=${encodeURIComponent(q)}`)
}
</script>

<template>
  <div class="flex min-h-screen">
    <USidebar
      v-model:open="open"
      collapsible="icon"
      rail
      :ui="{ container: 'h-full', inner: 'bg-elevated/25 divide-transparent', body: 'py-0', header: 'px-0'}"
    >
      <template #header>
        <div class="flex items-center gap-2 truncate border-b border-gray-200 dark:border-gray-800 py-4 px-4">
          <img src="/ntt.png" style="width: 32px;"/>
          <div v-if="open">
            <div class="font-bold text-lg" style="letter-spacing: 10px !important;">{{ config.public.appName || 'SIPERSA' }}</div>
          </div>
          <div class="text-wrap text-xs">Aplikasi persuratan UPTD Tekkomdik - Dinas Pendidikan dan Kebudayaan Provinsi NTT</div>
        </div>
      </template>

      <template #default="{ state }">
        <div class="py-6">
          <UNavigationMenu
            :key="state"
            :items="items"
            orientation="vertical"
            :ui="{ link: 'p-2 overflow-hidden' }"
          />
          </div>
      </template>

      <template #footer>
        <div class="flex items-center gap-2 px-2 py-1 overflow-hidden">
          <UIcon name="i-lucide-mail" class="text-primary size-5 shrink-0" />
          <div v-if="open" class="min-w-0 space-y-0.5">
            <div class="font-semibold text-sm truncate">{{ config.public.appName || 'SIPERSA' }}</div>
            <div class="text-xs text-muted truncate">Aplikasi Surat Masuk/Keluar, Disposisi &amp; Arsip</div>
            <div class="text-xs text-dimmed">v{{ appConfig.app.version }}</div>
          </div>
        </div>
      </template>
    </USidebar>

    <div class="flex-1 flex flex-col min-h-screen min-w-0">
      <header class="h-14 border-b border-default flex items-center justify-between px-4">
        <UButton
          icon="i-lucide-panel-left"
          color="neutral"
          variant="ghost"
          aria-label="Toggle sidebar"
          @click="open = !open"
        />
        <div class="flex-1" />
        <UInput
          v-model="topSearch"
          icon="i-lucide-search"
          placeholder="Cari surat / arsip…"
          class="w-36 md:w-64"
          @keyup.enter="goSearch"
        />
        <UColorModeButton  class="ml-2"/>
        <NotificationBell />
        <UDropdownMenu
          v-if="user"
          :items="userItems"
          :content="{ align: 'end', collisionPadding: 12 }"
          :ui="{ content: 'min-w-52' }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            class="data-[state=open]:bg-elevated"
            aria-label="Menu pengguna"
          >
            <template #leading>
              <UAvatar :src="avatarUrl" :alt="user.nama" size="sm" />
            </template>
            <span class="hidden sm:inline max-w-32 truncate">{{ user.nama }}</span>
            <template #trailing>
              <UIcon name="i-lucide-chevrons-up-down" class="text-muted" />
            </template>
          </UButton>
        </UDropdownMenu>
      </header>

      <main class="flex-1 p-4 min-w-0">
        <slot />
      </main>
    </div>
  </div>
</template>
