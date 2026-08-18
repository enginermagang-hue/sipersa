<script setup lang="ts">
import Editor from '@tinymce/tinymce-vue'

const model = defineModel<string>({ default: '' })
const props = defineProps<{
  height?: number
  paper?: boolean
  paperWidth?: number
  paperHeight?: number
  orientation?: 'portrait' | 'landscape'
  marginMm?: number
}>()

const editorInit = {
  height: props.height ?? 600,
  menubar: false,
  plugins: 'lists link image table charmap code wordcount advlist autolink',
  toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link table image | removeformat code',
  font_formats: 'Inter=Inter, sans-serif; Times New Roman=Times New Roman, serif; Arial=Arial, Helvetica, sans-serif; Courier New=Courier New, monospace; Georgia=Georgia, serif',
  content_style: 'body { font-family: Inter, sans-serif; font-size: 14px; line-height: 1.6; }',
  branding: false,
  license_key: 'gpl',
  init_instance_callback: (ed: any) => {
    applyPaper(ed)
    ed.on('input change setcontent NodeChange', () => resizeSheet(ed))
    resizeSheet(ed)
  }
}

const editorRef = ref<InstanceType<typeof Editor> | null>(null)

function getEditor(): any {
  return editorRef.value?.getEditor?.() ?? null
}

function applyPaper(ed?: any) {
  const target = ed || getEditor()
  const body = target?.getBody?.()
  const doc = target?.getDoc?.()
  if (!body) return

  if (!props.paper) {
    target.dom.setStyles(body, {
      margin: '0',
      padding: '',
      boxSizing: '',
      background: '',
      aspectRatio: '',
      color: '',
      overflow: ''
    })
    if (doc) target.dom.setStyles(doc.documentElement, { overflow: '' })
    resizeSheet(target)
    return
  }

  const PW = props.paperWidth ?? 210
  const PH = props.paperHeight ?? 297
  const orient = props.orientation ?? 'portrait'
  const mm = Math.max(0, props.marginMm ?? 25)
  const [sheetW, sheetH] = orient === 'landscape' ? [Math.max(PW, PH), Math.min(PW, PH)] : [PW, PH]
  const horizMm = orient === 'landscape' ? PH : PW
  const padPct = (mm / horizMm) * 100

  target.dom.setStyles(body, {
    margin: '0',
    padding: `${padPct}%`,
    boxSizing: 'border-box',
    background: '#ffffff',
    aspectRatio: `${sheetW} / ${sheetH}`,
    color: '#1a1a1a',
    overflow: 'hidden'
  })
  if (doc) target.dom.setStyles(doc.documentElement, { overflow: 'hidden' })
  resizeSheet(target)
}

function resizeSheet(ed?: any) {
  const target = ed || getEditor()
  const body = target?.getBody?.()
  const container = target?.getContentAreaContainer?.()
  const iframe = container?.querySelector('iframe')
  if (!body || !iframe) return
  iframe.style.height = props.paper ? `${body.scrollHeight}px` : ''
}

watch(
  () => [props.paper, props.paperWidth, props.paperHeight, props.orientation, props.marginMm],
  () => applyPaper()
)

function setContent(html: string) {
  getEditor()?.setContent(html)
}

function getContent(): string {
  return getEditor()?.getContent() ?? ''
}

defineExpose({ getEditor, setContent, getContent })
</script>

<template>
  <div :class="{ 'is-paper': paper }">
    <Editor ref="editorRef" v-model="model" :init="editorInit" tinymce-script-src="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js" />
  </div>
</template>

<style scoped>
.is-paper :deep(.tox .tox-edit-area) {
  background: #e2e8f0;
  padding: 32px;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.is-paper :deep(.tox .tox-edit-area:hover) {
  scrollbar-color: #94a3b8 transparent;
}
.is-paper :deep(.tox .tox-edit-area)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.is-paper :deep(.tox .tox-edit-area)::-webkit-scrollbar-track {
  background: transparent;
}
.is-paper :deep(.tox .tox-edit-area)::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
  transition: background 0.15s;
}
.is-paper :deep(.tox .tox-edit-area:hover)::-webkit-scrollbar-thumb,
.is-paper :deep(.tox .tox-edit-area:active)::-webkit-scrollbar-thumb {
  background: #94a3b8;
}

.is-paper :deep(.tox .tox-edit-area__iframe) {
  position: relative;
  display: block;
  width: 100%;
  height: auto;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.18);
  overflow: hidden !important;
}
</style>
