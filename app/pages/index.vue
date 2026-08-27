<script setup lang="ts">
const { user } = useAuth()
const { data, pending, isInitialLoading, isRefreshing, refresh, period, klasifikasiId } = useDashboard()
const { data: klasifikasi } = await useFetch('/api/klasifikasi', { headers: useRequestHeaders(['cookie']) as any })
const klasOptions = computed(() => [{ label:'Semua Klasifikasi', value:null }, ...((klasifikasi.value as any[])||[]).map((k:any)=>({label: k.nama, value:k.id}))])
</script>
<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2 justify-between items-center">
      <div><h1 class="text-xl font-bold">Selamat datang, {{ user?.nama }}</h1><p class="text-muted text-sm">Ringkasan persuratan instansi.</p></div>
      <div class="flex gap-2">
        <USelect v-model="period" :items="[{label:'3 Bulan',value:3},{label:'6 Bulan',value:6},{label:'9 Bulan',value:9},{label:'12 Bulan',value:12}]" size="sm" class="w-28" />
        <USelect v-model="klasifikasiId" :items="klasOptions" value-key="value" label-key="label" size="sm" class="w-48" placeholder="Filter klasifikasi" />
        <div class="flex items-center gap-2"><UIcon v-if="isRefreshing" name="i-lucide-loader-2" class="animate-spin text-muted" /><UButton icon="i-lucide-refresh-cw" size="sm" variant="outline" :loading="isRefreshing" @click="refresh()">Refresh</UButton></div>
      </div>
    </div>

    <div v-if="isInitialLoading" class="grid grid-cols-2 lg:grid-cols-4 gap-4"><USkeleton v-for="i in 8" :key="i" class="h-24" /></div>
    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="c in [
        {label:'Surat Masuk', value:data?.kpi.masuk, icon:'i-lucide-inbox', color:'text-sky-500', to:'/surat-masuk'},
        {label:'Surat Keluar', value:data?.kpi.keluar, icon:'i-lucide-send', color:'text-emerald-500', to:'/surat-keluar'},
        {label:'Arsip', value:data?.kpi.arsip, icon:'i-lucide-archive', color:'text-amber-500', to:'/arsip'},
        {label:'Disposisi Saya', value:data?.kpi.disposisiSaya, icon:'i-lucide-share-2', color:'text-rose-500', to:'/disposisi'},
        {label:'Disposisi Lewat', value:data?.kpi.disposisiOverdue, icon:'i-lucide-alarm-clock-off', color:'text-red-500', to:'/disposisi'},
        {label:'Masuk Hari Ini', value:data?.kpi.masukHariIni, icon:'i-lucide-calendar', color:'text-blue-500', to:'/surat-masuk'},
        {label:'Keluar Pending', value:data?.kpi.keluarPending, icon:'i-lucide-clock', color:'text-orange-500', to:'/surat-keluar'},
        {label:'Arsip Bulan Ini', value:data?.kpi.arsipBulan, icon:'i-lucide-folder', color:'text-violet-500', to:'/arsip'},
      ]" :key="c.label">
        <NuxtLink :to="c.to" class="flex justify-between items-center"><div><div class="text-sm text-muted">{{ c.label }}</div><div class="text-2xl font-bold">{{ c.value ?? 0 }}</div></div><UIcon :name="c.icon" :class="c.color" class="text-3xl" /></NuxtLink>
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
      <UCard><template #header><span class="font-semibold">Disposisi Perlu Tindakan</span></template><div v-if="!data?.pendingList?.length" class="text-sm text-muted">Tidak ada disposisi pending.</div><div v-for="d in (data?.pendingList||[])" :key="(d as any).id" class="py-2 border-b last:border-0 flex justify-between"><div><div class="font-medium text-sm">{{ (d as any).no_surat }} — {{ (d as any).perihal }}</div><div class="text-xs text-muted">{{ (d as any).prioritas }} • batas: {{ (d as any).batas_waktu || '-' }}</div></div><UBadge :color="(d as any).status==='baru'?'error':'warning'">{{ (d as any).status }}</UBadge></div></UCard>
      <DashboardRecentSuratMasuk :items="(data?.recentMasuk as any[])||[]" :pending="isInitialLoading" />
    </div>

    <DashboardApprovalQueue v-if="user?.role==='pimpinan' || user?.role==='admin'" :items="(data?.approvalQueue as any[])||[]" :pending="isInitialLoading" />

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <DashboardKlasifikasiArsip class="lg:col-span-8" :items="(data?.klasifikasiDist as any[])||[]" :pending="isInitialLoading" />
      <DashboardAktivitasTerbaru class="lg:col-span-4" :items="(data?.aktivitas as any[])||[]" :pending="isInitialLoading" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UCard><template #header><span class="font-semibold">Batas Waktu 7 Hari</span></template><div v-if="!data?.batasWaktu?.length" class="text-sm text-muted">Tidak ada yang mendekati batas.</div><div v-for="b in (data?.batasWaktu||[])" :key="(b as any).id" class="py-2 border-b last:border-0 flex justify-between"><span class="text-sm">{{ (b as any).no_surat }} — {{ (b as any).perihal }}</span><UBadge color="error">{{ (b as any).batas_waktu }}</UBadge></div></UCard>
      <UCard><template #header><span class="font-semibold">Aksi Cepat</span></template><div class="flex flex-wrap gap-2"><UButton to="/surat-masuk" icon="i-lucide-plus">Surat Masuk</UButton><UButton to="/surat-keluar" icon="i-lucide-plus" color="success">Surat Keluar</UButton><UButton to="/disposisi" icon="i-lucide-share-2" color="warning">Disposisi</UButton><UButton to="/laporan" icon="i-lucide-download" variant="outline">Export Laporan</UButton></div></UCard>
    </div>
  </div>
</template>
