<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const { user, fetchMe } = useAuth()
const toast = useToast()

const editModalOpen = ref(false)
const passwordModalOpen = ref(false)
const loading = ref(false)
const savingPw = ref(false)
const revoking = ref(false)

const isPimpinan = computed(() => user.value?.role === 'pimpinan')
const ttdStatus = ref<{ exists: boolean; file_name: string | null } | null>(null)
const ttdFile = ref<File | null>(null)
const ttdUploading = ref(false)
const ttdPreviewUrl = ref('')

async function muatTtd() {
  if (!isPimpinan.value) return
  try {
    ttdStatus.value = await $fetch('/api/users/ttd')
    if (ttdStatus.value?.exists) {
      const blob = await $fetch<Blob>('/api/users/ttd/file', { responseType: 'blob' })
      ttdPreviewUrl.value = URL.createObjectURL(blob)
    }
  } catch {
    ttdStatus.value = { exists: false, file_name: null }
  }
}

function onTtdPick(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] || null
  if (f && !f.type.startsWith('image/')) {
    toast.add({ title: 'File harus berupa gambar (PNG/JPG)', color: 'error' })
    input.value = ''
    return
  }
  if (f && f.size > 2 * 1024 * 1024) {
    toast.add({ title: 'Ukuran gambar maksimal 2 MB', color: 'error' })
    input.value = ''
    return
  }
  ttdFile.value = f
}

async function uploadTtd() {
  if (!ttdFile.value) return
  ttdUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', ttdFile.value)
    await $fetch('/api/users/upload-ttd', { method: 'POST', body: fd })
    toast.add({ title: 'Tanda tangan berhasil diunggah', color: 'success' })
    ttdFile.value = null
    await muatTtd()
  } catch (e: any) {
    toast.add({ title: e?.data?.statusMessage || 'Gagal mengunggah tanda tangan', color: 'error' })
  } finally {
    ttdUploading.value = false
  }
}

const form = reactive({
  nama: '',
  username: '',
  email: '',
  no_hp: '',
  unit_kerja: '',
  jabatan: ''
})

const pwForm = reactive({
  password: '',
  konfirmasi: ''
})

const activity = reactive({
  stats: {
    totalKeluar: 0,
    terarsip: 0,
    belumDiarsipkan: 0,
    progress: 0
  },
  activities: [] as Array<{ id: number; label: string; ref?: string; createdAt: string; entityId?: number | null }>
})

const avatarUrl = computed(() => user.value
  ? `https://api.dicebear.com/10.x/initial-face/svg?seed=${encodeURIComponent(user.value.nama)}&radius=50`
  : '')

const breadcrumbItems = computed(() => [
  { label: 'Beranda', to: '/' },
  { label: 'Profil', to: '/profil' }
])

function validate(): FormError[] {
  const errors: FormError[] = []
  if (!form.nama.trim()) errors.push({ name: 'nama', message: 'Nama wajib diisi' })
  if (!form.username.trim()) errors.push({ name: 'username', message: 'Username wajib diisi' })
  return errors
}

function validatePassword(): FormError[] {
  const errors: FormError[] = []
  if (!pwForm.password || pwForm.password.length < 4) errors.push({ name: 'password', message: 'Password minimal 4 karakter' })
  if (!pwForm.konfirmasi) errors.push({ name: 'konfirmasi', message: 'Konfirmasi password wajib diisi' })
  else if (pwForm.konfirmasi !== pwForm.password) errors.push({ name: 'konfirmasi', message: 'Konfirmasi password tidak sama' })
  return errors
}

function openEditModal() {
  if (user.value) {
    form.nama = user.value.nama || ''
    form.username = user.value.username || ''
    form.email = user.value.email || ''
    form.no_hp = user.value.no_hp || ''
    form.unit_kerja = user.value.unit_kerja || ''
    form.jabatan = user.value.jabatan || ''
  }
  editModalOpen.value = true
}

function openPasswordModal() {
  pwForm.password = ''
  pwForm.konfirmasi = ''
  passwordModalOpen.value = true
}

async function simpanProfil() {
  loading.value = true
  try {
    const body: Record<string, any> = {
      nama: form.nama,
      username: form.username,
      email: form.email,
      no_hp: form.no_hp || null,
      unit_kerja: form.unit_kerja || null,
      jabatan: form.jabatan || null
    }
    const res: any = await $fetch('/api/auth/profile', { method: 'PUT', body })
    if (res.user) {
      user.value = { ...user.value, ...res.user }
    }
    editModalOpen.value = false
    toast.add({ title: 'Profil berhasil diperbarui', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.statusMessage || 'Gagal memperbarui profil', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function simpanPassword() {
  savingPw.value = true
  try {
    await $fetch('/api/auth/profile', { method: 'PUT', body: { password: pwForm.password } })
    pwForm.password = ''
    pwForm.konfirmasi = ''
    passwordModalOpen.value = false
    toast.add({ title: 'Password berhasil diubah', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.statusMessage || 'Gagal mengubah password', color: 'error' })
  } finally {
    savingPw.value = false
  }
}

async function revokeAllSessions() {
  revoking.value = true
  try {
    await $fetch('/api/profil/sessions/revoke-all', { method: 'POST' })
    toast.add({ title: 'Semua sesi lain telah dikeluarkan', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.statusMessage || 'Gagal mengeluarkan sesi', color: 'error' })
  } finally {
    revoking.value = false
  }
}

async function updateNotifikasi(value?: boolean) {
  const val = value ?? !user.value?.email_notifikasi
  try {
    const body: Record<string, any> = { email_notifikasi: val }
    const res: any = await $fetch('/api/auth/profile', { method: 'PUT', body })
    if (res.user) {
      user.value = { ...user.value, ...res.user }
    }
    toast.add({ title: 'Preferensi notifikasi diperbarui', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.statusMessage || 'Gagal memperbarui notifikasi', color: 'error' })
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return value
  }
}

function formatActivityDate(value?: string | null) {
  if (!value) return ''
  try {
    const date = new Date(value)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Hari ini ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Kemarin ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  } catch {
    return value
  }
}

const ACTIVITY_META: Record<string, { label: string; icon: string; tone: string }> = {
  LOGIN: { label: 'Login', icon: 'i-lucide-log-in', tone: 'text-success bg-success/10' },
  LOGOUT: { label: 'Logout', icon: 'i-lucide-log-out', tone: 'text-muted bg-elevated' },
  UPDATE_PROFILE: { label: 'Perbarui Profil', icon: 'i-lucide-user-pen', tone: 'text-info bg-info/10' },
  UPLOAD_TTD: { label: 'Unggah Tanda Tangan', icon: 'i-lucide-signature', tone: 'text-info bg-info/10' },
  CREATE_SURAT_MASUK: { label: 'Buat Surat Masuk', icon: 'i-lucide-inbox', tone: 'text-success bg-success/10' },
  UPDATE_SURAT_MASUK: { label: 'Edit Surat Masuk', icon: 'i-lucide-pencil-line', tone: 'text-primary bg-primary/10' },
  DELETE_SURAT_MASUK: { label: 'Hapus Surat Masuk', icon: 'i-lucide-trash-2', tone: 'text-error bg-error/10' },
  EXPORT_SURAT_MASUK: { label: 'Ekspor Surat Masuk', icon: 'i-lucide-file-down', tone: 'text-muted bg-elevated' },
  CREATE_SURAT_KELUAR: { label: 'Buat Surat Keluar', icon: 'i-lucide-file-plus', tone: 'text-success bg-success/10' },
  SUBMIT_SURAT_KELUAR: { label: 'Kirim Surat Keluar', icon: 'i-lucide-send', tone: 'text-primary bg-primary/10' },
  UPDATE_SURAT_KELUAR: { label: 'Edit Surat Keluar', icon: 'i-lucide-file-pen-line', tone: 'text-primary bg-primary/10' },
  DELETE_SURAT_KELUAR: { label: 'Hapus Surat Keluar', icon: 'i-lucide-trash-2', tone: 'text-error bg-error/10' },
  EXPORT_SURAT_KELUAR: { label: 'Ekspor Surat Keluar', icon: 'i-lucide-file-down', tone: 'text-muted bg-elevated' },
  CREATE_DISPOSISI: { label: 'Buat Disposisi', icon: 'i-lucide-git-branch', tone: 'text-success bg-success/10' },
  UPDATE_DISPOSISI: { label: 'Perbarui Disposisi', icon: 'i-lucide-refresh-cw', tone: 'text-primary bg-primary/10' },
  FORWARD_DISPOSISI: { label: 'Teruskan Disposisi', icon: 'i-lucide-corner-down-right', tone: 'text-primary bg-primary/10' },
  EXPORT_DISPOSISI: { label: 'Ekspor Disposisi', icon: 'i-lucide-file-down', tone: 'text-muted bg-elevated' },
  CREATE_ARSIP: { label: 'Arsipkan Dokumen', icon: 'i-lucide-archive', tone: 'text-success bg-success/10' },
  UPDATE_ARSIP: { label: 'Edit Arsip', icon: 'i-lucide-pencil-line', tone: 'text-primary bg-primary/10' },
  DELETE_ARSIP: { label: 'Hapus Arsip', icon: 'i-lucide-trash-2', tone: 'text-error bg-error/10' },
  RESTORE_ARSIP: { label: 'Pulihkan Arsip', icon: 'i-lucide-archive-restore', tone: 'text-success bg-success/10' },
  DESTROY_ARSIP: { label: 'Pemusnahan Arsip', icon: 'i-lucide-archive-x', tone: 'text-error bg-error/10' },
  CREATE_USER: { label: 'Tambah User', icon: 'i-lucide-user-plus', tone: 'text-success bg-success/10' },
  UPDATE_USER: { label: 'Edit User', icon: 'i-lucide-user-pen', tone: 'text-primary bg-primary/10' },
  DELETE_USER: { label: 'Hapus User', icon: 'i-lucide-user-minus', tone: 'text-error bg-error/10' },
  CREATE_KLASIFIKASI: { label: 'Tambah Klasifikasi', icon: 'i-lucide-tags', tone: 'text-success bg-success/10' },
  UPDATE_KLASIFIKASI: { label: 'Edit Klasifikasi', icon: 'i-lucide-tags', tone: 'text-primary bg-primary/10' },
  DELETE_KLASIFIKASI: { label: 'Hapus Klasifikasi', icon: 'i-lucide-trash-2', tone: 'text-error bg-error/10' },
  EXPORT_LAPORAN: { label: 'Ekspor Laporan', icon: 'i-lucide-file-bar-chart', tone: 'text-muted bg-elevated' }
}

function activityMeta(action: string) {
  return ACTIVITY_META[action] || { label: action.replace(/_/g, ' '), icon: 'i-lucide-activity', tone: 'text-muted bg-elevated' }
}

function activityLink(item: { label: string; entityId?: number | null }): string | null {
  if (!item.entityId) return null
  if (/^(CREATE|UPDATE|SUBMIT)_SURAT_KELUAR$/.test(item.label)) return `/surat-keluar/${item.entityId}`
  return null
}

const timelineItems = computed(() => activity.activities.map((item) => ({
  ...item,
  meta: activityMeta(item.label),
  to: activityLink(item)
})))

watchEffect(() => {
  if (user.value) {
    form.nama = user.value.nama || ''
    form.username = user.value.username || ''
    form.email = user.value.email || ''
    form.no_hp = user.value.no_hp || ''
    form.unit_kerja = user.value.unit_kerja || ''
    form.jabatan = user.value.jabatan || ''
  }
})

onMounted(async () => {
  if (!user.value) await fetchMe()
  muatTtd()
  try {
    const data: any = await $fetch('/api/profil/activity')
    activity.stats = data?.stats || activity.stats
    activity.activities = data?.activities || []
  } catch {
    // fallback: tampilkan kosong
  }
})
</script>

<template>
  <div class="space-y-4">
    <UBreadcrumb :items="breadcrumbItems" />

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div class="lg:col-span-7 space-y-4">
        <UCard class="overflow-hidden">
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <UAvatar :src="avatarUrl" :alt="user?.nama" size="lg" class="ring-2 ring-default" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-xl font-bold">{{ user?.nama }}</h1>
                <UBadge v-if="user?.status === 'active'" color="success" variant="subtle" size="xs">Aktif</UBadge>
              </div>
              <p class="text-sm text-muted">{{ user?.jabatan }} - {{ user?.unit_kerja }}</p>
              <p class="text-xs text-muted">{{ user?.email }}</p>
            </div>
            <UButton icon="i-lucide-pencil" size="sm" @click="openEditModal">Edit Profil</UButton>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-base font-semibold">Informasi Akun</h2>
            <UButton variant="ghost" size="xs" icon="i-lucide-pencil" @click="openEditModal">Edit</UButton>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            <div>
              <p class="text-[11px] font-medium text-muted uppercase tracking-wider">Nama Lengkap</p>
              <p class="mt-0.5 text-sm">{{ user?.nama || '-' }}</p>
              <p v-if="user?.nip" class="text-xs text-muted">{{ user?.nip }}</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-muted uppercase tracking-wider">Username</p>
              <p class="mt-0.5 text-sm">{{ user?.username || '-' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-muted uppercase tracking-wider">Email Dinas</p>
              <p class="mt-0.5 text-sm break-all">{{ user?.email || '-' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-muted uppercase tracking-wider">No. HP</p>
              <p class="mt-0.5 text-sm">{{ user?.no_hp || '-' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-muted uppercase tracking-wider">Unit Kerja</p>
              <p class="mt-0.5 text-sm">{{ user?.unit_kerja || '-' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-muted uppercase tracking-wider">Bergabung</p>
              <p class="mt-0.5 text-sm">{{ formatDate(user?.tanggal_bergabung) }}</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <h2 class="text-base font-semibold mb-3">Keamanan</h2>          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">Password</p>
                <p class="text-xs text-muted">••••••••</p>
              </div>
              <UButton variant="outline" size="xs" @click="openPasswordModal">Ganti Password</UButton>
            </div>

            <USeparator class="my-2" />

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">Notifikasi Email</p>
                <p class="text-xs text-muted">Kirim ringkasan arsip harian</p>
              </div>
              <USwitch
                :model-value="!!user?.email_notifikasi"
                @update:model-value="async (val) => { await updateNotifikasi(val) }"
              />
            </div>

            <USeparator class="my-2" />

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">Sesi Perangkat</p>
                <p class="text-xs text-muted">Kelola perangkat yang login</p>
              </div>
              <UButton variant="outline" size="xs" :loading="revoking" @click="revokeAllSessions">Keluar semua</UButton>
            </div>
          </div>
        </UCard>

        <!-- Tanda Tangan Digital (pimpinan) -->
        <UCard v-if="isPimpinan">
          <h2 class="text-base font-semibold mb-1">Tanda Tangan Digital</h2>
          <p class="text-xs text-muted mb-3">Dipakai otomatis saat Anda menyetujui surat keluar. Format PNG transparan, rasio 2:1, maks. 2 MB.</p>
          <div v-if="ttdStatus?.exists && ttdPreviewUrl" class="space-y-3">
            <div class="inline-block rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-600">
              <img :src="ttdPreviewUrl" alt="Tanda tangan" class="h-16 object-contain" />
            </div>
            <p class="text-[11px] text-muted">{{ ttdStatus.file_name }}</p>
            <label class="inline-flex">
              <input type="file" accept="image/png,image/jpeg" class="hidden" @change="onTtdPick" />
              <span class="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-default px-2.5 py-1 text-xs font-medium hover:bg-elevated">
                <UIcon name="i-lucide-refresh-cw" class="w-3.5 h-3.5" /> Ganti Tanda Tangan
              </span>
            </label>
            <div v-if="ttdFile" class="flex items-center gap-2 pt-1">
              <span class="text-xs text-muted">{{ ttdFile.name }}</span>
              <UButton size="xs" :loading="ttdUploading" @click="uploadTtd">Simpan</UButton>
            </div>
          </div>
          <div v-else class="space-y-3">
            <div class="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-600">
              <UIcon name="i-lucide-signature" class="w-8 h-8 mx-auto text-muted mb-2" />
              <p class="text-sm text-muted">Belum ada tanda tangan</p>
            </div>
            <label class="inline-flex">
              <input type="file" accept="image/png,image/jpeg" class="hidden" @change="onTtdPick" />
              <span class="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-inverted">
                <UIcon name="i-lucide-upload" class="w-3.5 h-3.5" /> Pilih Gambar Tanda Tangan
              </span>
            </label>
            <div v-if="ttdFile" class="flex items-center gap-2">
              <span class="text-xs text-muted">{{ ttdFile.name }}</span>
              <UButton size="xs" :loading="ttdUploading" @click="uploadTtd">Upload</UButton>
            </div>
          </div>
        </UCard>
      </div>

      <div class="lg:col-span-5 space-y-4">
        <UCard>
          <h2 class="text-[14px] font-semibold tracking-tight mb-4">Aktivitas Saya</h2>
          <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="rounded-lg bg-elevated/50 px-2 py-3 text-center">
              <UIcon name="i-lucide-file-plus" class="size-4 mx-auto text-primary mb-1.5" />
              <p class="text-lg font-bold leading-none">{{ activity.stats.totalKeluar }}</p>
              <p class="text-[11px] text-muted mt-1.5">Surat Keluar</p>
            </div>
            <div class="rounded-lg bg-elevated/50 px-2 py-3 text-center">
              <UIcon name="i-lucide-archive" class="size-4 mx-auto text-success mb-1.5" />
              <p class="text-lg font-bold leading-none">{{ activity.stats.terarsip }}</p>
              <p class="text-[11px] text-muted mt-1.5">Terarsip</p>
            </div>
            <div class="rounded-lg bg-elevated/50 px-2 py-3 text-center">
              <UIcon name="i-lucide-inbox" class="size-4 mx-auto text-warning mb-1.5" />
              <p class="text-lg font-bold leading-none">{{ activity.stats.belumDiarsipkan }}</p>
              <p class="text-[11px] text-muted mt-1.5">Belum Diarsip</p>
            </div>
          </div>

          <div class="mb-5">
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="font-medium">Progres Arsip</span>
              <span class="text-muted">{{ activity.stats.progress }}%</span>
            </div>
            <UProgress :value="activity.stats.progress" size="sm" />
          </div>

          <h3 class="text-[11px] font-medium uppercase tracking-wider text-muted mb-3">Riwayat Terbaru</h3>
          <ol v-if="timelineItems.length" class="max-h-72 overflow-y-auto pr-1">
            <li v-for="(item, idx) in timelineItems" :key="item.id" class="relative flex gap-3 pb-4 last:pb-0">
              <span v-if="idx < timelineItems.length - 1" aria-hidden="true" class="absolute left-[11px] top-7 bottom-0 w-px bg-accented" />
              <span class="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ring-1 ring-default" :class="item.meta.tone">
                <UIcon :name="item.meta.icon" class="size-3.5 shrink-0" />
              </span>
              <div class="min-w-0 pt-0.5">
                <p class="text-sm leading-snug">
                  <NuxtLink v-if="item.to" :to="item.to" class="hover:text-primary hover:underline">{{ item.meta.label }}</NuxtLink>
                  <template v-else>{{ item.meta.label }}</template>
                  <span v-if="item.ref" class="ml-1.5 font-mono text-xs text-muted">{{ item.ref }}</span>
                </p>
                <p class="text-[11px] text-muted mt-0.5">{{ formatActivityDate(item.createdAt) }}</p>
              </div>
            </li>
          </ol>
          <div v-else class="rounded-lg border border-dashed border-default p-4 text-center">
            <UIcon name="i-lucide-activity" class="size-6 mx-auto text-muted mb-1" />
            <p class="text-xs text-muted">Belum ada aktivitas.</p>
          </div>
        </UCard>

        <UCard class="rounded-xl">
          <h2 class="text-[14px] font-semibold tracking-tight mb-3">Pintasan</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UButton to="/surat-keluar" variant="outline" class="justify-start h-auto py-2.5 px-3" icon="i-lucide-file-plus">
              <div class="text-left">
                <p class="text-sm font-medium leading-tight">Buat Surat Keluar</p>
                <p class="text-[11px] text-muted leading-tight">Alur 1: Buat → Arsipkan</p>
              </div>
            </UButton>
            <UButton to="/arsip" variant="outline" class="justify-start h-auto py-2.5 px-3" icon="i-lucide-archive">
              <div class="text-left">
                <p class="text-sm font-medium leading-tight">Lihat Arsip Saya</p>
                <p class="text-[11px] text-muted leading-tight">{{ activity.stats.terarsip }} surat terarsip</p>
              </div>
            </UButton>
          </div>
          <p class="text-[11px] text-muted mt-3">Alur simple: fokus hanya buat & arsip</p>
        </UCard>
      </div>
    </div>

    <UModal v-model:open="editModalOpen" title="Edit Profil">
      <template #body>
        <UForm :state="form" :validate="validate" class="space-y-4" @submit="simpanProfil">
          <UFormField label="Nama" name="nama">
            <UInput v-model="form.nama" class="w-full" />
          </UFormField>
          <UFormField label="Username" name="username">
            <UInput v-model="form.username" class="w-full" />
          </UFormField>
          <UFormField label="Email" name="email">
            <UInput v-model="form.email" class="w-full" />
          </UFormField>
          <UFormField label="No. HP" name="no_hp">
            <UInput v-model="form.no_hp" class="w-full" />
          </UFormField>
          <UFormField label="Unit Kerja" name="unit_kerja">
            <UInput v-model="form.unit_kerja" class="w-full" />
          </UFormField>
          <UFormField label="Jabatan" name="jabatan">
            <UInput v-model="form.jabatan" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="editModalOpen = false">Batal</UButton>
            <UButton type="submit" :loading="loading">Simpan</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="passwordModalOpen" title="Ganti Password">
      <template #body>
        <UForm :state="pwForm" :validate="validatePassword" class="space-y-4" @submit="simpanPassword">
          <UFormField label="Password Baru" name="password">
            <UInput v-model="pwForm.password" type="password" class="w-full" />
          </UFormField>
          <UFormField label="Konfirmasi Password Baru" name="konfirmasi">
            <UInput v-model="pwForm.konfirmasi" type="password" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="passwordModalOpen = false">Batal</UButton>
            <UButton type="submit" :loading="savingPw">Simpan Password</UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
