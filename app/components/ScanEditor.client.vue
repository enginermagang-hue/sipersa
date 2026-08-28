<script setup lang="ts">
import Cropper from 'cropperjs'

const props = defineProps<{
  images: string[]
  initialIndex?: number
}>()

const emit = defineEmits<{
  close: []
  save: [images: string[]]
}>()

const currentIndex = ref(props.initialIndex ?? 0)
const currentImage = computed(() => props.images[currentIndex.value])

const cropperRef = ref<any>(null)
const imageEl = ref<HTMLImageElement | null>(null)
const rotation = ref(0)
const scaleX = ref(1)
const scaleY = ref(1)
const isProcessing = ref(false)
const error = ref('')

let cropperInstance: any = null

function initCropper(imgSrc: string) {
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
  nextTick(() => {
    if (!imageEl.value) return
    cropperInstance = new Cropper(imageEl.value, {
      aspectRatio: NaN,
      viewMode: 1,
      dragMode: 'crop',
      guides: true,
      center: true,
      highlight: false,
      background: false,
      responsive: true,
      rotatable: true,
      scalable: true,
      zoomable: true,
      zoomOnTouch: true,
      zoomOnWheel: true,
      toggleDragModeOnDblclick: false,
      ready() {
        if (cropperInstance) {
          cropperInstance.zoomTo(0.8)
        }
      }
    })
  })
}

watch(currentImage, (src) => {
  if (src) initCropper(src)
}, { immediate: true })

onUnmounted(() => {
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
})

function rotate90(direction: 'left' | 'right') {
  if (!cropperInstance) return
  const angle = direction === 'left' ? -90 : 90
  rotation.value += angle
  cropperInstance.rotate(angle)
}

function flipHorizontal() {
  if (!cropperInstance) return
  scaleX.value *= -1
  cropperInstance.scaleX(scaleX.value)
}

function flipVertical() {
  if (!cropperInstance) return
  scaleY.value *= -1
  cropperInstance.scaleY(scaleY.value)
}

function zoom(delta: number) {
  if (!cropperInstance) return
  const currentZoom = cropperInstance.getData().scale || 1
  cropperInstance.zoomTo(currentZoom + delta)
}

function onSliderRotate(val: number) {
  if (!cropperInstance) return
  const current = rotation.value
  const delta = val - (current % 360)
  rotation.value = val
  cropperInstance.rotate(delta)
}

async function autoStraighten() {
  if (!imageEl.value || !cropperInstance) return
  isProcessing.value = true
  error.value = ''
  try {
    const canvas = cropperInstance.getCroppedCanvas()
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get canvas context')

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.drawImage(canvas, 0, 0)

    const angle = await detectSkew(tempCtx, canvas.width, canvas.height)
    if (angle === null) {
      error.value = 'Tidak dapat mendeteksi sudut. Coba manual.'
      return
    }

    const absAngle = Math.abs(angle)
    if (absAngle < 0.5) {
      error.value = 'Gambar sudah cukup lurus.'
      return
    }

    const resultCanvas = rotateCanvas(tempCanvas, -angle)
    const straightenedDataUrl = resultCanvas.toDataURL('image/jpeg', 0.9)

    const newImages = [...props.images]
    newImages[currentIndex.value] = straightenedDataUrl
    emit('save', newImages)
    initCropper(straightenedDataUrl)
  } catch (e: any) {
    error.value = 'Gagal auto straighten: ' + (e.message || 'Unknown error')
  } finally {
    isProcessing.value = false
  }
}

async function detectSkew(ctx: CanvasRenderingContext2D, width: number, height: number): Promise<number | null> {
  const tempCanvas = document.createElement('canvas')
  const size = 400
  tempCanvas.width = size
  tempCanvas.height = size
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, size, size)

  const imageData = tempCtx.getImageData(0, 0, size, size)
  const data = imageData.data
  const gray: number[] = []

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    gray.push(0.299 * r + 0.587 * g + 0.114 * b)
  }

  const sobelX: number[] = new Array(size * size).fill(0)
  const sobelY: number[] = new Array(size * size).fill(0)

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x
      const tl = gray[idx - size - 1], tc = gray[idx - size], tr = gray[idx - size + 1]
      const ml = gray[idx - 1], mr = gray[idx + 1]
      const bl = gray[idx + size - 1], bc = gray[idx + size], br = gray[idx + size + 1]
      sobelX[idx] = -tl - 2 * ml - bl + tr + 2 * mr + br
      sobelY[idx] = -tl - 2 * tc - tr + bl + 2 * bc + br
    }
  }

  const magnitude: number[] = new Array(size * size).fill(0)
  for (let i = 0; i < size * size; i++) {
    magnitude[i] = Math.sqrt(sobelX[i] * sobelX[i] + sobelY[i] * sobelY[i])
  }

  const threshold = 80
  const angles: number[] = []
  const pi = Math.PI

  for (let y = 1; y < size - 1; y += 4) {
    for (let x = 1; x < size - 1; x += 4) {
      const idx = y * size + x
      if (magnitude[idx] < threshold) continue
      const theta = Math.atan2(sobelY[idx], sobelX[idx])
      angles.push(theta)
    }
  }

  if (angles.length < 10) return null

  const median = angles.sort((a, b) => a - b)[Math.floor(angles.length / 2)]
  const skewAngle = (median * 180 / pi)
  return skewAngle > 45 ? skewAngle - 90 : skewAngle
}

function rotateCanvas(src: HTMLCanvasElement, angle: number): HTMLCanvasElement {
  const rad = angle * Math.PI / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const newWidth = src.width * cos + src.height * sin
  const newHeight = src.width * sin + src.height * cos

  const result = document.createElement('canvas')
  result.width = Math.round(newWidth)
  result.height = Math.round(newHeight)
  const ctx = result.getContext('2d')!

  ctx.translate(result.width / 2, result.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(src, -src.width / 2, -src.height / 2)

  return result
}

async function saveCurrentPage() {
  if (!cropperInstance) return
  isProcessing.value = true
  error.value = ''
  try {
    const canvas = cropperInstance.getCroppedCanvas()
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    const newImages = [...props.images]
    newImages[currentIndex.value] = dataUrl
    emit('save', newImages)
  } catch (e: any) {
    error.value = 'Gagal menyimpan halaman'
  } finally {
    isProcessing.value = false
  }
}

function prevPage() {
  if (currentIndex.value > 0) currentIndex.value--
}

function nextPage() {
  if (currentIndex.value < props.images.length - 1) currentIndex.value++
}

function getCroppedCanvas(): HTMLCanvasElement | null {
  if (!cropperInstance) return null
  return cropperInstance.getCroppedCanvas()
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-black" :style="{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }">
    <div class="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm border-b border-white/10 shrink-0">
      <div class="flex items-center gap-3">
        <UButton color="gray" variant="ghost" icon="i-lucide-arrow-left" size="sm" @click="emit('close')" />
        <span class="text-white font-medium text-sm sm:text-base">Edit Halaman {{ currentIndex + 1 }} / {{ images.length }}</span>
      </div>
      <UButton color="primary" size="sm" @click="saveCurrentPage" :disabled="isProcessing">
        <UIcon name="i-lucide-check" class="mr-1" /> Simpan
      </UButton>
    </div>

    <div class="flex-1 min-h-0 overflow-hidden relative">
      <div v-if="error" class="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-error/90 text-white rounded-lg text-xs sm:text-sm">
        {{ error }}
      </div>

      <div v-if="isProcessing" class="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
        <div class="flex flex-col items-center gap-2">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-white" />
          <span class="text-white text-sm">Memproses...</span>
        </div>
      </div>

      <div class="w-full h-full flex items-center justify-center p-2 sm:p-4">
        <img
          ref="imageEl"
          :src="currentImage"
          class="max-w-full max-h-full object-contain"
          style="max-height: calc(100dvh - 11rem);"
        />
      </div>
    </div>

    <div class="px-3 sm:px-4 py-3 bg-black/80 backdrop-blur-sm border-t border-white/10 shrink-0">
      <div class="flex flex-wrap items-center justify-center gap-1 sm:gap-2 mb-2 sm:mb-3">
        <UButton color="gray" variant="outline" size="sm" @click="rotate90('left')" title="Putar kiri 90°">
          <UIcon name="i-lucide-rotate-ccw" class="w-4 h-4" />
        </UButton>
        <UButton color="gray" variant="outline" size="sm" @click="rotate90('right')" title="Putar kanan 90°">
          <UIcon name="i-lucide-rotate-cw" class="w-4 h-4" />
        </UButton>
        <UButton color="gray" variant="outline" size="sm" @click="flipHorizontal" title="Balik horizontal">
          <UIcon name="i-lucide-flip-horizontal" class="w-4 h-4" />
        </UButton>
        <UButton color="gray" variant="outline" size="sm" @click="flipVertical" title="Balik vertical">
          <UIcon name="i-lucide-flip-vertical" class="w-4 h-4" />
        </UButton>
        <UButton color="yellow" variant="outline" size="sm" @click="autoStraighten" :disabled="isProcessing" title="Auto straighten">
          <UIcon name="i-lucide-straighten" class="w-4 h-4" />
        </UButton>
        <UButton color="gray" variant="outline" size="sm" @click="zoom(-0.1)" title="Zoom out">
          <UIcon name="i-lucide-zoom-out" class="w-4 h-4" />
        </UButton>
        <UButton color="gray" variant="outline" size="sm" @click="zoom(0.1)" title="Zoom in">
          <UIcon name="i-lucide-zoom-in" class="w-4 h-4" />
        </UButton>
      </div>

      <div class="flex items-center justify-center gap-2 sm:gap-3">
        <UButton color="gray" variant="ghost" size="sm" :disabled="currentIndex === 0" @click="prevPage" class="min-h-9 min-w-9">
          <UIcon name="i-lucide-chevron-left" />
        </UButton>
        <div class="flex gap-1 overflow-x-auto snap-x max-w-[60vw]" style="-webkit-overflow-scrolling: touch;">
          <div
            v-for="(img, i) in images"
            :key="i"
            class="flex-shrink-0 w-10 h-12 sm:w-8 sm:h-10 rounded border-2 cursor-pointer overflow-hidden transition-all snap-center"
            :class="i === currentIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'"
            @click="currentIndex = i"
          >
            <img :src="img" class="w-full h-full object-cover" />
          </div>
        </div>
        <UButton color="gray" variant="ghost" size="sm" :disabled="currentIndex === images.length - 1" @click="nextPage" class="min-h-9 min-w-9">
          <UIcon name="i-lucide-chevron-right" />
        </UButton>
      </div>
    </div>
  </div>
</template>
