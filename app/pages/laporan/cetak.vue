<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const config = useRuntimeConfig()
const instansiNama = config.public.instansiNama || 'Pemerintah Provinsi Nusa Tenggara Timur'
const instansiUnit = config.public.instansiUnit || 'Dinas Pendidikan dan Kebudayaan'
const instansiSubUnit = config.public.instansiSubUnit || ''
const instansiAlamat = config.public.instansiAlamat || ''

const { logoSrc } = useLogoUrl()

const q = computed(() => ({
  tab: (route.query.tab as string) || 'gabungan',
  start: (route.query.start as string) || undefined,
  end: (route.query.end as string) || undefined,
  klasifikasi_id: route.query.klasifikasi_id ? Number(route.query.klasifikasi_id) : undefined,
  q: (route.query.q as string) || undefined,
  limit: 1000
}))

const { data: items, pending } = await useFetch('/api/laporan/items', { query: q })
const { data: summary } = await useFetch('/api/laporan/summary', {
  query: computed(() => ({ start: q.value.start, end: q.value.end, klasifikasi_id: q.value.klasifikasi_id }))
})

const jenisLabel = computed(() => ({
  gabungan: 'Gabungan (Masuk & Keluar)',
  masuk: 'Surat Masuk',
  keluar: 'Surat Keluar',
  arsip: 'Arsip'
})[(route.query.tab as string) || 'gabungan'])

const periodeLabel = computed(() => {
  const s = route.query.start as string | undefined
  const e = route.query.end as string | undefined
  if (s && e) return `${s} s/d ${e}`
  if (s) return `Dari ${s}`
  if (e) return `Sampai ${e}`
  return 'Semua Periode'
})

function tglIndo(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function tglIndoShort(iso?: string) {
  if (!iso) return ''
  return String(iso).slice(0, 10)
}

onMounted(() => {
  nextTick(() => {
    setTimeout(() => window.print(), 500)
  })
})
</script>

<template>
  <div v-if="!pending" class="cetak-page">
    <div class="kop">
      <img v-if="logoSrc" :src="logoSrc" class="kop-logo" alt="Logo" />
      <div class="kop-text">
        <h1>{{ instansiNama }}</h1>
        <h2>{{ instansiUnit }}</h2>
        <h2 v-if="instansiSubUnit" class="kop-subunit">{{ instansiSubUnit }}</h2>
        <div v-if="instansiAlamat" class="kop-alamat">{{ instansiAlamat }}</div>
      </div>
    </div>

    <div class="judul-laporan">
      <div class="kop-judul">LAPORAN PERSURATAN & ARSIP</div>
      <p class="judul-meta">Periode: {{ periodeLabel }} | Jenis: {{ jenisLabel }} | Dicetak: {{ tglIndo(new Date().toISOString()) }}</p>
    </div>

    <table class="laporan-table">
      <thead>
        <tr>
          <th>No</th>
          <th>Jenis</th>
          <th>No. Surat</th>
          <th>Tgl</th>
          <th>Asal / Tujuan</th>
          <th>Perihal</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in (items?.data || [])" :key="`${r.jenis}-${r.id}`">
          <td class="c-no">{{ i + 1 }}</td>
          <td>{{ r.jenis }}</td>
          <td>{{ r.no_surat }}</td>
          <td class="c-tgl">{{ tglIndoShort(r.tgl_surat) }}</td>
          <td>{{ r.asal_tujuan }}</td>
          <td>{{ r.perihal }}</td>
          <td>{{ r.status }}</td>
        </tr>
        <tr v-if="!items?.data?.length">
          <td colspan="7" class="c-empty">Tidak ada data.</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div class="ttd">
        <p>Mengetahui,</p>
        <p class="ttd-jabatan">Kepala {{ instansiUnit }}</p>
        <div class="ttd-space"></div>
        <p class="ttd-nama">_________________________</p>
        <p class="ttd-nip">NIP. __________________</p>
      </div>
      <div class="ttd ttd-kanan">
        <p>{{ tglIndo(new Date().toISOString()) }},</p>
        <p class="ttd-jabatan">Petugas Arsip</p>
        <div class="ttd-space"></div>
        <p class="ttd-nama">_________________________</p>
        <p class="ttd-nip">NIP. __________________</p>
      </div>
    </div>
  </div>
  <div v-else class="cetak-loading">
    <p>Memuat data laporan…</p>
  </div>
</template>

<style>
@import "~/assets/css/main.css";

* {
  box-sizing: border-box;
}

.cetak-page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 18mm 18mm 15mm;
  background: white;
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  color: #000;
  font-size: 11px;
}

.cetak-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
}

.kop {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border-bottom: 3px double #000;
  padding-bottom: 12px;
  margin-bottom: 0;
  position: relative;
}
.judul-laporan {
  text-align: center;
  margin: 14px 0 16px;
}
.judul-meta {
  margin: 4px 0 0;
  font-size: 10px;
}
.kop-logo {
  width: 60px;
  height: auto;
  align-self: center;
  flex-shrink: 0;
}
.kop-text {
  text-align: center;
  flex: 1;
}
.kop h1 {
  margin: 0;
  font-size: 16px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.kop h2 {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
}
.kop-subunit {
  margin: 2px 0 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
.kop-judul {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.kop-alamat {
  margin-top: 2px;
  font-size: 10px;
  font-weight: 400;
  text-transform: none;
}


.laporan-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.laporan-table th {
  background: #f1f5f9;
  text-align: left;
  padding: 6px;
  border: 1px solid #cbd5e1;
}
.laporan-table td {
  padding: 5px 6px;
  border: 1px solid #e2e8f0;
  vertical-align: top;
}
.c-no {
  width: 24px;
}
.c-tgl {
  white-space: nowrap;
}
.c-empty {
  text-align: center;
  padding: 24px;
  color: #64748b;
}

.footer {
  margin-top: 36px;
  display: flex;
  justify-content: space-between;
}
.ttd {
  text-align: center;
  font-size: 11px;
}
.ttd p {
  margin: 0;
}
.ttd-jabatan {
  margin-top: 2px !important;
  font-weight: 600;
}
.ttd-space {
  height: 72px;
}
.ttd-nama {
  font-weight: 700;
  text-decoration: underline;
  margin-top: 4px !important;
}
.ttd-nip {
  font-size: 10px;
  margin-top: 2px !important;
}

@media print {
  @page {
    size: A4;
    margin: 14mm;
  }
  body {
    margin: 0;
    padding: 0;
    background: white;
  }
  .cetak-page {
    width: auto;
    min-height: auto;
    padding: 0;
  }
}
</style>
