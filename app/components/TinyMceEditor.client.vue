<script setup lang="ts">
import Editor from '@tinymce/tinymce-vue'

const model = defineModel<string>({ default: '' })
const props = defineProps<{
  height?: number
  paper?: boolean
  paperWidth?: number
  paperHeight?: number
  marginMm?: number
  fontFamily?: string
}>()

function buildContentStyle() {
  const f = props.fontFamily || 'Inter'
  return `body { font-family: ${f}, sans-serif; font-size: 14px; line-height: 1.6; }`
}

const editorInit = {
  height: props.height ?? undefined,
  min_height: 300,
  resize: false,
  menubar: false,
  plugins: 'lists link image table charmap code wordcount advlist autolink',
  toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link table image | removeformat code',
  font_formats: 'Inter=Inter, sans-serif; Times New Roman=Times New Roman, serif; Arial=Arial, Helvetica, sans-serif; Courier New=Courier New, monospace; Georgia=Georgia, serif',
  content_style: buildContentStyle(),
  branding: false,
  license_key: 'gpl',
  init_instance_callback: (ed: any) => {
    applyPaper(ed)
    ed.on('input change setcontent NodeChange', () => resizeSheet(ed))
    resizeSheet(ed)
    const ro = new ResizeObserver(() => {
      applyPaper(ed)
      resizeSheet(ed)
    })
    const area = ed.getContentAreaContainer()
    if (area) ro.observe(area)
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
      margin: '',
      width: '',
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
  const mm = Math.max(0, props.marginMm ?? 25)
  const area = target.getContentAreaContainer()
  const areaCs = area ? getComputedStyle(area) : null
  const contentW =
    area
      ? area.clientWidth -
        (parseFloat(areaCs?.paddingLeft || '') || 0) -
        (parseFloat(areaCs?.paddingRight || '') || 0)
      : body.clientWidth
  const scale = contentW / Math.min(PW, PH)
  const padPx = mm * scale

  target.dom.setStyles(body, {
    margin: '0 auto',
    width: `${contentW}px`,
    padding: `${padPx}px`,
    boxSizing: 'border-box',
    background: '#ffffff',
    aspectRatio: '',
    color: '#1a1a1a',
    overflow: 'visible'
  })
  if (doc) target.dom.setStyles(doc.documentElement, { overflow: '' })
  resizeSheet(target)
}

function resizeSheet(ed?: any) {
  const target = ed || getEditor()
  const body = target?.getBody?.()
  const container = target?.getContentAreaContainer?.()
  const iframe = container?.querySelector('iframe') as HTMLElement | null
  if (!body || !iframe) return
  if (props.paper) {
    iframe.style.height = `${body.scrollHeight}px`
  } else {
    iframe.style.height = ''
  }
}

watch(
  () => [props.paper, props.paperWidth, props.paperHeight, props.marginMm, props.fontFamily],
  () => applyPaper()
)

function applyFont() {
  const ed = getEditor()
  if (!ed || !ed.initialized) return
  ed.getBody().style.fontFamily = `${props.fontFamily || 'Inter'}, sans-serif`
}

watch(() => props.fontFamily, () => applyFont())

function setContent(html: string) {
  getEditor()?.setContent(html)
}

function getContent(): string {
  return getEditor()?.getContent() ?? ''
}

defineExpose({ getEditor, setContent, getContent })
</script>

<template>
  <div :class="{ 'is-paper': paper }" class="h-full min-h-0 flex flex-col [&_.tox]:flex-1 [&_.tox]:flex [&_.tox]:flex-col [&_.tox]:min-h-0 [&_.tox_.tox-edit-area]:flex-1 [&_.tox_.tox-edit-area]:min-h-0">
    <Editor ref="editorRef" v-model="model" :init="editorInit" tinymce-script-src="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js" />
  </div>
</template>

<style scoped>
.is-paper :deep(.tox .tox-edit-area) {
  background: #e2e8f0;
  padding: 32px;
  overflow: auto !important;
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 transparent;
  scrollbar-gutter: stable;
}
.is-paper :deep(.tox .tox-edit-area)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.is-paper :deep(.tox .tox-edit-area)::-webkit-scrollbar-track {
  background: transparent;
}
.is-paper :deep(.tox .tox-edit-area)::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 4px;
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
