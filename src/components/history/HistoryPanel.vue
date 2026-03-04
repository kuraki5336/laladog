<script setup lang="ts">
import { onMounted } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'
import { useTabStore } from '@/stores/tabStore'

const historyStore = useHistoryStore()
const tabStore = useTabStore()

onMounted(() => {
  historyStore.loadAll()
})

const methodColors: Record<string, string> = {
  GET: 'text-green-600',
  POST: 'text-yellow-600',
  PUT: 'text-blue-600',
  PATCH: 'text-purple-600',
  DELETE: 'text-danger',
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'text-success'
  if (status >= 400) return 'text-danger'
  return 'text-warning'
}

function loadEntry(entry: typeof historyStore.entries[number]) {
  tabStore.openFromHistory({
    method: entry.method,
    url: entry.url,
    requestHeaders: entry.requestHeaders,
    requestBody: entry.requestBody,
    response: entry.response,
  })
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <div class="p-2">
    <div class="mb-2 flex items-center justify-between">
      <span class="text-xs font-medium text-text-secondary">Recent Requests</span>
      <button
        v-if="historyStore.entries.length"
        class="text-xs text-text-muted hover:text-danger"
        @click="historyStore.clearAll()"
      >
        Clear
      </button>
    </div>

    <div v-if="historyStore.entries.length === 0" class="py-8 text-center text-xs text-text-muted">
      No history yet
    </div>

    <div
      v-for="entry in historyStore.entries"
      :key="entry.id"
      class="mb-1 cursor-pointer rounded-sm px-2 py-1.5 transition-colors hover:bg-bg-hover"
      @click="loadEntry(entry)"
    >
      <div class="flex items-center gap-2">
        <span class="w-12 shrink-0 text-[10px] font-bold" :class="methodColors[entry.method]">
          {{ entry.method }}
        </span>
        <span class="flex-1 truncate text-xs text-text-primary">{{ entry.url }}</span>
        <span class="shrink-0 text-[10px] font-bold" :class="statusColor(entry.status)">
          {{ entry.status }}
        </span>
      </div>
      <div class="mt-0.5 flex items-center gap-3 text-[10px] text-text-muted">
        <span>{{ entry.duration }}ms</span>
        <span>{{ formatTime(entry.timestamp) }}</span>
      </div>
    </div>
  </div>
</template>
