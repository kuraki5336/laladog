<script setup lang="ts">
import { useRequestStore } from '@/stores/requestStore'
import { useHistoryStore } from '@/stores/historyStore'

const requestStore = useRequestStore()
const historyStore = useHistoryStore()
</script>

<template>
  <footer class="flex h-6 shrink-0 items-center justify-between border-t border-border bg-primary px-3 text-xs text-text-inverse">
    <div class="flex items-center gap-3">
      <span v-if="requestStore.activeRequest.isSending" class="animate-pulse">Sending...</span>
      <span v-else>Ready</span>
    </div>
    <div class="flex items-center gap-3">
      <span>History: {{ historyStore.entries.length }}</span>
    </div>
  </footer>
</template>
