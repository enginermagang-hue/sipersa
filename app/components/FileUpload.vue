<script setup lang="ts">
const file = defineModel<File | null>('file', { default: null })
const files = defineModel<File[]>('files', { default: () => [] })
const props = defineProps<{ label?: string; description?: string; maxSize?: number; multiple?: boolean; progress?: number | null; uploading?: boolean; statusText?: string; activeIndex?: number | null }>()
const MAX = computed(() => props.maxSize ?? 25 * 1024 * 1024)
const error = ref('')
const toast = useToast()

// legacy single file watch
watch(file, (f) => {
  if (!f) { error.value = ''; return }
  if (f.size > MAX.value) {
    const msg = `Ukuran file terlalu besar (maks. ${Math.round(MAX.value/1024/1024)} MB)`
    error.value = msg
    toast.add({ title: 'File terlalu besar', description: msg, color: 'error' })
    file.value = null
  } else error.value = ''
})

watch(files, (arr) => {
  if (!arr?.length) { error.value = ''; return }
  let total = 0
  for (const f of arr) total += f.size
  if (total > MAX.value) {
    const msg = `Total ukuran file terlalu besar (maks. ${Math.round(MAX.value/1024/1024)} MB, total ${(total/1024/1024).toFixed(1)} MB)`
    error.value = msg
    toast.add({ title: 'File terlalu besar', description: msg, color: 'error' })
  } else {
    error.value = ''
    for (const f of arr) {
      if (f.size > MAX.value) {
        const msg = `File "${f.filename || f.name}" terlalu besar (maks. ${Math.round(MAX.value/1024/1024)} MB)`
        error.value = msg
        toast.add({ title: 'File terlalu besar', description: msg, color: 'error' })
        break
      }
    }
  }
})

function removeAt(i: number) {
  files.value = files.value.filter((_, idx) => idx !== i)
}
</script>

<template>
  <div class="space-y-1">
    <UFileUpload v-if="!multiple" v-model="file" :label="label" :description="description" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif" class="w-full" />
    <template v-else>
      <UFileUpload v-model="files" :multiple="true" :label="label" :description="description ? `${description} (Total maks. ${Math.round(MAX/1024/1024)} MB)` : `Total maks. ${Math.round(MAX/1024/1024)} MB`" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif" class="w-full" />
      <div v-if="files.length" class="space-y-1 mt-2">
        <div v-for="(f, i) in files" :key="i" class="rounded-lg border border-default px-3 py-2 text-sm" :class="uploading && activeIndex === i ? 'border-primary/40 bg-primary/5' : uploading && activeIndex !== null && i < (activeIndex ?? -1) ? 'border-success/30 bg-success/5' : ''">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate flex items-center gap-1.5"><UIcon v-if="uploading && activeIndex !== null && i < activeIndex" name="i-lucide-check" class="size-3.5 text-success shrink-0" /><UIcon v-else-if="uploading && activeIndex === i" name="i-lucide-loader-circle" class="size-3.5 animate-spin text-primary shrink-0" />{{ f.name }} <span class="text-muted text-xs">({{ (f.size/1024).toFixed(0) }} KB)</span></span>
            <UButton v-if="!uploading" size="xs" variant="ghost" color="error" icon="i-lucide-x" @click="removeAt(i)" />
            <span v-else-if="activeIndex === i" class="text-xs text-primary font-medium shrink-0">proses</span>
            <span v-else-if="activeIndex !== null && i < activeIndex" class="text-xs text-success font-medium shrink-0">selesai</span>
            <span v-else class="text-xs text-muted shrink-0">antri</span>
          </div>
          <UProgress v-if="uploading" :model-value="activeIndex === i ? undefined : (activeIndex !== null && i < activeIndex ? 100 : 0)" size="2xs" class="mt-1.5" :color="activeIndex !== null && i < activeIndex ? 'success' : undefined" />
        </div>
      </div>
    </template>
    <div v-if="uploading" class="space-y-1.5 mt-2">
      <UProgress :model-value="progress ?? undefined" :status="!!statusText" size="sm" />
      <p v-if="statusText" class="text-xs text-muted">{{ statusText }}<span v-if="progress !== null && progress !== undefined"> — {{ progress }}%</span></p>
    </div>
    <p v-if="error" class="text-xs text-error">{{ error }}</p>
  </div>
</template>
