<script setup lang="ts">
import { jsPDF } from 'jspdf'

const emit = defineEmits<{
  close: []
  capture: [file: File]
}>()

type Step = 'camera' | 'review' | 'edit'

const step = ref<Step>('camera')
const capturedImages = ref<string[]>([])
const isLoading = ref(false)
const error = ref('')
const currentFacing = ref<'environment' | 'user'>('environment')
const isFullscreen = ref(false)
const editingIndex = ref(0)

const videoRef = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)

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

function switchCamera() {
  currentFacing.value = currentFacing.value === 'environment' ? 'user' : 'environment'
  startCamera()
}

function goToReview() {
  if (capturedImages.value.length === 0) return
  step.value = 'review'
  stopCamera()
}

function goToCamera() {
  step.value = 'camera'
  startCamera()
}

async function onReviewSave(file: File) {
  emit('capture', file)
  emit('close')
}

function onEditPage(index: number) {
  editingIndex.value = index
  stopCamera()
  step.value = 'edit'
}

async function onEditorSave(images: string[]) {
  capturedImages.value = images
  step.value = 'review'
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-black">
    <div v-if="step === 'camera'" class="flex-1 flex flex-col">
      <div class="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
        <UButton color="gray" variant="ghost" icon="i-lucide-x" @click="emit('close')" />
        <span class="text-white font-medium">Scan Dokumen</span>
        <div class="w-10"></div>
      </div>

      <div class="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div v-if="error" class="mb-4 px-4 py-3 bg-error/90 text-white rounded-lg text-sm max-w-md text-center">
          {{ error }}
        </div>

        <div class="relative w-full max-w-4xl bg-neutral-900 rounded-lg overflow-hidden" style="aspect-ratio: 4/3;">
          <video
            v-show="!error"
            ref="videoRef"
            autoplay
            playsinline
            muted
            class="w-full h-full object-contain"
          />
          <div v-if="isLoading && !error" class="absolute inset-0 flex items-center justify-center bg-black/50">
            <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-white" />
          </div>
        </div>
      </div>

      <div class="p-4 bg-black/60 backdrop-blur-sm">
        <div v-if="capturedImages.length > 0" class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <p class="text-white/70 text-sm">Halaman ({{ capturedImages.length }})</p>
            <UButton color="red" variant="ghost" size="xs" @click="capturedImages = []">
              Hapus Semua
            </UButton>
          </div>
          <div class="flex gap-2 overflow-x-auto pb-2">
            <div
              v-for="(img, i) in capturedImages"
              :key="i"
              class="relative flex-shrink-0 w-16 h-20 bg-neutral-800 rounded overflow-hidden border border-white/20"
            >
              <img :src="img" class="w-full h-full object-cover" />
              <UButton
                color="red"
                variant="solid"
                size="xs"
                class="absolute top-0.5 right-0.5 w-5 h-5 p-0"
                @click="removeCapture(i)"
              >
                <UIcon name="i-lucide-x" class="w-3 h-3" />
              </UButton>
              <span class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">
                {{ i + 1 }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex gap-3 justify-center">
          <UButton
            color="gray"
            variant="outline"
            @click="switchCamera"
            :disabled="isLoading"
            class="px-6"
          >
            <UIcon name="i-lucide-switch-camera" class="mr-1" /> Flip
          </UButton>
          <UButton
            color="primary"
            @click="capture"
            :disabled="isLoading || !!error"
            class="px-8"
          >
            <UIcon name="i-lucide-camera" class="mr-1" /> Capture
          </UButton>
          <UButton
            v-if="capturedImages.length > 0"
            color="success"
            @click="goToReview"
            class="px-6"
          >
            <UIcon name="i-lucide-file-check" class="mr-1" /> Selesai
          </UButton>
        </div>
      </div>
    </div>

    <ScanReview
      v-else-if="step === 'review'"
      :images="capturedImages"
      @close="goToCamera"
      @save="onReviewSave"
      @edit-page="onEditPage"
    />

    <ScanEditor
      v-else-if="step === 'edit'"
      :images="capturedImages"
      :initial-index="editingIndex"
      @close="goToCamera"
      @save="onEditorSave"
    />
  </div>
</template>
