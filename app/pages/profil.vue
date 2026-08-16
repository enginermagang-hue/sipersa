<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const { user, fetchMe } = useAuth()
const toast = useToast()

const form = reactive({
  nama: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})
const loading = ref(false)

watchEffect(() => {
  if (user.value) {
    form.nama = user.value.nama || ''
    form.username = user.value.username || ''
    form.email = user.value.email || ''
  }
})

function validate(): FormError[] {
  const errors: FormError[] = []
  if (!form.nama) errors.push({ name: 'nama', message: 'Nama wajib diisi' })
  if (!form.username) errors.push({ name: 'username', message: 'Username wajib diisi' })
  if (form.password && form.password.length < 4) errors.push({ name: 'password', message: 'Password minimal 4 karakter' })
  if (form.password && form.password !== form.confirmPassword) errors.push({ name: 'confirmPassword', message: 'Konfirmasi password tidak cocok' })
  return errors
}

async function simpan() {
  loading.value = true
  try {
    const body: Record<string, string> = { nama: form.nama, username: form.username, email: form.email }
    if (form.password) body.password = form.password
    const res: any = await $fetch('/api/auth/profile', { method: 'PUT', body })
    if (res.user) {
      user.value = { ...user.value, ...res.user }
    }
    form.password = ''
    form.confirmPassword = ''
    toast.add({ title: 'Profil berhasil diperbarui', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.statusMessage || 'Gagal memperbarui profil', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-lg">
    <h1 class="text-xl font-bold mb-4">Profil Saya</h1>
    <UCard>
      <UForm :state="form" :validate="validate" class="space-y-4" @submit="simpan">
        <UFormField label="Nama" name="nama">
          <UInput v-model="form.nama" class="w-full" />
        </UFormField>
        <UFormField label="Username" name="username">
          <UInput v-model="form.username" class="w-full" />
        </UFormField>
        <UFormField label="Email" name="email">
          <UInput v-model="form.email" class="w-full" />
        </UFormField>
        <UFormField label="Password Baru" name="password" description="Kosongkan jika tidak ingin mengubah password">
          <UInput v-model="form.password" type="password" class="w-full" />
        </UFormField>
        <UFormField v-if="form.password" label="Konfirmasi Password" name="confirmPassword">
          <UInput v-model="form.confirmPassword" type="password" class="w-full" />
        </UFormField>
        <div class="flex justify-end">
          <UButton type="submit" :loading="loading">Simpan</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>
