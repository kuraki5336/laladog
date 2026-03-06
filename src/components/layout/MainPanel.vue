<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import TabBar from './TabBar.vue'
import RequestPanel from '@/components/request/RequestPanel.vue'
import ResponsePanel from '@/components/response/ResponsePanel.vue'
import WebSocketPanel from '@/components/request/WebSocketPanel.vue'
import { useTabStore } from '@/stores/tabStore'
import { useRequestStore } from '@/stores/requestStore'

const mode = ref<'http' | 'websocket'>('http')
const tabStore = useTabStore()
const requestStore = useRequestStore()

/* ── Auto dirty tracking ── */
const pendingCloseTabId = ref<string | null>(null)

watch(
  () => {
    const tab = tabStore.activeTab
    if (!tab) return null
    return JSON.stringify([tab.request.method, tab.request.url, tab.request.params, tab.request.headers, tab.request.body, tab.request.auth, tab.request.preRequestScript, tab.request.testScript])
  },
  () => {
    if (tabStore.activeTabId) tabStore.updateDirty(tabStore.activeTabId)
  },
)

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
    if (!tabStore.activeTabId) return
    const tab = tabStore.tabs.find(t => t.id === tabStore.activeTabId)
    if (tab?.isDirty) {
      pendingCloseTabId.value = tabStore.activeTabId
    } else {
      tabStore.closeTab(tabStore.activeTabId)
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    requestStore.saveToCollection()
  }
}

function confirmClose() {
  if (pendingCloseTabId.value) {
    tabStore.closeTab(pendingCloseTabId.value)
    pendingCloseTabId.value = null
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

    <!-- Close unsaved tab confirm (Ctrl+W) -->
    <Teleport to="body">
      <div v-if="pendingCloseTabId" class="fixed inset-0 z-40 bg-black/30" @click="pendingCloseTabId = null" />
      <div v-if="pendingCloseTabId" class="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bg-card p-5 shadow-lg">
        <p class="mb-4 text-sm text-text-primary">This tab has unsaved changes. Close anyway?</p>
        <div class="flex justify-end gap-2">
          <button class="rounded px-3 py-1.5 text-sm text-text-muted hover:bg-bg-hover" @click="pendingCloseTabId = null">Cancel</button>
          <button class="rounded bg-danger px-3 py-1.5 text-sm text-white hover:bg-danger/90" @click="confirmClose">Close</button>
        </div>
      </div>
    </Teleport>
  </main>
</template>
