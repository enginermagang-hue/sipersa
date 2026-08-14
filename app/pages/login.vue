<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

definePageMeta({ layout: false })
const { login } = useAuth()
const state = reactive({ username: '', password: '' })
const error = ref('')
const loading = ref(false)

function validate(s: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []
  if (!s.username) errors.push({ name: 'username', message: 'Username wajib diisi' })
  if (!s.password) errors.push({ name: 'password', message: 'Password wajib diisi' })
  return errors
}

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await login(state.username, state.password)
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Login gagal'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-bold">Login Sistem Persuratan</h1>
      </template>
      <UForm :state="state" :validate="validate" class="space-y-4" @submit="submit">
        <UFormField label="Username" name="username">
          <UInput v-model="state.username" class="w-full" autocomplete="username" />
        </UFormField>
        <UFormField label="Password" name="password">
          <UInput v-model="state.password" type="password" class="w-full" autocomplete="current-password" />
        </UFormField>
        <p v-if="error" class="text-sm text-error">{{ error }}</p>
        <UButton type="submit" :loading="loading" block>Masuk</UButton>
      </UForm>
    </UCard>
  </div>
</template>
