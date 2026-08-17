<script setup lang="ts">
const props = defineProps<{
  target: any
  form: any
  userOptions: any[]
  sifatOptions: any[]
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <UForm id="fwd-form" :state="form" class="space-y-3" @submit="emit('submit')">
    <UFormField label="Kepada" name="kepada_user_id">
      <USelect v-model="form.kepada_user_id" :items="userOptions" class="w-full" placeholder="Pilih user" />
    </UFormField>
    <div class="grid grid-cols-2 gap-3">
      <UFormField label="Sifat Disposisi">
        <USelect v-model="form.sifat_disposisi" :items="sifatOptions" class="w-full" />
      </UFormField>
      <UFormField label="Batas Waktu">
        <UInput v-model="form.batas_waktu" type="date" class="w-full" />
      </UFormField>
    </div>
    <UFormField label="Instruksi">
      <UTextarea v-model="form.instruksi" class="w-full" />
    </UFormField>
    <UFormField label="Catatan">
      <UTextarea v-model="form.catatan" class="w-full" />
    </UFormField>
    <p v-if="error" class="text-sm text-error">{{ error }}</p>
  </UForm>
</template>
