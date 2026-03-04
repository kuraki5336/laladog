<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { useTabStore } from '@/stores/tabStore'
import type { CollectionNode } from '@/types'

const props = defineProps<{
  tabId: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const collectionStore = useCollectionStore()
const tabStore = useTabStore()
const requestName = ref('')
const selectedParentId = ref<string | null>(null)

// 取得可選擇的父節點（collections + folders）
const selectableNodes = computed(() => {
  const result: { id: string; name: string; depth: number }[] = []
  function walk(nodes: CollectionNode[], depth: number) {
    for (const node of nodes) {
      if (node.type === 'collection' || node.type === 'folder') {
        result.push({ id: node.id, name: node.name, depth })
        if (node.children) {
          walk(node.children, depth + 1)
        }
      }
    }
  }
  walk(collectionStore.tree, 0)
  return result
})

// 預設選取第一個 collection
if (selectableNodes.value.length > 0) {
  selectedParentId.value = selectableNodes.value[0].id
}

// 預設名稱來自 tab title
const tab = tabStore.tabs.find(t => t.id === props.tabId)
if (tab) {
  requestName.value = tab.title === 'Untitled' ? '' : tab.title
}

async function handleSave() {
  if (!requestName.value.trim() || !selectedParentId.value) return

  const tab = tabStore.tabs.find(t => t.id === props.tabId)
  if (!tab) return

  const savedRequest = {
    method: tab.request.method,
    url: tab.request.url,
    params: tab.request.params,
    headers: tab.request.headers,
    body: tab.request.body,
    auth: tab.request.auth,
    preRequestScript: tab.request.preRequestScript,
    testScript: tab.request.testScript,
  }

  const nodeId = await collectionStore.addNode(
    requestName.value.trim(),
    'request',
    selectedParentId.value,
    savedRequest,
  )

  tabStore.markSaved(props.tabId, nodeId, requestName.value.trim())
  emit('saved')
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="emit('close')"
    >
      <div class="w-96 rounded-lg bg-bg-card p-4 shadow-xl">
        <h3 class="mb-3 text-sm font-medium text-text-primary">Save to Collection</h3>

        <!-- Request Name -->
        <div class="mb-3">
          <label class="mb-1 block text-xs text-text-secondary">Request Name</label>
          <input
            v-model="requestName"
            class="h-8 w-full rounded-button border border-border px-3 text-xs outline-none transition-colors focus:border-border-focus"
            placeholder="e.g. Get Users List"
            @keyup.enter="handleSave"
          />
        </div>

        <!-- Collection/Folder Selector -->
        <div class="mb-4">
          <label class="mb-1 block text-xs text-text-secondary">Save to</label>
          <div v-if="selectableNodes.length === 0" class="rounded-button border border-border p-3 text-center text-xs text-text-muted">
            No collections available. Create one first.
          </div>
          <div v-else class="max-h-48 overflow-y-auto rounded-button border border-border">
            <div
              v-for="node in selectableNodes"
              :key="node.id"
              class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-bg-hover"
              :class="{ 'bg-secondary-10 text-secondary': selectedParentId === node.id }"
              :style="{ paddingLeft: `${node.depth * 16 + 12}px` }"
              @click="selectedParentId = node.id"
            >
              <span>{{ node.depth === 0 ? '📦' : '📁' }}</span>
              <span class="truncate">{{ node.name }}</span>
              <span v-if="selectedParentId === node.id" class="ml-auto text-secondary">✓</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2">
          <button
            class="rounded-button px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            class="rounded-button bg-secondary px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-secondary-60 disabled:opacity-50"
            :disabled="!requestName.trim() || !selectedParentId"
            @click="handleSave"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
