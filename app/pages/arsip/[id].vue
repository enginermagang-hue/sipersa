<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string
const { user } = useAuth()
const { confirm } = useConfirm()
const toast = useToast()

const { data: arsip, pending, error, refresh } = await useFetch(`/api/arsip/${id}`)

const notFound = computed(() => !!error.value && (error.value as any)?.statusCode === 404)

const isArchived = computed(() => !!arsip.value)
const canManage = computed(() => user.value?.role === 'admin' || user.value?.id === (arsip.value as any)?.created_by)

const editOpen = ref(false)
const previewOpen = ref(false)
const destroyOpen = ref(false)
const destroyReason = ref('')
const destroyLoading = ref(false)

const retensiColor: Record<string, string> = { aktif: 'success', menjelang: 'warning', kadaluarsa: 'error' }
const retensiLabel: Record<string, string> = { aktif: 'Aktif', menjelang: 'Menjelang', kadaluarsa: 'Kadaluarsa' }

function fmtTgl(s?: string | null) {
  if (!s) return '—'
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function hapus() {
  await confirm({ title: 'Hapus Arsip', message: `Hapus arsip "${(arsip.value as any)?.nama_dokumen}"?`, okLabel: 'Hapus', loadingTitle: 'Menghapus...' }, async () => {
    await $fetch(`/api/arsip/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Arsip dihapus', color: 'success' })
    await navigateTo('/arsip')
  })
}

async function musnahkan() {
  if (!destroyOpen.value) return
  destroyLoading.value = true
  try {
    await $fetch(`/api/arsip/${id}/destroy`, { method: 'POST', body: { alasan: destroyReason.value } })
    toast.add({ title: 'Arsip dimusnahkan', color: 'success' })
    await navigateTo('/arsip')
  } catch (e: any) {
    toast.add({ title: e?.data?.statusMessage || 'Gagal memusnahkan', color: 'error' })
  } finally {
    destroyLoading.value = false
    destroyOpen.value = false
  }
}

function sumberLink(r: any) {
  if (r?.no_surat_masuk) return { label: r.no_surat_masuk, to: `/surat-masuk/${r.ref_masuk_id}` }
  if (r?.no_surat_keluar) return { label: r.no_surat_keluar, to: `/surat-keluar/${r.ref_keluar_id}` }
  return null
}

definePageMeta({ title: 'Detail Arsip' })
</script>

<template>
  <div v-if="pending" class="space-y-4">
    <USkeleton class="h-8 w-48" />
    <USkeleton class="h-64 w-full" />
  </div>
  <div v-else-if="notFound" class="py-16 text-center">
    <UIcon name="i-lucide-archive-x" class="w-10 h-10 mx-auto text-muted" />
    <p class="mt-3 font-medium">Arsip tidak ditemukan</p>
    <p class="text-sm text-muted">ID #{{ id }} tidak ada atau sudah dihapus.</p>
    <UButton to="/arsip" variant="outline" size="sm" class="mt-4" icon="i-lucide-arrow-left">Kembali ke Arsip</UButton>
  </div>
  <div v-else-if="arsip" class="space-y-5">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-[13px]">
      <NuxtLink to="/arsip" class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Arsip</NuxtLink>
      <span class="text-slate-300 dark:text-slate-600">/</span>
      <span class="font-medium text-slate-800 dark:text-slate-200 truncate">{{ (arsip as any).nama_dokumen }}</span>
    </nav>

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-[22px] md:text-[24px] font-semibold tracking-tight text-slate-900 dark:text-white truncate">{{ (arsip as any).nama_dokumen }}</h1>
        <UBadge :label="retensiLabel[(arsip as any).status] || (arsip as any).status" :color="retensiColor[(arsip as any).status] || 'neutral'" variant="subtle" />
        <span v-if="(arsip as any).sisa_tahun != null" class="text-xs text-muted">{{ (arsip as any).sisa_tahun >= 0 ? `Sisa ${(arsip as any).sisa_tahun} th` : `Lewat ${Math.abs((arsip as any).sisa_tahun)} th` }}</span>
        <span v-else class="text-xs text-muted">Tetap</span>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <UButton to="/arsip" variant="outline" size="sm">Kembali</UButton>
        <UButton v-if="(arsip as any).file_drive_id" variant="outline" size="sm" icon="i-lucide-download" :href="`/api/files/${(arsip as any).file_drive_id}`" target="_blank">Unduh</UButton>
        <UButton v-if="(arsip as any).file_drive_id" variant="outline" size="sm" icon="i-lucide-eye" @click="previewOpen = true">Preview</UButton>
        <UButton v-if="canManage" variant="outline" size="sm" icon="i-lucide-pen" @click="editOpen = true">Edit</UButton>
        <UButton v-if="canManage && (arsip as any).status === 'kadaluarsa'" color="error" variant="soft" size="sm" icon="i-lucide-flame" @click="destroyOpen = true">Pemusnahan</UButton>
        <UButton v-if="canManage" color="error" variant="soft" size="sm" icon="i-lucide-trash" @click="hapus">Hapus</UButton>
      </div>
    </div>

    <!-- Info Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 items-start">
      <div class="col-span-2 space-y-5">
        <UCard>
          <template #header><div class="flex items-center gap-2"><span class="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center dark:bg-slate-800 dark:border-slate-700"><UIcon name="i-lucide-archive" class="w-4 h-4 text-slate-500" /></span><h2 class="text-[13px] font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300">Informasi Arsip</h2></div></template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
            <div><p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Nama Dokumen</p><p class="font-medium text-slate-900 dark:text-white">{{ (arsip as any).nama_dokumen }}</p></div>
            <div><p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Klasifikasi</p><p class="text-slate-700 dark:text-slate-300">{{ (arsip as any).klasifikasi_kode ? `${(arsip as any).klasifikasi_kode} - ${(arsip as any).klasifikasi_nama}` : '—' }}</p></div>
            <div><p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Lokasi</p><p class="text-slate-700 dark:text-slate-300">{{ (arsip as any).lokasi || '—' }}</p></div>
            <div><p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Tahun</p><p class="text-slate-700 dark:text-slate-300">{{ (arsip as any).tahun || '—' }}</p></div>
            <div><p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Sifat</p><p class="text-slate-700 dark:text-slate-300">{{ (arsip as any).sifat || 'biasa' }}</p></div>
            <div><p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Tgl Arsip</p><p class="text-slate-700 dark:text-slate-300">{{ fmtTgl((arsip as any).tgl_arsip) }}</p></div>
            <div v-if="(arsip as any).tahun_musnah != null"><p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Tahun Musnah</p><p class="text-slate-700 dark:text-slate-300">{{ (arsip as any).tahun_musnah }}</p></div>
            <div><p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 dark:text-slate-400">Sumber</p>
              <NuxtLink v-if="sumberLink(arsip)" :to="sumberLink(arsip)!.to" class="text-primary hover:underline font-medium">{{ sumberLink(arsip)!.label }}</NuxtLink>
              <span v-else class="text-slate-400">Mandiri</span>
            </div>
          </div>
        </UCard>

        <UCard v-if="(arsip as any).file_drive_id">
          <template #header><div class="flex items-center justify-between"><span class="text-[12px] font-medium text-slate-500 uppercase tracking-wide dark:text-slate-400">File Arsip</span><span class="text-[11px] text-slate-400">{{ (arsip as any).file_name || 'Dokumen' }}</span></div></template>
          <FilePreview :file-id="(arsip as any).file_drive_id" :file-name="(arsip as any).file_name" />
        </UCard>
        <UCard v-else>
          <template #header><span class="text-[12px] font-medium text-slate-500 uppercase tracking-wide">File Arsip</span></template>
          <p class="py-6 text-center text-sm text-slate-400">Tidak ada file terlampir</p>
        </UCard>
      </div>

      <!-- Kanan -->
      <div class="space-y-3 lg:sticky lg:top-[80px]">
        <UCard>
          <template #header><h3 class="font-semibold text-slate-900 dark:text-white">Retensi & Status</h3></template>
          <div class="space-y-3 text-[13px]">
            <div class="flex items-center justify-between"><span class="text-slate-500">Status</span><UBadge :label="retensiLabel[(arsip as any).status]" :color="retensiColor[(arsip as any).status]" variant="subtle" /></div>
            <div class="flex items-center justify-between"><span class="text-slate-500">Sisa</span><span class="font-medium">{{ (arsip as any).sisa_tahun != null ? `${Math.abs((arsip as any).sisa_tahun)} tahun` : 'Tetap' }}</span></div>
            <div class="flex items-center justify-between"><span class="text-slate-500">Retensi</span><span class="font-medium">{{ (arsip as any).retensi_tahun ? `${(arsip as any).retensi_tahun} tahun` : 'Tanpa retensi' }}</span></div>
            <div class="flex items-center justify-between"><span class="text-slate-500">Tahun Musnah</span><span class="font-medium">{{ (arsip as any).tahun_musnah ?? '—' }}</span></div>
          </div>
        </UCard>

        <UCard v-if="canManage">
          <template #header><h3 class="font-semibold text-slate-900 dark:text-white">Aksi</h3></template>
          <div class="flex flex-col gap-2">
            <UButton block variant="outline" icon="i-lucide-pen" @click="editOpen=true">Edit Arsip</UButton>
            <UButton v-if="(arsip as any).status==='kadaluarsa'" block color="error" variant="soft" icon="i-lucide-flame" @click="destroyOpen=true">Pemusnahan</UButton>
            <UButton block color="error" variant="soft" icon="i-lucide-trash" @click="hapus">Hapus</UButton>
          </div>
        </UCard>

        <div class="px-1 flex items-center justify-between text-[11px] text-slate-400">
          <span>ID #{{ (arsip as any).id }}</span>
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sistem aktif</span>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <UModal v-model:open="editOpen" :title="`Edit Arsip: ${(arsip as any).nama_dokumen}`" :ui="{ footer:'justify-end' }">
      <template #body><ArsipForm v-if="editOpen" mode="manual" :arsip-id="Number(id)" :arsip="arsip" @saved="() => { editOpen=false; refresh() }" @close="editOpen=false" /></template>
      <template #footer="{ close }"><UButton variant="ghost" @click="close">Batal</UButton><UButton type="submit" form="surat-form" @click="close">Tutup</UButton></template>
    </UModal>

    <!-- Preview -->
    <UModal v-model:open="previewOpen" title="Preview File">
      <template #body><FilePreview v-if="(arsip as any).file_drive_id" :file-id="(arsip as any).file_drive_id" :file-name="(arsip as any).file_name" /></template>
    </UModal>

    <!-- Destroy -->
    <UModal v-model:open="destroyOpen" title="Pemusnahan Arsip">
      <template #body>
        <p class="text-sm mb-3">Arsip "{{ (arsip as any).nama_dokumen }}" akan dimusnahkan karena masa retensinya telah habis.</p>
        <UFormField label="Alasan Pemusnahan"><UTextarea v-model="destroyReason" class="w-full" placeholder="Alasan (opsional)" /></UFormField>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2"><UButton variant="ghost" @click="destroyOpen=false">Batal</UButton><UButton color="error" :loading="destroyLoading" @click="musnahkan">Musnahkan</UButton></div>
      </template>
    </UModal>
  </div>
</template>
