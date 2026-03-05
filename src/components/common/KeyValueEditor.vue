<script setup lang="ts">
import type { KeyValuePair } from '@/types'
import VariableHighlightInput from './VariableHighlightInput.vue'

const model = defineModel<KeyValuePair[]>({ required: true })

defineProps<{
  placeholderKey?: string
  placeholderValue?: string
}>()

function addRow() {
  if (!model.value) model.value = []
  model.value.push({
    id: crypto.randomUUID(),
    key: '',
    value: '',
    enabled: true,
  })
}

function removeRow(index: number) {
  model.value.splice(index, 1)
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase text-text-muted">
      <span class="w-6" />
      <span class="flex-1">Key</span>
      <span class="flex-1">Value</span>
      <span class="w-8" />
    </div>

    <!-- Rows -->
    <div
      v-for="(item, index) in model"
      :key="item.id"
      class="mb-1 flex items-center gap-2"
    >
      <input
        type="checkbox"
        v-model="item.enabled"
        class="h-4 w-4 shrink-0 accent-secondary"
      />
      <input
        v-model="item.key"
        class="flex-1 rounded-sm border border-border px-2 py-1.5 text-xs outline-none focus:border-border-focus"
        :placeholder="placeholderKey || 'Key'"
      />
      <VariableHighlightInput
        v-model="item.value"
        class="flex-1"
        input-class="w-full rounded-sm border border-border px-2 py-1.5 text-xs outline-none focus:border-border-focus"
        :placeholder="placeholderValue || 'Value'"
      />
      <button
        class="flex h-6 w-8 shrink-0 items-center justify-center text-text-muted hover:text-danger"
        @click="removeRow(index)"
      >
        ✕
      </button>
    </div>

    <!-- Add Button -->
    <button
      class="mt-1 flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-text-muted hover:bg-bg-hover hover:text-text-primary"
      @click="addRow"
    >
      <span>+</span> Add
    </button>
  </div>
</template>
