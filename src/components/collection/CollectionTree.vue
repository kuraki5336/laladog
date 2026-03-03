<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCollectionStore } from '@/stores/collectionStore'
import { parsePostmanCollection } from '@/utils/postmanImporter'
import CollectionItem from './CollectionItem.vue'

const store = useCollectionStore()
const showAddMenu = ref(false)
const newName = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const importError = ref<string | null>(null)

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
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const json = JSON.parse(text)
    const nodes = parsePostmanCollection(json)
    await store.importNodes(nodes)
  } catch (err: any) {
    importError.value = err.message || 'Failed to import'
  }

  // reset input so same file can be re-imported
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="p-2">
    <!-- Hidden file input for Postman import -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      class="hidden"
      @change="handleImportFile"
    />

    <!-- Add Collection + Import Buttons -->
    <div class="mb-2 flex items-center gap-1">
      <button
        class="flex h-8 flex-1 items-center justify-center gap-1 rounded-button bg-secondary text-xs font-medium text-white transition-all hover:bg-secondary-60 active:scale-[0.97]"
        @click="showAddMenu = !showAddMenu"
      >
        <span class="text-base">+</span>
        New Collection
      </button>
      <button
        class="flex h-8 items-center gap-1 rounded-button border border-border px-2 text-xs font-medium text-text-secondary transition-all hover:bg-bg-hover active:scale-[0.97]"
        title="Import Postman Collection (v2.1 JSON)"
        @click="triggerImport"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
        Import
      </button>
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
    <CollectionItem
      v-for="node in store.tree"
      :key="node.id"
      :node="node"
      :depth="0"
    />
  </div>
</template>
