<script setup lang="ts">
import { h } from 'vue'
import { UButton } from '#components'
import type { FormError, TableColumn } from '@nuxt/ui'

const { data, refresh } = await useFetch('/api/klasifikasi')
const editOpen = ref(false)
const form = reactive({ id: null as number | null, kode: '', nama: '', deskripsi: '', retensi_tahun: null as number | null })
const loading = ref(false)

function bukaTambah() {
  Object.assign(form, { id: null, kode: '', nama: '', deskripsi: '', retensi_tahun: null })
  editOpen.value = true
}
function bukaEdit(k: any) {
  Object.assign(form, { id: k.id, kode: k.kode, nama: k.nama, deskripsi: k.deskripsi, retensi_tahun: k.retensi_tahun })
  editOpen.value = true
}

function validate(s: Partial<typeof form>): FormError[] {
  const errors: FormError[] = []
  if (!s.kode) errors.push({ name: 'kode', message: 'Kode wajib diisi' })
  if (!s.nama) errors.push({ name: 'nama', message: 'Nama wajib diisi' })
  return errors
}

async function simpan() {
  loading.value = true
  if (form.id) {
    await $fetch(`/api/klasifikasi/${form.id}`, { method: 'PUT', body: { ...form } })
  } else {
    await $fetch('/api/klasifikasi', { method: 'POST', body: { ...form } })
  }
  loading.value = false
  editOpen.value = false
  await refresh()
}

const { confirm } = useConfirm()
async function hapus(id: number) {
  await confirm({ title: 'Hapus Klasifikasi', message: 'Hapus klasifikasi ini?', okLabel: 'Hapus', loadingTitle: 'Menghapus...' }, async () => {
    await $fetch(`/api/klasifikasi/${id}`, { method: 'DELETE' })
  })
  await refresh()
}

const columns: TableColumn<any>[] = [
  { accessorKey: 'kode', header: 'Kode' },
  { accessorKey: 'nama', header: 'Nama' },
  { accessorKey: 'retensi_tahun', header: 'Retensi (thn)', cell: ({ row }) => row.getValue('retensi_tahun') || '-' },
  {
    id: 'actions',
    header: '',
    meta: { class: { td: 'text-right' } },
    cell: ({ row }) => h('div', { class: 'flex justify-end gap-1' }, [
      h(UButton, { size: 'xs', variant: 'ghost', icon: 'i-lucide-pencil', onClick: () => bukaEdit(row.original) }),
      h(UButton, { size: 'xs', variant: 'ghost', color: 'error', icon: 'i-lucide-trash', onClick: () => hapus(row.original.id) })
    ])
  }
]
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">Klasifikasi Surat</h1>
      <UButton icon="i-lucide-plus" @click="bukaTambah">Tambah</UButton>
    </div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="data || []" :columns="columns" empty="Belum ada data" :ui="{ root: 'custom-scrollbar-table' }" />
    </UCard>

    <UModal v-model:open="editOpen" title="Klasifikasi">
      <template #body>
        <UForm :state="form" :validate="validate" class="space-y-3" @submit="simpan">
          <UFormField label="Kode" name="kode"><UInput v-model="form.kode" class="w-full" /></UFormField>
          <UFormField label="Nama" name="nama"><UInput v-model="form.nama" class="w-full" /></UFormField>
          <UFormField label="Deskripsi"><UTextarea v-model="form.deskripsi" class="w-full" /></UFormField>
          <UFormField label="Retensi (tahun)"><UInput v-model.number="form.retensi_tahun" type="number" class="w-full" /></UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="editOpen = false">Batal</UButton>
            <UButton type="submit" :loading="loading">Simpan</UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
