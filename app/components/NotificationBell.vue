<script setup lang="ts">
const { items, unread, load, markRead } = useNotifications()
const open = ref(false)
onMounted(() => {
  load()
  setInterval(() => load(), 30000)
})
</script>

<template>
  <UPopover v-model:open="open">
    <UButton icon="i-lucide-bell" color="neutral" variant="ghost" aria-label="Notifikasi">
      <template v-if="unread" #trailing>
        <UBadge :label="String(unread)" color="error" size="xs" />
      </template>
    </UButton>
    <template #content>
      <div class="w-80 p-2">
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold text-sm">Notifikasi</span>
          <UButton size="xs" variant="link" @click="markRead()">Tandai semua dibaca</UButton>
        </div>
        <ul class="max-h-80 overflow-auto space-y-1">
          <li
            v-for="n in items"
            :key="n.id"
            class="p-2 rounded cursor-pointer hover:bg-elevated"
            :class="!n.read ? 'bg-elevated' : ''"
            @click="markRead(n.id)"
          >
            <div class="text-sm font-medium">{{ n.title }}</div>
            <div class="text-xs text-muted">{{ n.message }}</div>
          </li>
          <li v-if="!items.length" class="text-sm text-muted p-2">Tidak ada notifikasi</li>
        </ul>
      </div>
    </template>
  </UPopover>
</template>
