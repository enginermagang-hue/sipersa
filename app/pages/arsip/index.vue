<script setup lang="ts">
import { h } from 'vue'
import { UButton } from '#components'
import type { FormError, TableColumn } from '@nuxt/ui'

const q = ref('')
const tahun = ref('')
const { data, refresh } = await useFetch('/api/arsip', { query: { q, tahun } })

const formOpen = ref(false)
const form = reactive({ nama_dokumen: '', lokasi: '', tahun: null as number | null, klasifikasi_id: null as number | null })
const { data: klas } = await useFetch('/api/klasifikasi')
const klasOptions = computed(() => (klas.value || []).map((k: any) => ({ label: `${k.kode} - ${k.nama}`, value: k.id })))
const loading = ref(false)

function validate(s: Partial<typeof form>): FormError[] {
  const errors: FormError[] = []
  if (!s.nama_dokumen) errors.push({ name: 'nama_dokumen', message: 'Nama dokumen wajib diisi' })
  return errors
}

async function simpan() {
  loading.value = true
  try {
    await $fetch('/api/arsip', { method: 'POST', body: { ...form } })
    formOpen.value = false
    Object.assign(form, { nama_dokumen: '', lokasi: '', tahun: null, klasifikasi_id: null })
    await refresh()
  } finally {
    loading.value = false
  }
}

const { confirm } = useConfirm()
async function hapus(id: number) {
  const ok = await confirm({ title: 'Hapus Arsip', message: 'Hapus arsip ini?', okLabel: 'Hapus' })
  if (!ok) return
  await $fetch(`/api/arsip/${id}`, { method: 'DELETE' })
  await refresh()
}

const columns: TableColumn<any>[] = [
  { accessorKey: 'nama_dokumen', header: 'Dokumen' },
  {
    accessorKey: 'klasifikasi_kode',
    header: 'Klasifikasi',
    cell: ({ row }) => (row.original.klasifikasi_kode ? `${row.original.klasifikasi_kode} - ${row.original.klasifikasi_nama}` : '-')
  },
  { accessorKey: 'lokasi', header: 'Lokasi', cell: ({ row }) => row.getValue('lokasi') || '-' },
  { accessorKey: 'tahun', header: 'Tahun', cell: ({ row }) => row.getValue('tahun') || '-' },
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
      <h1 class="text-xl font-bold">Arsip</h1>
      <UButton icon="i-lucide-plus" @click="formOpen = true">Tambah</UButton>
    </div>
    <div class="flex gap-2 mb-4">
      <UInput v-model="q" placeholder="Cari dokumen/lokasi" icon="i-lucide-search" class="max-w-xs" />
      <UInput v-model="tahun" placeholder="Tahun" type="number" class="w-28" />
    </div>
    <UCard>
      <UTable :data="data || []" :columns="columns" empty="Belum ada data" />
    </UCard>

    <UModal v-model:open="formOpen" title="Tambah Arsip">
      <template #body>
        <UForm :state="form" :validate="validate" class="space-y-3" @submit="simpan">
          <UFormField label="Nama Dokumen" name="nama_dokumen"><UInput v-model="form.nama_dokumen" class="w-full" /></UFormField>
          <UFormField label="Klasifikasi"><USelect v-model="form.klasifikasi_id" :items="klasOptions" class="w-full" :placeholder="'(tanpa)'" /></UFormField>
          <UFormField label="Lokasi"><UInput v-model="form.lokasi" class="w-full" placeholder="Rak B1" /></UFormField>
          <UFormField label="Tahun"><UInput v-model.number="form.tahun" type="number" class="w-full" /></UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="formOpen = false">Batal</UButton>
            <UButton type="submit" :loading="loading">Simpan</UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
