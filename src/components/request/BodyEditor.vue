<script setup lang="ts">
import { ref } from 'vue'
import { useRequestStore } from '@/stores/requestStore'
import KeyValueEditor from '@/components/common/KeyValueEditor.vue'
import FormDataEditor from '@/components/common/FormDataEditor.vue'
import VariableHighlightInput from '@/components/common/VariableHighlightInput.vue'

const store = useRequestStore()
const formatError = ref<string | null>(null)

function formatJson() {
  formatError.value = null
  const raw = store.activeRequest.body.raw
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    store.activeRequest.body.raw = JSON.stringify(parsed, null, 2)
  } catch {
    formatError.value = 'Invalid JSON'
    setTimeout(() => { formatError.value = null }, 2000)
  }
}

const bodyTypes = [
  { key: 'none', label: 'none' },
  { key: 'raw', label: 'raw' },
  { key: 'form-data', label: 'form-data' },
  { key: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
] as const

const rawTypes = ['json', 'xml', 'text'] as const
</script>

<template>
  <div>
    <!-- Body Type Selector -->
    <div class="mb-3 flex items-center gap-3">
      <label
        v-for="bt in bodyTypes"
        :key="bt.key"
        class="flex cursor-pointer items-center gap-1 text-xs"
      >
        <input
          type="radio"
          :value="bt.key"
          v-model="store.activeRequest.body.type"
          class="accent-secondary"
        />
        {{ bt.label }}
      </label>
    </div>

    <!-- None -->
    <div v-if="store.activeRequest.body.type === 'none'" class="py-4 text-center text-xs text-text-muted">
      This request does not have a body
    </div>

    <!-- Raw Body -->
    <div v-else-if="store.activeRequest.body.type === 'raw'">
      <div class="mb-2 flex items-center gap-2">
        <select
          v-model="store.activeRequest.body.rawType"
          class="rounded-sm border border-border px-2 py-1 text-xs outline-none focus:border-border-focus"
        >
          <option v-for="rt in rawTypes" :key="rt" :value="rt">{{ rt.toUpperCase() }}</option>
        </select>
        <button
          v-if="store.activeRequest.body.rawType === 'json'"
          class="rounded-sm border border-border px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
          @click="formatJson"
        >
          Format
        </button>
        <span v-if="formatError" class="text-xs text-danger">{{ formatError }}</span>
      </div>
      <VariableHighlightInput
        v-model="store.activeRequest.body.raw"
        multiline
        :rows="10"
        input-class="h-48 w-full rounded-button border border-border p-3 font-mono text-xs outline-none transition-colors focus:border-border-focus"
        placeholder='{ "key": "value" }'
      />
    </div>

    <!-- Form Data -->
    <div v-else-if="store.activeRequest.body.type === 'form-data'">
      <FormDataEditor v-model="store.activeRequest.body.formData!" />
    </div>

    <!-- URL Encoded -->
    <div v-else-if="store.activeRequest.body.type === 'x-www-form-urlencoded'">
      <KeyValueEditor v-model="store.activeRequest.body.urlencoded!" placeholder-key="Key" placeholder-value="Value" />
    </div>
  </div>
</template>
