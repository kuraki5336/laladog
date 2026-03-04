<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRequestStore } from '@/stores/requestStore'
import { useEnvironmentStore } from '@/stores/environmentStore'
import { useTabStore } from '@/stores/tabStore'
import { resolveVariables } from '@/utils/variableResolver'
import { generateCurl } from '@/utils/curlGenerator'
import SaveToCollectionDialog from '@/components/collection/SaveToCollectionDialog.vue'
import type { HttpMethod } from '@/types'

const store = useRequestStore()
const envStore = useEnvironmentStore()
const tabStore = useTabStore()
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle')
const curlStatus = ref<'idle' | 'copied'>('idle')
const showSaveDialog = ref(false)

async function handleSave() {
  saveStatus.value = 'saving'
  const ok = await store.saveToCollection()
  saveStatus.value = ok ? 'saved' : 'idle'
  if (ok) setTimeout(() => { saveStatus.value = 'idle' }, 1500)
}

async function copyAsCurl() {
  const vars = envStore.allVariables
  const req = store.activeRequest

  // 解析 URL + Query Params
  let url = resolveVariables(req.url, vars)
  const enabledParams = (req.params || []).filter(p => p.enabled && p.key)
  if (enabledParams.length > 0) {
    const urlObj = new URL(url)
    for (const p of enabledParams) {
      urlObj.searchParams.append(resolveVariables(p.key, vars), resolveVariables(p.value, vars))
    }
    url = urlObj.toString()
  }

  // 解析 Headers
  const headers: Record<string, string> = {}
  for (const h of req.headers) {
    if (h.enabled && h.key) {
      headers[resolveVariables(h.key, vars)] = resolveVariables(h.value, vars)
    }
  }

  // Auth → Headers
  if (req.auth.type === 'bearer' && req.auth.bearer?.token) {
    headers['Authorization'] = `Bearer ${resolveVariables(req.auth.bearer.token, vars)}`
  } else if (req.auth.type === 'basic' && req.auth.basic) {
    const user = resolveVariables(req.auth.basic.username || '', vars)
    const pass = resolveVariables(req.auth.basic.password || '', vars)
    headers['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`
  }

  // Content-Type 自動補（與 sendRequest 邏輯一致）
  const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === 'content-type')
  if (!hasContentType && req.body.type !== 'none') {
    if (req.body.type === 'raw') {
      const rawType = req.body.rawType || 'text'
      if (rawType === 'json') headers['Content-Type'] = 'application/json'
      else if (rawType === 'xml') headers['Content-Type'] = 'application/xml'
      else headers['Content-Type'] = 'text/plain'
    } else if (req.body.type === 'x-www-form-urlencoded') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    } else if (req.body.type === 'form-data') {
      headers['Content-Type'] = 'multipart/form-data'
    }
  }

  // 解析 Body
  let body: string | null = null
  if (req.body.type === 'raw' && req.body.raw) {
    body = resolveVariables(req.body.raw, vars)
  } else if (req.body.type === 'x-www-form-urlencoded') {
    const params = new URLSearchParams()
    for (const item of req.body.urlencoded || []) {
      if (item.enabled) {
        params.append(resolveVariables(item.key, vars), resolveVariables(item.value, vars))
      }
    }
    body = params.toString()
  } else if (req.body.type === 'form-data') {
    const formParts = (req.body.formData || [])
      .filter((item: any) => item.enabled)
      .map((item: any) => `${resolveVariables(item.key, vars)}=${resolveVariables(item.value, vars)}`)
    body = formParts.join('&')
  }

  const curl = generateCurl({ method: req.method, url, headers, body })
  await navigator.clipboard.writeText(curl)
  curlStatus.value = 'copied'
  setTimeout(() => { curlStatus.value = 'idle' }, 1500)
}

const resolvedUrl = computed(() => {
  const url = store.activeRequest.url
  if (!url.includes('{{')) return ''
  return resolveVariables(url, envStore.allVariables)
})

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-yellow-100 text-yellow-700',
  PUT: 'bg-blue-100 text-blue-700',
  PATCH: 'bg-purple-100 text-purple-700',
  DELETE: 'bg-red-100 text-red-700',
  HEAD: 'bg-gray-100 text-gray-600',
  OPTIONS: 'bg-gray-100 text-gray-600',
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 border-b border-border p-3">
      <!-- Method Selector -->
      <select
        v-model="store.activeRequest.method"
        class="h-9 rounded-button border border-border px-2 text-xs font-bold outline-none transition-colors focus:border-border-focus"
        :class="methodColors[store.activeRequest.method]"
      >
        <option v-for="m in methods" :key="m" :value="m">{{ m }}</option>
      </select>

      <!-- URL Input -->
      <input
        v-model="store.activeRequest.url"
        type="text"
        class="h-9 flex-1 rounded-button border border-border px-3 text-sm outline-none transition-colors focus:border-border-focus"
        placeholder="Enter URL or paste text (e.g. https://api.example.com/users)"
        @keyup.enter="store.sendRequest()"
      />

      <!-- Save Button -->
      <button
        v-if="tabStore.activeTab?.collectionNodeId"
        class="h-9 rounded-button border border-border px-3 text-sm font-medium transition-all hover:bg-bg-stripe active:scale-[0.97] disabled:opacity-50"
        :class="saveStatus === 'saved' ? 'text-success border-success' : 'text-text-secondary'"
        :disabled="saveStatus === 'saving'"
        @click="handleSave"
      >
        {{ saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save' }}
      </button>

      <!-- Save As (未儲存的 tab) -->
      <button
        v-else
        class="h-9 rounded-button border border-border px-3 text-sm font-medium text-text-secondary transition-all hover:bg-bg-stripe active:scale-[0.97]"
        @click="showSaveDialog = true"
      >
        Save
      </button>

      <!-- cURL Button -->
      <button
        v-if="store.activeRequest.url"
        class="h-9 rounded-button border border-border px-3 text-sm font-medium transition-all hover:bg-bg-stripe active:scale-[0.97]"
        :class="curlStatus === 'copied' ? 'text-success border-success' : 'text-text-secondary'"
        @click="copyAsCurl"
      >
        {{ curlStatus === 'copied' ? 'Copied!' : 'cURL' }}
      </button>

      <!-- Send Button -->
      <button
        class="h-9 rounded-button bg-secondary px-6 text-sm font-medium text-white transition-all hover:bg-secondary-60 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="store.activeRequest.isSending || !store.activeRequest.url"
        @click="store.sendRequest()"
      >
        {{ store.activeRequest.isSending ? 'Sending...' : 'Send' }}
      </button>
    </div>
    <!-- Resolved URL Preview -->
    <div v-if="resolvedUrl" class="border-b border-border px-3 py-1">
      <span class="text-[11px] text-text-muted truncate block">&rarr; {{ resolvedUrl }}</span>
    </div>

    <!-- Save To Collection Dialog -->
    <SaveToCollectionDialog
      v-if="showSaveDialog && tabStore.activeTabId"
      :tab-id="tabStore.activeTabId"
      @close="showSaveDialog = false"
      @saved="showSaveDialog = false"
    />
  </div>
</template>
