<script setup lang="ts">
import { ref, computed } from 'vue'

const model = defineModel<string>({ default: '' })

withDefaults(defineProps<{
  placeholder?: string
  inputClass?: string
}>(), {
  placeholder: '',
  inputClass: '',
})

const emit = defineEmits<{
  enter: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const scrollLeft = ref(0)

const hasVars = computed(() => (model.value || '').includes('{{'))

const segments = computed(() => {
  const text = model.value || ''
  if (!text || !hasVars.value) return []

  const result: { text: string; isVar: boolean }[] = []
  const regex = /(\{\{.*?\}\})/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ text: text.slice(lastIndex, match.index), isVar: false })
    }
    result.push({ text: match[1], isVar: true })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    result.push({ text: text.slice(lastIndex), isVar: false })
  }

  return result
})

function syncScroll() {
  if (inputRef.value) {
    scrollLeft.value = inputRef.value.scrollLeft
  }
}

defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<template>
  <div class="var-input-wrap">
    <!-- Actual input -->
    <input
      ref="inputRef"
      v-model="model"
      type="text"
      :class="inputClass"
      :placeholder="placeholder"
      :style="hasVars ? 'color: transparent; caret-color: var(--color-text-primary, #333);' : ''"
      @scroll="syncScroll"
      @keyup.enter="emit('enter')"
    />
    <!-- Variable highlight overlay -->
    <div
      v-if="hasVars"
      class="var-overlay"
      :class="inputClass"
    >
      <div class="var-segments" :style="{ transform: `translateX(-${scrollLeft}px)` }">
        <span
          v-for="(seg, idx) in segments"
          :key="idx"
          :class="seg.isVar ? 'var-highlight' : 'var-plain'"
        >{{ seg.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.var-input-wrap {
  position: relative;
}

.var-input-wrap input {
  width: 100%;
  position: relative;
  z-index: 1;
}

.var-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  pointer-events: none;
  z-index: 0;
  /* Override visual-only styles from inputClass */
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.var-segments {
  white-space: nowrap;
}

.var-highlight {
  color: #e67e22;
  background: rgba(230, 126, 34, 0.12);
  border-radius: 2px;
}

.var-plain {
  color: var(--color-text-primary);
}
</style>
