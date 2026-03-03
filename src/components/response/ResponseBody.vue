<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HttpResponse, ResponseViewMode } from '@/types'

const props = defineProps<{
  response: HttpResponse
}>()

const viewMode = ref<ResponseViewMode>('pretty')

const formattedBody = computed(() => {
  if (viewMode.value === 'raw') return props.response.body

  // Try to format as JSON
  try {
    const parsed = JSON.parse(props.response.body)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return props.response.body
  }
})

const isJson = computed(() => {
  try {
    JSON.parse(props.response.body)
    return true
  } catch {
    return false
  }
})

async function copyToClipboard() {
  await navigator.clipboard.writeText(props.response.body)
}
</script>

<template>
  <div>
    <!-- View Mode Toggle -->
    <div class="mb-2 flex items-center gap-2">
      <button
        v-for="mode in (['pretty', 'raw', 'preview'] as const)"
        :key="mode"
        class="rounded-sm px-2 py-1 text-xs capitalize transition-colors"
        :class="viewMode === mode ? 'bg-primary-10 text-primary' : 'text-text-muted hover:text-text-primary'"
        @click="viewMode = mode"
      >
        {{ mode }}
      </button>
      <button
        class="ml-auto rounded-sm px-2 py-1 text-xs text-text-muted hover:text-text-primary"
        @click="copyToClipboard"
      >
        Copy
      </button>
    </div>

    <!-- Preview Mode (HTML) -->
    <div v-if="viewMode === 'preview'" class="rounded-button border border-border">
      <iframe
        :srcdoc="response.body"
        class="h-64 w-full rounded-button"
        sandbox=""
      />
    </div>

    <!-- Pretty / Raw Mode -->
    <pre
      v-else
      class="max-h-96 overflow-auto rounded-button border border-border bg-bg-stripe p-3 font-mono text-xs leading-5 text-text-primary"
    ><code :class="{ 'text-primary-50': isJson && viewMode === 'pretty' }">{{ formattedBody }}</code></pre>
  </div>
</template>
