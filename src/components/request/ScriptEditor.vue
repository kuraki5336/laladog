<script setup lang="ts">
import { ref } from 'vue'
import { useEnvironmentStore } from '@/stores/environmentStore'
import type { HttpResponse } from '@/types/response'

const props = defineProps<{
  type: 'pre-request' | 'tests'
  response?: HttpResponse | null
}>()

const script = defineModel<string>({ default: '' })
const output = ref('')
const isRunning = ref(false)

const placeholder = props.type === 'pre-request'
  ? `// Pre-request Script\n// Available: pm.environment.set(key, value)\n//            pm.environment.get(key)\n\nconsole.log("Pre-request running...");`
  : `// Tests — 從 Response 擷取值存為環境變數\n// Available: pm.response.status / json() / headers\n//            pm.environment.set(key, value)\n//            pm.test(name, fn) / pm.expect(value)\n\nconst res = pm.response.json();\nif (res.data && res.data.accessToken) {\n  pm.environment.set("token", res.data.accessToken);\n  console.log("Token saved!");\n}`

/** 建構真實 pm 物件 */
function buildPm(logs: string[], responseData?: HttpResponse | null) {
  const envStore = useEnvironmentStore()

  return {
    environment: {
      set: (k: string, v: string) => {
        const activeEnv = envStore.activeEnvironment
        if (!activeEnv) {
          logs.push(`[ENV] ⚠ No active environment, cannot set "${k}"`)
          return
        }
        const existing = activeEnv.variables.find(v => v.key === k)
        if (existing) {
          envStore.updateVariable(existing.id, k, String(v), true)
          logs.push(`[ENV] ✓ Updated ${k} = ${String(v).substring(0, 80)}${String(v).length > 80 ? '...' : ''}`)
        } else {
          envStore.addVariable(activeEnv.id, k, String(v))
          logs.push(`[ENV] ✓ Created ${k} = ${String(v).substring(0, 80)}${String(v).length > 80 ? '...' : ''}`)
        }
      },
      get: (k: string) => {
        return envStore.allVariables[k] || ''
      },
    },
    variables: {
      get: (k: string) => envStore.allVariables[k] || '',
    },
    response: {
      status: responseData?.status ?? 0,
      statusText: responseData?.statusText ?? '',
      headers: responseData?.headers ?? {},
      body: responseData?.body ?? '',
      json: () => {
        try {
          return JSON.parse(responseData?.body || '{}')
        } catch {
          throw new Error('Response body is not valid JSON')
        }
      },
    },
    test: (name: string, fn: Function) => {
      try { fn(); logs.push(`✓ ${name}`) }
      catch (e: any) { logs.push(`✗ ${name}: ${e.message}`) }
    },
    expect: (val: any) => ({
      to: {
        equal: (expected: any) => {
          if (val !== expected) throw new Error(`Expected ${expected}, got ${val}`)
        },
        not: {
          equal: (expected: any) => {
            if (val === expected) throw new Error(`Expected not ${expected}`)
          },
        },
        be: {
          true: () => { if (!val) throw new Error('Expected true') },
          false: () => { if (val) throw new Error('Expected false') },
          above: (n: number) => { if (val <= n) throw new Error(`Expected > ${n}, got ${val}`) },
          below: (n: number) => { if (val >= n) throw new Error(`Expected < ${n}, got ${val}`) },
        },
        include: (str: string) => {
          if (typeof val === 'string' && !val.includes(str)) throw new Error(`Expected to include "${str}"`)
          if (Array.isArray(val) && !val.includes(str)) throw new Error(`Expected array to include "${str}"`)
        },
      },
    }),
  }
}

/** 執行 script */
async function runScript() {
  isRunning.value = true
  output.value = ''
  const logs: string[] = []

  try {
    const mockConsole = {
      log: (...args: any[]) => logs.push(args.map(String).join(' ')),
      error: (...args: any[]) => logs.push(`[ERROR] ${args.map(String).join(' ')}`),
      warn: (...args: any[]) => logs.push(`[WARN] ${args.map(String).join(' ')}`),
    }

    const pm = buildPm(logs, props.response)
    const fn = new Function('console', 'pm', script.value || '')
    fn(mockConsole, pm)

    output.value = logs.join('\n') || 'Script executed successfully (no output)'
  } catch (e: any) {
    output.value = `Error: ${e.message}`
  } finally {
    isRunning.value = false
  }
}

/** 外部呼叫（sendRequest 自動執行用） */
defineExpose({ runScript, buildPm })
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
