<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

interface WsMessage {
  direction: 'sent' | 'received'
  message: string
  timestamp: string
}

const url = ref('ws://localhost:8080')
const messageInput = ref('')
const messages = ref<WsMessage[]>([])
const isConnected = ref(false)
const error = ref<string | null>(null)

let ws: WebSocket | null = null

function connect() {
  error.value = null
  try {
    ws = new WebSocket(url.value)

    ws.onopen = () => {
      isConnected.value = true
      messages.value.push({
        direction: 'received',
        message: '🟢 Connected',
        timestamp: new Date().toISOString(),
      })
    }

    ws.onmessage = (event) => {
      messages.value.push({
        direction: 'received',
        message: event.data,
        timestamp: new Date().toISOString(),
      })
    }

    ws.onclose = () => {
      isConnected.value = false
      messages.value.push({
        direction: 'received',
        message: '🔴 Disconnected',
        timestamp: new Date().toISOString(),
      })
    }

    ws.onerror = () => {
      error.value = 'Connection failed'
      isConnected.value = false
    }
  } catch (e: any) {
    error.value = e.message
  }
}

function disconnect() {
  ws?.close()
  ws = null
}

function sendMessage() {
  if (!ws || !messageInput.value.trim()) return
  ws.send(messageInput.value)
  messages.value.push({
    direction: 'sent',
    message: messageInput.value,
    timestamp: new Date().toISOString(),
  })
  messageInput.value = ''
}

function clearMessages() {
  messages.value = []
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

onUnmounted(() => {
  ws?.close()
})
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Connection Bar -->
    <div class="flex items-center gap-2 border-b border-border p-3">
      <div class="h-2 w-2 shrink-0 rounded-full" :class="isConnected ? 'bg-success' : 'bg-text-muted'" />
      <input
        v-model="url"
        class="h-9 flex-1 rounded-button border border-border px-3 text-sm outline-none focus:border-border-focus dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        placeholder="ws://localhost:8080"
        :disabled="isConnected"
      />
      <button
        v-if="!isConnected"
        class="h-9 rounded-button bg-success px-4 text-sm font-medium text-white hover:opacity-90 active:scale-[0.97]"
        @click="connect"
      >
        Connect
      </button>
      <button
        v-else
        class="h-9 rounded-button bg-danger px-4 text-sm font-medium text-white hover:opacity-90 active:scale-[0.97]"
        @click="disconnect"
      >
        Disconnect
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-danger-light px-3 py-1 text-xs text-danger dark:bg-red-900/30">
      {{ error }}
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto p-3">
      <div class="mb-1 flex items-center justify-between">
        <span class="text-xs font-medium text-text-secondary dark:text-slate-400">Messages</span>
        <button class="text-xs text-text-muted hover:text-text-primary dark:text-slate-500" @click="clearMessages">
          Clear
        </button>
      </div>
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="mb-1 rounded-sm p-2 text-xs"
        :class="msg.direction === 'sent'
          ? 'bg-secondary-10 dark:bg-blue-900/20'
          : 'bg-bg-stripe dark:bg-slate-800'"
      >
        <div class="flex items-center gap-2">
          <span class="font-medium" :class="msg.direction === 'sent' ? 'text-secondary' : 'text-success'">
            {{ msg.direction === 'sent' ? '↑ Sent' : '↓ Received' }}
          </span>
          <span class="text-text-muted dark:text-slate-500">{{ formatTime(msg.timestamp) }}</span>
        </div>
        <pre class="mt-1 whitespace-pre-wrap break-all font-mono text-text-primary dark:text-slate-300">{{ msg.message }}</pre>
      </div>
    </div>

    <!-- Send Bar -->
    <div class="flex items-center gap-2 border-t border-border p-3">
      <textarea
        v-model="messageInput"
        class="h-16 flex-1 resize-none rounded-button border border-border p-2 font-mono text-xs outline-none focus:border-border-focus dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        placeholder="Type a message..."
        :disabled="!isConnected"
        @keydown.ctrl.enter="sendMessage"
      />
      <button
        class="h-9 rounded-button bg-secondary px-4 text-sm font-medium text-white hover:bg-secondary-60 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!isConnected || !messageInput.trim()"
        @click="sendMessage"
      >
        Send
      </button>
    </div>
  </div>
</template>
