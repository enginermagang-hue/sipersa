<script setup lang="ts">
import { watch, ref } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)

watch(() => props.open, (newVal) => {
  if (newVal) {
    dialogRef.value?.showModal()
  } else {
    dialogRef.value?.close()
  }
}, { immediate: true })

function close() {
  emit('update:open', false)
}

function onBackdropClick(e: MouseEvent) {
  if (e.target === dialogRef.value) {
    close()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="fixed inset-0 z-50 w-full max-w-lg rounded-lg border border-default bg-default p-0 shadow-lg backdrop:bg-black/50"
    @close="close"
    @click="onBackdropClick"
    @keydown="onKeydown"
  >
    <div class="flex flex-col divide-y divide-default">
      <div class="flex items-center justify-between p-4">
        <h2 class="text-lg font-semibold">{{ title }}</h2>
        <button
          type="button"
          class="rounded-md p-1 hover:bg-muted"
          aria-label="Close"
          @click="close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="p-4" @click.stop>
        <slot name="body" />
      </div>
      <div class="flex justify-end gap-2 p-4">
        <slot name="footer" />
      </div>
    </div>
  </dialog>
</template>

<style scoped>
dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
}
</style>
