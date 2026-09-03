<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string
const { user } = useAuth()
const { confirm } = useConfirm()
const toast = useToast()
const { data, error, refresh, pending } = await useFetch(`/api/disposisi/${id}`)

const { data: users } = await useFetch('/api/users')
const forwardOpen = ref(false)
const forwardLoading = ref(false)
const forwardError = ref('')
const updatingId = ref<number | null>(null)

const sifatOptions = [
  { label: 'Biasa', value: 'biasa' },
  { label: 'Segera', value: 'segera' },
  { label: 'Sangat Segera', value: 'sangat_segera' },
  { label: 'Rahasia', value: 'rahasia' }
]
const sifatLabel: Record<string, string> = { biasa: 'Biasa', segera: 'Segera', sangat_segera: 'Sangat Segera', rahasia: 'Rahasia' }
const statusMeta: Record<string, { label: string; color: string }> = {
  baru: { label: 'Baru', color: 'warning' },
  diproses: { label: 'Diproses', color: 'primary' },
  selesai: { label: 'Selesai', color: 'success' }
}

const isPenerimaAktif = computed(() => {
  const d = (data.value as any)?.disposisi
  if (!d) return false
  return d.kepada_user_id === user.value?.id && d.status !== 'selesai'
})
const canForward = computed(() => isPenerimaAktif.value)
const canSelesaikan = computed(() => isPenerimaAktif.value)

const initialRecipientIds = computed(() => {
  const all = (data.value as any)?.allForSurat || []
  return new Set(all.filter((d: any) => d.parent_id === null).map((d: any) => d.kepada_user_id))
})

const forwardForm = reactive({
  kepada_user_id: null as number | null,
  sifat_disposisi: 'biasa',
  batas_waktu: '',
  instruksi: '',
  catatan: ''
})

const recipientOptions = computed(() => {
  const all = (users.value || []) as any[]
  const blocked = initialRecipientIds.value
  return all
    .filter((u: any) => !['admin', 'pimpinan'].includes(u.role))
    .filter((u: any) => u.id !== user.value?.id)
    .filter((u: any) => !blocked.has(u.id))
    .map((u: any) => ({ label: u.nama, value: u.id }))
})

watch(forwardOpen, (v) => {
  if (!v) { forwardError.value = ''; forwardForm.kepada_user_id = null }
})

function fmtTgl(s?: string) {
  if (!s) return '-'
  const d = new Date(String(s).replace(' ', 'T'))
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtWaktu(s?: string) {
  if (!s) return '-'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function selesaikan() {
  const d = (data.value as any)?.disposisi
  if (!d) return
  await confirm({ title: 'Selesaikan Disposisi', message: `Selesaikan disposisi ${d.no_surat}?`, okLabel: 'Selesaikan', loadingTitle: 'Menyelesaikan...' }, async () => {
    updatingId.value = d.id
    try {
      await $fetch(`/api/disposisi/${d.id}`, { method: 'PUT', body: { status: 'selesai' } })
      await refresh()
      toast.add({ title: 'Berhasil', description: 'Disposisi diselesaikan', color: 'success' })
    } finally { updatingId.value = null }
  })
}

async function submitForward() {
  forwardError.value = ''
  if (!forwardForm.kepada_user_id) { forwardError.value = 'Pilih penerima'; return }
  forwardLoading.value = true
  try {
    await $fetch(`/api/disposisi/${id}/teruskan`, {
      method: 'POST',
      body: {
        kepada_user_ids: [forwardForm.kepada_user_id],
        instruksi: forwardForm.instruksi,
        catatan: forwardForm.catatan,
        sifat_disposisi: forwardForm.sifat_disposisi,
        batas_waktu: forwardForm.batas_waktu || null
      }
    })
    forwardOpen.value = false
    await refresh()
    toast.add({ title: 'Berhasil', description: 'Disposisi diteruskan', color: 'success' })
  } catch (e: any) {
    forwardError.value = e?.data?.statusMessage || 'Gagal meneruskan'
  } finally { forwardLoading.value = false }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <UButton to="/disposisi" variant="ghost" size="sm" icon="i-lucide-arrow-left">Kembali</UButton>
      <h1 class="text-xl font-bold flex-1">Detail Disposisi</h1>
      <UBadge v-if="data?.disposisi" :label="statusMeta[data.disposisi.status]?.label || data.disposisi.status" :color="statusMeta[data.disposisi.status]?.color || 'neutral'" variant="subtle" />
    </div>

    <div v-if="pending" class="py-12 text-center text-muted">Memuat...</div>
    <div v-else-if="error" class="py-12 text-center space-y-3">
      <p class="text-error font-medium">{{ (error as any)?.data?.statusMessage || 'Disposisi tidak ditemukan (404)' }}</p>
      <UButton to="/disposisi" variant="soft">Kembali ke Disposisi Saya</UButton>
    </div>
    <template v-else-if="data?.disposisi">
      <div class="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        <div class="space-y-4">
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <h3 class="font-semibold">Disposisi</h3>
                <UBadge :label="data.disposisi.parent_id === null ? 'Awal' : 'Terusan'" variant="outline" size="xs" />
                <span class="ml-auto text-xs text-muted">{{ fmtWaktu(data.disposisi.created_at) }}</span>
              </div>
            </template>
            <dl class="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt class="text-xs text-muted">Dari</dt><dd class="font-medium">{{ data.disposisi.dari_nama }}</dd></div>
              <div><dt class="text-xs text-muted">Kepada</dt><dd class="font-medium">{{ data.disposisi.kepada_nama }}</dd></div>
              <div><dt class="text-xs text-muted">Status</dt><dd><UBadge :label="statusMeta[data.disposisi.status]?.label || data.disposisi.status" :color="statusMeta[data.disposisi.status]?.color || 'neutral'" variant="subtle" size="xs" /></dd></div>
              <div><dt class="text-xs text-muted">Sifat</dt><dd>{{ sifatLabel[data.disposisi.sifat_disposisi] || data.disposisi.sifat_disposisi }}</dd></div>
              <div><dt class="text-xs text-muted">Batas Waktu</dt><dd :class="data.disposisi.batas_waktu && data.disposisi.status!=='selesai' && data.disposisi.batas_waktu < new Date().toISOString().slice(0,10) ? 'text-error font-semibold' : ''">{{ fmtTgl(data.disposisi.batas_waktu) }}</dd></div>
              <div><dt class="text-xs text-muted">Surat</dt><dd><NuxtLink :to="`/surat-masuk/${data.surat.id}`" class="text-primary hover:underline font-medium">{{ data.surat.no_surat }}</NuxtLink> <span class="text-muted text-xs">— {{ data.surat.perihal }}</span></dd></div>
              <div v-if="data.surat.klasifikasi_nama" class="sm:col-span-2"><dt class="text-xs text-muted">Klasifikasi</dt><dd>{{ data.surat.klasifikasi_kode }} - {{ data.surat.klasifikasi_nama }}</dd></div>
            </dl>
            <div v-if="data.disposisi.instruksi" class="mt-3 p-3 rounded-lg bg-muted border border-default text-sm italic">"{{ data.disposisi.instruksi }}"</div>
            <div v-if="data.disposisi.catatan" class="mt-2 text-sm"><span class="text-muted text-xs">Catatan:</span> {{ data.disposisi.catatan }}</div>
            <div class="flex gap-2 mt-4">
              <UButton v-if="canSelesaikan" color="success" variant="soft" icon="i-lucide-check" :loading="updatingId===data.disposisi.id" @click="selesaikan">Selesaikan</UButton>
              <UButton v-if="canForward" icon="i-lucide-corner-up-right" @click="forwardOpen=true">Teruskan Disposisi</UButton>
              <UButton variant="outline" icon="i-lucide-eye" :to="`/surat-masuk/${data.surat.id}`">Lihat Surat</UButton>
            </div>
          </UCard>

          <UCard v-if="data.children?.length">
            <template #header><h3 class="font-semibold text-sm">Diteruskan ke</h3></template>
            <ul class="space-y-2">
              <li v-for="c in data.children" :key="c.id" class="flex items-center justify-between p-2 rounded-lg border border-default">
                <div>
                  <div class="font-medium text-sm">{{ c.kepada_nama }}</div>
                  <div class="text-xs text-muted">{{ fmtWaktu(c.created_at) }} • {{ sifatLabel[c.sifat_disposisi] || c.sifat_disposisi }}</div>
                </div>
                <UBadge :label="statusMeta[c.status]?.label || c.status" :color="statusMeta[c.status]?.color || 'neutral'" variant="subtle" size="xs" />
              </li>
            </ul>
          </UCard>
        </div>

        <div class="space-y-4">
          <UCard>
            <template #header><h3 class="font-semibold">Surat</h3></template>
            <div class="space-y-2 text-sm">
              <div><span class="text-muted text-xs">No Surat</span><div class="font-medium">{{ data.surat.no_surat }}</div></div>
              <div><span class="text-muted text-xs">Pengirim</span><div class="font-medium">{{ data.surat.pengirim }}</div></div>
              <div><span class="text-muted text-xs">Tgl Surat</span><div>{{ fmtTgl(data.surat.tgl_surat) }}</div></div>
              <div><span class="text-muted text-xs">Perihal</span><div>{{ data.surat.perihal }}</div></div>
              <div v-if="data.surat.file_drive_id"><UButton :href="`/api/files/${data.surat.file_drive_id}`" target="_blank" size="xs" variant="soft" icon="i-lucide-download">Unduh File</UButton></div>
            </div>
          </UCard>
        </div>
      </div>

      <UModal v-model:open="forwardOpen" title="Teruskan Disposisi">
        <template #body>
          <UForm :state="forwardForm" class="space-y-3" @submit="submitForward">
            <UFormField label="Kepada" required><USelect v-model="forwardForm.kepada_user_id" :items="recipientOptions" placeholder="Pilih penerima" class="w-full" /></UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Sifat"><USelect v-model="forwardForm.sifat_disposisi" :items="sifatOptions" class="w-full" /></UFormField>
              <UFormField label="Batas Waktu"><UInput v-model="forwardForm.batas_waktu" type="date" class="w-full" /></UFormField>
            </div>
            <UFormField label="Instruksi"><UTextarea v-model="forwardForm.instruksi" class="w-full" /></UFormField>
            <UFormField label="Catatan"><UTextarea v-model="forwardForm.catatan" class="w-full" /></UFormField>
            <p v-if="forwardError" class="text-sm text-error">{{ forwardError }}</p>
          </UForm>
        </template>
        <template #footer><div class="flex justify-end gap-2 w-full"><UButton variant="ghost" @click="forwardOpen=false">Batal</UButton><UButton :loading="forwardLoading" @click="submitForward">Teruskan</UButton></div></template>
      </UModal>
    </template>
  </div>
</template>
