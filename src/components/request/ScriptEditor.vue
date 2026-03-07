<script setup lang="ts">
import { ref } from 'vue'
import { useRequestStore } from '@/stores/requestStore'
import type { HttpResponse } from '@/types/response'
import MonacoEditor from '@/components/common/MonacoEditor.vue'

const props = defineProps<{
  type: 'pre-request' | 'tests'
  response?: HttpResponse | null
}>()

const script = defineModel<string>({ default: '' })
const output = ref('')
const isRunning = ref(false)
const showRef = ref(false)

/** 預定義 snippet — 避免在 template 裡用跳脫字元 */
const snippets: Record<string, string> = {
  envSet: 'pm.environment.set("key", "value");',
  envGet: 'pm.environment.get("key")',
  resJson: 'const data = pm.response.json();',
  sendGet: [
    'const resp = await pm.sendRequest("https://api.example.com/token");',
    'console.log(resp.status, resp.json());',
  ].join('\n'),
  sendPost: [
    'const resp = await pm.sendRequest({',
    '  url: "https://api.example.com/token",',
    '  method: "POST",',
    '  header: [{ key: "Content-Type", value: "application/json" }],',
    '  body: { mode: "raw", raw: JSON.stringify({ user: "test" }) }',
    '});',
    'const token = resp.json().token;',
    'pm.environment.set("token", token);',
  ].join('\n'),
  sendCb: [
    'pm.sendRequest("https://api.example.com/token", (err, resp) => {',
    '  if (!err) {',
    '    pm.environment.set("token", resp.json().token);',
    '  }',
    '});',
  ].join('\n'),
  test: [
    'pm.test("Status is 200", () => {',
    '  pm.expect(pm.response.code).to.equal(200);',
    '});',
  ].join('\n'),
  hmac: [
    'const sig = CryptoJS.HmacSHA256("message", "secret");',
    'const b64 = CryptoJS.enc.Base64.stringify(sig);',
    'console.log(b64);',
  ].join('\n'),
  xml: [
    'const obj = xml2Json(pm.response.body);',
    'console.log(JSON.stringify(obj, null, 2));',
  ].join('\n'),
}

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
      bodyType: req.body?.type || 'none',
      bodyRawType: req.body?.rawType,
      formData: (req.body?.formData || []).filter((i: any) => i.enabled).map((i: any) => ({ key: i.key, value: i.value })),
      urlencoded: (req.body?.urlencoded || []).filter((i: any) => i.enabled).map((i: any) => ({ key: i.key, value: i.value })),
    } : undefined
    const result = await requestStore.executeScript(script.value || '', props.response, reqCtx)
    output.value = result || 'Script executed successfully (no output)'
  } catch (e: any) {
    output.value = `Error: ${e.message}`
  } finally {
    isRunning.value = false
  }
}

/** 插入範例到編輯器 */
function ins(key: string) {
  const code = snippets[key]
  if (!code) return
  script.value = script.value ? script.value + '\n' + code : code
  showRef.value = false
}

/** 動態變數顯示 helper（避免 Vue template 解析雙大括號） */
const dv = (name: string) => `{{${name}}}`

/** 外部呼叫（sendRequest 自動執行用） */
defineExpose({ runScript })
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border px-3 py-1">
      <span class="text-xs font-medium text-text-secondary dark:text-slate-400">
        {{ type === 'pre-request' ? 'Pre-request Script' : 'Tests' }}
      </span>
      <div class="flex items-center gap-1">
        <button
          class="rounded-sm px-2 py-1 text-xs text-text-secondary hover:bg-bg-stripe hover:text-text-primary"
          :class="showRef ? 'bg-bg-stripe text-text-primary' : ''"
          title="API Reference"
          @click="showRef = !showRef"
        >
          ?
        </button>
        <button
          class="rounded-sm bg-secondary px-3 py-1 text-xs text-white hover:bg-secondary-60 disabled:opacity-50"
          :disabled="isRunning"
          @click="runScript"
        >
          {{ isRunning ? 'Running...' : 'Run' }}
        </button>
      </div>
    </div>

    <!-- API Reference Panel -->
    <div v-if="showRef" class="max-h-64 overflow-y-auto border-b border-border bg-bg-stripe p-3 text-xs dark:bg-slate-900">
      <div class="mb-2 font-medium text-text-primary">Script API Reference</div>

      <!-- Variables -->
      <section class="mb-3">
        <div class="mb-1 font-medium text-blue-500">Variables</div>
        <div class="space-y-0.5 font-mono text-text-secondary">
          <div class="flex items-start gap-2">
            <code class="shrink-0 cursor-pointer text-green-600 hover:underline" @click="ins('envSet')">pm.environment.set(key, val)</code>
            <span class="text-text-muted">設定環境變數</span>
          </div>
          <div class="flex items-start gap-2">
            <code class="shrink-0 cursor-pointer text-green-600 hover:underline" @click="ins('envGet')">pm.environment.get(key)</code>
            <span class="text-text-muted">取得環境變數</span>
          </div>
          <div class="flex items-start gap-2">
            <code class="shrink-0 text-green-600">pm.variables</code>
            <span class="text-text-muted">同 environment（.get / .set）</span>
          </div>
          <div class="flex items-start gap-2">
            <code class="shrink-0 text-green-600">pm.collectionVariables</code>
            <span class="text-text-muted">.get / .set / .unset</span>
          </div>
          <div class="flex items-start gap-2">
            <code class="shrink-0 text-green-600">pm.globals</code>
            <span class="text-text-muted">.get / .set / .unset</span>
          </div>
        </div>
      </section>

      <!-- Request -->
      <section class="mb-3">
        <div class="mb-1 font-medium text-blue-500">Request</div>
        <div class="space-y-0.5 font-mono text-text-secondary">
          <div><code class="text-green-600">pm.request.method</code> <span class="text-text-muted">HTTP 方法</span></div>
          <div><code class="text-green-600">pm.request.url</code> <span class="text-text-muted">請求 URL</span></div>
          <div><code class="text-green-600">pm.request.headers</code> <span class="text-text-muted">請求 headers</span></div>
          <div><code class="text-green-600">pm.request.body.mode</code> <span class="text-text-muted">raw | urlencoded | formdata</span></div>
          <div><code class="text-green-600">pm.request.body.raw</code> <span class="text-text-muted">原始 body 字串</span></div>
        </div>
      </section>

      <!-- Response -->
      <section class="mb-3">
        <div class="mb-1 font-medium text-blue-500">Response</div>
        <div class="space-y-0.5 font-mono text-text-secondary">
          <div><code class="text-green-600">pm.response.status</code> / <code class="text-green-600">.code</code> <span class="text-text-muted">HTTP 狀態碼</span></div>
          <div><code class="text-green-600">pm.response.statusText</code> <span class="text-text-muted">狀態描述</span></div>
          <div><code class="text-green-600">pm.response.headers</code> <span class="text-text-muted">回應 headers</span></div>
          <div><code class="text-green-600">pm.response.body</code> <span class="text-text-muted">回應 body 字串</span></div>
          <div class="flex items-start gap-2">
            <code class="shrink-0 cursor-pointer text-green-600 hover:underline" @click="ins('resJson')">pm.response.json()</code>
            <span class="text-text-muted">解析為 JSON</span>
          </div>
        </div>
      </section>

      <!-- sendRequest -->
      <section class="mb-3">
        <div class="mb-1 font-medium text-blue-500">pm.sendRequest()</div>
        <div class="space-y-1 font-mono text-text-secondary">
          <div class="flex items-start gap-2">
            <code class="shrink-0 cursor-pointer text-green-600 hover:underline" @click="ins('sendGet')">await pm.sendRequest(url)</code>
            <span class="text-text-muted">GET 請求</span>
          </div>
          <div class="flex items-start gap-2">
            <code class="shrink-0 cursor-pointer text-green-600 hover:underline" @click="ins('sendPost')">pm.sendRequest(options)</code>
            <span class="text-text-muted">自訂 method / headers / body</span>
          </div>
          <div class="flex items-start gap-2">
            <code class="shrink-0 cursor-pointer text-green-600 hover:underline" @click="ins('sendCb')">pm.sendRequest(url, callback)</code>
            <span class="text-text-muted">Postman callback 風格</span>
          </div>
        </div>
      </section>

      <!-- Tests & Assertions -->
      <section class="mb-3">
        <div class="mb-1 font-medium text-blue-500">Tests & Assertions（Chai 風格）</div>
        <div class="space-y-0.5 font-mono text-text-secondary">
          <div class="flex items-start gap-2">
            <code class="shrink-0 cursor-pointer text-green-600 hover:underline" @click="ins('test')">pm.test(name, fn)</code>
            <span class="text-text-muted">定義測試</span>
          </div>
          <div><code class="text-green-600">.to.equal(val)</code> <span class="text-text-muted">嚴格相等</span></div>
          <div><code class="text-green-600">.to.eql(val)</code> <span class="text-text-muted">深層比較</span></div>
          <div><code class="text-green-600">.to.be.an("array")</code> / <code class="text-green-600">.a("string")</code> <span class="text-text-muted">型別檢查</span></div>
          <div><code class="text-green-600">.to.have.property("key")</code> <span class="text-text-muted">屬性檢查</span></div>
          <div><code class="text-green-600">.to.have.lengthOf(n)</code> <span class="text-text-muted">長度</span></div>
          <div><code class="text-green-600">.to.include(val)</code> <span class="text-text-muted">包含</span></div>
          <div><code class="text-green-600">.to.be.above(n)</code> / <code class="text-green-600">.below(n)</code> <span class="text-text-muted">比較</span></div>
          <div><code class="text-green-600">.to.be.within(min, max)</code> <span class="text-text-muted">範圍</span></div>
          <div><code class="text-green-600">.to.have.status(code)</code> <span class="text-text-muted">Response 狀態碼</span></div>
          <div><code class="text-green-600">.to.have.header("name")</code> <span class="text-text-muted">Response header</span></div>
          <div><code class="text-green-600">.to.not.equal(val)</code> <span class="text-text-muted">.not 否定</span></div>
          <div><code class="text-green-600">.and</code> <span class="text-text-muted">鏈式串接</span></div>
        </div>
      </section>

      <!-- Utilities -->
      <section class="mb-3">
        <div class="mb-1 font-medium text-blue-500">工具庫</div>
        <div class="space-y-0.5 font-mono text-text-secondary">
          <div class="flex items-start gap-2">
            <code class="shrink-0 cursor-pointer text-green-600 hover:underline" @click="ins('hmac')">CryptoJS.HmacSHA256(msg, key)</code>
            <span class="text-text-muted">HMAC 簽章</span>
          </div>
          <div><code class="text-green-600">CryptoJS</code> <span class="text-text-muted">MD5, SHA256, AES, enc.Base64…</span></div>
          <div><code class="text-green-600">btoa(str)</code> / <code class="text-green-600">atob(b64)</code> <span class="text-text-muted">Base64 編碼/解碼</span></div>
          <div><code class="text-green-600">_</code> <span class="text-text-muted">Lodash（_.uniq, _.get, _.merge…）</span></div>
          <div class="flex items-start gap-2">
            <code class="shrink-0 cursor-pointer text-green-600 hover:underline" @click="ins('xml')">xml2Json(xmlString)</code>
            <span class="text-text-muted">XML 轉 JSON</span>
          </div>
          <div><code class="text-green-600">console.log / .warn / .error</code> <span class="text-text-muted">輸出訊息</span></div>
        </div>
      </section>

      <!-- Dynamic Variables -->
      <section>
        <div class="mb-1 font-medium text-blue-500">動態變數（用在 URL / Headers / Body）</div>
        <div class="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-text-secondary">
          <div><code class="text-orange-500" v-text="dv('$guid')" /> <span class="text-text-muted">UUID</span></div>
          <div><code class="text-orange-500" v-text="dv('$timestamp')" /> <span class="text-text-muted">Unix 時間戳</span></div>
          <div><code class="text-orange-500" v-text="dv('$isoTimestamp')" /> <span class="text-text-muted">ISO 時間</span></div>
          <div><code class="text-orange-500" v-text="dv('$randomInt')" /> <span class="text-text-muted">0-999</span></div>
          <div><code class="text-orange-500" v-text="dv('$randomEmail')" /> <span class="text-text-muted">隨機信箱</span></div>
          <div><code class="text-orange-500" v-text="dv('$randomFullName')" /> <span class="text-text-muted">隨機姓名</span></div>
          <div><code class="text-orange-500" v-text="dv('$randomIP')" /> <span class="text-text-muted">隨機 IP</span></div>
          <div><code class="text-orange-500" v-text="dv('$randomBoolean')" /> <span class="text-text-muted">true/false</span></div>
          <div><code class="text-orange-500" v-text="dv('$randomColor')" /> <span class="text-text-muted">#hex</span></div>
          <div><code class="text-orange-500" v-text="dv('$randomPassword')" /> <span class="text-text-muted">16 字元</span></div>
          <div><code class="text-orange-500" v-text="dv('$randomUUID')" /> <span class="text-text-muted">同 $guid</span></div>
        </div>
      </section>
    </div>

    <!-- Monaco Editor -->
    <div class="flex-1 border-b border-border" :class="showRef ? 'min-h-24' : ''">
      <MonacoEditor v-model="script" language="javascript" />
    </div>

    <!-- Output -->
    <div class="h-24 overflow-y-auto bg-primary-90 p-2 font-mono text-xs text-green-400">
      <div v-if="!output" class="text-text-muted">Output will appear here...</div>
      <pre v-else class="whitespace-pre-wrap">{{ output }}</pre>
    </div>
  </div>
</template>
