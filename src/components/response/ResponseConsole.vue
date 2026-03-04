<script setup lang="ts">
import type { HttpResponse } from '@/types/response'

defineProps<{
  request: {
    method: string
    url: string
    headers: Record<string, string>
    body: string | null
  }
  response: HttpResponse
}>()

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'text-success'
  if (status >= 300 && status < 400) return 'text-info'
  if (status >= 400 && status < 500) return 'text-warning'
  return 'text-danger'
}

const methodColors: Record<string, string> = {
  GET: 'text-green-600',
  POST: 'text-yellow-600',
  PUT: 'text-blue-600',
  PATCH: 'text-purple-600',
  DELETE: 'text-danger',
  HEAD: 'text-text-muted',
  OPTIONS: 'text-text-muted',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function tryFormatJson(body: string | null): string {
  if (!body) return ''
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}
</script>

<template>
  <div class="space-y-4 text-xs">
    <!-- General Info -->
    <section>
      <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        General
      </h3>
      <div class="rounded-md border border-border bg-bg-main">
        <div class="flex border-b border-border-light px-3 py-1.5">
          <span class="w-32 shrink-0 text-text-secondary">Request URL</span>
          <span class="break-all font-mono text-text-primary">{{ request.url }}</span>
        </div>
        <div class="flex border-b border-border-light px-3 py-1.5">
          <span class="w-32 shrink-0 text-text-secondary">Request Method</span>
          <span class="font-bold" :class="methodColors[request.method] || 'text-text-primary'">
            {{ request.method }}
          </span>
        </div>
        <div class="flex border-b border-border-light px-3 py-1.5">
          <span class="w-32 shrink-0 text-text-secondary">Status Code</span>
          <span class="font-bold" :class="statusColor(response.status)">
            {{ response.status }} {{ response.statusText }}
          </span>
        </div>
        <div class="flex border-b border-border-light px-3 py-1.5">
          <span class="w-32 shrink-0 text-text-secondary">Duration</span>
          <span class="text-text-primary">{{ response.duration }} ms</span>
        </div>
        <div class="flex px-3 py-1.5">
          <span class="w-32 shrink-0 text-text-secondary">Size</span>
          <span class="text-text-primary">{{ formatSize(response.size) }}</span>
        </div>
      </div>
    </section>

    <!-- Response Headers -->
    <section>
      <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Response Headers
        <span class="ml-1 font-normal text-text-muted">({{ Object.keys(response.headers).length }})</span>
      </h3>
      <div class="rounded-md border border-border bg-bg-main">
        <table class="w-full">
          <tbody>
            <tr
              v-for="(value, key) in response.headers"
              :key="key"
              class="border-b border-border-light last:border-0 hover:bg-bg-hover"
            >
              <td class="w-48 px-3 py-1.5 font-medium text-primary">{{ key }}</td>
              <td class="break-all px-3 py-1.5 font-mono text-text-primary">{{ value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Request Headers -->
    <section>
      <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Request Headers
        <span class="ml-1 font-normal text-text-muted">({{ Object.keys(request.headers).length }})</span>
      </h3>
      <div class="rounded-md border border-border bg-bg-main">
        <table class="w-full">
          <tbody>
            <tr
              v-for="(value, key) in request.headers"
              :key="key"
              class="border-b border-border-light last:border-0 hover:bg-bg-hover"
            >
              <td class="w-48 px-3 py-1.5 font-medium text-primary">{{ key }}</td>
              <td class="break-all px-3 py-1.5 font-mono text-text-primary">{{ value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Request Body -->
    <section v-if="request.body">
      <h3 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Request Body
      </h3>
      <div class="rounded-md border border-border bg-bg-main">
        <pre class="max-h-60 overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-text-primary">{{ tryFormatJson(request.body) }}</pre>
      </div>
    </section>
  </div>
</template>
