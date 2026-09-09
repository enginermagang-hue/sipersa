<script setup lang="ts">
import { h } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { UButton } from '#components'
import type { FormError, TableColumn } from '@nuxt/ui'

type ViewMode='table'|'grid'|'compact'
const view = useLocalStorage<ViewMode>('sipersa.klas.view','table')
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
  { accessorKey: 'kode', header: 'Kode', meta: { class: { td: 'whitespace-nowrap' } } },
  { accessorKey: 'nama', header: 'Nama',
    meta: { class: { th: 'max-w-[260px]', td: 'max-w-[260px] whitespace-normal' } },
    cell: ({ row }) => h('span', { class: 'break-words whitespace-normal line-clamp-3 leading-snug block max-w-[240px]', title: String(row.getValue('nama')||'') }, row.getValue('nama') as string) },
  { accessorKey: 'retensi_tahun', header: 'Retensi (thn)', meta: { class: { td: 'whitespace-nowrap' } }, cell: ({ row }) => row.getValue('retensi_tahun') || '-' },
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
    <div class="flex justify-end mb-2">
      <UFieldGroup class="border border-default p-1 rounded-lg shrink-0" size="sm">
        <UButton icon="i-lucide-rows-3" :color="view === 'table' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan tabel" :ui="{ base: 'px-2' }" @click="view = 'table'" />
        <UButton icon="i-lucide-layout-grid" :color="view === 'grid' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan grid" :ui="{ base: 'px-2' }" @click="view = 'grid'" />
        <UButton icon="i-lucide-list" :color="view === 'compact' ? 'primary' : 'neutral'" variant="soft" aria-label="Tampilan ringkas" :ui="{ base: 'px-2' }" @click="view = 'compact'" />
      </UFieldGroup>
    </div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template v-if="view==='table'">
        <UTable :data="data || []" :columns="columns" empty="Belum ada data" :ui="{ root: 'custom-scrollbar-table' }" />
      </template>
      <div v-else-if="view==='grid'" class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="k in (data||[])" :key="k.id" class="rounded-xl border border-default p-4 hover:bg-muted/30 flex flex-col">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <UBadge :label="k.kode" variant="subtle" size="sm" />
              <span class="font-medium text-sm truncate" :title="k.nama">{{ k.nama }}</span>
            </div>
            <div class="flex gap-1">
              <UButton size="xs" variant="ghost" icon="i-lucide-pencil" @click="bukaEdit(k)" />
              <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash" @click="hapus(k.id)" />
            </div>
          </div>
          <p class="text-sm text-muted break-words whitespace-normal line-clamp-3 leading-snug mt-2" :title="k.deskripsi">{{ k.deskripsi || '-' }}</p>
          <div class="mt-3 flex items-center gap-2">
            <UBadge :label="k.retensi_tahun ? `${k.retensi_tahun} th` : '-'" variant="subtle" size="xs" />
            <span class="text-xs text-muted">Retensi</span>
          </div>
        </div>
        <div v-if="!(data||[]).length" class="col-span-full py-12 text-center text-muted">Belum ada data</div>
      </div>
      <div v-else class="divide-y divide-default">
        <div v-for="k in (data||[])" :key="k.id" class="flex gap-3 px-4 py-3 hover:bg-muted/30">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <UBadge :label="k.kode" variant="subtle" size="xs" />
              <span class="font-medium text-sm truncate" :title="k.nama">{{ k.nama }}</span>
              <span class="text-xs text-muted">• {{ k.retensi_tahun || '-' }} th</span>
            </div>
            <p class="text-xs text-muted truncate break-words whitespace-normal line-clamp-1 leading-snug" :title="k.deskripsi">{{ k.deskripsi || '-' }}</p>
          </div>
          <div class="flex gap-1 shrink-0">
            <UButton size="xs" variant="ghost" icon="i-lucide-pencil" @click="bukaEdit(k)" />
            <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash" @click="hapus(k.id)" />
          </div>
        </div>
        <div v-if="!(data||[]).length" class="py-12 text-center text-muted text-sm">Belum ada data</div>
      </div>
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
