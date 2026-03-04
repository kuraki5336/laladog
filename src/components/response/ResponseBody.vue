<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HttpResponse, ResponseViewMode } from '@/types'

const isTauri = !!(window as any).__TAURI_INTERNALS__

const props = defineProps<{
  response: HttpResponse
}>()

const viewMode = ref<ResponseViewMode>('pretty')
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

const isBinary = computed(() => props.response.bodyEncoding === 'base64')

const formattedBody = computed(() => {
  if (isBinary.value) {
    return `[Binary data - ${formatSize(props.response.size)}]\n\nUse "Save to File" to download.`
  }

  if (viewMode.value === 'raw') return props.response.body

  // Try to format as JSON
  try {
    const parsed = JSON.parse(props.response.body)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return props.response.body
  }
})

const isJson = computed(() => {
  if (isBinary.value) return false
  try {
    JSON.parse(props.response.body)
    return true
  } catch {
    return false
  }
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 根據 Content-Type 推斷副檔名 */
function guessExtension(contentType: string): string {
  const ct = contentType.toLowerCase()
  if (ct.includes('json')) return '.json'
  if (ct.includes('xml')) return '.xml'
  if (ct.includes('html')) return '.html'
  if (ct.includes('csv')) return '.csv'
  if (ct.includes('plain')) return '.txt'
  if (ct.includes('pdf')) return '.pdf'
  if (ct.includes('png')) return '.png'
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg'
  if (ct.includes('gif')) return '.gif'
  if (ct.includes('svg')) return '.svg'
  if (ct.includes('zip')) return '.zip'
  if (ct.includes('gzip')) return '.gz'
  if (ct.includes('openxmlformats-officedocument.spreadsheetml')) return '.xlsx'
  if (ct.includes('ms-excel') || ct.includes('vnd.ms-excel')) return '.xls'
  if (ct.includes('openxmlformats-officedocument.wordprocessingml')) return '.docx'
  if (ct.includes('msword')) return '.doc'
  if (ct.includes('openxmlformats-officedocument.presentationml')) return '.pptx'
  if (ct.includes('ms-powerpoint')) return '.ppt'
  if (ct.includes('octet-stream')) return '.bin'
  return '.bin'
}

/** 取得檔案名稱建議 */
function suggestFilename(): string {
  // 從 Content-Disposition header 取得
  const disposition = props.response.headers['content-disposition'] || ''
  const match = disposition.match(/filename[*]?=(?:UTF-8''|"?)([^";]+)/i)
  if (match) return decodeURIComponent(match[1].replace(/"/g, ''))

  const contentType = props.response.headers['content-type'] || ''
  const ext = guessExtension(contentType)
  return `response${ext}`
}

async function copyToClipboard() {
  await navigator.clipboard.writeText(props.response.body)
}

async function saveToFile() {
  saveStatus.value = 'saving'

  try {
    const filename = suggestFilename()
    const contentType = props.response.headers['content-type'] || ''
    const ext = guessExtension(contentType)

    if (isTauri) {
      // Tauri: 系統另存新檔對話框
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile, writeTextFile } = await import('@tauri-apps/plugin-fs')

      const filePath = await save({
        defaultPath: filename,
        filters: [{
          name: ext.replace('.', '').toUpperCase(),
          extensions: [ext.replace('.', '')],
        }],
      })

      if (!filePath) {
        saveStatus.value = 'idle'
        return
      }

      if (isBinary.value) {
        // base64 → Uint8Array → 寫入檔案
        const raw = atob(props.response.body)
        const bytes = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) {
          bytes[i] = raw.charCodeAt(i)
        }
        await writeFile(filePath, bytes)
      } else {
        await writeTextFile(filePath, props.response.body)
      }
    } else {
      // 瀏覽器: Blob + download
      let blob: Blob
      if (isBinary.value) {
        const raw = atob(props.response.body)
        const bytes = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) {
          bytes[i] = raw.charCodeAt(i)
        }
        blob = new Blob([bytes], { type: contentType || 'application/octet-stream' })
      } else {
        blob = new Blob([props.response.body], { type: contentType || 'text/plain' })
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }

    saveStatus.value = 'saved'
    setTimeout(() => { saveStatus.value = 'idle' }, 2000)
  } catch (e: any) {
    console.error('Save to file failed:', e)
    saveStatus.value = 'error'
    setTimeout(() => { saveStatus.value = 'idle' }, 2000)
  }
}
</script>

<template>
  <div>
    <!-- View Mode Toggle -->
    <div class="mb-2 flex items-center gap-2">
      <button
        v-for="mode in (['pretty', 'raw', 'preview'] as const)"
        :key="mode"
        class="rounded-sm px-2 py-1 text-xs capitalize transition-colors"
        :class="viewMode === mode ? 'bg-primary-10 text-primary' : 'text-text-muted hover:text-text-primary'"
        @click="viewMode = mode"
      >
        {{ mode }}
      </button>

      <div class="ml-auto flex items-center gap-1">
        <!-- Save to File -->
        <button
          class="rounded-sm px-2 py-1 text-xs transition-colors"
          :class="{
            'text-success': saveStatus === 'saved',
            'text-danger': saveStatus === 'error',
            'text-text-muted hover:text-text-primary': saveStatus === 'idle',
            'text-text-muted animate-pulse': saveStatus === 'saving',
          }"
          :disabled="saveStatus === 'saving'"
          @click="saveToFile"
        >
          <span v-if="saveStatus === 'saving'">Saving...</span>
          <span v-else-if="saveStatus === 'saved'">Saved!</span>
          <span v-else-if="saveStatus === 'error'">Failed</span>
          <span v-else>
            <svg xmlns="http://www.w3.org/2000/svg" class="inline-block h-3.5 w-3.5 mr-0.5 align-text-bottom" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            Save to File
          </span>
        </button>

        <!-- Copy -->
        <button
          v-if="!isBinary"
          class="rounded-sm px-2 py-1 text-xs text-text-muted hover:text-text-primary"
          @click="copyToClipboard"
        >
          Copy
        </button>
      </div>
    </div>

    <!-- Binary Preview -->
    <div v-if="isBinary" class="flex flex-col items-center justify-center rounded-button border border-border bg-bg-stripe p-8 text-center">
      <div class="mb-2 text-3xl">📄</div>
      <div class="mb-1 text-sm font-medium text-text-primary">Binary Response</div>
      <div class="mb-3 text-xs text-text-muted">{{ formatSize(response.size) }} &middot; {{ response.headers['content-type'] || 'unknown type' }}</div>
      <button
        class="rounded-button bg-secondary px-4 py-2 text-xs font-medium text-white transition-all hover:bg-secondary-60 active:scale-[0.97]"
        @click="saveToFile"
      >
        Save to File
      </button>
    </div>

    <!-- Preview Mode (HTML) -->
    <div v-else-if="viewMode === 'preview'" class="rounded-button border border-border">
      <iframe
        :srcdoc="response.body"
        class="h-64 w-full rounded-button"
        sandbox=""
      />
    </div>

    <!-- Pretty / Raw Mode -->
    <pre
      v-else
      class="max-h-96 overflow-auto rounded-button border border-border bg-bg-stripe p-3 font-mono text-xs leading-5 text-text-primary"
    ><code :class="{ 'text-primary-50': isJson && viewMode === 'pretty' }">{{ formattedBody }}</code></pre>
  </div>
</template>
