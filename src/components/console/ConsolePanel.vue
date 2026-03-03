<script setup lang="ts">
import { ref } from 'vue'
import { useConsoleStore } from '@/stores/consoleStore'

const consoleStore = useConsoleStore()
const expandedId = ref<string | null>(null)
const showFullBody = ref<Record<string, boolean>>({})

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function toggleShowMore(id: string) {
  showFullBody.value[id] = !showFullBody.value[id]
}

const methodColors: Record<string, string> = {
  GET: 'text-green-600',
  POST: 'text-yellow-600',
  PUT: 'text-blue-600',
  PATCH: 'text-purple-600',
  DELETE: 'text-danger',
  HEAD: 'text-gray-500',
  OPTIONS: 'text-gray-500',
}

function statusColor(status: number): string {
  if (status === 0) return 'text-danger'
  if (status >= 200 && status < 300) return 'text-success'
  if (status >= 400) return 'text-danger'
  return 'text-warning'
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function truncateBody(body: string): string {
  return body.length > 500 ? body.slice(0, 500) : body
}

function formatHeaders(headers: Record<string, string>): string {
  return Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n')
}
</script>

<template>
  <div class="p-2">
    <div class="mb-2 flex items-center justify-between">
      <span class="text-xs font-medium text-text-secondary">Console</span>
      <button
        v-if="consoleStore.entries.length"
        class="text-xs text-text-muted hover:text-danger"
        @click="consoleStore.clearAll()"
      >
        Clear
      </button>
    </div>

    <div v-if="consoleStore.entries.length === 0" class="py-8 text-center text-xs text-text-muted">
      No requests recorded yet.<br />Send a request to see details here.
    </div>

    <div
      v-for="entry in consoleStore.entries"
      :key="entry.id"
      class="mb-1 rounded-sm border border-transparent transition-colors"
      :class="expandedId === entry.id ? 'border-border bg-bg-stripe' : 'hover:bg-bg-hover'"
    >
      <!-- 摘要列 -->
      <div
        class="flex cursor-pointer items-center gap-2 px-2 py-1.5"
        @click="toggleExpand(entry.id)"
      >
        <span class="w-12 shrink-0 text-[10px] font-bold" :class="methodColors[entry.method]">
          {{ entry.method }}
        </span>
        <span class="flex-1 truncate text-xs text-text-primary">{{ entry.url }}</span>
        <span class="shrink-0 text-[10px] font-bold" :class="statusColor(entry.status)">
          {{ entry.status || 'ERR' }}
        </span>
        <span class="shrink-0 text-[10px] text-text-muted">{{ entry.duration }}ms</span>
      </div>

      <!-- 展開細節 -->
      <div v-if="expandedId === entry.id" class="border-t border-border px-2 py-2 text-[11px]">
        <div class="mb-1 text-[10px] text-text-muted">{{ formatTime(entry.timestamp) }}</div>

        <!-- Request Headers -->
        <details class="mb-2">
          <summary class="cursor-pointer font-medium text-text-secondary">Request Headers</summary>
          <pre class="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-sm bg-bg-main p-2 text-text-primary">{{ formatHeaders(entry.requestHeaders) }}</pre>
        </details>

        <!-- Request Body -->
        <details v-if="entry.requestBody" class="mb-2">
          <summary class="cursor-pointer font-medium text-text-secondary">Request Body</summary>
          <pre class="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-sm bg-bg-main p-2 text-text-primary">{{ showFullBody[entry.id + '-req'] ? entry.requestBody : truncateBody(entry.requestBody) }}</pre>
          <button
            v-if="entry.requestBody.length > 500"
            class="mt-1 text-[10px] text-secondary hover:underline"
            @click.stop="toggleShowMore(entry.id + '-req')"
          >
            {{ showFullBody[entry.id + '-req'] ? 'Show less' : 'Show more' }}
          </button>
        </details>

        <!-- Response Headers -->
        <details class="mb-2">
          <summary class="cursor-pointer font-medium text-text-secondary">Response Headers</summary>
          <pre class="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-sm bg-bg-main p-2 text-text-primary">{{ formatHeaders(entry.responseHeaders) }}</pre>
        </details>

        <!-- Response Body -->
        <details class="mb-2">
          <summary class="cursor-pointer font-medium text-text-secondary">Response Body</summary>
          <pre class="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-sm bg-bg-main p-2 text-text-primary">{{ showFullBody[entry.id + '-res'] ? entry.responseBody : truncateBody(entry.responseBody) }}</pre>
          <button
            v-if="entry.responseBody.length > 500"
            class="mt-1 text-[10px] text-secondary hover:underline"
            @click.stop="toggleShowMore(entry.id + '-res')"
          >
            {{ showFullBody[entry.id + '-res'] ? 'Show less' : 'Show more' }}
          </button>
        </details>

        <!-- Size -->
        <div class="text-[10px] text-text-muted">
          {{ entry.size >= 1024 ? (entry.size / 1024).toFixed(1) + ' KB' : entry.size + ' B' }}
        </div>
      </div>
    </div>
  </div>
</template>
