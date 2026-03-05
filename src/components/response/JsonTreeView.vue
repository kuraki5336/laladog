<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  data: any
  depth?: number
  keyName?: string
  defaultExpanded?: boolean
}>(), {
  depth: 0,
  keyName: '',
  defaultExpanded: true,
})

const isExpanded = ref(props.defaultExpanded && props.depth < 3)

const isObject = computed(() => props.data !== null && typeof props.data === 'object' && !Array.isArray(props.data))
const isArray = computed(() => Array.isArray(props.data))
const isExpandable = computed(() => isObject.value || isArray.value)

const entries = computed(() => {
  if (isObject.value) return Object.entries(props.data)
  if (isArray.value) return props.data.map((v: any, i: number) => [String(i), v] as [string, any])
  return []
})

const childCount = computed(() => entries.value.length)
const bracketOpen = computed(() => isArray.value ? '[' : '{')
const bracketClose = computed(() => isArray.value ? ']' : '}')

const preview = computed(() => {
  if (isArray.value) return `[${childCount.value} items]`
  if (isObject.value) return `{${childCount.value} keys}`
  return ''
})

function valueClass(val: any): string {
  if (val === null) return 'json-null'
  if (typeof val === 'string') return 'json-string'
  if (typeof val === 'number') return 'json-number'
  if (typeof val === 'boolean') return 'json-boolean'
  return ''
}

function formatValue(val: any): string {
  if (val === null) return 'null'
  if (typeof val === 'string') return `"${val}"`
  return String(val)
}

function toggle() {
  isExpanded.value = !isExpanded.value
}

function expandAll() {
  isExpanded.value = true
  // 透過 event 向下傳遞
  expandAllChildren.value++
}

function collapseAll() {
  isExpanded.value = false
  collapseAllChildren.value++
}

const expandAllChildren = ref(0)
const collapseAllChildren = ref(0)

defineExpose({ expandAll, collapseAll })
</script>

<template>
  <div class="json-tree" :style="{ paddingLeft: depth > 0 ? '16px' : '0' }">
    <!-- Expandable node (Object / Array) -->
    <template v-if="isExpandable">
      <div class="json-line">
        <!-- Toggle button -->
        <span class="json-toggle" @click="toggle">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="json-arrow"
            :class="{ 'json-arrow--expanded': isExpanded }"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </span>

        <!-- Key name -->
        <span v-if="keyName" class="json-key" @click="toggle">{{ keyName }}:&nbsp;</span>

        <!-- Collapsed preview -->
        <template v-if="!isExpanded">
          <span class="json-bracket" @click="toggle">{{ bracketOpen }}</span>
          <span class="json-preview" @click="toggle">{{ preview }}</span>
          <span class="json-bracket" @click="toggle">{{ bracketClose }}</span>
        </template>

        <!-- Expanded open bracket -->
        <template v-else>
          <span class="json-bracket">{{ bracketOpen }}</span>
          <!-- Expand/Collapse all (only at root) -->
          <span v-if="depth === 0" class="json-actions">
            <button class="json-action-btn" @click="expandAll" title="Expand All">⊞</button>
            <button class="json-action-btn" @click="collapseAll" title="Collapse All">⊟</button>
          </span>
        </template>
      </div>

      <!-- Children -->
      <template v-if="isExpanded">
        <div v-for="([key, value], idx) in entries" :key="key" class="json-child">
          <JsonTreeView
            :data="value"
            :depth="depth + 1"
            :key-name="isObject ? key : `${key}`"
            :default-expanded="expandAllChildren > collapseAllChildren"
          />
          <span v-if="idx < entries.length - 1" class="json-comma">,</span>
        </div>
        <div class="json-line" :style="{ paddingLeft: '0px' }">
          <span class="json-bracket">{{ bracketClose }}</span>
        </div>
      </template>
    </template>

    <!-- Primitive value -->
    <template v-else>
      <div class="json-line">
        <span class="json-toggle-spacer" />
        <span v-if="keyName" class="json-key">{{ keyName }}:&nbsp;</span>
        <span :class="valueClass(data)">{{ formatValue(data) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.json-tree {
  font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
}

.json-line {
  display: flex;
  align-items: flex-start;
  white-space: nowrap;
}

.json-child {
  display: flex;
  align-items: flex-start;
}

.json-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-top: 3px;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 2px;
  color: var(--color-text-muted);
}

.json-toggle:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.json-toggle-spacer {
  display: inline-block;
  width: 14px;
  flex-shrink: 0;
}

.json-arrow {
  width: 12px;
  height: 12px;
  transition: transform 0.15s ease;
}

.json-arrow--expanded {
  transform: rotate(90deg);
}

.json-key {
  color: #9cdcfe;
  cursor: pointer;
}

.json-key:hover {
  text-decoration: underline;
}

.json-bracket {
  color: var(--color-text-muted);
  cursor: pointer;
}

.json-preview {
  color: var(--color-text-muted);
  font-style: italic;
  cursor: pointer;
  margin: 0 2px;
}

.json-comma {
  color: var(--color-text-muted);
}

.json-string {
  color: #ce9178;
}

.json-number {
  color: #b5cea8;
}

.json-boolean {
  color: #569cd6;
}

.json-null {
  color: #569cd6;
  font-style: italic;
}

.json-actions {
  margin-left: 8px;
  display: inline-flex;
  gap: 2px;
}

.json-action-btn {
  font-size: 12px;
  padding: 0 3px;
  border-radius: 2px;
  color: var(--color-text-muted);
  cursor: pointer;
  line-height: 1;
}

.json-action-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}
</style>
