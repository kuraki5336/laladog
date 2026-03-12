<script setup lang="ts">
import { onMounted, ref, computed, provide, onBeforeUnmount } from 'vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useTeamStore } from '@/stores/teamStore'
import { useTabStore } from '@/stores/tabStore'
import { parsePostmanCollection } from '@/utils/postmanImporter'
import { parseOpenAPISpec, isOpenAPISpec } from '@/utils/openapiImporter'
import { exportToPostmanV21 } from '@/utils/postmanExporter'
import CollectionItem from './CollectionItem.vue'

const store = useCollectionStore()
const wsStore = useWorkspaceStore()
const teamStore = useTeamStore()
const tabStore = useTabStore()
const showAddMenu = ref(false)
const showMoreMenu = ref(false)
const newName = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const importError = ref<string | null>(null)
const searchText = ref('')

/* ── Collection Drag & Drop (shared state) ── */
const dragNodeId = ref<string | null>(null)
const dragNodeType = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)
const dropPosition = ref<'before' | 'after' | 'inside' | null>(null)
const isDragging = ref(false)
const justDragged = ref(false) // 防止拖曳結束後觸發 click
let dragStartX = 0
let dragStartY = 0
const DRAG_THRESHOLD = 5

provide('collectionDrag', {
  dragNodeId,
  dragNodeType,
  dropTargetId,
  dropPosition,
  isDragging,
  justDragged,
})

function onCollectionMouseMove(e: MouseEvent) {
  if (!dragNodeId.value) return

  if (!isDragging.value) {
    const dx = Math.abs(e.clientX - dragStartX)
    const dy = Math.abs(e.clientY - dragStartY)
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return
    isDragging.value = true
  }

  // 找到滑鼠下方的 collection node 元素
  const treeContainer = document.querySelector('.collection-tree-container')
  if (!treeContainer) return

  const nodeEls = treeContainer.querySelectorAll<HTMLElement>('[data-node-id]')
  let foundTarget: string | null = null
  let foundPosition: 'before' | 'after' | 'inside' | null = null

  for (const el of nodeEls) {
    const rect = el.getBoundingClientRect()
    if (e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom) {
      const nodeId = el.getAttribute('data-node-id')
      const nodeType = el.getAttribute('data-node-type')
      if (!nodeId || nodeId === dragNodeId.value) break

      // 計算游標在元素中的相對位置
      const relY = (e.clientY - rect.top) / rect.height

      if (nodeType === 'request') {
        // request 節點：上半 = before，下半 = after
        foundPosition = relY < 0.5 ? 'before' : 'after'
      } else {
        // collection/folder 節點：上 25% = before，中間 50% = inside，下 25% = after
        if (relY < 0.25) foundPosition = 'before'
        else if (relY > 0.75) foundPosition = 'after'
        else foundPosition = 'inside'
      }

      // 防止非法操作
      // collection 不能放進別的節點裡 → 只允許 before/after
      if (dragNodeType.value === 'collection' && foundPosition === 'inside') {
        foundPosition = relY < 0.5 ? 'before' : 'after'
      }

      foundTarget = nodeId
      break
    }
  }

  dropTargetId.value = foundTarget
  dropPosition.value = foundPosition
}

function onCollectionMouseUp() {
  window.removeEventListener('mousemove', onCollectionMouseMove)
  window.removeEventListener('mouseup', onCollectionMouseUp)

  const wasDragging = isDragging.value

  if (wasDragging && dragNodeId.value && dropTargetId.value && dropPosition.value) {
    store.moveNode(dragNodeId.value, dropTargetId.value, dropPosition.value)
  }

  dragNodeId.value = null
  dragNodeType.value = null
  dropTargetId.value = null
  dropPosition.value = null
  isDragging.value = false

  // 拖曳結束後短暫標記，防止 click 事件誤觸
  if (wasDragging) {
    justDragged.value = true
    setTimeout(() => { justDragged.value = false }, 50)
  }
}

/** 由 CollectionItem 呼叫，啟動拖曳 */
function startCollectionDrag(e: MouseEvent, nodeId: string, nodeType: string) {
  dragNodeId.value = nodeId
  dragNodeType.value = nodeType
  dragStartX = e.clientX
  dragStartY = e.clientY
  isDragging.value = false

  window.addEventListener('mousemove', onCollectionMouseMove)
  window.addEventListener('mouseup', onCollectionMouseUp)
}

provide('startCollectionDrag', startCollectionDrag)

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onCollectionMouseMove)
  window.removeEventListener('mouseup', onCollectionMouseUp)
})

/** 是否有編輯權限（admin/editor 或地端 workspace） */
const canEdit = computed(() => {
  const ws = wsStore.activeWorkspace
  if (!ws?.teamId) return true // 地端 workspace 無限制
  const team = teamStore.teams.find(t => t.id === ws.teamId)
  if (!team) return true // team 資料未載入或不存在，預設允許編輯（workspace 擁有者）
  return team.role === 'admin' || team.role === 'editor'
})

onMounted(() => {
  store.loadAll()
})

async function addCollection() {
  if (!newName.value.trim()) return
  await store.addNode(newName.value.trim(), 'collection', null)
  newName.value = ''
  showAddMenu.value = false
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImportFile(e: Event) {
  importError.value = null
  const files = (e.target as HTMLInputElement).files
  if (!files || files.length === 0) return

  const errors: string[] = []

  for (const file of Array.from(files)) {
    try {
      const text = await file.text()
      let data: any

      // 嘗試 JSON 解析，失敗則嘗試 YAML
      try {
        data = JSON.parse(text)
      } catch {
        const yaml = await import('js-yaml')
        data = yaml.load(text)
      }

      // 自動判斷格式：OpenAPI/Swagger 或 Postman
      let nodes
      if (isOpenAPISpec(data)) {
        nodes = parseOpenAPISpec(data)
      } else {
        nodes = parsePostmanCollection(data)
      }
      await store.importNodes(nodes)
    } catch (err: any) {
      errors.push(`${file.name}: ${err.message || 'Failed to import'}`)
    }
  }

  if (errors.length > 0) {
    importError.value = errors.join('\n')
  }

  // reset input so same file can be re-imported
  if (fileInput.value) fileInput.value.value = ''
}

/** 遞迴過濾樹：若節點名稱或 request URL 包含搜尋文字則保留 */
function filterTree(nodes: typeof store.tree, filter: string): typeof store.tree {
  if (!filter) return nodes
  const lower = filter.toLowerCase()

  return nodes.reduce((acc, node) => {
    const nameMatch = node.name.toLowerCase().includes(lower)
    const urlMatch = node.request?.url?.toLowerCase().includes(lower) ?? false
    const methodMatch = node.request?.method?.toLowerCase().includes(lower) ?? false
    const filteredChildren = node.children ? filterTree(node.children, filter) : []

    if (nameMatch || urlMatch || methodMatch || filteredChildren.length > 0) {
      acc.push({
        ...node,
        isExpanded: filter ? true : node.isExpanded,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      })
    }
    return acc
  }, [] as typeof store.tree)
}

const filteredNodes = computed(() => filterTree(store.tree, searchText.value))

/** 匯出當前 workspace 的所有 collections */
async function handleExportAll() {
  showMoreMenu.value = false
  const wsId = wsStore.activeWorkspace?.id
  const wsName = wsStore.activeWorkspace?.name || 'collections'
  if (!wsId) return

  const trees = store.getAllCollectionTrees(wsId)
  if (trees.length === 0) return

  const combined = trees.map((c) => exportToPostmanV21(c))
  const jsonStr = JSON.stringify(combined, null, 2)
  const filename = `${wsName.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, '_')}_collections.json`

  const isTauri = !!(window as any).__TAURI_INTERNALS__
  if (isTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    const filePath = await save({
      defaultPath: filename,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (!filePath) return
    await writeTextFile(filePath, jsonStr)
  } else {
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}
</script>

<template>
  <div class="p-2">
    <!-- Hidden file input for Postman import -->
    <input
      ref="fileInput"
      type="file"
      accept=".json,.yaml,.yml"
      multiple
      class="hidden"
      @change="handleImportFile"
    />

    <!-- Search Box -->
    <div class="mb-2">
      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
        <input
          v-model="searchText"
          type="text"
          class="h-8 w-full rounded-button border border-border bg-bg-card pl-7 pr-7 text-xs outline-none transition-colors focus:border-border-focus"
          placeholder="Search APIs..."
        />
        <button
          v-if="searchText"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
          @click="searchText = ''"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Action Buttons（僅 editor/admin 可見） -->
    <div v-if="canEdit" class="mb-2 flex items-center gap-1">
      <!-- 主要動作：New Request -->
      <button
        class="flex h-8 flex-1 items-center justify-center gap-1 rounded-button bg-secondary text-xs font-medium text-white transition-all hover:bg-secondary-60 active:scale-[0.97]"
        @click="tabStore.createTab()"
      >
        <span class="text-base leading-none">+</span>
        New Request
      </button>

      <!-- 次要選單：Collection / Import -->
      <div class="relative">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-button border border-border text-sm text-text-secondary transition-all hover:bg-bg-hover active:scale-[0.97]"
          title="More actions"
          @click="showMoreMenu = !showMoreMenu"
        >
          ⋯
        </button>
        <div
          v-if="showMoreMenu"
          class="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-border bg-bg-card py-1 shadow-lg"
        >
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
            @click="showAddMenu = !showAddMenu; showMoreMenu = false"
          >
            <span class="text-sm">📦</span>
            New Collection
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
            @click="triggerImport(); showMoreMenu = false"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            Import Collection
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
            @click="handleExportAll"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
            Export All
          </button>
        </div>
      </div>
    </div>

    <!-- Import Error -->
    <div v-if="importError" class="mb-2 rounded-sm bg-danger-light px-2 py-1 text-xs text-danger">
      {{ importError }}
    </div>

    <!-- Inline Add Form -->
    <div v-if="showAddMenu" class="mb-2 flex gap-1">
      <input
        v-model="newName"
        class="flex-1 rounded-sm border border-border px-2 py-1 text-xs outline-none focus:border-border-focus"
        placeholder="Collection name"
        @keyup.enter="addCollection"
      />
      <button
        class="rounded-sm bg-secondary px-2 py-1 text-xs text-white hover:bg-secondary-60"
        @click="addCollection"
      >
        Add
      </button>
    </div>

    <!-- Tree -->
    <div v-if="store.tree.length === 0" class="py-8 text-center text-xs text-text-muted">
      No collections yet
    </div>
    <div v-else-if="searchText && filteredNodes.length === 0" class="py-4 text-center text-xs text-text-muted">
      No results for "{{ searchText }}"
    </div>
    <div class="collection-tree-container">
      <CollectionItem
        v-for="node in filteredNodes"
        :key="node.id"
        :node="node"
        :depth="0"
        :can-edit="canEdit"
      />
    </div>
  </div>
</template>
