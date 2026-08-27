<script setup lang="ts">
import '@uppy/core/css/style.min.css'
import '@uppy/dashboard/css/style.min.css'
import '@uppy/image-editor/css/style.min.css'
import { onBeforeUnmount, onMounted } from 'vue'

const emit = defineEmits<{
  change: [File | null]
  error: [string]
  uploaded: [{ blob: Blob | null; file_name: string | null }]
}>()

let uppy: any = null
let dashboard: any = null

onMounted(async () => {
  const { default: Uppy } = await import('@uppy/core')
  const { default: Dashboard } = await import('@uppy/dashboard')
  const { default: ImageEditor } = await import('@uppy/image-editor')
  const { default: XHRUpload } = await import('@uppy/xhr-upload')

  uppy = new Uppy({
    autoProceed: false,
    restrictions: {
      allowedFileTypes: ['image/*'],
      maxFileSize: 2 * 1024 * 1024,
    },
  })
    .use(Dashboard, {
      inline: false,
      theme: 'light',
      closeModalOnClickOutside: true,
      disablePageScrollWhenModalOpen: true,
      autoOpen: 'imageEditor',
      proudlyDisplayPoweredByUppy: false,
      note: 'PNG/JPG, maks 2 MB, rasio 2:1',
      locale: {
        strings: {
          browse: 'Pilih berkas',
          dropHereOr: 'Letakkan di sini atau %{browse}',
          dropPaste: 'Letakkan gambar di sini, %{browse} atau tempel',
          uploadComplete: 'Unggah selesai',
          uploadFailed: 'Unggah gagal',
          pleasePress: 'Silakan tekan %{retry} untuk mencoba lagi',
        },
      },
    })
    .use(ImageEditor, {
      quality: 0.92,
      actions: {
        cropSquare: false,
        cropWidescreen: false,
        cropWidescreenVertical: false,
        revert: true,
        rotate: true,
        granularRotate: true,
        flip: true,
        zoomIn: true,
        zoomOut: true,
      },
      cropperOptions: {
        aspectRatio: 2,
        initialAspectRatio: 2,
        viewMode: 1,
        background: false,
        autoCropArea: 1,
        responsive: true,
      },
      locale: {
        strings: {
          revert: 'Kembalikan',
          rotate: 'Putar',
          zoomIn: 'Perbesar',
          zoomOut: 'Perkecil',
          flipHorizontal: 'Balik horizontal',
          aspectRatioSquare: 'Kotak',
          aspectRatioLandscape: 'Lanskap (16:9)',
          aspectRatioPortrait: 'Potret (9:16)',
        },
      },
    })
    .use(XHRUpload, { endpoint: '/api/users/upload-ttd', fieldName: 'file' })

  dashboard = uppy.getPlugin('Dashboard')

  uppy.on('complete', (result: any) => {
    if (result.successful?.length) {
      const f = uppy.getFile(result.successful[0].id)
      const blob = (f?.data as Blob) || null
      const file_name = (result.successful[0].response?.body as any)?.file_name || null
      dashboard?.closeModal()
      uppy.clear()
      emit('uploaded', { blob, file_name })
    }
  })
  uppy.on('upload-error', (_file: any, _error: any, response: any) =>
    emit('error', (response?.body as any)?.statusMessage || 'Gagal mengunggah tanda tangan'),
  )

  uppy.on('file-added', (file: any) => {
    uppy.getFiles().forEach((f: any) => {
      if (f.id !== file.id) uppy.removeFile(f.id)
    })
    emit('change', (file.data as File) || null)
  })
  uppy.on('file-editor:complete', (file: any) => emit('change', (file.data as File) || null))
  uppy.on('file-removed', () => emit('change', null))
  uppy.on('restriction-failed', (_file: any, error: any) =>
    emit('error', error?.message || 'Berkas tidak valid'),
  )
})

onBeforeUnmount(() => {
  uppy?.destroy()
})

defineExpose({
  open: () => dashboard?.openModal(),
  clear: () => {
    uppy?.clear()
    emit('change', null)
  },
})
</script>

<template>
  <div />
</template>
