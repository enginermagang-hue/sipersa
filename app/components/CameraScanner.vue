<script setup lang="ts">
import { jsPDF } from 'jspdf'

const emit = defineEmits<{
  close: []
  capture: [file: File]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)
const capturedImages = ref<string[]>([])
const isLoading = ref(false)
const error = ref('')
const currentFacing = ref<'environment' | 'user'>('environment')

onMounted(async () => {
  await startCamera()
})

onUnmounted(() => {
  stopCamera()
})

async function startCamera() {
  isLoading.value = true
  error.value = ''
  stopCamera()
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: currentFacing.value,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream.value
      await videoRef.value.play()
    }
  } catch (e: any) {
    if (e.name === 'NotAllowedError') {
      error.value = 'Kamera tidak diizinkan. Mohon izinkan akses kamera.'
    } else if (e.name === 'NotFoundError') {
      error.value = 'Kamera tidak ditemukan.'
    } else {
      error.value = 'Gagal mengakses kamera.'
    }
  } finally {
    isLoading.value = false
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach(t => t.stop())
    stream.value = null
  }
}

function capture() {
  if (!videoRef.value) return
  const canvas = document.createElement('canvas')
  canvas.width = videoRef.value.videoWidth
  canvas.height = videoRef.value.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(videoRef.value, 0, 0)
  capturedImages.value.push(canvas.toDataURL('image/jpeg', 0.9))
}

function removeCapture(index: number) {
  capturedImages.value.splice(index, 1)
}

async function finish() {
  if (capturedImages.value.length === 0) return
  isLoading.value = true
  try {
    const pdf = new jsPDF({
      orientation: capturedImages.value.length === 1 ? 'portrait' : 'portrait',
      unit: 'px',
      format: [612, 792]
    })
    for (let i = 0; i < capturedImages.value.length; i++) {
      if (i > 0) pdf.addPage()
      const img = capturedImages.value[i]
      const imgWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (videoRef.value!.videoHeight / videoRef.value!.videoWidth) * imgWidth
      pdf.addImage(img, 'JPEG', 0, 0, imgWidth, imgHeight)
    }
    const blob = pdf.output('blob')
    const file = new File([blob], `scan_${Date.now()}.pdf`, { type: 'application/pdf' })
    emit('capture', file)
    emit('close')
  } catch (e) {
    error.value = 'Gagal membuat PDF'
  } finally {
    isLoading.value = false
  }
}

function switchCamera() {
  currentFacing.value = currentFacing.value === 'environment' ? 'user' : 'environment'
  startCamera()
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
    <div class="bg-background rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh]">
      <div class="flex items-center justify-between p-4 border-b">
        <h3 class="font-semibold text-lg">Scan Dokumen</h3>
        <UButton color="gray" variant="ghost" icon="i-lucide-x" @click="emit('close')" />
      </div>

      <div class="p-4 flex-1 overflow-auto">
        <div v-if="error" class="mb-4 p-3 bg-error/10 text-error rounded-lg text-sm">
          {{ error }}
        </div>

        <div class="relative bg-black rounded-lg overflow-hidden mb-4" style="aspect-ratio: 4/3;">
          <video
            v-show="!error"
            ref="videoRef"
            autoplay
            playsinline
            muted
            class="w-full h-full object-contain"
          />
          <div v-if="isLoading && !error" class="absolute inset-0 flex items-center justify-center bg-black/50">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin" />
          </div>
        </div>

        <div class="flex gap-2 justify-center mb-4">
          <UButton @click="capture" :disabled="isLoading || !!error" class="px-6">
            <UIcon name="i-lucide-camera" class="mr-1" /> Capture
          </UButton>
          <UButton color="gray" @click="switchCamera" :disabled="isLoading">
            <UIcon name="i-lucide-switch-camera" class="mr-1" /> Flip
          </UButton>
        </div>

        <div v-if="capturedImages.length > 0" class="border-t pt-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-medium">Halaman ({{ capturedImages.length }})</p>
            <UButton color="red" variant="ghost" size="sm" @click="capturedImages = []">
              Hapus Semua
            </UButton>
          </div>
          <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
            <div
              v-for="(img, i) in capturedImages"
              :key="i"
              class="relative group aspect-[3/4] bg-muted rounded overflow-hidden border"
            >
              <img :src="img" class="w-full h-full object-cover" />
              <UButton
                color="red"
                variant="solid"
                size="xs"
                class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                @click="removeCapture(i)"
              >
                <UIcon name="i-lucide-x" />
              </UButton>
              <span class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">
                {{ i + 1 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t flex justify-end gap-2">
        <UButton color="gray" variant="outline" @click="emit('close')">Batal</UButton>
        <UButton
          @click="finish"
          :disabled="capturedImages.length === 0 || isLoading"
        >
          <UIcon name="i-lucide-check" class="mr-1" /> Selesai ({{ capturedImages.length }} halaman)
        </UButton>
      </div>
    </div>
  </div>
</template>
