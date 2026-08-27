<script setup lang="ts">
defineProps<{ items: any[]; pending?: boolean }>()
const max = computed((props: any) => Math.max(1, ...((props.items||[]).map((k:any)=>k.n))))
</script>
<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold">Arsip per Klasifikasi</span>
        <UButton to="/arsip" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">Lihat arsip</UButton>
      </div>
    </template>
    <div v-if="pending" class="p-3 space-y-3"><USkeleton v-for="i in 5" :key="i" class="h-6" /></div>
    <div v-else-if="!items?.length" class="p-8 text-center text-sm text-muted"><UIcon name="i-lucide-archive" class="text-2xl mb-2" /><p>Belum ada data arsip.</p></div>
    <div v-else class="divide-y divide-default">
      <div v-for="k in items" :key="k.nama" class="p-3 hover:bg-elevated/50 transition-colors">
        <div class="flex justify-between text-sm mb-1"><span class="truncate pr-2">{{ k.nama }}</span><span class="text-muted text-xs shrink-0">{{ k.n }} dokumen</span></div>
        <div class="flex items-center gap-2">
          <div class="flex-1 h-2 bg-elevated dark:bg-neutral-800 rounded-full overflow-hidden"><div class="h-2 bg-primary rounded-full transition-all" :style="{ width: (k.n / (max as any) * 100) + '%' }" /></div>
          <span class="text-xs text-muted w-10 text-right">{{ Math.round(k.n / (max as any) * 100) }}%</span>
        </div>
      </div>
    </div>
  </UCard>
</template>
