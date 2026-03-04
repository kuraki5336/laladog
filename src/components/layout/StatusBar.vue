<script setup lang="ts">
import { useRequestStore } from '@/stores/requestStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useSyncStore } from '@/stores/syncStore'
import { useCollectionStore } from '@/stores/collectionStore'

const requestStore = useRequestStore()
const historyStore = useHistoryStore()
const syncStore = useSyncStore()
const collectionStore = useCollectionStore()
</script>

<template>
  <footer class="flex h-6 shrink-0 items-center justify-between border-t border-border bg-primary px-3 text-xs text-text-inverse">
    <div class="flex items-center gap-3">
      <span v-if="requestStore.activeRequest.isSending" class="animate-pulse">Sending...</span>
      <span v-else>Ready</span>
    </div>
    <div class="flex items-center gap-3">
      <!-- WebSocket 同步狀態 -->
      <span v-if="syncStore.currentTeamId" class="flex items-center gap-1" :title="'Sync: ' + syncStore.status">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="{
            'bg-green-400': syncStore.status === 'connected',
            'bg-yellow-400 animate-pulse': syncStore.status === 'connecting',
            'bg-gray-400': syncStore.status === 'disconnected',
          }"
        />
        <span v-if="collectionStore.isSyncing" class="animate-pulse">Syncing...</span>
        <span v-else-if="syncStore.status === 'connected'">Live</span>
        <span v-else-if="syncStore.status === 'connecting'">Connecting</span>
        <span v-else>Offline</span>
      </span>
      <span>History: {{ historyStore.entries.length }}</span>
    </div>
  </footer>
</template>
