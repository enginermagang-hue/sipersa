<script setup lang="ts">
const file = defineModel<File | null>('file', { default: null })
</script>

<template>
  <UFileUpload v-model="file" class="w-full" />
</template>
