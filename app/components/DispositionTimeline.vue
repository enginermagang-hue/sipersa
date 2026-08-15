<script setup lang="ts">
const props = defineProps<{ items: any[] }>()

const prioritasColor: Record<string, string> = { normal: 'neutral', segera: 'warning', penting: 'error' }
const statusColor: Record<string, string> = { baru: 'warning', diproses: 'primary', selesai: 'success' }
const prioritasLabel: Record<string, string> = { normal: 'Normal', segera: 'Segera', penting: 'Penting' }

const rendered = computed(() => {
  const idx = new Map<number, number>()
  props.items.forEach((it, i) => idx.set(it.id, i))
  return props.items.map((it) => {
    let depth = 0
    let p = it.parent_id
    let hops = 0
    while (p != null && idx.has(p) && hops < 50) {
      depth++
      hops++
      p = props.items[idx.get(p) as number].parent_id
    }
    return { ...it, depth }
  })
})

function fmt(d?: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function isOverdue(it: any) {
  return it.batas_waktu && it.status !== 'selesai' && it.batas_waktu < new Date().toISOString().slice(0, 10)
}
</script>

<template>
  <ul class="space-y-3">
    <li
      v-for="d in rendered"
      :key="d.id"
      class="border-l-2 border-primary pl-3"
      :style="{ marginLeft: `${Math.min(d.depth, 4) * 16}px` }"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium">{{ d.dari_nama }} → {{ d.kepada_nama }}</span>
        <UBadge :label="prioritasLabel[d.prioritas] || d.prioritas" size="xs" :color="prioritasColor[d.prioritas] || 'neutral'" variant="subtle" />
        <UBadge :label="d.status" size="xs" :color="statusColor[d.status] || 'neutral'" variant="subtle" />
        <span v-if="d.batas_waktu" class="text-xs" :class="isOverdue(d) ? 'text-error font-semibold' : 'text-muted'">
          Batas: {{ d.batas_waktu }}{{ isOverdue(d) ? ' (lewat)' : '' }}
        </span>
      </div>
      <div v-if="d.instruksi" class="text-sm">{{ d.instruksi }}</div>
      <div v-if="d.catatan" class="text-xs text-muted">Catatan: {{ d.catatan }}</div>
      <div v-if="d.diproses_at || d.selesai_at" class="text-xs text-muted">
        <template v-if="d.diproses_at">Diproses: {{ fmt(d.diproses_at) }}</template>
        <template v-if="d.selesai_at"> · Selesai: {{ fmt(d.selesai_at) }}</template>
      </div>
    </li>
    <li v-if="!items.length" class="text-sm text-muted">Belum ada disposisi</li>
  </ul>
</template>
