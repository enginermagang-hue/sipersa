<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

withDefaults(defineProps<{
  title?: string
  message?: string
  okLabel?: string
  cancelLabel?: string
  color?: 'error' | 'primary' | 'success' | 'warning' | 'neutral'
}>(), {
  title: 'Konfirmasi',
  message: 'Yakin melanjutkan?',
  okLabel: 'Ya',
  cancelLabel: 'Batal',
  color: 'error'
})

const emit = defineEmits<{ close: [value: boolean]; 'after:leave': [] }>()

function onConfirm() {
  emit('close', true)
  open.value = false
}
function onCancel() {
  emit('close', false)
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" :title="title" @after:leave="emit('after:leave')">
    <template #body>
      <p class="text-sm text-muted">{{ message }}</p>
    </template>
    <template #footer>
      <UButton variant="ghost" @click="onCancel">{{ cancelLabel }}</UButton>
      <UButton :color="color" @click="onConfirm">{{ okLabel }}</UButton>
    </template>
  </UModal>
</template>
