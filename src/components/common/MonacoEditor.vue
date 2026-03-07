<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { initMonaco } from '@/utils/monacoSetup'

const props = withDefaults(defineProps<{
  modelValue: string
  language?: string
  readOnly?: boolean
}>(), {
  language: 'javascript',
  readOnly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const container = ref<HTMLDivElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let isUpdatingFromProp = false

onMounted(() => {
  if (!container.value) return
  initMonaco()

  editor = monaco.editor.create(container.value, {
    value: props.modelValue,
    language: props.language,
    theme: 'vs-dark',
    minimap: { enabled: false },
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    lineNumbers: 'on',
    lineNumbersMinChars: 3,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    readOnly: props.readOnly,
    tabSize: 2,
    renderLineHighlight: 'line',
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    padding: { top: 8, bottom: 8 },
    suggest: {
      showMethods: true,
      showFunctions: true,
      showProperties: true,
      showSnippets: true,
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },
  })

  editor.onDidChangeModelContent(() => {
    if (!isUpdatingFromProp) {
      emit('update:modelValue', editor!.getValue())
    }
  })
})

watch(() => props.modelValue, (newVal) => {
  if (editor && editor.getValue() !== newVal) {
    isUpdatingFromProp = true
    editor.setValue(newVal)
    isUpdatingFromProp = false
  }
})

onBeforeUnmount(() => {
  editor?.dispose()
})
</script>

<template>
  <div ref="container" class="h-full w-full" />
</template>
