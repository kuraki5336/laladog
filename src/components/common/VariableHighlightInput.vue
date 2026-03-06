<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import VariablePopover from './VariablePopover.vue'

const model = defineModel<string>({ default: '' })

withDefaults(defineProps<{
  placeholder?: string
  inputClass?: string
  multiline?: boolean
  rows?: number
}>(), {
  placeholder: '',
  inputClass: '',
  multiline: false,
  rows: 3,
})

const emit = defineEmits<{
  enter: []
}>()

const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
const scrollLeft = ref(0)
const scrollTop = ref(0)

// Popover state
const hoveredVar = ref<string | null>(null)
const popoverAnchorRect = ref<{ top: number; left: number; bottom: number; right: number } | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null

const hasVars = computed(() => (model.value || '').includes('{{'))

const segments = computed(() => {
  const text = model.value || ''
  if (!text || !hasVars.value) return []

  const result: { text: string; isVar: boolean; varName: string }[] = []
  const regex = /(\{\{([\w.:-]*)\}\})/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ text: text.slice(lastIndex, match.index), isVar: false, varName: '' })
    }
    result.push({ text: match[1], isVar: true, varName: match[2] })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    result.push({ text: text.slice(lastIndex), isVar: false, varName: '' })
  }

  return result
})

function syncScroll() {
  if (inputRef.value) {
    scrollLeft.value = inputRef.value.scrollLeft
    scrollTop.value = inputRef.value.scrollTop
  }
}

function scheduleClose() {
  closeTimer = setTimeout(() => {
    hoveredVar.value = null
    popoverAnchorRect.value = null
  }, 200)
}

function cancelClose() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function onVarMouseEnter(e: MouseEvent, varName: string) {
  cancelClose()
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  hoveredVar.value = varName
  popoverAnchorRect.value = {
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.right,
  }
}

function onVarMouseLeave() {
  scheduleClose()
}

function onPopoverMouseEnter() {
  cancelClose()
}

function onPopoverMouseLeave() {
  scheduleClose()
}

function onPopoverClose() {
  cancelClose()
  hoveredVar.value = null
  popoverAnchorRect.value = null
}

function onVarClick() {
  // Forward focus to the input when clicking on variable overlay
  inputRef.value?.focus()
}

onBeforeUnmount(() => {
  if (closeTimer) clearTimeout(closeTimer)
})

defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<template>
  <div class="var-input-wrap">
    <!-- Multiline textarea -->
    <textarea
      v-if="multiline"
      ref="inputRef"
      v-model="model"
      :class="inputClass"
      :placeholder="placeholder"
      :rows="rows"
      :style="hasVars ? 'color: transparent; caret-color: var(--color-text-primary, #333); resize: vertical;' : 'resize: vertical;'"
      @scroll="syncScroll"
    />
    <!-- Single-line input -->
    <input
      v-else
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
      :class="[inputClass, { 'var-overlay--multiline': multiline }]"
    >
      <div class="var-segments" :class="{ 'var-segments--multiline': multiline }" :style="{ transform: `translate(-${scrollLeft}px, -${scrollTop}px)` }">
        <span
          v-for="(seg, idx) in segments"
          :key="idx"
          :class="seg.isVar ? 'var-highlight var-highlight--interactive' : 'var-plain'"
          @mouseenter="seg.isVar ? onVarMouseEnter($event, seg.varName) : undefined"
          @mouseleave="seg.isVar ? onVarMouseLeave() : undefined"
          @click="seg.isVar ? onVarClick() : undefined"
        >{{ seg.text }}</span>
      </div>
    </div>

    <!-- Variable Popover -->
    <VariablePopover
      v-if="hoveredVar"
      :var-name="hoveredVar"
      :anchor-rect="popoverAnchorRect"
      @mouseenter="onPopoverMouseEnter"
      @mouseleave="onPopoverMouseLeave"
      @close="onPopoverClose"
    />
  </div>
</template>

<style scoped>
.var-input-wrap {
  position: relative;
}

.var-input-wrap input,
.var-input-wrap textarea {
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
  z-index: 2;
  /* Override visual-only styles from inputClass */
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.var-overlay--multiline {
  align-items: flex-start;
  white-space: pre-wrap;
  word-break: break-all;
}

.var-segments {
  white-space: nowrap;
}

.var-segments--multiline {
  white-space: pre-wrap;
  word-break: break-all;
}

.var-highlight {
  color: #e67e22;
  background: rgba(230, 126, 34, 0.12);
  border-radius: 2px;
}

.var-highlight--interactive {
  pointer-events: auto;
  cursor: pointer;
}

.var-highlight--interactive:hover {
  background: rgba(230, 126, 34, 0.25);
}

.var-plain {
  color: var(--color-text-primary);
}
</style>
