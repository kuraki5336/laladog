<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import TabBar from './TabBar.vue'
import RequestPanel from '@/components/request/RequestPanel.vue'
import ResponsePanel from '@/components/response/ResponsePanel.vue'
import WebSocketPanel from '@/components/request/WebSocketPanel.vue'
import { useTabStore } from '@/stores/tabStore'

const mode = ref<'http' | 'websocket'>('http')
const tabStore = useTabStore()

/* ── Resizable split ── */
const containerRef = ref<HTMLElement | null>(null)
const requestRatio = ref(50)
const isDragging = ref(false)
let startY = 0
let startRatio = 0

function onDragStart(e: MouseEvent) {
  if (!containerRef.value) return
  isDragging.value = true
  startY = e.clientY
  startRatio = requestRatio.value
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  if (!containerRef.value) return
  const containerHeight = containerRef.value.clientHeight
  const delta = e.clientY - startY
  const deltaPercent = (delta / containerHeight) * 100
  requestRatio.value = Math.min(85, Math.max(15, startRatio + deltaPercent))
}

function onDragEnd() {
  isDragging.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
}

function resetRatio() {
  requestRatio.value = 50
}

/* ── Keyboard shortcuts ── */
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
  <main ref="containerRef" class="flex flex-1 flex-col overflow-hidden">
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
      <div :style="{ flex: requestRatio }" class="flex flex-col overflow-hidden">
        <RequestPanel />
      </div>

      <!-- Drag Handle -->
      <div
        class="group relative flex h-2 shrink-0 cursor-row-resize items-center justify-center transition-colors"
        :class="{ 'bg-secondary-10': isDragging }"
        @mousedown.prevent="onDragStart"
        @dblclick="resetRatio"
      >
        <div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border transition-colors group-hover:bg-secondary/40" :class="{ '!bg-secondary/40': isDragging }" />
        <div
          class="relative z-10 flex w-6 h-1 items-center justify-center rounded-full bg-border transition-all group-hover:bg-secondary group-hover:h-1.5"
          :class="{ '!bg-secondary !h-1.5': isDragging }"
        />
      </div>

      <!-- Response Area -->
      <div :style="{ flex: 100 - requestRatio }" class="flex flex-col overflow-hidden">
        <ResponsePanel />
      </div>
    </template>

    <template v-else>
      <WebSocketPanel />
    </template>
  </main>
</template>
