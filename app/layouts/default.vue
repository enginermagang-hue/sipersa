<script setup lang="ts">
const { user, logout } = useAuth()

const open = ref(true)

const items = computed(() => {
  const base = [
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/' },
    { label: 'Surat Masuk', icon: 'i-lucide-inbox', to: '/surat-masuk' },
    { label: 'Surat Keluar', icon: 'i-lucide-send', to: '/surat-keluar' },
    { label: 'Disposisi', icon: 'i-lucide-share-2', to: '/disposisi' },
    { label: 'Arsip', icon: 'i-lucide-archive', to: '/arsip' },
    { label: 'Pencarian', icon: 'i-lucide-search', to: '/search' },
    { label: 'Laporan', icon: 'i-lucide-file-bar-chart', to: '/laporan' }
  ]
  if (user.value?.role === 'admin') base.push({ label: 'Admin', icon: 'i-lucide-settings', to: '/admin/users' })
  return base
})

const userItems = computed(() => [[
  { label: 'Keluar', icon: 'i-lucide-log-out', onSelect: () => logout() }
]])
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
        <div class="flex items-center gap-2 px-2 font-bold text-lg truncate">
          <UIcon name="i-lucide-mail" class="text-primary text-xl shrink-0" />
          <span v-if="open">Persuratan</span>
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
        <NotificationBell />
      </header>

      <main class="flex-1 p-4">
        <slot />
      </main>
    </div>
  </div>
</template>
