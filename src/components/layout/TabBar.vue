<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from 'vue'
import { useTabStore } from '@/stores/tabStore'

const tabStore = useTabStore()
const showCloseConfirm = ref<string | null>(null)

/* ── Rename ── */
const editingTabId = ref<string | null>(null)
const editingTitle = ref('')
function startRename(tabId: string) {
  const tab = tabStore.tabs.find(t => t.id === tabId)
  if (!tab) return
  editingTabId.value = tabId
  editingTitle.value = tab.title
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('.tab-rename-input')
    input?.focus()
    input?.select()
  })
}

function commitRename() {
  if (editingTabId.value && editingTitle.value.trim()) {
    tabStore.renameTab(editingTabId.value, editingTitle.value.trim())
  }
  editingTabId.value = null
}

function cancelRename() {
  editingTabId.value = null
}

const methodColors: Record<string, string> = {
  GET: 'text-green-600',
  POST: 'text-yellow-600',
  PUT: 'text-blue-600',
  PATCH: 'text-purple-600',
  DELETE: 'text-danger',
  HEAD: 'text-text-muted',
  OPTIONS: 'text-text-muted',
}

/* ── Drag & Drop (Mouse Events) ── */
const dragTabId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0
const DRAG_THRESHOLD = 5 // 最少移動 5px 才算拖曳（避免誤觸）

function onTabMouseDown(e: MouseEvent, tabId: string) {
  // 只處理左鍵；中鍵 → 關閉
  if (e.button === 1) {
    e.preventDefault()
    handleClose(tabId)
    return
  }
  if (e.button !== 0) return
  if (editingTabId.value) return // 改名中不允許拖曳

  // 點到 close 按鈕或 input 不啟動拖曳
  const target = e.target as HTMLElement
  if (target.closest('button') || target.closest('input')) return

  dragTabId.value = tabId
  dragStartX = e.clientX
  dragStartY = e.clientY
  isDragging.value = false

  window.addEventListener('mousemove', onWindowMouseMove)
  window.addEventListener('mouseup', onWindowMouseUp)
}

function onWindowMouseMove(e: MouseEvent) {
  if (!dragTabId.value) return

  // 判斷是否超過閾值開始拖曳
  if (!isDragging.value) {
    const dx = Math.abs(e.clientX - dragStartX)
    const dy = Math.abs(e.clientY - dragStartY)
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return
    isDragging.value = true
  }

  // 找到滑鼠下方的 tab 元素
  const tabContainer = document.querySelector('.tab-scroll-container')
  if (!tabContainer) return

  const tabEls = tabContainer.querySelectorAll<HTMLElement>('[data-tab-id]')
  let foundTarget: string | null = null

  for (const el of tabEls) {
    const rect = el.getBoundingClientRect()
    if (e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom) {
      const tid = el.getAttribute('data-tab-id')
      if (tid && tid !== dragTabId.value) {
        foundTarget = tid
      }
      break
    }
  }

  dropTargetId.value = foundTarget
}

function onWindowMouseUp(_e: MouseEvent) {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)

  if (isDragging.value && dragTabId.value && dropTargetId.value) {
    tabStore.moveTab(dragTabId.value, dropTargetId.value)
  }

  // 如果沒有拖曳（只是點擊），切換 tab
  if (!isDragging.value && dragTabId.value) {
    tabStore.switchTab(dragTabId.value)
  }

  dragTabId.value = null
  dropTargetId.value = null
  isDragging.value = false
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
})

function handleClose(tabId: string) {
  const tab = tabStore.tabs.find(t => t.id === tabId)
  if (tab?.isDirty) {
    showCloseConfirm.value = tabId
  } else {
    tabStore.closeTab(tabId)
  }
}

function confirmClose() {
  if (showCloseConfirm.value) {
    tabStore.closeTab(showCloseConfirm.value)
    showCloseConfirm.value = null
  }
}
</script>

<template>
  <div class="flex shrink-0 items-center border-b border-border bg-bg-stripe">
    <!-- Scrollable tab container -->
    <div class="tab-scroll-container flex flex-1 items-center overflow-x-auto">
      <div
        v-for="tab in tabStore.tabs"
        :key="tab.id"
        :data-tab-id="tab.id"
        class="group flex shrink-0 items-center gap-1.5 border-r border-border px-3 py-1.5 text-xs transition-colors select-none"
        :class="[
          tab.id === tabStore.activeTabId
            ? 'bg-bg-card text-text-primary border-b-2 border-b-secondary'
            : 'text-text-muted hover:bg-bg-hover hover:text-text-primary',
          isDragging && dragTabId === tab.id ? 'opacity-40' : '',
          isDragging ? 'cursor-grabbing' : 'cursor-pointer',
        ]"
        :style="dropTargetId === tab.id ? 'box-shadow: -3px 0 0 0 var(--color-secondary) inset' : ''"
        @mousedown="onTabMouseDown($event, tab.id)"
      >
        <!-- Method badge -->
        <span
          class="w-8 shrink-0 text-[10px] font-bold"
          :class="methodColors[tab.request.method] || 'text-text-muted'"
        >
          {{ tab.request.method }}
        </span>

        <!-- Tab title (double-click to rename) -->
        <input
          v-if="editingTabId === tab.id"
          v-model="editingTitle"
          class="tab-rename-input w-24 rounded border border-secondary bg-bg-card px-1 text-xs text-text-primary outline-none"
          @blur="commitRename"
          @keydown.enter="commitRename"
          @keydown.escape="cancelRename"
          @click.stop
        />
        <span
          v-else
          class="max-w-36 truncate"
          @dblclick.stop="startRename(tab.id)"
        >{{ tab.title }}</span>

        <!-- Dirty indicator -->
        <span v-if="tab.isDirty" class="text-xs text-warning">●</span>

        <!-- Close button -->
        <button
          class="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[10px] text-text-muted opacity-0 transition-opacity hover:bg-bg-hover hover:text-danger group-hover:opacity-100"
          :class="{ 'opacity-100': tab.id === tabStore.activeTabId }"
          @click.stop="handleClose(tab.id)"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- New tab button -->
    <button
      class="flex h-full shrink-0 items-center px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
      title="New Tab (Ctrl+T)"
      @click="tabStore.createTab()"
    >
      +
    </button>
  </div>

  <!-- Close Confirm Dialog -->
  <Teleport to="body">
    <div
      v-if="showCloseConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showCloseConfirm = null"
    >
      <div class="w-80 rounded-lg bg-bg-card p-4 shadow-xl">
        <h3 class="mb-2 text-sm font-medium text-text-primary">Unsaved Changes</h3>
        <p class="mb-4 text-xs text-text-secondary">
          This tab has unsaved changes. Close anyway?
        </p>
        <div class="flex justify-end gap-2">
          <button
            class="rounded-button px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
            @click="showCloseConfirm = null"
          >
            Cancel
          </button>
          <button
            class="rounded-button bg-danger px-3 py-1.5 text-xs text-white hover:opacity-90"
            @click="confirmClose"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
