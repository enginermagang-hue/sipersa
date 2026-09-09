<script setup lang="ts">
const props = defineProps<{ files: any[] }>()
const active = ref<number | null>(null)
const activeFile = computed(() => active.value !== null ? props.files[active.value] : null)
const isOpen = computed({
  get: () => active.value !== null,
  set: (v: boolean) => { if (!v) active.value = null }
})

function open(i: number) { active.value = i }
function close() { active.value = null }
defineExpose({ open, close })
function prev() { if (active.value !== null) active.value = (active.value - 1 + props.files.length) % props.files.length }
function next() { if (active.value !== null) active.value = (active.value + 1) % props.files.length }

function onKey(e: KeyboardEvent) {
  if (active.value === null) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <button
        v-for="(f,i) in files"
        :key="f.id || f.file_drive_id"
        class="group relative overflow-hidden rounded-lg border border-default hover:border-primary/50 transition"
        @click="open(i)"
      >
        <img
          :src="`/api/files/${f.file_drive_id}?inline=1`"
          :alt="f.file_name"
          loading="lazy"
          class="h-36 w-full object-cover group-hover:scale-[1.02] transition"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition" />
        <span class="absolute bottom-1 left-1 right-1 truncate text-[11px] text-white drop-shadow px-1">{{ f.file_name }}</span>
      </button>
    </div>

    <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-4xl bg-black/95' }" :dismissable="true">
      <template #content v-if="activeFile">
        <div class="relative p-4 flex flex-col items-center">
          <img :src="`/api/files/${activeFile.file_drive_id}?inline=1`" :alt="activeFile.file_name" class="max-h-[75vh] max-w-full object-contain rounded" />
          <div class="mt-3 flex items-center gap-2 text-white text-sm">
            <span>{{ ((active ?? 0) + 1) }} / {{ files.length }} — {{ activeFile.file_name }}</span>
            <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-chevron-left" @click="prev" />
            <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-chevron-right" @click="next" />
            <UButton size="xs" variant="soft" icon="i-lucide-download" :href="`/api/files/${activeFile.file_drive_id}`" target="_blank" >Unduh</UButton>
            <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" @click="close" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
