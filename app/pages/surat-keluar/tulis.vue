<script setup lang="ts">
import { SURAT_TEMPLATES, assembleTemplate, tembusanBlock, ttdBlock, parafHirarkiBlock } from '~/utils/surat-templates'
import TinyMceEditor from '~/components/TinyMceEditor.client.vue'

const toast = useToast()
const saving = ref(false)
const config = useRuntimeConfig()

const { data: klas } = await useFetch('/api/klasifikasi')
const klasOptions = computed(() =>
  (klas.value || []).map((k: any) => ({ label: `${k.kode} - ${k.nama}`, value: k.id }))
)

const { data: nextNo } = await useFetch('/api/surat-keluar/next-no')
const { data: users } = await useFetch('/api/users')

const state = reactive({
  no_surat: nextNo.value?.no_surat ?? '',
  no_urut: nextNo.value?.no_urut ?? 0,
  tgl_surat: new Date().toISOString().slice(0, 10),
  tujuan: '',
  perihal: '',
  sifat: 'biasa',
  status: 'draft',
  penandatangan: '',
  klasifikasi_id: null as number | null
})

const isi = ref('')

const ukuranKertas = ref<'a4' | 'f4' | 'letter'>('a4')
const font = ref('Inter')
const marginMm = ref(25)
const orientasi = ref<'portrait' | 'landscape'>('portrait')

const PAPER: Record<string, [number, number]> = {
  a4: [210, 297],
  f4: [210, 330],
  letter: [215.9, 279.4]
}

const kertasOptions = [
  { label: 'A4 (210 × 297 mm)', value: 'a4' },
  { label: 'F4 / Folio (210 × 330 mm)', value: 'f4' },
  { label: 'Letter (215.9 × 279.4 mm)', value: 'letter' }
]

const fontOptions = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Georgia', value: 'Georgia' }
]

const orientasiOptions = [
  { label: 'Portrait', value: 'portrait' },
  { label: 'Landscape', value: 'landscape' }
]

const sifatOptions = [
  { label: 'Biasa', value: 'biasa' },
  { label: 'Segera', value: 'segera' },
  { label: 'Rahasia', value: 'rahasia' },
  { label: 'Penting', value: 'penting' }
]

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Proses TTD', value: 'proses_ttd' },
  { label: 'Terkirim', value: 'terkirim' },
  { label: 'Selesai', value: 'selesai' }
]

const templateOptions = SURAT_TEMPLATES.map((t) => ({ label: t.label, value: t.id }))
const templateId = ref(SURAT_TEMPLATES[0].id)
const denganTembusan = ref(false)
const denganParaf = ref(false)

const penandatanganOptions = computed(() =>
  (users.value || []).map((u: any) => ({
    // label: u.nip ? `${u.nama} — ${u.nip}` : u.nama,
    label: u.nama,
    value: u.id
  }))
)
const penandatanganId = ref<number | null>(null)

const penandatanganUser = computed(() =>
  (users.value || []).find((u: any) => u.id === penandatanganId.value) || null
)

const instansiNama = config.public.instansiNama || 'Pemerintah Provinsi Nusa Tenggara Timur'
const instansiUnit = config.public.instansiUnit || 'Dinas Pendidikan dan Kebudayaan'
const instansiSubUnit = config.public.instansiSubUnit || ''
const instansiAlamat = config.public.instansiAlamat || ''

const { logoHtml, logoLoading } = useLogoUrl()

onMounted(async () => {
  await waitEditor()
  applyTemplate()
})

watch(logoHtml, () => {
  const ed = getEd()
  if (ed && ed.initialized) applyTemplate()
})

function tglIndoLong(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const tinyRef = ref<InstanceType<typeof TinyMceEditor> | null>(null)

function getEd(): any {
  return tinyRef.value?.getEditor() ?? null
}

async function waitEditor() {
  for (let i = 0; i < 100; i++) {
    const ed = getEd()
    if (ed && ed.initialized) return
    await new Promise((r) => setTimeout(r, 150))
  }
}

function buildCtx() {
  return {
    instansiNama,
    instansiUnit,
    instansiSubUnit,
    instansiAlamat,
    logo: logoHtml.value,
    noSurat: state.no_surat,
    tglSurat: tglIndoLong(state.tgl_surat),
    tujuan: state.tujuan,
    perihal: state.perihal,
    isi: isi.value,
    penandatangan: penandatanganUser.value
      ? { nama: penandatanganUser.value.nama, nip: penandatanganUser.value.nip }
      : null,
    denganTembusan: denganTembusan.value,
    denganParaf: denganParaf.value
  }
}

function applyTemplate() {
  const ed = getEd()
  if (!ed) return
  ed.setContent(assembleTemplate(templateId.value, { ...buildCtx(), isi: '' }))
  ed.fire('change input')
}

function insertBlock(ed: any, html: string) {
  const el = ed.getDoc().createElement('div')
  el.innerHTML = html
  ed.dom.add(ed.getBody(), el.firstElementChild!)
}

function syncBlocks() {
  const ed = getEd()
  if (!ed) return
  ed.dom.remove(ed.dom.get('blok-tembusan'))
  ed.dom.remove(ed.dom.get('blok-paraf-hirarki'))
  ed.dom.remove(ed.dom.get('blok-ttd'))
  insertBlock(ed, ttdBlock(buildCtx()))
  if (denganTembusan.value) insertBlock(ed, tembusanBlock())
  if (denganParaf.value) insertBlock(ed, parafHirarkiBlock())
  ed.fire('change input')
}

watch(templateId, () => applyTemplate())
watch([denganTembusan, denganParaf, penandatanganId], () => {
  state.penandatangan = penandatanganUser.value?.nama || ''
  syncBlocks()
})

const tabItems = [
  { label: 'Informasi Surat', value: 'informasi', slot: 'informasi' },
  { label: 'Opsi Cetak', value: 'cetak', slot: 'cetak' },
  { label: 'Template', value: 'template', slot: 'template' }
]

function validate(): string | null {
  if (!state.tgl_surat) return 'Tanggal surat wajib diisi'
  if (!state.tujuan.trim()) return 'Tujuan wajib diisi'
  if (!state.perihal.trim()) return 'Perihal wajib diisi'
  if (!state.no_surat.trim()) return 'No. surat wajib diisi'
  if (!isi.value || !isi.value.replace(/<[^>]*>/g, '').trim()) return 'Isi surat masih kosong'
  return null
}

function renderPdf(html: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const [w, h] = PAPER[ukuranKertas.value]
    const [pw, ph] = orientasi.value === 'landscape' ? [Math.max(w, h), Math.min(w, h)] : [w, h]
    const ifr = document.createElement('iframe')
    ifr.style.cssText = 'position:fixed;top:0;left:-10000px;width:210mm;height:297mm;border:0;visibility:hidden'
    document.body.appendChild(ifr)

    const srcdoc = ['<!DOCTYPE html><html lang="id"><head>',
      '<meta charset="utf-8"/>',
      '<link rel="preconnect" href="https://fonts.googleapis.com"/>',
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>',
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Times+New+Roman&display=swap"/>`,
      '<style>',
      `body{margin:0}#sheet{width:${pw}mm;min-height:${ph}mm;box-sizing:border-box;padding:${marginMm.value}mm;font-family:${font.value === 'Inter' ? "'Inter',sans-serif" : `'${font.value}',serif`};font-size:12pt;line-height:1.6;color:#000;background:#fff}`,
      'img{max-width:100%}</style>',
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>',
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>',
      `<script>window.__imReady=false;window.__render=async function(html){document.getElementById("sheet").innerHTML=html;await document.fonts.ready;var c=await html2canvas(document.getElementById("sheet"),{scale:2,backgroundColor:"#ffffff"});var img=c.toDataURL("image/jpeg",0.98);var pdf=new jspdf.jsPDF({unit:"mm",format:[${pw},${ph}],orientation:"${orientasi.value}"});pdf.addImage(img,"JPEG",0,0,${pw},${ph},undefined,"FAST");window.__imReady=false;return pdf.output("datauristring")};window.__imReady=true<\/script>`,
      '</head><body><div id="sheet"></div></body></html>'
    ].join('')

    ifr.srcdoc = srcdoc
    ifr.addEventListener('load', async () => {
      const w = ifr.contentWindow!
      const deadline = Date.now() + 15000
      while (!w.__imReady && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 150))
      }
      try {
        if (!w.__imReady) throw new Error('Library PDF gagal dimuat di iframe')
        const dataUrl = await w.__render(html)
        ifr.remove()
        resolve(dataUrl)
      } catch (e: any) {
        ifr.remove()
        reject(new Error(e?.message || 'Gagal membuat PDF'))
      }
    })
  })
}

async function simpan() {
  const err = validate()
  if (err) {
    toast.add({ title: 'Data belum lengkap', description: err, color: 'error' })
    return
  }
  saving.value = true
  try {
    const dataUrl = await renderPdf(isi.value)
    const blob = await (await fetch(dataUrl)).blob()

    const file = new File([blob], `${state.no_surat.replace(/\//g, '-')}.pdf`, { type: 'application/pdf' })
    const fd = new FormData()
    Object.entries({ ...state, klasifikasi_id: state.klasifikasi_id ?? '' }).forEach(([k, v]) => fd.append(k, String(v)))
    fd.append('file', file)

    const res = await $fetch('/api/surat-keluar', { method: 'POST', body: fd })
    toast.add({ title: 'Berhasil', description: 'Surat dibuat & PDF diunggah', color: 'success' })
    navigateTo(`/surat-keluar/${res.id}`)
  } catch (e: any) {
    toast.add({ title: 'Gagal menyimpan', description: e?.data?.statusMessage || 'Terjadi kesalahan', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <UButton icon="i-lucide-arrow-left" variant="ghost" :to="'/surat-keluar'" aria-label="Kembali" />
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Tulis Surat Keluar</h1>
          <p class="text-sm text-muted mt-0.5">Tulis langsung di aplikasi, otomatis jadi PDF & diunggah ke Drive</p>
        </div>
      </div>
      <UButton icon="i-lucide-save" color="primary" :loading="saving" @click="simpan">Simpan Surat</UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5 items-start">
      <UCard :ui="{ body: 'p-2' }" class="min-w-0">
        <div class="min-h-[600px]">
          <TinyMceEditor
            ref="tinyRef"
            v-model="isi"
            :height="620"
            paper
            :paper-width="PAPER[ukuranKertas][0]"
            :paper-height="PAPER[ukuranKertas][1]"
            :orientation="orientasi"
            :margin-mm="marginMm"
          />
          <div v-if="logoLoading" class="flex items-center gap-2 mt-2 text-sm text-muted">
            <UIcon name="i-lucide-loader-circle" class="animate-spin" />
            Memuat logo…
          </div>
        </div>
      </UCard>

      <div class="lg:sticky lg:top-[80px] min-w-0">
        <UCard :ui="{ body: 'p-0' }">
          <UTabs :items="tabItems" :default-value="'informasi'">
            <template #informasi>
              <div class="py-4 px-2 space-y-3">
                <UFormField label="No. Surat">
                  <UInput class="w-full" v-model="state.no_surat" />
                </UFormField>
                <UFormField label="Tanggal Surat">
                  <UInput class="w-full" v-model="state.tgl_surat" type="date" />
                </UFormField>
                <UFormField label="Tujuan">
                  <UInput class="w-full" v-model="state.tujuan" />
                </UFormField>
                <UFormField label="Perihal">
                  <UInput class="w-full" v-model="state.perihal" />
                </UFormField>
                <div class="grid grid-cols-2 gap-3">
                  <UFormField label="Sifat">
                    <USelect class="w-full" v-model="state.sifat" :items="sifatOptions" />
                  </UFormField>
                  <UFormField label="Klasifikasi">
                    <USelect class="w-full" v-model="state.klasifikasi_id" :items="klasOptions" placeholder="(tanpa)" />
                  </UFormField>
                </div>
                <UFormField label="Status">
                  <USelect class="w-full" v-model="state.status" :items="statusOptions" />
                </UFormField>
              </div>
            </template>

            <template #cetak>
              <div class="p-4 space-y-3">
                <UFormField label="Ukuran Kertas">
                  <USelect class="w-full" v-model="ukuranKertas" :items="kertasOptions" />
                </UFormField>
                <UFormField label="Font">
                  <USelect class="w-full" v-model="font" :items="fontOptions" />
                </UFormField>
                <UFormField label="Margin (mm)">
                  <UInput v-model.number="marginMm" type="number" min="0" max="60" />
                </UFormField>
                <UFormField label="Orientasi">
                  <USelect class="w-full" v-model="orientasi" :items="orientasiOptions" />
                </UFormField>
              </div>
            </template>

            <template #template>
              <div class="p-4 space-y-4">
                <UFormField label="Jenis Template">
                  <USelect class="w-full" v-model="templateId" :items="templateOptions" />
                </UFormField>
                <div class="space-y-2">
                  <UCheckbox v-model="denganParaf" label="Dengan Paraf Hirarki" />
                  <UCheckbox v-model="denganTembusan" label="Dengan Tembusan" />
                </div>
                <UFormField label="Penandatangan">
                  <USelect class="w-full" v-model="penandatanganId" :items="penandatanganOptions" placeholder="Pilih pegawai" />
                </UFormField>
                <UAlert v-if="!penandatanganId" color="info" variant="soft" title="Tanda tangan akan tetap muncul di surat; pilih pegawai agar nama & NIP terisi, atau biarkan kosong." />
              </div>
            </template>
          </UTabs>
        </UCard>
      </div>
    </div>
  </div>
</template>
