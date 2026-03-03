<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import TeamMembersDialog from './TeamMembersDialog.vue'

const wsStore = useWorkspaceStore()
const isAdding = ref(false)
const showMembersDialog = ref(false)
const newName = ref('')
const showMenu = ref(false)
const renamingId = ref<string | null>(null)
const renameValue = ref('')

function handleSwitch(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === '__add__') {
    isAdding.value = true
    return
  }
  wsStore.setActive(value)
}

async function handleAdd() {
  const name = newName.value.trim()
  if (!name) {
    isAdding.value = false
    return
  }
  await wsStore.addWorkspace(name)
  newName.value = ''
  isAdding.value = false
}

function handleCancel() {
  isAdding.value = false
  newName.value = ''
}

async function handleDelete() {
  const ws = wsStore.activeWorkspace
  if (!ws) return
  if (wsStore.workspaces.length <= 1) return
  showMenu.value = false
  await wsStore.deleteWorkspace(ws.id)
}

function startRename() {
  const ws = wsStore.activeWorkspace
  if (!ws) return
  showMenu.value = false
  renamingId.value = ws.id
  renameValue.value = ws.name
  nextTick(() => {
    const input = document.querySelector('.rename-input') as HTMLInputElement
    input?.focus()
    input?.select()
  })
}

async function handleRename() {
  if (renamingId.value && renameValue.value.trim()) {
    await wsStore.renameWorkspace(renamingId.value, renameValue.value.trim())
  }
  renamingId.value = null
  renameValue.value = ''
}

function cancelRename() {
  renamingId.value = null
  renameValue.value = ''
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}

// 點擊外部關閉
function onClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.ws-menu-area')) {
    showMenu.value = false
  }
}
</script>

<template>
  <div class="flex items-center gap-1.5" @click.stop>
    <!-- 重命名模式 -->
    <template v-if="renamingId">
      <input
        v-model="renameValue"
        type="text"
        class="rename-input h-7 w-32 rounded-sm border border-border px-2 text-xs outline-none focus:border-border-focus"
        @keyup.enter="handleRename"
        @keyup.escape="cancelRename"
      />
      <button
        class="h-7 rounded-sm border border-border px-2 text-xs text-text-secondary hover:bg-bg-hover"
        @click="handleRename"
      >
        OK
      </button>
      <button
        class="h-7 text-xs text-text-muted hover:text-text-primary"
        @click="cancelRename"
      >
        Cancel
      </button>
    </template>

    <!-- 新增工作區 inline -->
    <template v-else-if="isAdding">
      <input
        v-model="newName"
        type="text"
        class="h-7 w-32 rounded-sm border border-border px-2 text-xs outline-none focus:border-border-focus"
        placeholder="Workspace name"
        autofocus
        @keyup.enter="handleAdd"
        @keyup.escape="handleCancel"
      />
      <button
        class="h-7 rounded-sm border border-border px-2 text-xs text-text-secondary hover:bg-bg-hover"
        @click="handleAdd"
      >
        OK
      </button>
      <button
        class="h-7 text-xs text-text-muted hover:text-text-primary"
        @click="handleCancel"
      >
        Cancel
      </button>
    </template>

    <!-- 工作區選擇 + 管理選單 -->
    <template v-else>
      <select
        :value="wsStore.activeWorkspace?.id || ''"
        class="h-7 rounded-sm border border-border bg-transparent px-2 text-xs text-text-secondary outline-none focus:border-border-focus"
        @change="handleSwitch"
      >
        <option
          v-for="ws in wsStore.workspaces"
          :key="ws.id"
          :value="ws.id"
        >
          {{ ws.name }}
        </option>
        <option value="__add__">+ New Workspace</option>
      </select>

      <!-- 三點選單按鈕 -->
      <div class="ws-menu-area relative">
        <button
          class="flex h-7 w-7 items-center justify-center rounded-sm text-text-muted hover:bg-bg-hover hover:text-text-secondary"
          title="Workspace settings"
          @click="toggleMenu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        <!-- 下拉選單 -->
        <div
          v-if="showMenu"
          class="absolute left-0 top-full z-50 mt-1 w-40 rounded-md border border-border bg-bg-card py-1 shadow-lg"
        >
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
            @click="startRename"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
            Rename
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
            @click="showMembersDialog = true; showMenu = false"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Members
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-bg-hover"
            :class="wsStore.workspaces.length <= 1 ? 'text-text-muted cursor-not-allowed' : 'text-red-500'"
            :disabled="wsStore.workspaces.length <= 1"
            @click="handleDelete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </template>
  </div>

  <!-- 點擊外部關閉 overlay -->
  <Teleport to="body">
    <div
      v-if="showMenu"
      class="fixed inset-0 z-40"
      @click="showMenu = false"
    />
  </Teleport>

  <!-- Team Members Dialog -->
  <TeamMembersDialog
    :open="showMembersDialog"
    @close="showMembersDialog = false"
  />
</template>
