<script setup lang="ts">
import { onMounted } from 'vue'
import { useEnvironmentStore } from '@/stores/environmentStore'

const store = useEnvironmentStore()

onMounted(() => {
  store.loadAll()
})
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-xs text-text-muted">Environment:</span>
    <select
      class="rounded-button border border-border px-2 py-1 text-xs outline-none focus:border-border-focus"
      :value="store.activeEnvironment?.id || ''"
      @change="(e) => {
        const val = (e.target as HTMLSelectElement).value
        if (val) store.setActive(val)
      }"
    >
      <option value="">No Environment</option>
      <option
        v-for="env in store.environments"
        :key="env.id"
        :value="env.id"
      >
        {{ env.name }}
      </option>
    </select>
  </div>
</template>
