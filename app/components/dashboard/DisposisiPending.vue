<script setup lang="ts">
const props = defineProps<{ items: any[]; pending?: boolean }>()

function prioritasColor(p: string) {
  if (p === 'tinggi') return 'error'
  if (p === 'sedang') return 'warning'
  return 'neutral'
}
function statusColor(s: string) {
  if (s === 'baru') return 'error'
  if (s === 'diproses') return 'warning'
  return 'neutral'
}
function sisaHariColor(batas: string) {
  if (!batas) return 'neutral'
  const diff = Math.ceil((new Date(batas).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) / 86400000)
  if (diff < 0) return 'error'
  if (diff <= 2) return 'error'
  if (diff <= 5) return 'warning'
  return 'neutral'
}
function sisaHariLabel(batas: string) {
  if (!batas) return '-'
  const diff = Math.ceil((new Date(batas).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) / 86400000)
  if (diff < 0) return `Lewat ${Math.abs(diff)} hari`
  if (diff === 0) return 'Hari ini'
  if (diff === 1) return 'Besok'
  return `${diff} hari lagi`
}
</script>
<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold">Disposisi Perlu Tindakan</span>
        <div class="flex items-center gap-2">
          <UBadge v-if="items?.length" variant="subtle">{{ items.length }}</UBadge>
          <UButton to="/disposisi" variant="link" size="xs" trailing-icon="i-lucide-arrow-right">Lihat semua</UButton>
        </div>
      </div>
    </template>
    <div v-if="pending" class="divide-y divide-default">
      <div v-for="i in 5" :key="i" class="p-3 flex gap-3"><USkeleton class="size-8 rounded" /><div class="flex-1 space-y-2"><USkeleton class="h-3 w-3/4" /><USkeleton class="h-3 w-1/2" /></div></div>
    </div>
    <div v-else-if="!items?.length" class="p-8 text-center text-sm text-muted">
      <UIcon name="i-lucide-share-2" class="text-2xl mb-2" /><p>Tidak ada disposisi pending.</p>
    </div>
    <div v-else class="divide-y divide-default">
      <div v-for="d in items" :key="d.id" class="flex gap-3 p-3 hover:bg-elevated/50 transition-colors">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium text-sm truncate">{{ d.no_surat }}</span>
            <UBadge :color="prioritasColor(d.prioritas)" variant="subtle" size="xs">{{ d.prioritas || 'normal' }}</UBadge>
            <UBadge :color="statusColor(d.status)" variant="subtle" size="xs">{{ d.status }}</UBadge>
            <UBadge v-if="d.batas_waktu" :color="sisaHariColor(d.batas_waktu)" variant="subtle" size="xs">{{ sisaHariLabel(d.batas_waktu) }}</UBadge>
            <span v-if="d.batas_waktu" class="text-xs text-muted ml-auto">{{ d.batas_waktu }}</span>
          </div>
          <div v-if="d.pengirim" class="text-xs text-muted truncate">{{ d.pengirim }}</div>
          <div class="text-sm text-muted line-clamp-2">{{ d.perihal }}</div>
        </div>
        <div class="flex flex-col gap-1 shrink-0">
          <UButton :to="`/disposisi?highlight=${d.id}`" size="xs" variant="ghost" icon="i-lucide-eye" aria-label="Lihat disposisi">Lihat</UButton>
          <UButton :to="`/surat-masuk/${d.surat_masuk_id}`" size="xs" color="warning" variant="soft" icon="i-lucide-file-text" aria-label="Buka surat">Surat</UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
