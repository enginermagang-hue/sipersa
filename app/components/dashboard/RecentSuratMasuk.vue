<script setup lang="ts">
const props = defineProps<{ items: any[]; pending?: boolean }>()
function sifatColor(s: string) {
  if (s === 'sangat_segera') return 'error'
  if (s === 'segera') return 'warning'
  return 'neutral'
}
</script>
<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold">Surat Masuk Terbaru</span>
        <div class="flex items-center gap-2">
          <UBadge v-if="items?.length" variant="subtle">{{ items.length }}</UBadge>
          <UButton to="/surat-masuk" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">Lihat semua</UButton>
        </div>
      </div>
    </template>
    <div v-if="pending" class="divide-y divide-default">
      <div v-for="i in 6" :key="i" class="p-3 flex gap-3"><USkeleton class="size-8 rounded" /><div class="flex-1 space-y-2"><USkeleton class="h-3 w-3/4" /><USkeleton class="h-3 w-1/2" /></div></div>
    </div>
    <div v-else-if="!items?.length" class="p-8 text-center text-sm text-muted">
      <UIcon name="i-lucide-inbox" class="text-2xl mb-2" /><p>Belum ada surat masuk.</p>
    </div>
    <div v-else class="divide-y divide-default">
      <div v-for="s in items" :key="s.id" class="flex gap-3 p-3 hover:bg-elevated/50 transition-colors">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium text-sm truncate">{{ s.no_surat }}</span>
            <UBadge :color="sifatColor(s.sifat)" variant="subtle" size="xs">{{ s.sifat || 'biasa' }}</UBadge>
            <span class="text-xs text-muted ml-auto">{{ s.tgl_terima || s.tgl_surat }}</span>
            <UIcon v-if="s.file_drive_id" name="i-lucide-paperclip" class="text-muted" />
          </div>
          <div class="text-xs text-muted truncate">{{ s.pengirim }}<span v-if="s.klasifikasi_nama"> • {{ s.klasifikasi_nama }}</span></div>
          <div class="text-sm text-muted line-clamp-2">{{ s.perihal }}</div>
        </div>
        <div class="flex flex-col gap-1 shrink-0">
          <UButton :to="`/surat-masuk/${s.id}`" size="xs" variant="ghost" icon="i-lucide-eye" aria-label="Lihat surat">Lihat</UButton>
          <UButton :to="`/disposisi?surat=${s.id}`" size="xs" color="warning" variant="soft" icon="i-lucide-share-2" aria-label="Disposisi surat">Disposisi</UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
