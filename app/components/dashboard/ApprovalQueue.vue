<script setup lang="ts">
defineProps<{ items: any[]; pending?: boolean }>()
function statusColor(s: string) { return s === 'submitted' ? 'warning' : 'neutral' }
</script>
<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold">Antrian Persetujuan</span>
        <div class="flex items-center gap-2">
          <UBadge v-if="items?.length" color="warning" variant="subtle">{{ items.length }}</UBadge>
          <UButton to="/surat-keluar" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">Lihat semua</UButton>
        </div>
      </div>
    </template>
    <div v-if="pending" class="divide-y divide-default">
      <div v-for="i in 6" :key="i" class="p-3 flex gap-3"><USkeleton class="size-8 rounded" /><div class="flex-1 space-y-2"><USkeleton class="h-3 w-3/4" /><USkeleton class="h-3 w-1/2" /></div></div>
    </div>
    <div v-else-if="!items?.length" class="p-8 text-center text-sm text-muted">
      <UIcon name="i-lucide-clock" class="text-2xl mb-2" /><p>Tidak ada antrian persetujuan.</p>
    </div>
    <div v-else class="divide-y divide-default">
      <div v-for="a in items" :key="a.id" class="flex gap-3 p-3 hover:bg-elevated/50 transition-colors">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium text-sm truncate">{{ a.no_surat }}</span>
            <UBadge :color="statusColor(a.status)" variant="subtle" size="xs">{{ a.status }}</UBadge>
            <span class="text-xs text-muted ml-auto">{{ a.created_at?.slice(0,10) }}</span>
          </div>
          <div class="text-xs text-muted truncate">{{ a.tujuan }}</div>
          <div class="text-sm text-muted line-clamp-2">{{ a.perihal }}</div>
        </div>
        <div class="flex flex-col gap-1 shrink-0">
          <UButton :to="`/surat-keluar/${a.id}`" size="xs" variant="ghost" icon="i-lucide-eye">Lihat</UButton>
          <UButton :to="`/surat-keluar/${a.id}?approve=1`" size="xs" color="success" variant="soft" icon="i-lucide-check">Setujui</UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
