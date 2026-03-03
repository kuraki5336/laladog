<script setup lang="ts">
import { useRequestStore } from '@/stores/requestStore'
import KeyValueEditor from '@/components/common/KeyValueEditor.vue'

const store = useRequestStore()
</script>

<template>
  <div>
    <div class="mb-2 text-xs font-medium text-text-secondary">Headers</div>
    <KeyValueEditor v-model="store.activeRequest.headers" placeholder-key="Header" placeholder-value="Value" />
  </div>
</template>
