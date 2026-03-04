<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import TabBar from './TabBar.vue'
import RequestPanel from '@/components/request/RequestPanel.vue'
import ResponsePanel from '@/components/response/ResponsePanel.vue'
import WebSocketPanel from '@/components/request/WebSocketPanel.vue'
import { useTabStore } from '@/stores/tabStore'

const mode = ref<'http' | 'websocket'>('http')
const tabStore = useTabStore()

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 't') {
    e.preventDefault()
    tabStore.createTab()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
    e.preventDefault()
    if (tabStore.activeTabId) tabStore.closeTab(tabStore.activeTabId)
  }
}

onMounted(() => {
  tabStore.init()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main class="flex flex-1 flex-col overflow-hidden">
    <!-- Mode Toggle -->
    <div class="flex shrink-0 items-center gap-1 border-b border-border bg-bg-card px-3 py-1.5">
      <button
        class="rounded-sm px-3 py-1 text-xs font-medium transition-colors"
        :class="mode === 'http' ? 'bg-primary text-text-inverse' : 'text-text-muted hover:text-text-primary'"
        @click="mode = 'http'"
      >
        HTTP
      </button>
      <button
        class="rounded-sm px-3 py-1 text-xs font-medium transition-colors"
        :class="mode === 'websocket' ? 'bg-primary text-text-inverse' : 'text-text-muted hover:text-text-primary'"
        @click="mode = 'websocket'"
      >
        WebSocket
      </button>
    </div>

    <!-- Tab Bar (HTTP mode only) -->
    <TabBar v-if="mode === 'http'" />

    <template v-if="mode === 'http'">
      <!-- Request Area -->
      <div class="flex flex-1 flex-col overflow-hidden border-b border-border">
        <RequestPanel />
      </div>

      <!-- Response Area -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <ResponsePanel />
      </div>
    </template>

    <template v-else>
      <WebSocketPanel />
    </template>
  </main>
</template>
