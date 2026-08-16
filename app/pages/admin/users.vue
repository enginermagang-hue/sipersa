<script setup lang="ts">
import { h } from 'vue'
import { UBadge, UButton, UDropdownMenu, USelect } from '#components'
import type { FormError, TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/vue-table'

const { user } = useAuth()
const page = ref(1)
const { data, refresh } = await useFetch('/api/admin/users', {
  query: { page }
})

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Staff TU', value: 'staff_tu' },
  { label: 'Pimpinan', value: 'pimpinan' }
]

const statusOptions = [
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' }
]

const roleColor: Record<string, string> = { admin: 'primary', staff_tu: 'neutral', pimpinan: 'warning' }

const createOpen = ref(false)
const form = reactive({ nama: '', username: '', email: '', password: '', role: 'staff_tu' })
const loading = ref(false)
const error = ref('')

const editOpen = ref(false)
const editForm = reactive({
  id: 0,
  nama: '',
  username: '',
  email: '',
  role: 'staff_tu',
  status: 'active',
  password: ''
})

function validate(s: Partial<typeof form>): FormError[] {
  const errors: FormError[] = []
  if (!s.nama) errors.push({ name: 'nama', message: 'Nama wajib diisi' })
  if (!s.username) errors.push({ name: 'username', message: 'Username wajib diisi' })
  if (!s.password) errors.push({ name: 'password', message: 'Password wajib diisi' })
  return errors
}

function validateEdit(s: Partial<typeof editForm>): FormError[] {
  const errors: FormError[] = []
  if (!s.nama) errors.push({ name: 'nama', message: 'Nama wajib diisi' })
  if (!s.username) errors.push({ name: 'username', message: 'Username wajib diisi' })
  if (s.password && s.password.length < 4) errors.push({ name: 'password', message: 'Password minimal 4 karakter' })
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

function openEdit(u: any) {
  Object.assign(editForm, {
    id: u.id,
    nama: u.nama,
    username: u.username,
    email: u.email || '',
    role: u.role,
    status: u.status,
    password: ''
  })
  error.value = ''
  editOpen.value = true
}

async function simpanEdit() {
  loading.value = true
  error.value = ''
  try {
    const body: any = { nama: editForm.nama, email: editForm.email, role: editForm.role, status: editForm.status }
    if (editForm.password) body.password = editForm.password
    await $fetch(`/api/admin/users/${editForm.id}`, { method: 'PUT', body })
    editOpen.value = false
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
  await confirm({ title: 'Nonaktifkan User', message: 'Nonaktifkan user ini?', okLabel: 'Nonaktifkan', loadingTitle: 'Menonaktifkan...' }, async () => {
    await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
  })
  await refresh()
}

function getRowItems(row: Row<any>) {
  const u = row.original
  const items: any[] = [
    { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEdit(u) },
    {
      label: 'Ubah Status',
      icon: u.status === 'active' ? 'i-lucide-power-off' : 'i-lucide-power',
      color: u.status === 'active' ? 'warning' : 'success',
      onSelect: () => toggleStatus(u)
    }
  ]
  if (u.id !== user.value?.id) {
    items.push(
      { type: 'separator' },
      { label: 'Nonaktifkan', icon: 'i-lucide-trash', color: 'error', onSelect: () => hapus(u.id) }
    )
  }
  return items
}

const columns: TableColumn<any>[] = [
  { accessorKey: 'nama', header: 'Nama' },
  { accessorKey: 'username', header: 'Username' },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => h(UBadge, {
      label: row.original.role,
      variant: 'subtle',
      color: (roleColor as any)[row.original.role] || 'neutral'
    })
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(UBadge, {
      label: row.original.status === 'active' ? 'Aktif' : 'Nonaktif',
      variant: 'subtle',
      color: row.original.status === 'active' ? 'success' : 'neutral'
    })
  },
  {
    id: 'actions',
    header: '',
    enableHiding: false,
    meta: { class: { td: 'text-right' } },
    cell: ({ row }) => h(UDropdownMenu, {
      content: { align: 'end' },
      items: getRowItems(row),
      'aria-label': 'Aksi'
    }, () => h(UButton, {
      icon: 'i-lucide-ellipsis-vertical',
      color: 'neutral',
      variant: 'ghost',
      'aria-label': 'Aksi'
    }))
  }
]
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">Manajemen User</h1>
      <UButton icon="i-lucide-plus" @click="createOpen = true">Tambah User</UButton>
    </div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="data?.data || []" :columns="columns" empty="Belum ada data" />
      <div class="p-4 border-t border-default">
        <UPagination
          v-model="page"
          :page-count="data?.limit || 20"
          :total="data?.total || 0"
          class="mt-0 justify-end"
        />
      </div>
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

    <UModal v-model:open="editOpen" title="Edit User">
      <template #body>
        <UForm :state="editForm" :validate="validateEdit" class="space-y-3" @submit="simpanEdit">
          <UFormField label="Nama" name="nama"><UInput v-model="editForm.nama" class="w-full" /></UFormField>
          <UFormField label="Username" name="username"><UInput v-model="editForm.username" class="w-full" /></UFormField>
          <UFormField label="Email"><UInput v-model="editForm.email" class="w-full" /></UFormField>
          <UFormField label="Role"><USelect v-model="editForm.role" :items="roleOptions" class="w-full" /></UFormField>
          <UFormField label="Status"><USelect v-model="editForm.status" :items="statusOptions" class="w-full" /></UFormField>
          <UFormField label="Password Baru (kosongkan bila tidak diganti)" name="password">
            <UInput v-model="editForm.password" type="password" class="w-full" />
          </UFormField>
          <p v-if="error" class="text-sm text-error">{{ error }}</p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="editOpen = false">Batal</UButton>
            <UButton type="submit" :loading="loading">Simpan</UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
