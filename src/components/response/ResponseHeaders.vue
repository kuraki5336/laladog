<script setup lang="ts">
defineProps<{
  headers: Record<string, string>
}>()
</script>

<template>
  <div>
    <table class="w-full text-xs">
      <thead>
        <tr class="border-b border-border text-left">
          <th class="px-2 py-2 font-medium text-text-secondary">Key</th>
          <th class="px-2 py-2 font-medium text-text-secondary">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(value, key) in headers"
          :key="key"
          class="border-b border-border-light hover:bg-bg-hover"
        >
          <td class="px-2 py-1.5 font-medium text-primary">{{ key }}</td>
          <td class="break-all px-2 py-1.5 font-mono text-text-primary">{{ value }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
