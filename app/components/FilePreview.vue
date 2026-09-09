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
const isPdf = computed(() => (props.fileName || '').toLowerCase().endsWith('.pdf'))
const isImage = computed(() => /\.(png|jpe?g|gif|webp)$/i.test(props.fileName || ''))
const isViewable = computed(() => isPdf.value || isImage.value)
</script>

<template>
  <div class="space-y-2">
    <div v-if="!hideActions" class="flex items-center gap-2">
      <UButton :href="`/api/files/${fileId}`" target="_blank" size="sm" icon="i-lucide-download" variant="soft">
        Unduh{{ fileName ? `: ${fileName}` : '' }}
      </UButton>
      <UButton
        v-if="isViewable"
        :href="`/api/files/${fileId}?inline=1`"
        target="_blank"
        size="sm"
        icon="i-lucide-eye"
        variant="ghost"
      >
        Lihat
      </UButton>
    </div>
    <img
      v-if="isImage"
      :src="`/api/files/${fileId}?inline=1`"
      :alt="fileName || 'preview'"
      class="w-full max-h-[70vh] object-contain border border-default rounded-md bg-muted"
      loading="lazy"
    />
    <iframe
      v-else-if="isPdf"
      :src="`/api/files/${fileId}?inline=1`"
      class="w-full h-[70vh] border border-default rounded-md"
      title="Preview"
    />
  </div>
</template>