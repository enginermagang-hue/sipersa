<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { renderPdf, parseRenderConfig, PAPER } from '~/utils/pdf-render'

const route = useRoute()
const id = route.params.id as string
const { data, refresh } = await useFetch(`/api/surat-keluar/${id}`, {
  key: `surat-keluar-detail-${id}`
})

const toast = useToast()
const { user } = useAuth()
const { confirm } = useConfirm()

const isArchived = computed(() => !!data.value?.arsip)
const editOpen = ref(false)
const editLoading = ref(false)

const status = computed(() => data.value?.status || 'draft')
const isPimpinan = computed(() => user.value?.role === 'pimpinan')
const isAdminOrCreator = computed(() => user.value?.role === 'admin' || user.value?.id === data.value?.created_by)
const canEdit = computed(() => isAdminOrCreator.value && ['draft', 'ditolak'].includes(status.value))
const canSubmit = computed(() => isAdminOrCreator.value && ['draft', 'ditolak'].includes(status.value))
const canDecide = computed(() => isPimpinan.value && status.value === 'menunggu_persetujuan')

const submitting = ref(false)
const approving = ref(false)
const rejecting = ref(false)
const rejectOpen = ref(false)
const rejectCatatan = ref('')

const { data: ttdStatus } = await useFetch('/api/users/ttd')

const statusMeta: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  menunggu_persetujuan: { label: 'Menunggu Persetujuan', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
  ditolak: { label: 'Ditolak', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' },
  terkirim: { label: 'Disetujui / Terkirim', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
  selesai: { label: 'Selesai', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' }
}

const approvalMeta: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
  rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' }
}

function onEditSaved() {
  editOpen.value = false
  refresh()
  toast.add({ title: 'Berhasil', description: 'Surat keluar berhasil diperbarui', color: 'success' })
}

function fmtTgl(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

async function submitForApproval() {
  submitting.value = true
  try {
    await $fetch(`/api/surat-keluar/${id}/submit`, { method: 'POST' })
    toast.add({ title: 'Surat disubmit', description: 'Menunggu persetujuan pimpinan.', color: 'success' })
    refresh()
  } catch (e: any) {
    toast.add({ title: 'Gagal submit', description: e?.data?.statusMessage || 'Terjadi kesalahan', color: 'error' })
  } finally {
    submitting.value = false
  }
}

async function getTtdDataUrl(): Promise<string | null> {
  try {
    const blob = await $fetch<Blob>('/api/users/ttd/file', { responseType: 'blob' })
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function previewPdf() {
  const d = data.value
  if (!d) return
  try {
    if (d.html_content) {
      const cfg = parseRenderConfig(d.render_config)
      const html = String(d.html_content).replace(/\{\{%ttd%\}\}/g, '')
      const dataUrl = await renderPdf(html, cfg)
      const blob = await (await fetch(dataUrl)).blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } else if (d.file_drive_id) {
      window.open(`/api/files/${d.file_drive_id}?inline=1`, '_blank')
    } else {
      toast.add({ title: 'Belum ada isi surat untuk dipratinjau', color: 'warning' })
    }
  } catch (e: any) {
    toast.add({ title: 'Gagal membuat pratinjau', description: e?.message || e?.data?.statusMessage || 'Terjadi kesalahan', color: 'error' })
  }
}

async function approveSurat() {
  const d = data.value
  if (!d) return
  approving.value = true
  try {
    const fd = new FormData()
    fd.append('status', 'approved')
    if (d.html_content) {
      const ttdUrl = await getTtdDataUrl()
      if (!ttdUrl) {
        toast.add({
          title: 'Tanda tangan belum diunggah',
          description: 'Unggah tanda tangan Anda di halaman Profil sebelum menyetujui surat.',
          color: 'error'
        })
        return
      }
      const html = String(d.html_content).replace(
        /\{\{%ttd%\}\}/g,
        `<img src="${ttdUrl}" style="height:66px;display:block;margin:0 auto;" />`
      )
      const cfg = parseRenderConfig(d.render_config)
      const dataUrl = await renderPdf(html, cfg)
      const blob = await (await fetch(dataUrl)).blob()
      fd.append('file', new File([blob], `${d.no_surat.replace(/\//g, '-')}.pdf`, { type: 'application/pdf' }))
    }
    await $fetch(`/api/surat-keluar/${id}/approve`, { method: 'POST', body: fd })
    toast.add({ title: 'Surat disetujui', description: 'PDF final dengan tanda tangan telah dibuat.', color: 'success' })
    refresh()
  } catch (e: any) {
    toast.add({ title: 'Gagal menyetujui', description: e?.data?.statusMessage || 'Terjadi kesalahan', color: 'error' })
  } finally {
    approving.value = false
  }
}

async function rejectSurat() {
  rejecting.value = true
  try {
    const fd = new FormData()
    fd.append('status', 'rejected')
    fd.append('catatan', rejectCatatan.value.trim())
    await $fetch(`/api/surat-keluar/${id}/approve`, { method: 'POST', body: fd })
    rejectOpen.value = false
    rejectCatatan.value = ''
    toast.add({ title: 'Surat ditolak', description: 'Staff TU dapat memperbaiki dan mensubmit ulang.', color: 'success' })
    refresh()
  } catch (e: any) {
    toast.add({ title: 'Gagal menolak surat', description: e?.data?.statusMessage || 'Terjadi kesalahan', color: 'error' })
  } finally {
    rejecting.value = false
  }
}

function unduhPdf() {
  const d = data.value
  if (d?.file_drive_id) window.open(`/api/files/${d.file_drive_id}`, '_blank')
  else previewPdf()
}

// Pratinjau HTML inline: pimpinan melihat posisi TTD miliknya saat menunggu persetujuan
const ttdPreviewUrl = ref<string | null>(null)

watch(canDecide, async (v) => {
  if (v && data.value?.html_content && !ttdPreviewUrl.value) {
    ttdPreviewUrl.value = await getTtdDataUrl()
  }
}, { immediate: true })

const previewHtml = computed(() => {
  if (!data.value?.html_content) return ''
  const img = ttdPreviewUrl.value
    ? `<img src="${ttdPreviewUrl.value}" style="height:66px;display:block;margin:0 auto;" />`
    : ''
  return String(data.value.html_content).replace(/\{\{%ttd%\}\}/g, img)
})

const sheetStyle = computed(() => {
  const cfg = parseRenderConfig(data.value?.render_config)
  const [w, h] = PAPER[cfg.ukuranKertas] || PAPER.a4
  const [pw, ph] = cfg.orientasi === 'landscape' ? [Math.max(w, h), Math.min(w, h)] : [w, h]
  const px = (mm: number) => `${((mm * 96) / 25.4).toFixed(1)}px`
  return {
    width: px(pw),
    minHeight: px(ph),
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: px(cfg.marginMm),
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: cfg.font === 'Inter' ? "'Inter',sans-serif" : `'${cfg.font}',serif`,
    fontSize: '12pt',
    lineHeight: '1.6',
    margin: '0 auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    borderRadius: '4px'
  }
})
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
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-[22px] md:text-[24px] font-semibold tracking-tight text-slate-900 dark:text-white">Detail Surat Keluar</h1>
        <span
          v-if="statusMeta[status]"
          class="inline-flex items-center px-2.5 py-1 rounded-full border text-[12px] font-medium"
          :class="statusMeta[status].cls"
        >{{ statusMeta[status].label }}</span>
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
      <div class="flex items-center gap-2 flex-wrap">
        <UButton :to="`/surat-keluar`" variant="outline" size="sm">Kembali</UButton>
        <UButton
          v-if="canSubmit"
          color="primary"
          size="sm"
          icon="i-lucide-send"
          :loading="submitting"
          @click="submitForApproval"
        >Submit untuk Persetujuan</UButton>
        <template v-if="canDecide">
          <UButton variant="outline" size="sm" icon="i-lucide-eye" :disabled="approving" @click="previewPdf">Preview PDF</UButton>
          <UButton color="success" size="sm" icon="i-lucide-check" :loading="approving" @click="approveSurat">Setujui</UButton>
          <UButton color="error" variant="soft" size="sm" icon="i-lucide-x" :disabled="approving" @click="rejectOpen = true">Tolak</UButton>
        </template>
        <UButton v-if="data.file_drive_id" variant="outline" size="sm" icon="i-lucide-download" @click="unduhPdf">Unduh PDF</UButton>
        <UButton v-if="canEdit" variant="outline" size="sm" icon="i-lucide-pen" @click="editOpen = true">Edit</UButton>
        <UButton v-if="isAdminOrCreator" color="error" variant="soft" size="sm" icon="i-lucide-trash" @click="hapus">Hapus</UButton>
      </div>
    </div>

    <!-- Alert penolakan -->
    <UAlert
      v-if="status === 'ditolak'"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Surat ditolak oleh pimpinan"
      :description="data.catatan_tolak || 'Tidak ada catatan penolakan. Perbaiki surat lalu submit ulang untuk persetujuan.'"
    />

    <!-- Alert TTD belum ada (pimpinan) -->
    <UAlert
      v-if="canDecide && !ttdStatus?.exists"
      color="warning"
      variant="soft"
      icon="i-lucide-signature"
      title="Tanda tangan digital belum diunggah"
      description="Unggah tanda tangan Anda di halaman Profil sebelum menyetujui surat."
    />

    <!-- Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 items-start">
      <!-- KOLOM KIRI -->
      <div class="col-span-2 space-y-5">
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
              <span v-if="data.file_drive_id || previewHtml" class="text-[11px] text-slate-400 dark:text-slate-500">1 halaman • A4</span>
            </div>
          </template>
          <!-- Surat disetujui → PDF final bertanda tangan -->
          <FilePreview
            v-if="data.file_drive_id && ['terkirim', 'selesai'].includes(status)"
            :file-id="data.file_drive_id"
            :file-name="data.file_name"
          />
          <!-- Sebelum approve → pratinjau HTML inline -->
          <div v-else-if="previewHtml" class="overflow-auto">
            <div :style="sheetStyle" v-html="previewHtml" />
          </div>
          <!-- Fallback: file tanpa html_content (surat upload) -->
          <FilePreview
            v-else-if="data.file_drive_id"
            :file-id="data.file_drive_id"
            :file-name="data.file_name"
          />
          <p v-else class="py-10 text-center text-sm text-slate-400 dark:text-slate-500">Tidak ada isi surat untuk dipratinjau</p>
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

        <!-- Card Riwayat Persetujuan -->
        <UCard v-if="data.approvals?.length">
          <template #header>
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center dark:bg-slate-800 dark:border-slate-700">
                <UIcon name="i-lucide-history" class="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </span>
              <h3 class="text-[13px] font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300">Riwayat Persetujuan</h3>
            </div>
          </template>
          <div class="space-y-3">
            <div
              v-for="a in data.approvals"
              :key="a.id"
              class="rounded-lg border border-slate-200 p-3 space-y-1 dark:border-slate-700"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-[13px] font-medium text-slate-900 dark:text-white">{{ a.reviewer_nama || '—' }}</span>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium"
                  :class="approvalMeta[a.status]?.cls"
                >{{ approvalMeta[a.status]?.label || a.status }}</span>
              </div>
              <p class="text-[11px] text-slate-400 dark:text-slate-500">
                {{ fmtDateTime(a.reviewed_at) }}<span v-if="a.reviewer_jabatan"> • {{ a.reviewer_jabatan }}</span>
              </p>
              <p v-if="a.catatan" class="text-[12px] italic text-slate-600 dark:text-slate-300">"{{ a.catatan }}"</p>
            </div>
          </div>
        </UCard>

        <div class="px-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>Alur: Buat → Submit → Persetujuan Pimpinan → Arsip</span>
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

    <!-- Modal Tolak -->
    <UModal v-model:open="rejectOpen" title="Tolak Surat" :ui="{ footer: 'justify-end' }">
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-slate-500 dark:text-slate-400">Beri catatan penolakan agar staff TU tahu apa yang perlu diperbaiki.</p>
          <UTextarea
            v-model="rejectCatatan"
            :rows="4"
            class="w-full"
            placeholder="Contoh: Tanggal kegiatan tidak sesuai, mohon direvisi..."
          />
        </div>
      </template>
      <template #footer="{ close }">
        <UButton variant="ghost" @click="close">Batal</UButton>
        <UButton color="error" :loading="rejecting" :disabled="!rejectCatatan.trim()" @click="rejectSurat">Tolak Surat</UButton>
      </template>
    </UModal>
  </div>
</template>
