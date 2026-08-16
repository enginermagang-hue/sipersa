<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const id = route.params.id as string
const { data, refresh } = await useFetch(`/api/surat-keluar/${id}`, {
  key: `surat-keluar-detail-${id}`
})

const toast = useToast()

const isArchived = computed(() => !!data.value?.arsip)
const editOpen = ref(false)
const editLoading = ref(false)

function onEditSaved() {
  editOpen.value = false
  refresh()
  toast.add({ title: 'Berhasil', description: 'Surat keluar berhasil diperbarui', color: 'success' })
}

const { confirm } = useConfirm()

function fmtTgl(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const sifatLabel: Record<string, string> = { biasa: 'Biasa', segera: 'Segera', rahasia: 'Rahasia', penting: 'Penting' }

function onArsipSaved() {
  refresh()
}

async function hapus() {
  await confirm({ title: 'Hapus Surat', message: 'Hapus surat ini?', okLabel: 'Hapus', loadingTitle: 'Menghapus...' }, async () => {
    await $fetch(`/api/surat-keluar/${id}`, { method: 'DELETE' })
  })
  navigateTo('/surat-keluar')
}
</script>

<template>
  <div v-if="data" class="space-y-5">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-[13px]">
      <NuxtLink to="/surat-keluar" class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Surat Keluar</NuxtLink>
      <span class="text-slate-300 dark:text-slate-600">/</span>
      <span class="font-medium text-slate-800 dark:text-slate-200">{{ data.no_surat }}</span>
    </nav>

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <h1 class="text-[22px] md:text-[24px] font-semibold tracking-tight text-slate-900 dark:text-white">Detail Surat Keluar</h1>
        <span
          v-if="!isArchived"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span class="text-[12px] font-medium text-amber-700">Belum Diarsipkan</span>
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span class="text-[12px] font-medium text-emerald-700">Diarsipkan</span>
        </span>
      </div>
      <div class="flex items-center gap-2">
        <UButton :to="`/surat-keluar`" variant="outline" size="sm">Kembali</UButton>
        <UButton variant="outline" size="sm" icon="i-lucide-pen" @click="editOpen = true">Edit</UButton>
        <UButton color="primary" size="sm" icon="i-lucide-download" @click="window.print()">Unduh PDF</UButton>
        <UButton color="error" variant="soft" size="sm" icon="i-lucide-trash" @click="hapus">Hapus</UButton>
      </div>
    </div>

    <!-- Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-5 md:gap-6 items-start">
      <!-- KOLOM KIRI -->
      <div class="space-y-5">
        <!-- Card Informasi Surat -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center dark:bg-slate-800 dark:border-slate-700">
                <UIcon name="i-lucide-file-text" class="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </span>
              <h2 class="text-[13px] font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300">Informasi Surat</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
            <div>
              <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">No. Surat</p>
              <p class="font-medium text-slate-900 dark:text-white">{{ data.no_surat }}</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Tanggal</p>
              <p class="text-slate-700 dark:text-slate-300">{{ fmtTgl(data.tgl_surat) }}</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Tujuan</p>
              <p class="text-slate-700 dark:text-slate-300">{{ data.tujuan }}</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Perihal</p>
              <p class="text-slate-700 dark:text-slate-300">{{ data.perihal }}</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Sifat</p>
              <UBadge :label="sifatLabel[data.sifat] || data.sifat" variant="subtle" />
            </div>
            <div>
              <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Lampiran</p>
              <p v-if="data.file_drive_id" class="text-slate-700 dark:text-slate-300">1 Berkas</p>
              <p v-else class="text-slate-400 dark:text-slate-500">Tidak ada</p>
            </div>
          </div>
        </UCard>

        <!-- Card Preview Isi Surat -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-[12px] font-medium text-slate-500 uppercase tracking-wide dark:text-slate-400">Preview Isi Surat</span>
              <span v-if="data.file_drive_id" class="text-[11px] text-slate-400 dark:text-slate-500">1 halaman • A4</span>
            </div>
          </template>
          <FilePreview
            v-if="data.file_drive_id"
            :file-id="data.file_drive_id"
            :file-name="data.file_name"
          />
          <p v-else class="py-10 text-center text-sm text-slate-400 dark:text-slate-500">Tidak ada file untuk dipratinjau</p>
        </UCard>
      </div>

      <!-- KOLOM KANAN (sticky) -->
      <div class="space-y-3 lg:sticky lg:top-[80px]">
        <!-- Card Arsip -->
        <UCard v-if="isArchived">
          <template #header>
            <h3 class="font-semibold text-slate-900 dark:text-white">Informasi Arsip</h3>
          </template>
          <div class="space-y-3 text-[13px]">
            <div>
              <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Nama Dokumen</p>
              <p class="text-slate-700 dark:text-slate-300">{{ data.arsip.nama_dokumen || '—' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Lokasi Simpan</p>
              <p class="text-slate-700 dark:text-slate-300">{{ data.arsip.lokasi || '—' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Tahun</p>
              <p class="text-slate-700 dark:text-slate-300">{{ data.arsip.tahun || '—' }}</p>
            </div>
          </div>
        </UCard>

        <!-- Card Arsipkan Surat (inline form) -->
        <div v-else class="rounded-xl border border-indigo-100 shadow-sm overflow-hidden bg-white dark:bg-slate-900 dark:border-slate-800">
          <div class="bg-indigo-50/40 p-5 border-b border-indigo-100 dark:bg-slate-800/60 dark:border-slate-700">
            <div class="flex items-start gap-3">
              <span class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-archive" class="w-4 h-4" />
              </span>
              <div>
                <h3 class="font-semibold text-slate-900 dark:text-white">Arsipkan Surat</h3>
                <p class="text-[12px] text-slate-500 dark:text-slate-400">Lengkapi data arsip untuk menyimpan ke Daftar Arsip</p>
              </div>
            </div>
          </div>
          <div class="p-5">
            <ArsipForm mode="keluar" :surat="data" inline @saved="onArsipSaved" />
          </div>
        </div>

        <div class="px-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>Alur simple: Buat Surat → Diarsipkan</span>
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Sistem aktif
          </span>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <UModal v-model:open="editOpen" title="Edit Surat Keluar" :ui="{ footer: 'justify-end' }">
      <template #body>
        <SuratForm
          v-if="editOpen"
          type="keluar"
          :surat-id="Number(id)"
          :surat="data"
          @close="onEditSaved"
          @busy="editLoading = $event"
        />
      </template>
      <template #footer="{ close }">
        <UButton variant="ghost" @click="close">Batal</UButton>
        <UButton type="submit" form="surat-form" :loading="editLoading">Perbarui</UButton>
      </template>
    </UModal>
  </div>
</template>
