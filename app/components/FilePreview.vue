<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    fileId: string
    fileName?: string
    hideActions?: boolean
  }>(),
  {
    hideActions: false
  }
)
const isViewable = computed(() => {
  const n = (props.fileName || '').toLowerCase()
  return n.endsWith('.pdf') || /\.(png|jpe?g|gif|webp)$/.test(n)
})
</script>

<template>
  <div class="space-y-2">
    <div v-if="!hideActions" class="flex items-center gap-2">
      <UButton :to="`/api/files/${fileId}`" target="_blank" size="sm" icon="i-lucide-download" variant="soft">
        Unduh{{ fileName ? `: ${fileName}` : '' }}
      </UButton>
      <UButton
        v-if="isViewable"
        :to="`/api/files/${fileId}?inline=1`"
        target="_blank"
        size="sm"
        icon="i-lucide-eye"
        variant="ghost"
      >
        Lihat
      </UButton>
    </div>
    <iframe
      v-if="isViewable"
      :src="`/api/files/${fileId}?inline=1`"
      class="w-full h-[70vh] border border-default rounded-md"
      title="Preview"
    />
  </div>
</template>