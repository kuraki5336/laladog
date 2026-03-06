<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import type { CollectionNode } from '@/types'
import type { Ref } from 'vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { useTabStore } from '@/stores/tabStore'
import { exportToPostmanV21 } from '@/utils/postmanExporter'

const props = defineProps<{
  node: CollectionNode
  depth: number
  canEdit: boolean
}>()

const store = useCollectionStore()
const tabStore = useTabStore()
const isEditing = ref(false)
const editName = ref('')
const showContextMenu = ref(false)
const showAddChild = ref(false)
const newChildName = ref('')

/* ── Drag & Drop (inject shared state) ── */
const collectionDrag = inject<{
  dragNodeId: Ref<string | null>
  dragNodeType: Ref<string | null>
  dropTargetId: Ref<string | null>
  dropPosition: Ref<'before' | 'after' | 'inside' | null>
  isDragging: Ref<boolean>
  justDragged: Ref<boolean>
}>('collectionDrag')!

const startCollectionDrag = inject<(e: MouseEvent, nodeId: string, nodeType: string) => void>('startCollectionDrag')!

function onNodeMouseDown(e: MouseEvent) {
  // 只處理左鍵
  if (e.button !== 0) return
  if (isEditing.value) return
  if (!props.canEdit) return

  // 點到按鈕或 input 不啟動拖曳
  const target = e.target as HTMLElement
  if (target.closest('button') || target.closest('input')) return

  startCollectionDrag(e, props.node.id, props.node.type)
}

/** 當前節點的拖曳指示器位置 class */
const dropIndicatorClass = computed(() => {
  if (!collectionDrag.isDragging.value) return ''
  if (collectionDrag.dropTargetId.value !== props.node.id) return ''

  const pos = collectionDrag.dropPosition.value
  if (pos === 'before') return 'drop-before'
  if (pos === 'after') return 'drop-after'
  if (pos === 'inside') return 'drop-inside'
  return ''
})

const isDragSource = computed(() =>
  collectionDrag.isDragging.value && collectionDrag.dragNodeId.value === props.node.id
)

const methodColors: Record<string, string> = {
  GET: 'text-green-600',
  POST: 'text-yellow-600',
  PUT: 'text-blue-600',
  PATCH: 'text-purple-600',
  DELETE: 'text-danger',
  HEAD: 'text-text-muted',
  OPTIONS: 'text-text-muted',
}

function handleClick() {
  // 拖曳中或拖曳剛結束時不觸發點擊
  if (collectionDrag.isDragging.value || collectionDrag.dragNodeId.value || collectionDrag.justDragged.value) return

  if (props.node.type === 'request') {
    store.selectedNodeId = props.node.id
    if (props.node.request) {
      tabStore.openFromCollection(props.node.id, props.node.request, props.node.name)
    }
  } else {
    store.toggleExpand(props.node.id)
  }
}

function startRename() {
  editName.value = props.node.name
  isEditing.value = true
  showContextMenu.value = false
}

async function finishRename() {
  if (editName.value.trim()) {
    await store.renameNode(props.node.id, editName.value.trim())
  }
  isEditing.value = false
}

async function addChild(type: 'folder' | 'request') {
  if (!newChildName.value.trim()) return
  await store.addNode(
    newChildName.value.trim(),
    type,
    props.node.id,
    type === 'request' ? { method: 'GET', url: '', params: [], headers: [], body: { type: 'none' }, auth: { type: 'none' } } : undefined,
  )
  newChildName.value = ''
  showAddChild.value = false
}

async function handleExport() {
  showContextMenu.value = false
  const collectionTree = store.getCollectionTree(props.node.id)
  if (!collectionTree) return

  const postmanJson = exportToPostmanV21(collectionTree)
  const jsonStr = JSON.stringify(postmanJson, null, 2)
  const filename = `${props.node.name.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, '_')}.postman_collection.json`

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

const contextMenuPos = ref({ x: 0, y: 0 })

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  if (props.canEdit) {
    contextMenuPos.value = { x: e.clientX, y: e.clientY }
    showContextMenu.value = !showContextMenu.value
  }
}

function openContextMenuFromButton(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  contextMenuPos.value = { x: rect.left, y: rect.bottom + 4 }
  showContextMenu.value = !showContextMenu.value
}
</script>

<template>
  <div>
    <!-- Node Row -->
    <div
      :data-node-id="node.id"
      :data-node-type="node.type"
      class="group relative flex items-center gap-1 rounded-sm px-1 py-2 text-xs transition-colors select-none"
      :class="[
        store.selectedNodeId === node.id ? 'bg-secondary-10' : 'hover:bg-bg-hover',
        isDragSource ? 'opacity-40' : '',
        collectionDrag.isDragging.value ? 'cursor-grabbing' : 'cursor-pointer',
        dropIndicatorClass,
      ]"
      :style="{ paddingLeft: `${depth * 16 + 4}px` }"
      @click="handleClick"
      @contextmenu="handleContextMenu"
      @mousedown="onNodeMouseDown"
    >
      <!-- Expand/Collapse Icon -->
      <span
        v-if="node.type !== 'request'"
        class="w-4 shrink-0 text-center text-text-muted transition-transform"
        :class="{ 'rotate-90': node.isExpanded }"
      >
        ▶
      </span>
      <span v-else class="w-4 shrink-0" />

      <!-- Method Badge (for requests) -->
      <span
        v-if="node.type === 'request' && node.request"
        class="w-10 shrink-0 text-[10px] font-bold"
        :class="methodColors[node.request.method] || 'text-text-muted'"
      >
        {{ node.request.method }}
      </span>

      <!-- Icon (for collections/folders) -->
      <svg v-if="node.type === 'collection'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
      </svg>
      <svg v-else-if="node.type === 'folder'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>

      <!-- Name -->
      <input
        v-if="isEditing"
        v-model="editName"
        class="flex-1 rounded-sm border border-border-focus px-1 text-xs outline-none"
        @blur="finishRename"
        @keyup.enter="finishRename"
        @click.stop
      />
      <span v-else class="flex-1 truncate text-text-primary">{{ node.name }}</span>

      <!-- Add Request Button (visible on hover for collections/folders) -->
      <button
        v-if="canEdit && node.type !== 'request'"
        class="shrink-0 px-1 text-text-muted opacity-0 transition-opacity hover:text-secondary group-hover:opacity-100"
        title="Add Request"
        @click.stop="showAddChild = true; showContextMenu = false"
      >
        +
      </button>

      <!-- Context Menu Trigger -->
      <button
        v-if="canEdit"
        class="shrink-0 px-1 text-text-muted opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100"
        @click.stop="openContextMenuFromButton($event)"
      >
        ⋯
      </button>
    </div>

    <!-- Context Menu (floating) -->
    <Teleport to="body">
      <div v-if="showContextMenu && canEdit" class="fixed inset-0 z-40" @click="showContextMenu = false" @contextmenu.prevent="showContextMenu = false" />
      <div
        v-if="showContextMenu && canEdit"
        class="fixed z-50 w-40 rounded-lg border border-border bg-bg-card py-1 shadow-xl"
        :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
      >
        <button
          v-if="node.type !== 'request'"
          class="flex w-full items-center px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
          @click="showAddChild = true; showContextMenu = false"
        >
          Add Request
        </button>
        <button
          v-if="node.type !== 'request'"
          class="flex w-full items-center px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
          @click="store.addNode('New Folder', 'folder', node.id); showContextMenu = false"
        >
          Add Folder
        </button>
        <button
          v-if="node.type === 'collection'"
          class="flex w-full items-center px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
          @click="handleExport"
        >
          Export
        </button>
        <div v-if="node.type !== 'request'" class="my-1 border-t border-border" />
        <button
          class="flex w-full items-center px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
          @click="startRename"
        >
          Rename
        </button>
        <div class="my-1 border-t border-border" />
        <button
          class="flex w-full items-center px-3 py-1.5 text-left text-xs text-danger hover:bg-bg-hover"
          @click="store.deleteNode(node.id); showContextMenu = false"
        >
          Delete
        </button>
      </div>
    </Teleport>

    <!-- Add Child Form -->
    <div
      v-if="showAddChild"
      class="flex gap-1 py-1"
      :style="{ paddingLeft: `${(depth + 1) * 16 + 4}px` }"
    >
      <input
        v-model="newChildName"
        class="flex-1 rounded-sm border border-border px-2 py-1 text-xs outline-none focus:border-border-focus"
        placeholder="Request name"
        @keyup.enter="addChild('request')"
      />
      <button
        class="rounded-sm bg-secondary px-2 py-1 text-xs text-white hover:bg-secondary-60"
        @click="addChild('request')"
      >
        +
      </button>
    </div>

    <!-- Children -->
    <div v-if="node.isExpanded && node.children?.length">
      <CollectionItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :can-edit="canEdit"
      />
    </div>
  </div>
</template>

<style scoped>
/* ── Drag & Drop 視覺指示器 ── */

/* before / after：顯示一條明顯的藍色橫線 + 小圓點 */
.drop-before::before,
.drop-after::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  background-color: var(--color-secondary);
  border-radius: 1px;
  z-index: 10;
}
.drop-before::before {
  top: -1px;
}
.drop-after::after {
  bottom: -1px;
}

/* 小圓點標記 */
.drop-before::after {
  content: '';
  position: absolute;
  left: 4px;
  top: -4px;
  width: 8px;
  height: 8px;
  background-color: var(--color-secondary);
  border-radius: 50%;
  z-index: 11;
}
.drop-after::before {
  content: '';
  position: absolute;
  left: 4px;
  bottom: -4px;
  width: 8px;
  height: 8px;
  background-color: var(--color-secondary);
  border-radius: 50%;
  z-index: 11;
}

/* inside：虛線框 + 背景色 */
.drop-inside {
  background-color: var(--color-secondary-10) !important;
  outline: 2px dashed var(--color-secondary);
  outline-offset: -2px;
  border-radius: 4px;
}
</style>
