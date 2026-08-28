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

const imageEl = ref<HTMLImageElement | null>(null)
const rotation = ref(0)
const scaleX = ref(1)
const scaleY = ref(1)
const isProcessing = ref(false)
const detecting = ref(false)
const error = ref('')
const detectError = ref('')

let cropperInstance: any = null

async function initCropper(imgSrc: string, autoCropRect?: { x: number; y: number; width: number; height: number }) {
  if (cropperInstance) {
    try { cropperInstance.destroy() } catch {}
    cropperInstance = null
  }
  await nextTick()
  if (!imageEl.value) return
  // pastikan image visible sebelum Cropper ukur (Cropper akan hide + clone)
  imageEl.value.style.display = 'block'
  imageEl.value.style.visibility = 'visible'
  imageEl.value.style.opacity = '1'
  // tunggu image benar-benar loaded sebelum Cropper ukur
  if (!imageEl.value.complete || imageEl.value.naturalWidth === 0) {
    await new Promise<void>((resolve) => {
      const el = imageEl.value!
      if (!el) return resolve()
      const onLoad = () => { el.removeEventListener('load', onLoad); el.removeEventListener('error', onErr); resolve() }
      const onErr = () => { el.removeEventListener('load', onLoad); el.removeEventListener('error', onErr); resolve() }
      el.addEventListener('load', onLoad)
      el.addEventListener('error', onErr)
      setTimeout(resolve, 800)
    })
  }
  if (!imageEl.value) return
  await nextTick()
  // pastikan host punya ukuran sebelum init
  await new Promise<void>(r => requestAnimationFrame(() => r()))
  try {
    cropperInstance = new Cropper(imageEl.value, {
      viewMode: 1,
      dragMode: 'crop',
      autoCrop: true,
      autoCropArea: 0.98,
      guides: true,
      center: true,
      highlight: false,
      background: false,
      responsive: true,
      restore: true,
      rotatable: true,
      scalable: true,
      zoomable: true,
      zoomOnTouch: true,
      zoomOnWheel: true,
      wheelZoomRatio: 0.1,
      toggleDragModeOnDblclick: false,
      aspectRatio: NaN,
      minContainerWidth: 200,
      minContainerHeight: 200,
      minCropBoxWidth: 40,
      minCropBoxHeight: 40,
      minCanvasWidth: 0,
      minCanvasHeight: 0,
      ready() {
        if (autoCropRect && cropperInstance) {
          nextTick(() => {
            try {
              cropperInstance.setCropBoxData({
                left: autoCropRect.x,
                top: autoCropRect.y,
                width: autoCropRect.width,
                height: autoCropRect.height
              })
            } catch {}
          })
        }
      }
    })
  } catch (e: any) {
    console.error('Cropper init failed', e)
    if (imageEl.value) {
      imageEl.value.style.display = 'block'
      imageEl.value.style.visibility = 'visible'
      imageEl.value.style.opacity = '1'
    }
    error.value = 'Gagal init cropper: ' + (e?.message || '')
  }
}

function destroyCropper() {
  if (cropperInstance) {
    try { cropperInstance.destroy() } catch {}
    cropperInstance = null
  }
  if (imageEl.value) {
    imageEl.value.style.display = 'block'
    imageEl.value.style.visibility = 'visible'
    imageEl.value.style.opacity = '1'
  }
}

async function detectPaperCorners(imgSrc: string): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const scanSize = 600
        const scale = Math.min(1, scanSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)

        const imageData = ctx.getImageData(0, 0, w, h)
        const data = imageData.data

        const gray: number[] = []
        for (let i = 0; i < data.length; i += 4) {
          gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
        }

        const blurSize = 5
        const blurred: number[] = new Array(w * h).fill(0)
        for (let y = blurSize; y < h - blurSize; y++) {
          for (let x = blurSize; x < w - blurSize; x++) {
            let sum = 0
            for (let dy = -blurSize; dy <= blurSize; dy++) {
              for (let dx = -blurSize; dx <= blurSize; dx++) {
                sum += gray[(y + dy) * w + (x + dx)]
              }
            }
            blurred[y * w + x] = sum / ((blurSize * 2 + 1) ** 2)
          }
        }

        const sobelX: number[] = new Array(w * h).fill(0)
        const sobelY: number[] = new Array(w * h).fill(0)
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x
            const tl = blurred[idx - w - 1], tc = blurred[idx - w], tr = blurred[idx - w + 1]
            const ml = blurred[idx - 1], mr = blurred[idx + 1]
            const bl = blurred[idx + w - 1], bc = blurred[idx + w], br = blurred[idx + w + 1]
            sobelX[idx] = -tl - 2 * ml - bl + tr + 2 * mr + br
            sobelY[idx] = -tl - 2 * tc - tr + bl + 2 * bc + br
          }
        }

        const magnitude: number[] = new Array(w * h).fill(0)
        for (let i = 0; i < w * h; i++) {
          magnitude[i] = Math.sqrt(sobelX[i] * sobelX[i] + sobelY[i] * sobelY[i])
        }

        const threshold = 60
        const edges: boolean[] = new Array(w * h).fill(false)
        for (let i = 0; i < w * h; i++) {
          edges[i] = magnitude[i] > threshold
        }

        const minArea = (w * h) * 0.08
        const visited: boolean[] = new Array(w * h).fill(false)
        function floodFill(startIdx: number): number[] {
          const pixels: number[] = []
          const stack = [startIdx]
          while (stack.length > 0) {
            const idx = stack.pop()!
            if (idx < 0 || idx >= w * h || visited[idx] || !edges[idx]) continue
            visited[idx] = true
            pixels.push(idx)
            const nx = idx % w, ny = Math.floor(idx / w)
            if (nx > 0) stack.push(idx - 1)
            if (nx < w - 1) stack.push(idx + 1)
            if (ny > 0) stack.push(idx - w)
            if (ny < h - 1) stack.push(idx + w)
          }
          return pixels
        }

        let bestRect = null
        let bestScore = 0

        for (let i = 0; i < w * h; i++) {
          if (edges[i] && !visited[i]) {
            const region = floodFill(i)
            if (region.length < minArea) continue

            const xs = region.map(idx => idx % w)
            const ys = region.map(idx => Math.floor(idx / w))
            const minX = Math.min(...xs), maxX = Math.max(...xs)
            const minY = Math.min(...ys), maxY = Math.max(...ys)
            const area = (maxX - minX) * (maxY - minY)
            const rectFit = region.length / area
            const aspect = (maxX - minX) / ((maxY - minY) || 1)
            if (rectFit > 0.5 && aspect > 0.3 && aspect < 3.0 && area > bestScore) {
              bestScore = area
              bestRect = {
                x: Math.round(minX / scale),
                y: Math.round(minY / scale),
                width: Math.round((maxX - minX) / scale),
                height: Math.round((maxY - minY) / scale)
              }
            }
          }
        }

        resolve(bestRect)
      } catch (e) {
        console.error('Paper detection error:', e)
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = imgSrc
  })
}

watch(currentImage, async (src) => {
  if (!src) return
  destroyCropper()
  rotation.value = 0
  scaleX.value = 1
  scaleY.value = 1
  error.value = ''
  detectError.value = ''
  // tampilkan cropper segera dengan area penuh, deteksi jalan background
  await initCropper(src)
  detecting.value = true
  try {
    const rect = await detectPaperCorners(src)
    if (rect && cropperInstance) {
      try {
        cropperInstance.setCropBoxData({
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height
        })
      } catch {}
    }
  } catch (e) {
    // deteksi gagal tidak block crop
  } finally {
    detecting.value = false
  }
}, { immediate: true })

onUnmounted(() => {
  destroyCropper()
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
  if (!cropperInstance || typeof cropperInstance.zoom !== 'function') return
  cropperInstance.zoom(delta)
}

function resetCrop() {
  if (!cropperInstance || typeof cropperInstance.reset !== 'function') return
  try { cropperInstance.reset() } catch {}
  rotation.value = 0
  scaleX.value = 1
  scaleY.value = 1
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
  isProcessing.value = true
  error.value = ''
  try {
    if (cropperInstance && typeof cropperInstance.getCroppedCanvas === 'function') {
      const canvas = cropperInstance.getCroppedCanvas({ imageSmoothingQuality: 'high' })
      if (!canvas) throw new Error('Canvas kosong')
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
      const newImages = [...props.images]
      newImages[currentIndex.value] = dataUrl
      emit('save', newImages)
      return
    }
    // fallback: simpan gambar asli tanpa crop jika cropper belum siap
    if (currentImage.value) {
      const newImages = [...props.images]
      // jika bukan dataURL cropped, tetap simpan asli
      newImages[currentIndex.value] = currentImage.value
      emit('save', newImages)
      return
    }
    throw new Error('Crop belum siap')
  } catch (e: any) {
    console.error(e)
    error.value = 'Gagal menyimpan halaman: ' + (e?.message || '')
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
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-black">
    <div class="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent" style="padding-top: calc(0.75rem + env(safe-area-inset-top));">
      <div class="flex items-center gap-2">
        <UButton color="gray" variant="ghost" icon="i-lucide-arrow-left" size="sm" @click="emit('close')" />
        <span class="text-white font-medium text-sm sm:text-base">Edit {{ currentIndex + 1 }}/{{ images.length }}</span>
      </div>
      <div class="flex items-center gap-2">
        <UButton color="gray" variant="ghost" size="sm" @click="resetCrop" title="Reset crop">
          <UIcon name="i-lucide-rotate-cw" class="w-4 h-4" />
        </UButton>
        <UButton color="primary" size="sm" @click="saveCurrentPage" :disabled="isProcessing">
          <UIcon name="i-lucide-check" class="mr-1" /> Simpan
        </UButton>
      </div>
    </div>

    <div class="absolute inset-0 flex flex-col" style="padding-top: calc(3.5rem + env(safe-area-inset-top)); padding-bottom: calc(8.5rem + env(safe-area-inset-bottom));">
      <div v-if="detecting" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 gap-3">
        <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-white" />
        <span class="text-white text-sm">Mendeteksi tepi kertas...</span>
      </div>

      <div v-if="error || detectError" class="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-error/90 text-white rounded-lg text-xs sm:text-sm max-w-xs text-center">
        {{ error || detectError }}
      </div>

      <div v-if="isProcessing" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 gap-3">
        <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-white" />
        <span class="text-white text-sm">Memproses...</span>
      </div>

      <div class="flex-1 min-h-0 w-full cropper-host flex items-center justify-center bg-black overflow-hidden">
        <img
          ref="imageEl"
          :src="currentImage"
          class="block max-w-full max-h-full object-contain"
          style="display:block;"
        />
      </div>
    </div>

    <div class="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent" :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }">
      <div class="px-3 sm:px-4 pt-4 pb-3">
        <div class="flex flex-wrap items-center justify-center gap-1 sm:gap-2 mb-2">
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
            <UIcon name="i-lucide-move-diagonal" class="w-4 h-4" />
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
              :class="i === currentIndex ? 'border-primary' : 'border-transparent opacity-50 hover:opacity-100'"
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
  </div>
</template>

<style>
.cropper-host {
  width: 100%;
  height: 100%;
  min-height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(.cropper-container) {
  direction: ltr !important;
  touch-action: none !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 50vh !important;
}
:deep(.cropper-wrap-box),
:deep(.cropper-canvas) {
  width: 100% !important;
  height: 100% !important;
}
:deep(.cropper-point) {
  width: 18px !important;
  height: 18px !important;
  border-radius: 50% !important;
  background: rgba(255, 200, 0, 0.9) !important;
  border: 2px solid rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 2px 6px rgba(0,0,0,0.5) !important;
  opacity: 1 !important;
}
:deep(.cropper-point.se) {
  width: 24px !important;
  height: 24px !important;
}
:deep(.cropper-line) {
  background-color: rgba(255, 255, 255, 0.6) !important;
}
:deep(.cropper-view-box) {
  outline: 2px solid rgba(255, 200, 0, 0.8) !important;
  outline-color: rgba(255, 200, 0, 0.3) !important;
}
:deep(.cropper-modal) {
  background-color: rgba(0, 0, 0, 0.5) !important;
}
:deep(.cropper-dashed) {
  border-color: rgba(255, 255, 255, 0.4) !important;
}
</style>
