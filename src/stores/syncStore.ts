import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './authStore'
import { useWorkspaceStore } from './workspaceStore'
import { useCollectionStore } from './collectionStore'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

/** 將 http(s):// 轉換為 ws(s):// */
function toWsUrl(base: string): string {
  return base.replace(/^http/, 'ws')
}

export type SyncStatus = 'disconnected' | 'connecting' | 'connected'

export const useSyncStore = defineStore('sync', () => {
  const status = ref<SyncStatus>('disconnected')
  const currentTeamId = ref<string | null>(null)

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = 1000
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let intentionalClose = false

  /** 建立 WebSocket 連線 */
  function connect(teamId: string) {
    const authStore = useAuthStore()
    if (!authStore.token || !teamId) return

    // 如果已連線到同一個 team，不重連
    if (ws && currentTeamId.value === teamId && status.value === 'connected') return

    // 先斷開舊連線
    disconnect()

    currentTeamId.value = teamId
    intentionalClose = false
    status.value = 'connecting'

    const wsBase = toWsUrl(API_BASE)
    const url = `${wsBase}/ws/sync/${teamId}?token=${authStore.token}`

    try {
      ws = new WebSocket(url)
    } catch (e) {
      console.error('[WS] Failed to create WebSocket:', e)
      status.value = 'disconnected'
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      console.log(`[WS] Connected to team ${teamId}`)
      status.value = 'connected'
      reconnectDelay = 1000 // 重設 backoff
      startHeartbeat()
    }

    ws.onmessage = (event) => {
      handleMessage(event.data)
    }

    ws.onclose = (event) => {
      console.log(`[WS] Disconnected (code=${event.code}, reason=${event.reason})`)
      status.value = 'disconnected'
      stopHeartbeat()
      ws = null

      // 非主動關閉 → 自動重連
      if (!intentionalClose && currentTeamId.value) {
        scheduleReconnect()
      }
    }

    ws.onerror = (event) => {
      console.error('[WS] Error:', event)
    }
  }

  /** 斷開連線 */
  function disconnect() {
    intentionalClose = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    stopHeartbeat()
    if (ws) {
      ws.close()
      ws = null
    }
    status.value = 'disconnected'
    currentTeamId.value = null
  }

  /** 發送訊息 */
  function send(message: Record<string, unknown>): boolean {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(message))
    return true
  }

  /** 排程重連 (exponential backoff: 1s → 2s → 4s → 8s → max 30s) */
  function scheduleReconnect() {
    if (reconnectTimer) return
    console.log(`[WS] Reconnecting in ${reconnectDelay / 1000}s...`)
    status.value = 'connecting'
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (currentTeamId.value) {
        reconnectDelay = Math.min(reconnectDelay * 2, 30000)
        connect(currentTeamId.value)
      }
    }, reconnectDelay)
  }

  /** 心跳：每 25 秒送 ping */
  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      send({ type: 'ping' })
    }, 25000)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  /** 處理收到的訊息 */
  function handleMessage(raw: string) {
    try {
      const msg = JSON.parse(raw)

      switch (msg.type) {
        case 'collection_updated':
          // 其他成員更新了 collection → 更新本地
          handleRemoteCollectionUpdate(msg)
          break

        case 'sync_ok':
          // 自己 push 成功的確認
          console.log('[WS] Sync confirmed at', msg.timestamp)
          break

        case 'pong':
          // 心跳回應
          break

        case 'error':
          console.warn('[WS] Server error:', msg.message)
          break

        default:
          console.log('[WS] Unknown message type:', msg.type)
      }
    } catch (e) {
      console.error('[WS] Failed to parse message:', e)
    }
  }

  /** 處理遠端 collection 更新 */
  function handleRemoteCollectionUpdate(msg: {
    data: string
    name: string
    updated_by: string
    timestamp: string
  }) {
    const collectionStore = useCollectionStore()
    const wsStore = useWorkspaceStore()

    // 找到 team 對應的本地 workspace
    const ws = wsStore.workspaces.find(w => w.teamId === currentTeamId.value)
    if (!ws) return

    console.log(`[WS] Remote update from ${msg.updated_by}, applying to workspace ${ws.name}`)
    collectionStore.applyRemoteUpdate(msg.data, ws.id)
  }

  /** 透過 WebSocket 推送 collection 更新，回傳是否成功 */
  function pushViaWs(data: string, name: string): boolean {
    return send({
      type: 'collection_update',
      data,
      name,
    })
  }

  return {
    status,
    currentTeamId,
    connect,
    disconnect,
    send,
    pushViaWs,
  }
})
