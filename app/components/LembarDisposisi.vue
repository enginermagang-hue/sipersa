<script setup lang="ts">
interface Surat {
  no_surat: string
  pengirim: string
  tgl_surat: string
  tgl_terima: string
  perihal: string
  sifat?: string
  klasifikasi_kode?: string
  klasifikasi_nama?: string
  no_agenda?: string | null
}

interface Disposisi {
  id: number
  parent_id: number | null
  dari_nama: string
  kepada_nama: string
  sifat_disposisi: string
  instruksi_list: string
  catatan: string
  created_at: string
}

const props = defineProps<{
  surat: Surat
  disposisi: Disposisi[]
}>()

const config = useRuntimeConfig()
const instansiNama = config.public.instansiNama || 'Pemerintah Provinsi Nusa Tenggara Timur'
const instansiUnit = config.public.instansiUnit || 'Dinas Pendidikan dan Kebudayaan'
const instansiAlamat = config.public.instansiAlamat || ''

const { logoSrc } = useLogoUrl()

const first = computed(() => props.disposisi?.[0] || null)
const pimpinan = computed(() => first.value?.dari_nama || '')

const firstBatchRecipients = computed(() => {
  if (!props.disposisi.length) return []
  const names: string[] = []
  for (const d of props.disposisi) {
    if (d.parent_id === null && !names.includes(d.kepada_nama)) {
      names.push(d.kepada_nama)
    }
  }
  return names
})

function tglIndo(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function tglIndoShort(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getDate()}/${d.getMonth() + 1}-${String(d.getFullYear()).slice(-2)}`
}

function checked(list?: string, val?: string) {
  if (!list || !val) return false
  try {
    const arr = JSON.parse(list)
    return Array.isArray(arr) && arr.includes(val)
  } catch {
    return false
  }
}

function isCheckedSifat(val?: string) {
  if (!val || !first.value) return false
  const s = first.value.sifat_disposisi
  if (val === 'Segera') return s === 'segera' || s === 'sangat_segera'
  if (val === 'Sangat Segera') return s === 'sangat_segera'
  if (val === 'Rahasia') return s === 'rahasia'
  if (val === 'Biasa') return s === 'biasa'
  return false
}

const semuaInstruksi = [
  'Tindak Lanjuti',
  'Pelajari & Konsep Balasan',
  'Koordinasikan',
  'Laporkan Hasilnya',
  'Arsipkan',
  'Untuk Diketahui',
  'Selesaikan sesuai kebijakan'
]
</script>

<template>
  <div class="lembar-disposisi">
    <!-- HEADER -->
    <div class="ld-header">
      <img v-if="logoSrc" :src="logoSrc" class="ld-logo" alt="Logo" />
      <div v-else class="ld-logo-placeholder">[Logo]</div>
      <div class="ld-instansi">
        <div class="ld-instansi-nama">{{ instansiNama }}</div>
        <div class="ld-instansi-unit">{{ instansiUnit }}</div>
        <div v-if="instansiAlamat" class="ld-instansi-alamat">{{ instansiAlamat }}</div>
      </div>
    </div>

    <div class="ld-judul">LEMBAR DISPOSISI</div>
    <div class="ld-line"></div>

    <!-- INFO SURAT - 4 kolom (2 pasang label+content) -->
    <table class="ld-table">
      <tbody>
        <tr>
          <td class="ld-label">Surat dari</td>
          <td class="ld-content">{{ surat.pengirim }}</td>
          <td class="ld-label">No. Surat</td>
          <td class="ld-content">{{ surat.no_surat }}</td>
        </tr>
        <tr>
          <td class="ld-label">Tanggal Surat</td>
          <td class="ld-content">{{ tglIndo(surat.tgl_surat) }}</td>
          <td class="ld-label">Diterima tanggal</td>
          <td class="ld-content">{{ tglIndoShort(surat.tgl_terima) }}</td>
        </tr>
        <tr>
          <td class="ld-label">Perihal</td>
          <td class="ld-content">{{ surat.perihal }}</td>
          <td class="ld-label">&nbsp;</td>
          <td class="ld-content">&nbsp;</td>
        </tr>
        <tr>
          <td class="ld-label">No. Agenda</td>
          <td class="ld-content">{{ surat.no_agenda ?? '' }}</td>
          <td class="ld-label">Sifat</td>
          <td class="ld-content">
            <table class="ld-sifat-grid">
              <tbody>
                <tr>
                  <td><label class="ld-check"><span class="ld-box" :class="{ 'ld-checked': isCheckedSifat('Segera') }"></span> Segera</label></td>
                  <td><label class="ld-check"><span class="ld-box" :class="{ 'ld-checked': isCheckedSifat('Biasa') }"></span> Biasa</label></td>
                </tr>
                <tr>
                  <td><label class="ld-check"><span class="ld-box" :class="{ 'ld-checked': isCheckedSifat('Sangat Segera') }"></span> Sangat Segera</label></td>
                  <td><label class="ld-check"><span class="ld-box" :class="{ 'ld-checked': isCheckedSifat('Rahasia') }"></span> Rahasia</label></td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- DITERUSKAN KEPADA -->
    <div class="ld-section">Diteruskan kepada :</div>
    <div class="ld-check-list">
      <label class="ld-check" v-for="r in firstBatchRecipients" :key="r">
        <span class="ld-box ld-checked"></span> {{ r }}
      </label>
      <label class="ld-check">
        <span class="ld-box"></span> ............................................ 
      </label>
    </div>

    <!-- PETUNJUK INFORMASI -->
    <div class="ld-section">Petunjuk Informasi :</div>
    <div class="ld-check-list">
      <label class="ld-check" v-for="opt in semuaInstruksi" :key="opt">
        <span class="ld-box" :class="{ 'ld-checked': checked(first?.instruksi_list, opt) }"></span> {{ opt }}
      </label>
    </div>

    <!-- CATATAN SEKRETARIS -->
    <div class="ld-catatan-box">
      <div class="ld-catatan-label">Catatan Sekretaris :</div>
      <div class="ld-catatan-content">{{ first?.catatan || '' }}</div>
    </div>

    <!-- CATATAN KEPADA / TANDA TANGAN -->
    <div class="ld-ttd-box">
      <div class="ld-ttd-kota">Kupang, {{ tglIndoShort(first?.created_at) }}</div>
      <div class="ld-ttd-bagian">
        <div class="ld-ttd-nama">{{ pimpinan }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ld-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 4px;
}
.ld-logo-placeholder {
  width: 70px;
  height: 70px;
  border: 1px solid #222;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: #222;
  flex-shrink: 0;
}
.ld-logo {
  width: 70px;
  height: 70px;
  object-fit: contain;
  flex-shrink: 0;
}
.ld-instansi {
  text-align: center;
  flex: 1;
  padding-top: 4px;
}
.ld-instansi-nama {
  font-size: 13pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.3;
}
.ld-instansi-unit {
  font-size: 12pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.3;
}
.ld-instansi-alamat {
  font-size: 10pt;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  line-height: 1.3;
  margin-top: 2px;
}
.ld-judul {
  text-align: center;
  font-size: 13pt;
  font-weight: 700;
  letter-spacing: 2px;
  margin: 6px 0 4px;
}
.ld-line {
  border-bottom: 1.5px solid #222;
  margin-bottom: 6px;
}

.ld-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
  margin-bottom: 4px;
}
.ld-table td {
  border: 1px solid #222;
  padding: 3px 6px;
  vertical-align: top;
}
.ld-label {
  font-weight: 700;
  width: 120px;
  text-align: right;
  padding-right: 8px;
  background: #fff;
  white-space: nowrap;
}
.ld-content {
  font-size: 10pt;
  min-height: 20px;
}
.ld-sifat-grid {
  border-collapse: collapse;
  font-size: 10pt;
}
.ld-sifat-grid td {
  border: none;
  padding: 2px 8px 2px 0;
  vertical-align: top;
}

.ld-section {
  font-size: 10pt;
  font-weight: 700;
  margin: 8px 0 3px;
}
.ld-check-list {
  margin-bottom: 6px;
}
.ld-check {
  display: inline-flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 10pt;
  cursor: default;
  margin-right: 16px;
  margin-bottom: 3px;
}
.ld-box {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1.5px solid #222;
  flex-shrink: 0;
  margin-top: 1px;
}
.ld-checked {
  background: #222;
}

.ld-catatan-box {
  border: 1px solid #222;
  min-height: 60px;
  margin-bottom: 30px;
}
.ld-catatan-label {
  font-size: 10pt;
  font-weight: 700;
  padding: 3px 6px;
  border-bottom: 1px solid #222;
}
.ld-catatan-content {
  padding: 6px;
  font-size: 10pt;
  min-height: 40px;
  white-space: pre-wrap;
}

.ld-ttd-box {
  margin-top: 20px;
  padding: 0 10px;
}
.ld-ttd-kota {
  font-size: 10pt;
  margin-bottom: 30px;
}
.ld-ttd-bagian {
  text-align: center;
}
.ld-ttd-nama {
  font-size: 10pt;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 30px;
}
.ld-ttd-line {
  border-bottom: 1px solid #222;
  height: 36px;
  margin: 0 20px;
}
</style>