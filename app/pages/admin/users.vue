<script setup lang="ts">
import { h } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { UBadge, UButton, UDropdownMenu, USelect } from '#components'
import type { FormError, TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/vue-table'

const { user } = useAuth()
type ViewMode = 'table' | 'grid' | 'compact'
const view = useLocalStorage<ViewMode>('sipersa.users.view', 'table')
const page = ref(1)
const search = ref('')
const debouncedSearch = ref('')
let debounceTimer: ReturnType<typeof setTimeout>
watch(search, (v) => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { debouncedSearch.value = v; page.value = 1 }, 300) })
const { data, refresh, pending } = await useFetch('/api/admin/users', {
  query: { page, q: debouncedSearch }
})

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Staff', value: 'staff' },
  { label: 'Pimpinan', value: 'pimpinan' }
]

const statusOptions = [
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' }
]

const roleColor: Record<string, string> = { admin: 'primary', staff: 'neutral', pimpinan: 'warning' }
const avatarPalette = [
  { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' }
]
function avatarColor(u:any){
  const seed = String(u.id ?? u.username ?? u.nama ?? '')
  let h=0; for(let i=0;i<seed.length;i++) h=(h*31+seed.charCodeAt(i))>>>0
  return avatarPalette[h % avatarPalette.length]
}

const createOpen = ref(false)
const form = reactive({ nama: '', username: '', email: '', password: '', role: 'staff', nip: '', no_hp: '', jabatan: '' })
const loading = ref(false)
const error = ref('')

const editOpen = ref(false)
const editForm = reactive({
  id: 0,
  nama: '',
  username: '',
  email: '',
  role: 'staff',
  status: 'active',
  password: '',
  nip: '',
  no_hp: '',
  jabatan: ''
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
    Object.assign(form, { nama: '', username: '', email: '', password: '', role: 'staff', nip: '', no_hp: '', jabatan: '' })
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
    password: '',
    nip: u.nip || '',
    no_hp: u.no_hp || '',
    jabatan: u.jabatan || ''
  })
  error.value = ''
  editOpen.value = true
}

async function simpanEdit() {
  loading.value = true
  error.value = ''
  try {
    const body: any = { nama: editForm.nama, username: editForm.username, email: editForm.email, role: editForm.role, status: editForm.status, nip: editForm.nip, no_hp: editForm.no_hp, jabatan: editForm.jabatan }
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
  const isAdmin = user.value?.role === 'admin'
  const items: any[] = []
  if (isAdmin) {
    items.push({ label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEdit(u) })
    items.push({
      label: 'Ubah Status',
      icon: u.status === 'active' ? 'i-lucide-power-off' : 'i-lucide-power',
      color: u.status === 'active' ? 'warning' : 'success',
      onSelect: () => toggleStatus(u)
    })
    if (u.id !== user.value?.id) {
      items.push(
        { type: 'separator' },
        { label: 'Nonaktifkan', icon: 'i-lucide-trash', color: 'error', onSelect: () => hapus(u.id) }
      )
    }
  } else {
    items.push({ label: 'Lihat Detail', icon: 'i-lucide-eye', onSelect: () => openEdit(u) })
  }
  return items
}

function initials(n:string){ const p=(n||'?').split(' ').filter(Boolean); return (p[0]?.[0]||'?').toUpperCase()+(p[1]?.[0]||'').toUpperCase() }
const columns: TableColumn<any>[] = [
  { accessorKey: 'nama', header: 'Nama',
    meta: { class: { th: 'max-w-[200px]', td: 'max-w-[200px] whitespace-normal align-top' } },
    cell: ({ row }) => {
      const u=row.original; const c=avatarColor(u)
      return h('div', { class: 'flex items-center gap-2 min-w-0' }, [
        h('div', { class: `w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${c.bg} ${c.text}` }, initials(u.nama)),
        h('span', { class: 'break-words whitespace-normal line-clamp-3 leading-snug block max-w-[150px]', title: u.nama }, u.nama)
      ])
    } },
  { accessorKey: 'nip', header: 'NIP', meta: { class: { td: 'whitespace-nowrap' } }, cell: ({ row }) => row.original.nip || '-' },
  { accessorKey: 'jabatan', header: 'Jabatan',
    meta: { class: { th: 'max-w-[180px]', td: 'max-w-[180px] whitespace-normal' } },
    cell: ({ row }) => h('span', { class: 'break-words whitespace-normal line-clamp-3 leading-snug block max-w-[170px]' }, row.original.jabatan || '-') },
  { accessorKey: 'no_hp', header: 'No HP', cell: ({ row }) => row.original.no_hp || '-' },
  { accessorKey: 'username', header: 'Username',
    meta: { class: { td: 'max-w-[140px]' } },
    cell: ({ row }) => h('span', { class: 'truncate block max-w-[130px]', title: row.original.username }, row.original.username) },
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
      <div class="p-3 border-b border-default flex items-center gap-2">
        <UInput v-model="search" placeholder="Cari nama, username, email, NIP, jabatan, no HP..." icon="i-lucide-search" class="flex-1 max-w-sm" />
        <UFieldGroup class="border border-default p-1 rounded-lg shrink-0 ml-auto" size="sm">
          <UButton icon="i-lucide-rows-3" :color="view === 'table' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan tabel" :ui="{ base: 'px-2' }" @click="view = 'table'" />
          <UButton icon="i-lucide-layout-grid" :color="view === 'grid' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan grid" :ui="{ base: 'px-2' }" @click="view = 'grid'" />
          <UButton icon="i-lucide-list" :color="view === 'compact' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan ringkas" :ui="{ base: 'px-2' }" @click="view = 'compact'" />
        </UFieldGroup>
      </div>
      <div v-if="pending" class="h-0.5 w-full overflow-hidden bg-muted"><div class="h-full w-1/3 bg-primary animate-[shimmer_1.2s_ease-in-out_infinite]" /></div>
      <template v-if="view === 'table'">
        <UTable :data="data?.data || []" :columns="columns" empty="Belum ada data" :ui="{ root: 'custom-scrollbar-table' }" />
      </template>
      <div v-else-if="view === 'grid'" class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="u in data?.data || []" :key="u.id" class="rounded-xl border border-default p-4 flex flex-col hover:bg-muted/30">
          <div class="flex items-start gap-3">
            <div :class="`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatarColor(u).bg} ${avatarColor(u).text}`">{{ initials(u.nama) }}</div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-sm truncate" :title="u.nama">{{ u.nama }}</div>
              <div class="text-xs text-muted truncate">@{{ u.username }} • {{ u.email || '-' }}</div>
              <div class="flex gap-1 mt-1.5 flex-wrap">
                <UBadge :label="u.role" :color="(roleColor as any)[u.role]||'neutral'" variant="subtle" size="xs" />
                <UBadge :label="u.status==='active'?'Aktif':'Nonaktif'" :color="u.status==='active'?'success':'neutral'" variant="subtle" size="xs" />
              </div>
            </div>
            <UDropdownMenu :items="getRowItems({ original: u } as any)"><UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" /></UDropdownMenu>
          </div>
          <div class="mt-3 space-y-1 text-xs">
            <div class="flex justify-between"><span class="text-muted">NIP</span><span class="font-medium truncate ml-2">{{ u.nip || '-' }}</span></div>
            <div class="flex justify-between"><span class="text-muted">Jabatan</span><span class="font-medium truncate ml-2 max-w-[150px] text-right" :title="u.jabatan">{{ u.jabatan || '-' }}</span></div>
            <div class="flex justify-between"><span class="text-muted">No HP</span><span class="font-medium">{{ u.no_hp || '-' }}</span></div>
          </div>
        </div>
        <div v-if="!pending && !(data?.data||[]).length" class="col-span-full py-12 text-center text-muted">Belum ada data</div>
      </div>
      <div v-else class="divide-y divide-default">
        <div v-for="u in data?.data || []" :key="u.id" class="flex gap-3 px-4 py-3 hover:bg-muted/30">
          <div :class="`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor(u).bg} ${avatarColor(u).text}`">{{ initials(u.nama) }}</div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-medium text-sm truncate" :title="u.nama">{{ u.nama }}</span>
              <UBadge :label="u.role" :color="(roleColor as any)[u.role]||'neutral'" variant="subtle" size="xs" />
              <UBadge :label="u.status==='active'?'Aktif':'Nonaktif'" :color="u.status==='active'?'success':'neutral'" variant="subtle" size="xs" />
            </div>
            <div class="text-xs text-muted truncate">@{{ u.username }} • {{ u.jabatan || '-' }} • {{ u.nip || '-' }}</div>
          </div>
          <UDropdownMenu :items="getRowItems({ original: u } as any)"><UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" /></UDropdownMenu>
        </div>
        <div v-if="!pending && !(data?.data||[]).length" class="py-12 text-center text-muted text-sm">Belum ada data</div>
      </div>
      <div class="p-4 border-t border-default flex items-center justify-between gap-4">
        <p class="text-sm text-muted">
          Menampilkan {{ data?.data?.length ? ((data!.page - 1) * data!.limit + 1).toLocaleString('id-ID') : 0 }}–{{ ((data!.page - 1) * (data?.limit || 20) + (data?.data || []).length).toLocaleString('id-ID') }} dari {{ (data?.total ?? 0).toLocaleString('id-ID') }} user
        </p>
        <UPagination
          v-model:page="page"
          :items-per-page="data?.limit || 20"
          :total="data?.total || 0"
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
          <UFormField label="NIP"><UInput v-model="form.nip" class="w-full" placeholder="Opsional" /></UFormField>
          <UFormField label="Jabatan"><UInput v-model="form.jabatan" class="w-full" placeholder="Opsional" /></UFormField>
          <UFormField label="No HP"><UInput v-model="form.no_hp" class="w-full" placeholder="Opsional" /></UFormField>
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
          <UFormField label="NIP"><UInput v-model="editForm.nip" class="w-full" /></UFormField>
          <UFormField label="Jabatan"><UInput v-model="editForm.jabatan" class="w-full" /></UFormField>
          <UFormField label="No HP"><UInput v-model="editForm.no_hp" class="w-full" /></UFormField>
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
