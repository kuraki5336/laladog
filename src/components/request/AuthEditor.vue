<script setup lang="ts">
import { useRequestStore } from '@/stores/requestStore'

const store = useRequestStore()

const authTypes = [
  { key: 'none', label: 'No Auth' },
  { key: 'bearer', label: 'Bearer Token' },
  { key: 'basic', label: 'Basic Auth' },
  { key: 'apikey', label: 'API Key' },
] as const
</script>

<template>
  <div>
    <!-- Auth Type Selector -->
    <div class="mb-4">
      <label class="mb-1 block text-xs font-medium text-text-secondary">Type</label>
      <select
        v-model="store.activeRequest.auth.type"
        class="rounded-button border border-border px-3 py-2 text-xs outline-none focus:border-border-focus"
      >
        <option v-for="at in authTypes" :key="at.key" :value="at.key">{{ at.label }}</option>
      </select>
    </div>

    <!-- No Auth -->
    <div v-if="store.activeRequest.auth.type === 'none'" class="py-4 text-center text-xs text-text-muted">
      No authentication
    </div>

    <!-- Bearer Token -->
    <div v-else-if="store.activeRequest.auth.type === 'bearer'">
      <label class="mb-1 block text-xs font-medium text-text-secondary">Token</label>
      <input
        v-model="store.activeRequest.auth.bearer!.token"
        type="text"
        class="w-full rounded-button border border-border px-3 py-2 font-mono text-xs outline-none focus:border-border-focus"
        placeholder="Enter token"
      />
    </div>

    <!-- Basic Auth -->
    <div v-else-if="store.activeRequest.auth.type === 'basic'" class="space-y-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-text-secondary">Username</label>
        <input
          v-model="store.activeRequest.auth.basic!.username"
          type="text"
          class="w-full rounded-button border border-border px-3 py-2 text-xs outline-none focus:border-border-focus"
          placeholder="Username"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-text-secondary">Password</label>
        <input
          v-model="store.activeRequest.auth.basic!.password"
          type="password"
          class="w-full rounded-button border border-border px-3 py-2 text-xs outline-none focus:border-border-focus"
          placeholder="Password"
        />
      </div>
    </div>

    <!-- API Key -->
    <div v-else-if="store.activeRequest.auth.type === 'apikey'" class="space-y-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-text-secondary">Key</label>
        <input
          v-model="store.activeRequest.auth.apikey!.key"
          type="text"
          class="w-full rounded-button border border-border px-3 py-2 text-xs outline-none focus:border-border-focus"
          placeholder="e.g. X-API-Key"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-text-secondary">Value</label>
        <input
          v-model="store.activeRequest.auth.apikey!.value"
          type="text"
          class="w-full rounded-button border border-border px-3 py-2 font-mono text-xs outline-none focus:border-border-focus"
          placeholder="API Key value"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-text-secondary">Add to</label>
        <select
          v-model="store.activeRequest.auth.apikey!.addTo"
          class="rounded-button border border-border px-3 py-2 text-xs outline-none focus:border-border-focus"
        >
          <option value="header">Header</option>
          <option value="query">Query Params</option>
        </select>
      </div>
    </div>
  </div>
</template>
