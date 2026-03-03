<script setup lang="ts">
import { ref } from 'vue'
import { useRequestStore } from '@/stores/requestStore'
import ResponseBody from './ResponseBody.vue'
import ResponseHeaders from './ResponseHeaders.vue'

const store = useRequestStore()
const activeTab = ref<'body' | 'headers' | 'scripts'>('body')

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'text-success'
  if (status >= 300 && status < 400) return 'text-info'
  if (status >= 400 && status < 500) return 'text-warning'
  return 'text-danger'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="flex flex-1 flex-col overflow-hidden bg-bg-card">
    <!-- Response Meta -->
    <div class="flex items-center gap-4 border-b border-border px-3 py-2">
      <span class="text-xs font-medium text-text-secondary">Response</span>

      <template v-if="store.response">
        <span class="text-xs font-bold" :class="statusColor(store.response.status)">
          {{ store.response.status }} {{ store.response.statusText }}
        </span>
        <span class="text-xs text-text-muted">{{ store.response.duration }} ms</span>
        <span class="text-xs text-text-muted">{{ formatSize(store.response.size) }}</span>
      </template>

      <!-- Tabs -->
      <div class="ml-auto flex gap-1">
        <button
          class="rounded-sm px-2 py-1 text-xs transition-colors"
          :class="activeTab === 'body' ? 'bg-secondary-10 text-secondary' : 'text-text-muted hover:text-text-primary'"
          @click="activeTab = 'body'"
        >
          Body
        </button>
        <button
          class="rounded-sm px-2 py-1 text-xs transition-colors"
          :class="activeTab === 'headers' ? 'bg-secondary-10 text-secondary' : 'text-text-muted hover:text-text-primary'"
          @click="activeTab = 'headers'"
        >
          Headers
        </button>
        <button
          v-if="store.scriptOutput"
          class="rounded-sm px-2 py-1 text-xs transition-colors"
          :class="activeTab === 'scripts' ? 'bg-secondary-10 text-secondary' : 'text-text-muted hover:text-text-primary'"
          @click="activeTab = 'scripts'"
        >
          Scripts
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-3">
      <!-- Error -->
      <div v-if="store.error" class="rounded-button bg-danger-light p-4 text-sm text-danger">
        {{ store.error }}
      </div>

      <!-- No Response -->
      <div v-else-if="!store.response" class="flex h-full items-center justify-center">
        <div class="text-center text-text-muted">
          <div class="mb-2 text-3xl">🚀</div>
          <div class="text-sm">Send a request to see the response</div>
        </div>
      </div>

      <!-- Response Content -->
      <template v-else>
        <ResponseBody v-if="activeTab === 'body'" :response="store.response" />
        <ResponseHeaders v-else-if="activeTab === 'headers'" :headers="store.response.headers" />
        <div v-else-if="activeTab === 'scripts'" class="font-mono text-xs">
          <pre class="whitespace-pre-wrap text-green-400">{{ store.scriptOutput }}</pre>
        </div>
      </template>
    </div>
  </div>
</template>
