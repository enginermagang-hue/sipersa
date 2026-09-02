<script setup lang="ts">
const file = defineModel<File | null>('file', { default: null })
const props = defineProps<{ label?: string; description?: string; maxSize?: number }>()
const MAX = computed(() => props.maxSize ?? 25 * 1024 * 1024)
const error = ref('')
const toast = useToast()
watch(file, (f) => {
  if (!f) { error.value = ''; return }
  if (f.size > MAX.value) {
    const msg = `Ukuran file terlalu besar (maks. ${Math.round(MAX.value/1024/1024)} MB)`
    error.value = msg
    toast.add({ title: 'File terlalu besar', description: msg, color: 'error' })
    file.value = null
  } else error.value = ''
})
</script>

<template>
  <div class="space-y-1">
    <UFileUpload v-model="file" :label="label" :description="description" accept=".pdf,.jpg,.jpeg,.png" class="w-full" />
    <p v-if="error" class="text-xs text-error">{{ error }}</p>
  </div>
</template>
