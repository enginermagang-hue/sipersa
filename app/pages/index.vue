<script setup lang="ts">
const { user } = useAuth()
const { data, pending, isInitialLoading, isRefreshing, refresh, period, klasifikasiId } = useDashboard()
const { data: klasifikasi } = await useFetch('/api/klasifikasi', { headers: useRequestHeaders(['cookie']) as any })
const klasOptions = computed(() => [{ label:'Semua Klasifikasi', value:null }, ...((klasifikasi.value as any[])||[]).map((k:any)=>({label: k.nama, value:k.id}))])
const aksiItems = computed(() => {
  if (user.value?.role === 'pimpinan') return []
  return [[
    { label: 'Surat Masuk', icon: 'i-lucide-plus', to: '/surat-masuk' },
    { label: 'Surat Keluar', icon: 'i-lucide-plus', to: '/surat-keluar' },
    { label: 'Disposisi', icon: 'i-lucide-share-2', to: '/disposisi' },
  ], [{ label: 'Export Laporan', icon: 'i-lucide-download', to: '/laporan' }]]
})
</script>
<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2 justify-between items-center">
      <div><h1 class="text-xl font-bold">Selamat datang, {{ user?.nama }}</h1><p class="text-muted text-sm">Ringkasan persuratan instansi.</p></div>
      <div class="flex gap-2">
        <USelect v-model="period" :items="[{label:'3 Bulan',value:3},{label:'6 Bulan',value:6},{label:'9 Bulan',value:9},{label:'12 Bulan',value:12}]" size="sm" class="w-28" />
        <USelect v-model="klasifikasiId" :items="klasOptions" value-key="value" label-key="label" size="sm" class="w-48" placeholder="Filter klasifikasi" />
        <div class="flex items-center gap-2"><UIcon v-if="isRefreshing" name="i-lucide-loader-2" class="animate-spin text-muted" /><UButton icon="i-lucide-refresh-cw" size="sm" variant="outline" :loading="isRefreshing" @click="refresh()">Refresh</UButton><UDropdownMenu v-if="aksiItems.length" :items="aksiItems" :content="{ align: 'end' }"><UButton icon="i-lucide-zap" trailing-icon="i-lucide-chevron-down" size="sm">Aksi Cepat</UButton></UDropdownMenu></div>
      </div>
    </div>

    <div v-if="isInitialLoading" class="grid grid-cols-2 lg:grid-cols-4 gap-4"><USkeleton v-for="i in 8" :key="i" class="h-24" /></div>
    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="c in [
        {label:'Surat Masuk', value:data?.kpi.masuk, icon:'i-lucide-inbox', bg:'bg-sky-50 dark:bg-sky-950/50', color:'text-sky-600 dark:text-sky-400', to:'/surat-masuk'},
        {label:'Surat Keluar', value:data?.kpi.keluar, icon:'i-lucide-send', bg:'bg-emerald-50 dark:bg-emerald-950/50', color:'text-emerald-600 dark:text-emerald-400', to:'/surat-keluar'},
        {label:'Arsip', value:data?.kpi.arsip, icon:'i-lucide-archive', bg:'bg-amber-50 dark:bg-amber-950/50', color:'text-amber-600 dark:text-amber-400', to:'/arsip'},
        {label:'Disposisi Saya', value:data?.kpi.disposisiSaya, icon:'i-lucide-share-2', bg:'bg-violet-50 dark:bg-violet-950/50', color:'text-violet-600 dark:text-violet-400', to:'/disposisi'},
        {label:'Disposisi Lewat', value:data?.kpi.disposisiOverdue, icon:'i-lucide-alarm-clock-off', bg:'bg-red-50 dark:bg-red-950/50', color:'text-red-600 dark:text-red-400', to:'/disposisi'},
        {label:'Masuk Hari Ini', value:data?.kpi.masukHariIni, icon:'i-lucide-calendar', bg:'bg-blue-50 dark:bg-blue-950/50', color:'text-blue-600 dark:text-blue-400', to:'/surat-masuk'},
        {label:'Keluar Pending', value:data?.kpi.keluarPending, icon:'i-lucide-clock', bg:'bg-orange-50 dark:bg-orange-950/50', color:'text-orange-600 dark:text-orange-400', to:'/surat-keluar'},
        {label:'Arsip Bulan Ini', value:data?.kpi.arsipBulan, icon:'i-lucide-folder', bg:'bg-slate-100 dark:bg-slate-800', color:'text-slate-600 dark:text-slate-300', to:'/arsip'},
      ]" :key="c.label" :ui="{ body: 'p-4' }" class="hover:shadow-sm transition-shadow">
        <NuxtLink :to="c.to" class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ c.label }}</div><div class="text-3xl font-bold mt-1">{{ c.value ?? 0 }}</div></div><div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="[c.bg, c.color]"><UIcon :name="c.icon" class="w-5 h-5" /></div></NuxtLink>
      </UCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div class="lg:col-span-8"><DashboardTrendChart :trend="data?.trend||[]" :pending="pending" /></div>
      <div class="lg:col-span-4">
        <UCard><template #header><span class="font-semibold">Status Disposisi</span></template>
          <div class="space-y-2 text-sm"><div class="flex justify-between"><span>Baru</span><UBadge>{{ (data?.disposisiStats as any)?.baru ?? 0 }}</UBadge></div><div class="flex justify-between"><span>Diproses</span><UBadge color="warning">{{ (data?.disposisiStats as any)?.diproses ?? 0 }}</UBadge></div><div class="flex justify-between"><span>Selesai</span><UBadge color="success">{{ (data?.disposisiStats as any)?.selesai ?? 0 }}</UBadge></div><div class="flex justify-between"><span>Lewat Batas</span><UBadge color="error">{{ (data?.disposisiStats as any)?.lewat ?? 0 }}</UBadge></div></div>
        </UCard>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <DashboardDisposisiPending :items="(data?.pendingList as any[])||[]" :pending="isInitialLoading" />
      <DashboardRecentSuratMasuk :items="(data?.recentMasuk as any[])||[]" :pending="isInitialLoading" />
    </div>

    <DashboardApprovalQueue v-if="user?.role==='pimpinan' || user?.role==='admin'" :items="(data?.approvalQueue as any[])||[]" :pending="isInitialLoading" />

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <DashboardKlasifikasiArsip class="lg:col-span-8" :items="(data?.klasifikasiDist as any[])||[]" :pending="isInitialLoading" />
      <DashboardAktivitasTerbaru class="lg:col-span-4" :items="(data?.aktivitas as any[])||[]" :pending="isInitialLoading" />
    </div>

    <DashboardBatasWaktu :items="(data?.batasWaktu as any[])||[]" :pending="isInitialLoading" />
  </div>
</template>
