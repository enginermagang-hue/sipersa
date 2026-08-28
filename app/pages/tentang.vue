<script setup lang="ts">
const appConfig = useAppConfig()
const config = useRuntimeConfig()

const currentYear = new Date().getFullYear()

useSeoMeta({
  title: `Tentang - ${config.public.appName || 'SIPERSA'}`,
  description: 'Informasi tentang Sistem Persuratan dan Arsip Digital - SIPERSA'
})

const breadcrumbItems = [
  { label: 'Beranda', to: '/' },
  { label: 'Tentang' }
]

const fiturList = [
  { label: 'Surat Masuk', desc: 'Pencatatan, penomoran otomatis & pengarsipan surat dari eksternal.', icon: 'i-lucide-inbox', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/50', to: '/surat-masuk' },
  { label: 'Surat Keluar', desc: 'Pembuatan surat keluar dengan alur persetujuan pimpinan.', icon: 'i-lucide-send', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50', to: '/surat-keluar' },
  { label: 'Disposisi', desc: 'Distribusi & tindak lanjut surat dengan notifikasi real-time.', icon: 'i-lucide-share-2', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/50', to: '/disposisi' },
  { label: 'Arsip', desc: 'Klasifikasi, retensi, pencarian & pemusnahan arsip terstruktur.', icon: 'i-lucide-archive', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50', to: '/arsip' },
  { label: 'Laporan', desc: 'Rekapitulasi & export Excel/print untuk kebutuhan audit.', icon: 'i-lucide-file-bar-chart', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/50', to: '/laporan' },
  { label: 'Admin', desc: 'Manajemen user, sesi, klasifikasi & log aktivitas.', icon: 'i-lucide-settings', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800', to: '/admin/users' }
]

const alurList = [
  { step: '01', title: 'Pencatatan', desc: 'Surat masuk/keluar dicatat, nomor otomatis per tahun (NNN/SM-INST/...).', icon: 'i-lucide-file-plus' },
  { step: '02', title: 'Disposisi', desc: 'Pimpinan mendisposisikan surat ke pelaksana dengan instruksi & batas waktu.', icon: 'i-lucide-git-branch' },
  { step: '03', title: 'Tindak Lanjut', desc: 'Pelaksana memproses disposisi, memberi catatan & update status.', icon: 'i-lucide-list-checks' },
  { step: '04', title: 'Arsip', desc: 'Dokumen diarsipkan sesuai klasifikasi & jadwal retensi, siap ditelusuri kembali.', icon: 'i-lucide-archive' }
]

const teknologi = [
  { nama: 'Nuxt 4 + Nitro', ket: 'Fullstack Vue 3 (SSR)', icon: 'i-lucide-layers' },
  { nama: 'Nuxt UI v4 + Tailwind v4', ket: 'Desain sistem & styling', icon: 'i-lucide-palette' },
  { nama: 'Turso / SQLite', ket: 'Database via @libsql/client', icon: 'i-lucide-database' },
  { nama: 'Dropbox API', ket: 'Penyimpanan file surat & arsip', icon: 'i-lucide-hard-drive' },
  { nama: 'Zod + bcryptjs', ket: 'Validasi & keamanan password', icon: 'i-lucide-shield-check' },
  { nama: 'ExcelJS + window.print', ket: 'Export laporan', icon: 'i-lucide-file-down' }
]
</script>

<template>
  <div class="space-y-4">
    <UBreadcrumb :items="breadcrumbItems" />

    <!-- Hero -->
    <UCard class="overflow-hidden">
      <div class="relative -m-6 p-6 sm:p-8 bg-gradient-to-br from-violet-50 via-indigo-50 to-sky-50 dark:from-slate-900 dark:via-violet-950/20 dark:to-indigo-950/30">
        <!-- dekor blob -->
        <div aria-hidden="true" class="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-violet-400/20 to-indigo-400/20 blur-2xl" />
        <div aria-hidden="true" class="pointer-events-none absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-gradient-to-br from-sky-300/20 to-violet-300/20 blur-2xl" />
        <div class="relative flex flex-col gap-6">
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div class="flex items-center gap-3 shrink-0">
              <img src="/ntt.png" alt="Logo NTT" width="48" height="48" class="h-12 w-12 object-contain">
              <img src="/tutwuri.png" alt="Logo Tut Wuri" width="48" height="48" class="h-12 w-12 object-contain">
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight" style="letter-spacing: 4px;">{{ config.public.appName || 'SIPERSA' }}</h1>
                <UBadge color="primary" variant="subtle" size="sm" class="rounded-full">v{{ appConfig.app.version }}</UBadge>
              </div>
              <p class="mt-1 text-sm sm:text-base font-medium text-muted">Sistem Informasi Persuratan dan Arsip Digital</p>
              <p class="mt-2 text-sm text-muted max-w-2xl leading-relaxed">
                Aplikasi manajemen persuratan terpadu untuk pencatatan surat masuk &amp; keluar, disposisi berjenjang,
                klasifikasi &amp; retensi arsip, serta pelaporan — dirancang untuk satu instansi dengan alur yang sederhana dan teraudit.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <UBadge icon="i-lucide-building-2" variant="subtle" color="neutral" size="md" class="rounded-full">
              {{ config.public.instansiUnit || 'UPTD Tekkomdik' }}<template v-if="config.public.instansiSubUnit"> — {{ config.public.instansiSubUnit }}</template>
            </UBadge>
            <UBadge icon="i-lucide-map-pin" variant="subtle" color="neutral" size="md" class="rounded-full">
              {{ config.public.instansiNama || 'Dinas Pendidikan dan Kebudayaan' }} Provinsi NTT
            </UBadge>
            <UBadge icon="i-lucide-copyright" variant="subtle" color="neutral" size="md" class="rounded-full">© {{ currentYear }}</UBadge>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Fitur Utama -->
    <div>
      <h2 class="text-base font-semibold mb-3">Fitur Utama</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="f in fiturList"
          :key="f.label"
          :ui="{ body: 'p-4' }"
          class="hover:shadow-sm transition-shadow"
        >
          <NuxtLink :to="f.to" class="flex gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="[f.bg, f.color]">
              <UIcon :name="f.icon" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold">{{ f.label }}</div>
              <div class="text-xs text-muted mt-1 leading-relaxed">{{ f.desc }}</div>
            </div>
          </NuxtLink>
        </UCard>
      </div>
    </div>

    <!-- Alur Kerja -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-route" class="w-4 h-4 text-muted" />
          <span class="font-semibold text-sm">Alur Kerja Sederhana</span>
        </div>
      </template>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="a in alurList"
          :key="a.step"
          class="relative rounded-xl border border-default bg-elevated/30 p-4"
        >
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold">{{ a.step }}</span>
            <UIcon :name="a.icon" class="w-4 h-4 text-muted" />
            <span class="text-sm font-semibold">{{ a.title }}</span>
          </div>
          <p class="text-xs text-muted leading-relaxed">{{ a.desc }}</p>
        </div>
      </div>
      <p class="text-[11px] text-muted mt-3">
        Penomoran otomatis: <span class="font-mono font-medium">NNN/SM-INST/ROMAN/TAHUN</span> (masuk) &amp;
        <span class="font-mono font-medium">NNN/SK-INST/...</span> (keluar). Soft delete dengan <span class="font-mono">deleted_at</span>, semua daftar filter <span class="font-mono">IS NULL</span>.
      </p>
    </UCard>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- Informasi Instansi -->
      <UCard class="lg:col-span-7">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-building" class="w-4 h-4 text-muted" />
            <span class="font-semibold text-sm">Informasi Instansi</span>
          </div>
        </template>
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <p class="text-[11px] font-medium text-muted uppercase tracking-wider">Instansi</p>
              <p class="mt-1 font-medium">{{ config.public.instansiNama || 'Dinas Pendidikan dan Kebudayaan' }}</p>
              <p class="text-xs text-muted">Provinsi Nusa Tenggara Timur</p>
            </div>
            <div>
              <p class="text-[11px] font-medium text-muted uppercase tracking-wider">Unit</p>
              <p class="mt-1 font-medium">{{ config.public.instansiUnit || 'UPTD Tekkomdik' }}</p>
              <p v-if="config.public.instansiSubUnit" class="text-xs text-muted">{{ config.public.instansiSubUnit }}</p>
              <p v-else class="text-xs text-muted">Teknologi Komunikasi Pendidikan</p>
            </div>
            <div class="sm:col-span-2">
              <p class="text-[11px] font-medium text-muted uppercase tracking-wider">Alamat</p>
              <p class="mt-1 text-sm leading-relaxed">{{ config.public.instansiAlamat || 'Kupang, Nusa Tenggara Timur' }}</p>
            </div>
          </div>
          <USeparator />
          <div class="flex flex-wrap gap-2 text-xs">
            <span class="inline-flex items-center gap-1.5 text-muted"><UIcon name="i-lucide-mail" class="w-3.5 h-3.5" /> Sistem persuratan internal</span>
            <span class="hidden sm:inline text-muted">•</span>
            <span class="inline-flex items-center gap-1.5 text-muted"><UIcon name="i-lucide-lock" class="w-3.5 h-3.5" /> Akses berbasis peran (admin / staff_tu / pimpinan)</span>
          </div>
        </div>
      </UCard>

      <!-- Teknologi -->
      <UCard class="lg:col-span-5">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-cpu" class="w-4 h-4 text-muted" />
            <span class="font-semibold text-sm">Teknologi</span>
          </div>
        </template>
        <ul class="space-y-2.5">
          <li v-for="t in teknologi" :key="t.nama" class="flex items-start gap-3">
            <div class="mt-0.5 w-7 h-7 rounded-lg bg-elevated flex items-center justify-center shrink-0">
              <UIcon :name="t.icon" class="w-3.5 h-3.5 text-muted" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium leading-none">{{ t.nama }}</p>
              <p class="text-xs text-muted mt-1">{{ t.ket }}</p>
            </div>
          </li>
        </ul>
        <USeparator class="my-3" />
        <p class="text-[11px] text-muted leading-relaxed">
          File disimpan di Dropbox (<span class="font-mono">file_drive_id</span>), metadata di Turso. Upload via
          <span class="font-mono">readFormWithFile()</span> (multipart), body limit 25 MB.
        </p>
      </UCard>
    </div>

    <!-- Tentang Aplikasi + Bantuan -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <UCard class="lg:col-span-8">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-info" class="w-4 h-4 text-muted" />
            <span class="font-semibold text-sm">Tentang Aplikasi</span>
          </div>
        </template>
        <div class="space-y-3 text-sm leading-relaxed text-muted">
          <p>
            <span class="font-semibold text-default">{{ config.public.appName || 'SIPERSA' }}</span> membantu tata kelola surat agar tertib,
            teraudit, dan mudah ditelusuri. Setiap aksi penting (login, CRUD surat, disposisi, revoke sesi) dicatat di
            <span class="font-mono text-xs">activity_log</span> melalui <span class="font-mono text-xs">logActivity()</span>.
          </p>
          <p>
            Peran: <UBadge size="xs" variant="subtle">admin</UBadge> kelola user &amp; klasifikasi,
            <UBadge size="xs" variant="subtle" color="success">staff_tu</UBadge> kelola persuratan harian,
            <UBadge size="xs" variant="subtle" color="warning">pimpinan</UBadge> persetujuan &amp; disposisi.
          </p>
          <p class="text-xs">
            Login mendukung akun lokal (username/password) dan Google OAuth 2.0 (hanya email terdaftar). Sesi disimpan sebagai cookie
            <span class="font-mono">sid</span> httpOnly.
          </p>
        </div>
      </UCard>

      <UCard class="lg:col-span-4">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-life-buoy" class="w-4 h-4 text-muted" />
            <span class="font-semibold text-sm">Bantuan</span>
          </div>
        </template>
        <div class="space-y-3">
          <p class="text-sm text-muted leading-relaxed">Butuh bantuan atau menemukan kendala?</p>
          <div class="flex flex-col gap-2">
            <UButton to="/profil" icon="i-lucide-user" variant="outline" block>Lihat Profil Saya</UButton>
            <UButton to="/" icon="i-lucide-layout-dashboard" variant="ghost" block>Kembali ke Dashboard</UButton>
          </div>
          <p class="text-[11px] text-muted text-center">Hubungi admin instansi untuk reset password atau pendaftaran akun Google.</p>
        </div>
      </UCard>
    </div>

    <div class="text-center text-xs text-muted py-2">
      © {{ currentYear }} {{ config.public.appName || 'SIPERSA' }} — v{{ appConfig.app.version }} • Sistem Informasi Persuratan dan Arsip
    </div>
  </div>
</template>
