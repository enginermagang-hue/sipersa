<script setup lang="ts">
defineProps<{ items: any[] }>()
</script>

<template>
  <ul class="space-y-3">
    <li v-for="d in items" :key="d.id" class="border-l-2 border-primary pl-3">
      <div class="text-sm font-medium">{{ d.dari_nama }} → {{ d.kepada_nama }}</div>
      <div v-if="d.instruksi" class="text-sm">{{ d.instruksi }}</div>
      <div v-if="d.catatan" class="text-xs text-muted">Catatan: {{ d.catatan }}</div>
      <UBadge :label="d.status" size="xs" variant="subtle" class="mt-1" />
    </li>
    <li v-if="!items.length" class="text-sm text-muted">Belum ada disposisi</li>
  </ul>
</template>
