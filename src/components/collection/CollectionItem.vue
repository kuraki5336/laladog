<script setup lang="ts">
import { ref } from 'vue'
import type { CollectionNode } from '@/types'
import { useCollectionStore } from '@/stores/collectionStore'
import { useRequestStore } from '@/stores/requestStore'

const props = defineProps<{
  node: CollectionNode
  depth: number
  canEdit: boolean
}>()

const store = useCollectionStore()
const requestStore = useRequestStore()
const isEditing = ref(false)
const editName = ref('')
const showContextMenu = ref(false)
const showAddChild = ref(false)
const newChildName = ref('')

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
  if (props.node.type === 'request') {
    store.selectedNodeId = props.node.id
    if (props.node.request) {
      requestStore.loadFromCollection(props.node.id, props.node.request)
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

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  if (props.canEdit) {
    showContextMenu.value = !showContextMenu.value
  }
}
</script>

<template>
  <div>
    <!-- Node Row -->
    <div
      class="group flex cursor-pointer items-center gap-1 rounded-sm px-1 py-1 text-xs transition-colors hover:bg-bg-hover"
      :class="{ 'bg-secondary-10': store.selectedNodeId === node.id }"
      :style="{ paddingLeft: `${depth * 16 + 4}px` }"
      @click="handleClick"
      @contextmenu="handleContextMenu"
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
      <span v-if="node.type === 'collection'" class="shrink-0">📦</span>
      <span v-else-if="node.type === 'folder'" class="shrink-0">📁</span>

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

      <!-- Context Menu Trigger（僅可編輯時顯示） -->
      <button
        v-if="canEdit"
        class="shrink-0 px-1 text-text-muted opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100"
        @click.stop="showContextMenu = !showContextMenu"
      >
        ⋯
      </button>
    </div>

    <!-- Context Menu（僅可編輯時顯示） -->
    <div
      v-if="showContextMenu && canEdit"
      class="ml-4 rounded-sm border border-border bg-bg-card py-1 shadow-md"
      :style="{ marginLeft: `${depth * 16 + 20}px` }"
    >
      <button
        v-if="node.type !== 'request'"
        class="block w-full px-3 py-1 text-left text-xs hover:bg-bg-hover"
        @click="showAddChild = true; showContextMenu = false"
      >
        Add Request
      </button>
      <button
        v-if="node.type !== 'request'"
        class="block w-full px-3 py-1 text-left text-xs hover:bg-bg-hover"
        @click="store.addNode('New Folder', 'folder', node.id); showContextMenu = false"
      >
        Add Folder
      </button>
      <button
        class="block w-full px-3 py-1 text-left text-xs hover:bg-bg-hover"
        @click="startRename"
      >
        Rename
      </button>
      <button
        class="block w-full px-3 py-1 text-left text-xs text-danger hover:bg-danger-light"
        @click="store.deleteNode(node.id); showContextMenu = false"
      >
        Delete
      </button>
    </div>

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
