<script setup lang="ts">
import { jsPDF } from 'jspdf'

const props = defineProps<{
  images: string[]
}>()

const emit = defineEmits<{
  close: []
  save: [file: File]
  editPage: [index: number]
}>()

const isProcessing = ref(false)
const error = ref('')
const aspectRatio = ref(1.5)

onMounted(() => {
  if (props.images.length > 0) {
    const img = new Image()
    img.onload = () => {
      aspectRatio.value = img.width / img.height
    }
    img.src = props.images[0]
  }
})

async function generatePDF() {
  isProcessing.value = true
  error.value = ''
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [612, 792]
    })

    for (let i = 0; i < props.images.length; i++) {
      if (i > 0) pdf.addPage()

      const imgData = props.images[i]
      const imgWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = imgWidth / aspectRatio.value

      if (imgHeight > pdf.internal.pageSize.getHeight()) {
        const scale = pdf.internal.pageSize.getHeight() / imgHeight
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth * scale, pdf.internal.pageSize.getHeight())
      } else {
        const yOffset = (pdf.internal.pageSize.getHeight() - imgHeight) / 2
        pdf.addImage(imgData, 'JPEG', 0, yOffset, imgWidth, imgHeight)
      }
    }

    const blob = pdf.output('blob')
    const fileName = `scan_${Date.now()}.pdf`
    const file = new File([blob], fileName, { type: 'application/pdf' })
    emit('save', file)
  } catch (e: any) {
    error.value = 'Gagal membuat PDF: ' + (e.message || 'Unknown error')
  } finally {
    isProcessing.value = false
  }
}

function removePage(index: number) {
  if (props.images.length <= 1) {
    emit('close')
    return
  }
  const newImages = props.images.filter((_, i) => i !== index)
  emit('save', newImages as any)
}

function editPage(index: number) {
  emit('editPage', index)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-black" :style="{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }">
    <div class="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm border-b border-white/10 shrink-0">
      <UButton color="gray" variant="ghost" icon="i-lucide-arrow-left" @click="emit('close')" />
      <span class="text-white font-medium text-sm sm:text-base">Review ({{ images.length }} halaman)</span>
      <div class="w-10 sm:w-20"></div>
    </div>

    <div class="flex-1 overflow-auto p-3 sm:p-4">
      <div v-if="error" class="mb-3 sm:mb-4 px-4 py-2 bg-error/90 text-white rounded-lg text-xs sm:text-sm text-center">
        {{ error }}
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
        <div
          v-for="(img, i) in images"
          :key="i"
          class="relative group aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden border-2 border-white/10 hover:border-primary active:border-primary transition-colors cursor-pointer"
        >
          <img :src="img" class="w-full h-full object-contain" />

          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 sm:opacity-0 group-active:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
            <UButton color="primary" variant="solid" size="sm" class="w-full min-h-9" @click.stop="editPage(i)">
              <UIcon name="i-lucide-edit" class="w-4 h-4 mr-1" /> Edit
            </UButton>
            <UButton color="error" variant="solid" size="sm" class="w-full min-h-9" @click.stop="removePage(i)">
              <UIcon name="i-lucide-trash-2" class="w-4 h-4 mr-1" /> Hapus
            </UButton>
          </div>

          <span class="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-1">
            {{ i + 1 }}
          </span>
        </div>
      </div>
    </div>

    <div class="p-3 sm:p-4 bg-black/80 backdrop-blur-sm border-t border-white/10 shrink-0">
      <div class="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3">
        <UButton color="gray" variant="outline" size="sm" class="min-h-10 sm:min-h-9" @click="emit('close')">
          Batal
        </UButton>
        <UButton
          color="primary"
          size="sm"
          class="min-h-10 sm:min-h-9"
          @click="generatePDF"
          :disabled="isProcessing || images.length === 0"
        >
          <UIcon v-if="isProcessing" name="i-lucide-loader-2" class="w-4 h-4 animate-spin mr-1" />
          <UIcon v-else name="i-lucide-file-check" class="w-4 h-4 mr-1" />
          Simpan PDF ({{ images.length }})
        </UButton>
      </div>
    </div>
  </div>
</template>
