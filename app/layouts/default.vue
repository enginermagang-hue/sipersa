<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import type { NavigationMenuItem } from '@nuxt/ui'

const { user, logout, fetchMe } = useAuth()

const open = useLocalStorage('sidebar-open', true)

onMounted(() => {
  if (!user.value) fetchMe()
})

const items = computed<NavigationMenuItem[][]>(() => {
  const utama: NavigationMenuItem[] = [
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/' },
    { label: 'Surat Masuk', icon: 'i-lucide-inbox', to: '/surat-masuk' },
    { label: 'Surat Keluar', icon: 'i-lucide-send', to: '/surat-keluar' },
    { label: 'Disposisi', icon: 'i-lucide-share-2', to: '/disposisi' }
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

const userItems = computed(() => [[
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
      :ui="{ container: 'h-full', inner: 'bg-elevated/25 divide-transparent', body: 'py-0' }"
    >
      <template #header>
        <div class="flex items-center gap-2 truncate">
          <UIcon name="i-lucide-mail" class="text-primary size-8  " />
          <span v-if="open" class="font-bold text-lg">Persuratan</span>
        </div>
      </template>

      <template #default="{ state }">
        <UNavigationMenu
          :key="state"
          :items="items"
          orientation="vertical"
          :ui="{ link: 'p-2 overflow-hidden' }"
        />
      </template>

      <template #footer>
        <UDropdownMenu
          v-if="user"
          :items="userItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
        >
          <UButton
            :label="open ? user.nama : ''"
            icon="i-lucide-user"
            trailing-icon="i-lucide-chevrons-up-down"
            color="neutral"
            variant="ghost"
            square
            class="w-full data-[state=open]:bg-elevated overflow-hidden"
            :ui="{ trailingIcon: 'text-dimmed ms-auto' }"
          />
        </UDropdownMenu>
      </template>
    </USidebar>

    <div class="flex-1 flex flex-col min-h-screen">
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
        <UColorModeButton />
        <NotificationBell />
      </header>

      <main class="flex-1 p-4">
        <slot />
      </main>
    </div>
  </div>
</template>
