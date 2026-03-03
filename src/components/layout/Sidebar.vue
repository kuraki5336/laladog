<script setup lang="ts">
import { ref } from 'vue'
import CollectionTree from '@/components/collection/CollectionTree.vue'
import HistoryPanel from '@/components/history/HistoryPanel.vue'
import ConsolePanel from '@/components/console/ConsolePanel.vue'

const activeTab = ref<'collections' | 'history' | 'console'>('collections')
</script>

<template>
  <aside class="flex w-72 shrink-0 flex-col border-r border-border bg-bg-sidebar">
    <!-- Sidebar Tabs -->
    <div class="flex border-b border-border">
      <button
        class="flex-1 px-3 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'collections'
          ? 'border-b-2 border-secondary text-secondary'
          : 'text-text-muted hover:text-text-primary'"
        @click="activeTab = 'collections'"
      >
        Collections
      </button>
      <button
        class="flex-1 px-3 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'history'
          ? 'border-b-2 border-secondary text-secondary'
          : 'text-text-muted hover:text-text-primary'"
        @click="activeTab = 'history'"
      >
        History
      </button>
      <button
        class="flex-1 px-3 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'console'
          ? 'border-b-2 border-secondary text-secondary'
          : 'text-text-muted hover:text-text-primary'"
        @click="activeTab = 'console'"
      >
        Console
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <CollectionTree v-if="activeTab === 'collections'" />
      <HistoryPanel v-else-if="activeTab === 'history'" />
      <ConsolePanel v-else-if="activeTab === 'console'" />
    </div>
  </aside>
</template>
