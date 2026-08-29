<script setup lang="ts">
import { SURAT_TEMPLATES, assembleTemplate, tembusanBlock, ttdBlock, parafHirarkiBlock } from '~/utils/surat-templates'
import TinyMceEditor from '~/components/TinyMceEditor.client.vue'
import { useLocalStorage } from '@vueuse/core'

const toast = useToast()
const saving = ref(false)
const config = useRuntimeConfig()
const panelOpen = useLocalStorage('sk-tulis-panel-open', true)

const { openPopup } = useKlasifikasiPopup()

const { data: nextNo } = await useFetch('/api/surat-keluar/next-no')
const { data: users } = await useFetch('/api/users')

const state = reactive({
  no_surat: nextNo.value?.no_surat ?? '',
  no_urut: nextNo.value?.no_urut ?? 0,
  tgl_surat: new Date().toISOString().slice(0, 10),
  tujuan: '',
  perihal: '',
  sifat: 'biasa',
  penandatangan: '',
  klasifikasi_kode: ''
})

const isi = ref('')

const MARGIN_TEMPLATES = [
  { label:'Skripsi — 4·4·3·3 cm (A4)', value:'skripsi', m:{top:4,right:3,bottom:3,left:4} },
  { label:'Surat Dinas — 3·4·3·3 cm (A4/F4)', value:'dinas', m:{top:3,right:3,bottom:3,left:4} },
  { label:'Makalah — 3·4·3·3 cm (A4)', value:'makalah', m:{top:3,right:3,bottom:3,left:4} },
  { label:'Internasional — 2,54 cm semua sisi', value:'inci', m:{top:2.54,right:2.54,bottom:2.54,left:2.54} },
  { label:'Custom…', value:'custom' },
] as const
const marginTemplate = ref('inci')
const marginCustomCm = reactive({top:2.54,right:2.54,bottom:2.54,left:2.54})
const marginMm = computed(()=> {
  if(marginTemplate.value==='custom') return {top:Math.round(marginCustomCm.top*10*10)/10,right:Math.round(marginCustomCm.right*10*10)/10,bottom:Math.round(marginCustomCm.bottom*10*10)/10,left:Math.round(marginCustomCm.left*10*10)/10}
  const t=(MARGIN_TEMPLATES as any).find((x:any)=>x.value===marginTemplate.value); return t?.m ? {top:t.m.top*10,right:t.m.right*10,bottom:t.m.bottom*10,left:t.m.left*10} : {top:30,right:30,bottom:30,left:40}
})

const ukuranKertas = ref<'a4' | 'f4' | 'letter'>('a4')
const font = ref('Inter')
const orientasi = ref<'portrait' | 'landscape'>('portrait')

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
      ? { nama: penandatanganUser.value.nama, nip: penandatanganUser.value.nip, jabatan: penandatanganUser.value.jabatan || '' }
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

function escHtml(s:string){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function syncDom(id:string, html:string){
  const ed=getEd(); if(!ed||!ed.dom) return
  const el=ed.dom.get(id); if(el) { ed.dom.setHTML(el, html); ed.fire('change input') }
}
let syncTimer:any=null
function debouncedSync(fn:()=>void){ clearTimeout(syncTimer); syncTimer=setTimeout(fn, 120) }
watch(()=>state.tujuan, v=> debouncedSync(()=> syncDom('hdr-tujuan', escHtml(v) || '..........................................')))
watch(()=>state.perihal, v=> debouncedSync(()=>{ const h=escHtml(v); syncDom('hdr-perihal', h||''); syncDom('kv-acara', h||'..........................................'); syncDom('opening-perihal', h||'...') }))
watch(()=>state.no_surat, v=> debouncedSync(()=> syncDom('hdr-nomor', escHtml(v))))

const tabItems = [
  { label: 'Informasi Surat', value: 'informasi', slot: 'informasi' },
  { label: 'Opsi Cetak', value: 'cetak', slot: 'cetak' },
  { label: 'Template', value: 'template', slot: 'template' }
]

watch(() => [state.tgl_surat, state.klasifikasi_kode] as const, async ([tgl, kode]) => {
  if (!kode?.trim() || !tgl) return
  try {
    const r: any = await $fetch('/api/surat-keluar/next-no', { query: { kode: kode.trim(), tgl_surat: tgl } })
    state.no_surat = r.no_surat; state.no_urut = r.no_urut
  } catch {}
})

function validate(): string | null {
  if (!state.klasifikasi_kode?.trim()) return 'Kode klasifikasi wajib diisi'
  if (!state.tgl_surat) return 'Tanggal surat wajib diisi'
  if (!state.tujuan.trim()) return 'Tujuan wajib diisi'
  if (!state.perihal.trim()) return 'Perihal wajib diisi'
  if (!state.no_surat.trim()) return 'No. surat wajib diisi'
  if (!isi.value || !isi.value.replace(/<[^>]*>/g, '').trim()) return 'Isi surat masih kosong'
  return null
}

const submitting = ref(false)
const ajukanOpen = ref(false)

async function simpanWithStatus(status: string) {
  const err = validate()
  if (err) {
    toast.add({ title: 'Data belum lengkap', description: err, color: 'error' })
    return null
  }
  const isAjukan = status === 'menunggu_persetujuan'
  if (isAjukan) submitting.value = true; else saving.value = true
  try {
    const fd = new FormData()
    Object.entries({ ...state }).forEach(([k, v]) => fd.append(k, String(v)))
    fd.set('status', status)
    if (penandatanganId.value) fd.append('penandatangan_id', String(penandatanganId.value))
    fd.append('html_content', isi.value)
    fd.append('render_config', JSON.stringify({ ukuranKertas: ukuranKertas.value, font: font.value, marginMm: marginMm.value, orientasi: orientasi.value }))
    const res = await $fetch('/api/surat-keluar', { method: 'POST', body: fd })
    toast.add({ title: 'Berhasil', description: isAjukan ? 'Surat diajukan, menunggu persetujuan pimpinan.' : 'Surat disimpan sebagai draft. Submit untuk persetujuan pimpinan di halaman detail.', color: 'success' })
    navigateTo(`/surat-keluar/${res.id}`)
    return res
  } catch (e: any) {
    toast.add({ title: isAjukan ? 'Gagal mengajukan' : 'Gagal menyimpan', description: e?.data?.statusMessage || 'Terjadi kesalahan', color: 'error' })
    return null
  } finally {
    saving.value = false; submitting.value = false
  }
}
async function simpan() { await simpanWithStatus('draft') }
async function ajukan() {
  const err = validate()
  if (err) { toast.add({ title: 'Data belum lengkap', description: err, color: 'error' }); return }
  ajukanOpen.value = true
}
async function confirmAjukan() { ajukanOpen.value = false; await simpanWithStatus('menunggu_persetujuan') }
</script>

<template>
  <div class="flex flex-col gap-5 flex-1 min-h-0 h-[calc(100dvh-3.5rem-2rem)]">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
      <div class="flex items-center gap-3">
        <UButton icon="i-lucide-arrow-left" variant="ghost" :to="'/surat-keluar'" aria-label="Kembali" />
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Tulis Surat Keluar</h1>
          <p class="text-sm text-muted mt-0.5">Simpan sebagai draft; PDF dibuat otomatis setelah disetujui pimpinan</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-save" color="neutral" variant="outline" :loading="saving" :disabled="submitting" @click="simpan">Simpan draft</UButton>
        <UButton icon="i-lucide-send" color="primary" :loading="submitting" :disabled="saving" @click="ajukan">Ajukan untuk persetujuan</UButton>
      </div>
    </div>
    <UModal v-model:open="ajukanOpen" title="Ajukan surat?" :ui="{ footer: 'justify-end' }">
      <template #body><p class="text-sm text-muted">Surat akan langsung berstatus <b>Menunggu Persetujuan</b> dan terkunci sampai pimpinan menyetujui/menolak. Lanjutkan?</p></template>
      <template #footer="{ close }"><UButton variant="ghost" @click="close">Batal</UButton><UButton color="primary" :loading="submitting" @click="confirmAjukan">Ya, Ajukan</UButton></template>
    </UModal>

    <div class="grid gap-5 flex-1 min-h-0 items-stretch" :class="panelOpen ? 'grid-cols-1 lg:grid-cols-[7fr_3fr]' : 'grid-cols-1'">
      <UCard :ui="{ body: 'p-2 h-full flex flex-col min-h-0' }" class="min-w-0 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div class="flex-1 min-h-0 flex flex-col">
          <TinyMceEditor
            ref="tinyRef"
            v-model="isi"
            class="flex-1 min-h-0"
            paper
            :paper-width="PAPER[ukuranKertas][0]"
            :paper-height="PAPER[ukuranKertas][1]"
            :margin-mm="marginMm"
            :orientasi="orientasi"
            :font-family="font"
          />
          <div v-if="logoLoading" class="flex items-center gap-2 mt-2 text-sm text-muted shrink-0">
            <UIcon name="i-lucide-loader-circle" class="animate-spin" />
            Memuat logo…
          </div>
        </div>
      </UCard>

      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-4"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-4"
      >
      <div v-if="panelOpen" class="lg:sticky lg:top-[80px] min-w-0 self-start">
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
                    <UInput class="w-full" v-model="state.klasifikasi_kode" placeholder="mis. 800.1" />
                    <a href="#" class="text-xs text-primary underline mt-1 inline-block" @click.prevent="openPopup()">Lihat daftar kode klasifikasi</a>
                  </UFormField>
                </div>
                <UAlert color="info" variant="soft" icon="i-lucide-info" title="Surat disimpan sebagai draft dan dapat disubmit untuk persetujuan pimpinan." />
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
                <UFormField label="Template Margin">
                  <USelect class="w-full" v-model="marginTemplate" :items="[...MARGIN_TEMPLATES]" />
                </UFormField>
                <div v-if="marginTemplate!=='custom'" class="text-xs text-muted bg-muted/30 rounded-lg p-2">
                  Atas {{(marginMm as any).top/10}} cm ({{(marginMm as any).top}} mm) · Kanan {{(marginMm as any).right/10}} cm · Bawah {{(marginMm as any).bottom/10}} cm · Kiri {{(marginMm as any).left/10}} cm
                </div>
                <template v-else>
                  <div class="grid grid-cols-2 gap-3">
                    <UFormField label="Atas (cm)"><UInput v-model.number="marginCustomCm.top" type="number" step="0.1" min="0" /></UFormField>
                    <UFormField label="Kanan (cm)"><UInput v-model.number="marginCustomCm.right" type="number" step="0.1" min="0" /></UFormField>
                    <UFormField label="Bawah (cm)"><UInput v-model.number="marginCustomCm.bottom" type="number" step="0.1" min="0" /></UFormField>
                    <UFormField label="Kiri (cm)"><UInput v-model.number="marginCustomCm.left" type="number" step="0.1" min="0" /></UFormField>
                  </div>
                  <p class="text-xs text-muted">≈ {{marginMm.top}} / {{marginMm.right}} / {{marginMm.bottom}} / {{marginMm.left}} mm</p>
                </template>
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
      </Transition>

      <UButton
        :icon="panelOpen ? 'i-lucide-panel-right-open' : 'i-lucide-panel-right-close'"
        color="neutral"
        variant="solid"
        size="lg"
        class="fixed bottom-6 right-6 z-40 shadow-lg rounded-full"
        :aria-label="panelOpen ? 'Sembunyikan panel' : 'Tampilkan panel'"
        @click="panelOpen = !panelOpen"
      />
    </div>
  </div>
</template>
