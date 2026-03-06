<script setup lang="ts">
import { ref } from 'vue'
import { useRequestStore } from '@/stores/requestStore'
import type { HttpResponse } from '@/types/response'

const props = defineProps<{
  type: 'pre-request' | 'tests'
  response?: HttpResponse | null
}>()

const script = defineModel<string>({ default: '' })
const output = ref('')
const isRunning = ref(false)

const placeholder = props.type === 'pre-request'
  ? `// Pre-request Script\n// Available: pm.environment / pm.collectionVariables / pm.request\n//            CryptoJS (HmacSHA256, enc.Base64, etc.)\n\nconsole.log("Pre-request running...");`
  : `// Tests — 從 Response 擷取值存為環境變數\n// Available: pm.response.status / json() / headers\n//            pm.environment.set(key, value)\n//            pm.test(name, fn) / pm.expect(value)\n\nconst res = pm.response.json();\nif (res.data && res.data.accessToken) {\n  pm.environment.set("token", res.data.accessToken);\n  console.log("Token saved!");\n}`

/** 執行 script（使用 requestStore 統一的 executeScript） */
async function runScript() {
  isRunning.value = true
  output.value = ''

  try {
    const requestStore = useRequestStore()
    const req = requestStore.activeRequest
    const reqCtx = req ? {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(
        (req.headers || []).filter((h: any) => h.enabled && h.key).map((h: any) => [h.key, h.value]),
      ),
      body: req.body?.raw || null,
    } : undefined
    const result = requestStore.executeScript(script.value || '', props.response, reqCtx)
    output.value = result || 'Script executed successfully (no output)'
  } catch (e: any) {
    output.value = `Error: ${e.message}`
  } finally {
    isRunning.value = false
  }
}

/** 外部呼叫（sendRequest 自動執行用） */
defineExpose({ runScript })
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Editor -->
    <div class="flex items-center justify-between border-b border-border px-3 py-1">
      <span class="text-xs font-medium text-text-secondary dark:text-slate-400">
        {{ type === 'pre-request' ? 'Pre-request Script' : 'Tests' }}
      </span>
      <button
        class="rounded-sm bg-secondary px-3 py-1 text-xs text-white hover:bg-secondary-60 disabled:opacity-50"
        :disabled="isRunning"
        @click="runScript"
      >
        {{ isRunning ? 'Running...' : 'Run' }}
      </button>
    </div>

    <textarea
      v-model="script"
      class="flex-1 resize-none border-b border-border bg-bg-stripe p-3 font-mono text-xs outline-none dark:bg-slate-900 dark:text-slate-300"
      :placeholder="placeholder"
      spellcheck="false"
    />

    <!-- Output -->
    <div class="h-24 overflow-y-auto bg-primary-90 p-2 font-mono text-xs text-green-400">
      <div v-if="!output" class="text-text-muted">Output will appear here...</div>
      <pre v-else class="whitespace-pre-wrap">{{ output }}</pre>
    </div>
  </div>
</template>
