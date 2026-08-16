<script setup lang="ts">
const file = defineModel<File | null>('file', { default: null })
defineProps<{ label?: string; description?: string }>()
</script>

<template>
  <UFileUpload v-model="file" :label="label" :description="description" class="w-full" />
</template>
