<script setup lang="ts">
import { h } from 'vue'
import { UButton, USelect } from '#components'
import type { FormError, TableColumn } from '@nuxt/ui'

const { data, refresh } = await useFetch('/api/admin/users')

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Staff TU', value: 'staff_tu' },
  { label: 'Pimpinan', value: 'pimpinan' }
]

const createOpen = ref(false)
const form = reactive({ nama: '', username: '', email: '', password: '', role: 'staff_tu' })
const loading = ref(false)
const error = ref('')

function validate(s: Partial<typeof form>): FormError[] {
  const errors: FormError[] = []
  if (!s.nama) errors.push({ name: 'nama', message: 'Nama wajib diisi' })
  if (!s.username) errors.push({ name: 'username', message: 'Username wajib diisi' })
  if (!s.password) errors.push({ name: 'password', message: 'Password wajib diisi' })
  return errors
}

async function simpan() {
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: { ...form } })
    createOpen.value = false
    Object.assign(form, { nama: '', username: '', email: '', password: '', role: 'staff_tu' })
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Gagal'
  } finally {
    loading.value = false
  }
}

async function toggleStatus(u: any) {
  const status = u.status === 'active' ? 'inactive' : 'active'
  await $fetch(`/api/admin/users/${u.id}`, { method: 'PUT', body: { status } })
  await refresh()
}

const { confirm } = useConfirm()
async function hapus(id: number) {
  const ok = await confirm({ title: 'Nonaktifkan User', message: 'Nonaktifkan user ini?', okLabel: 'Nonaktifkan' })
  if (!ok) return
  await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
  await refresh()
}

const columns: TableColumn<any>[] = [
  { accessorKey: 'nama', header: 'Nama' },
  { accessorKey: 'username', header: 'Username' },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => h(USelect, {
      modelValue: row.original.role,
      items: roleOptions,
      class: 'w-36',
      'onUpdate:modelValue': (v: string) => $fetch(`/api/admin/users/${row.original.id}`, { method: 'PUT', body: { role: v } }).then(() => refresh())
    })
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(UButton, {
      size: 'xs',
      color: row.original.status === 'active' ? 'success' : 'neutral',
      variant: 'soft',
      onClick: () => toggleStatus(row.original)
    }, () => row.original.status === 'active' ? 'Aktif' : 'Nonaktif')
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { td: 'text-right' } },
    cell: ({ row }) => h(UButton, { size: 'xs', variant: 'ghost', color: 'error', icon: 'i-lucide-trash', onClick: () => hapus(row.original.id) })
  }
]
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">Manajemen User</h1>
      <UButton icon="i-lucide-plus" @click="createOpen = true">Tambah User</UButton>
    </div>
    <UCard>
      <UTable :data="data || []" :columns="columns" empty="Belum ada data" />
    </UCard>

    <UModal v-model:open="createOpen" title="Tambah User">
      <template #body>
        <UForm :state="form" :validate="validate" class="space-y-3" @submit="simpan">
          <UFormField label="Nama" name="nama"><UInput v-model="form.nama" class="w-full" /></UFormField>
          <UFormField label="Username" name="username"><UInput v-model="form.username" class="w-full" /></UFormField>
          <UFormField label="Email"><UInput v-model="form.email" class="w-full" /></UFormField>
          <UFormField label="Password" name="password"><UInput v-model="form.password" type="password" class="w-full" /></UFormField>
          <UFormField label="Role"><USelect v-model="form.role" :items="roleOptions" class="w-full" /></UFormField>
          <p v-if="error" class="text-sm text-error">{{ error }}</p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="createOpen = false">Batal</UButton>
            <UButton type="submit" :loading="loading">Simpan</UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
