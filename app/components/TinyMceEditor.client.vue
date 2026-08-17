<script setup lang="ts">
import Editor from '@tinymce/tinymce-vue'

const model = defineModel<string>({ default: '' })
const props = defineProps<{ height?: number }>()

const editorInit = {
  height: props.height ?? 600,
  menubar: false,
  plugins: 'lists link image table charmap code wordcount advlist autolink',
  toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link table image | removeformat code',
  font_formats: 'Inter=Inter, sans-serif; Times New Roman=Times New Roman, serif; Arial=Arial, Helvetica, sans-serif; Courier New=Courier New, monospace; Georgia=Georgia, serif',
  content_style: 'body { font-family: Inter, sans-serif; font-size: 14px; line-height: 1.6; }',
  branding: false,
  license_key: 'gpl'
}

const editorRef = ref<InstanceType<typeof Editor> | null>(null)

function getEditor(): any {
  return editorRef.value?.getEditor?.() ?? null
}

function setContent(html: string) {
  getEditor()?.setContent(html)
}

function getContent(): string {
  return getEditor()?.getContent() ?? ''
}

defineExpose({ getEditor, setContent, getContent })
</script>

<template>
  <Editor ref="editorRef" v-model="model" :init="editorInit" tinymce-script-src="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js" />
</template>
