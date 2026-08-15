<script setup lang="ts">
const { data, refresh } = await useFetch('/api/disposisi/me')
const { data: users } = await useFetch('/api/users')

const statusOptions = [
  { label: 'Baru', value: 'baru' },
  { label: 'Diproses', value: 'diproses' },
  { label: 'Selesai', value: 'selesai' }
]

const prioritasOptions = [
  { label: 'Normal', value: 'normal' },
  { label: 'Segera', value: 'segera' },
  { label: 'Penting', value: 'penting' }
]

const allowedTransitions: Record<string, string[]> = {
  baru: ['diproses', 'selesai'],
  diproses: ['selesai', 'baru'],
  selesai: []
}

function allowedStatus(current: string) {
  return statusOptions.filter((o) => o.value === current || allowedTransitions[current]?.includes(o.value))
}

const prioritasLabel: Record<string, string> = { normal: 'Normal', segera: 'Segera', penting: 'Penting' }
const prioritasColor: Record<string, string> = { normal: 'neutral', segera: 'warning', penting: 'error' }

function isOverdue(d: any) {
  return d.batas_waktu && d.status !== 'selesai' && d.batas_waktu < new Date().toISOString().slice(0, 10)
}

async function updateStatus(id: number, status: string) {
  await $fetch(`/api/disposisi/${id}`, { method: 'PUT', body: { status } })
  await refresh()
}

const userOptions = computed(() =>
  (users.value || []).map((u: any) => ({ label: u.nama, value: u.id }))
)

const fwdTarget = ref<any>(null)
const fwdForm = reactive({ kepada_user_id: null as number | null, instruksi: '', catatan: '', prioritas: 'normal', batas_waktu: '' })
const fwdLoading = ref(false)
const fwdError = ref('')

function openForward(d: any) {
  fwdTarget.value = d
  fwdForm.kepada_user_id = null
  fwdForm.instruksi = ''
  fwdForm.catatan = ''
  fwdForm.prioritas = 'normal'
  fwdForm.batas_waktu = ''
  fwdError.value = ''
}

async function forward() {
  if (!fwdTarget.value) return
  fwdLoading.value = true
  fwdError.value = ''
  try {
    await $fetch(`/api/disposisi/${fwdTarget.value.id}/teruskan`, {
      method: 'POST',
      body: { ...fwdForm }
    })
    fwdTarget.value = null
    await refresh()
  } catch (e: any) {
    fwdError.value = e?.data?.statusMessage || 'Gagal meneruskan'
  } finally {
    fwdLoading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-xl font-bold mb-4">Disposisi Saya</h1>
    <UCard>
      <ul class="divide-y divide-default">
        <li v-for="d in data || []" :key="d.id" class="py-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <NuxtLink :to="`/surat-masuk/${d.surat_masuk_id}`" class="font-medium hover:underline">
                {{ d.no_surat }}
              </NuxtLink>
              <div class="flex flex-wrap items-center gap-2 mt-1">
                <span class="text-xs text-muted">Dari: {{ d.dari_nama }} — {{ d.perihal }}</span>
                <UBadge :label="prioritasLabel[d.prioritas] || d.prioritas" size="xs" :color="prioritasColor[d.prioritas] || 'neutral'" variant="subtle" />
                <span v-if="d.batas_waktu" class="text-xs" :class="isOverdue(d) ? 'text-error font-semibold' : 'text-muted'">
                  Batas: {{ d.batas_waktu }}{{ isOverdue(d) ? ' (lewat)' : '' }}
                </span>
              </div>
              <div v-if="d.instruksi" class="text-xs mt-1">{{ d.instruksi }}</div>
            </div>
            <div class="flex items-center gap-2">
              <USelect
                :model-value="d.status"
                :items="allowedStatus(d.status)"
                class="w-36"
                @update:model-value="(v: string) => updateStatus(d.id, v)"
              />
              <UButton
                v-if="d.status !== 'selesai'"
                size="sm"
                variant="soft"
                icon="i-lucide-corner-up-right"
                @click="openForward(d)"
              >
                Teruskan
              </UButton>
            </div>
          </div>
        </li>
        <li v-if="!data?.length" class="py-4 text-center text-muted">Tidak ada disposisi</li>
      </ul>
    </UCard>

    <UModal v-model:open="fwdTarget" title="Teruskan Disposisi">
      <template #body>
        <UForm id="fwd-form" :state="fwdForm" class="space-y-3" @submit="forward">
          <UFormField label="Kepada" name="kepada_user_id">
            <USelect v-model="fwdForm.kepada_user_id" :items="userOptions" class="w-full" placeholder="Pilih user" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Prioritas">
              <USelect v-model="fwdForm.prioritas" :items="prioritasOptions" class="w-full" />
            </UFormField>
            <UFormField label="Batas Waktu">
              <UInput v-model="fwdForm.batas_waktu" type="date" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Instruksi">
            <UTextarea v-model="fwdForm.instruksi" class="w-full" />
          </UFormField>
          <UFormField label="Catatan">
            <UTextarea v-model="fwdForm.catatan" class="w-full" />
          </UFormField>
          <p v-if="fwdError" class="text-sm text-error">{{ fwdError }}</p>
        </UForm>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="fwdTarget = null">Batal</UButton>
          <UButton type="submit" form="fwd-form" :loading="fwdLoading">Kirim</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
