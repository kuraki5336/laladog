<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useEnvironmentStore } from '@/stores/environmentStore'

const props = defineProps<{
  varName: string
  anchorRect: { top: number; left: number; bottom: number; right: number } | null
}>()

const emit = defineEmits<{
  close: []
  mouseenter: []
  mouseleave: []
}>()

const envStore = useEnvironmentStore()

const editValue = ref('')
const popoverRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const sharedValue = computed(() => envStore.getSharedValue(props.varName))
const currentValue = computed(() => envStore.allVariables[props.varName] ?? '')
const hasOverride = computed(() => props.varName in envStore.localOverrides)
const variableSource = computed(() => envStore.getVariableSource(props.varName))
const isUndefined = computed(() => sharedValue.value === undefined && !hasOverride.value)

const sourceLabel = computed(() => {
  if (isUndefined.value) return 'Unresolved'
  const src = variableSource.value
  if (src.source === 'environment') return src.envName || 'Environment'
  if (src.source === 'global') return 'Global'
  return 'Unknown'
})

// Position the popover
const popoverStyle = computed(() => {
  if (!props.anchorRect) return { display: 'none' }
  return {
    position: 'fixed' as const,
    top: `${props.anchorRect.bottom + 6}px`,
    left: `${props.anchorRect.left}px`,
    zIndex: 9999,
  }
})

watch(
  () => props.varName,
  () => {
    editValue.value = currentValue.value
  },
  { immediate: true },
)

function applyLocalOverride() {
  if (editValue.value !== currentValue.value) {
    envStore.setLocalOverride(props.varName, editValue.value)
  }
}

async function updateShared() {
  const val = hasOverride.value ? envStore.localOverrides[props.varName] : editValue.value
  await envStore.updateSharedValue(props.varName, val)
  editValue.value = envStore.allVariables[props.varName] ?? ''
}

function resetValue() {
  envStore.clearLocalOverride(props.varName)
  editValue.value = sharedValue.value ?? ''
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    applyLocalOverride()
    inputRef.value?.blur()
  } else if (e.key === 'Escape') {
    editValue.value = currentValue.value
    inputRef.value?.blur()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="popoverRef"
      class="variable-popover"
      :style="popoverStyle"
      @mouseenter="emit('mouseenter')"
      @mouseleave="emit('mouseleave')"
    >
      <!-- Header: variable name + source -->
      <div class="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span class="font-mono text-sm font-semibold text-text-primary">{{ varName }}</span>
        <span
          class="rounded px-2 py-0.5 text-[11px] font-medium"
          :class="isUndefined ? 'bg-danger/10 text-danger' : 'bg-secondary-10 text-secondary'"
        >
          {{ sourceLabel }}
        </span>
        <span v-if="hasOverride" class="rounded bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
          Local
        </span>
      </div>

      <!-- Value: always an input -->
      <div class="px-4 py-3">
        <input
          v-if="!isUndefined"
          ref="inputRef"
          v-model="editValue"
          class="w-full rounded border border-border bg-bg-page px-2.5 py-1.5 font-mono text-sm text-text-primary outline-none transition-colors focus:border-primary"
          @keydown="onEditKeydown"
          @blur="applyLocalOverride"
        />
        <div v-else class="text-sm italic text-text-muted">
          Variable is not defined
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 border-t border-border px-4 py-3">
        <button
          class="shrink-0 whitespace-nowrap rounded px-4 py-2 text-sm text-text-primary transition-colors hover:bg-bg-hover"
          @click="updateShared"
        >
          Update shared value
        </button>
        <button
          class="shrink-0 whitespace-nowrap rounded px-4 py-2 text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          @click="resetValue"
        >
          Reset value
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.variable-popover {
  min-width: 320px;
  max-width: 480px;
  background: var(--color-bg-card, #fff);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
</style>
