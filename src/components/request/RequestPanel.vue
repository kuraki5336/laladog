<script setup lang="ts">
import { useRequestStore } from '@/stores/requestStore'
import UrlBar from './UrlBar.vue'
import ParamsEditor from './ParamsEditor.vue'
import HeadersEditor from './HeadersEditor.vue'
import BodyEditor from './BodyEditor.vue'
import AuthEditor from './AuthEditor.vue'
import ScriptEditor from './ScriptEditor.vue'

const store = useRequestStore()

const tabs = [
  { key: 'params', label: 'Params' },
  { key: 'headers', label: 'Headers' },
  { key: 'body', label: 'Body' },
  { key: 'auth', label: 'Auth' },
  { key: 'pre-request', label: 'Pre-request' },
  { key: 'tests', label: 'Tests' },
] as const
</script>

<template>
  <div class="flex flex-1 flex-col overflow-hidden bg-bg-card">
    <!-- URL Bar -->
    <UrlBar />

    <!-- Tabs -->
    <div class="flex border-b border-border">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-4 py-2 text-xs font-medium transition-colors"
        :class="store.activeRequest.activeTab === tab.key
          ? 'border-b-2 border-secondary text-secondary'
          : 'text-text-muted hover:text-text-primary'"
        @click="store.activeRequest.activeTab = tab.key"
      >
        {{ tab.label }}
        <span
          v-if="tab.key === 'headers' && store.activeRequest.headers.filter(h => h.enabled).length"
          class="ml-1 rounded-full bg-secondary-10 px-1.5 text-[10px] text-secondary"
        >
          {{ store.activeRequest.headers.filter(h => h.enabled).length }}
        </span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-y-auto p-3">
      <ParamsEditor v-if="store.activeRequest.activeTab === 'params'" />
      <HeadersEditor v-else-if="store.activeRequest.activeTab === 'headers'" />
      <BodyEditor v-else-if="store.activeRequest.activeTab === 'body'" />
      <AuthEditor v-else-if="store.activeRequest.activeTab === 'auth'" />
      <ScriptEditor v-else-if="store.activeRequest.activeTab === 'pre-request'" type="pre-request" v-model="store.activeRequest.preRequestScript" />
      <ScriptEditor v-else-if="store.activeRequest.activeTab === 'tests'" type="tests" v-model="store.activeRequest.testScript" :response="store.response" />
    </div>
  </div>
</template>
