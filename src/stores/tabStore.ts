import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TabState } from '@/types/tab'
import type { SavedRequest } from '@/types/collection'
import type { HttpResponse } from '@/types/response'
import { createEmptyRequest } from '@/types/request'

const STORAGE_KEY = 'laladog_tabs'

export const useTabStore = defineStore('tab', () => {
  const tabs = ref<TabState[]>([])
  const activeTabId = ref<string | null>(null)

  /* ── Computed ── */

  const activeTab = computed(() =>
    tabs.value.find(t => t.id === activeTabId.value) ?? null,
  )

  /* ── Persistence ── */

  /** 儲存所有 tab 狀態到 localStorage */
  function persistTabs() {
    try {
      const data = {
        activeTabId: activeTabId.value,
        tabs: tabs.value.map(t => ({
          id: t.id,
          title: t.title,
          request: {
            method: t.request.method,
            url: t.request.url,
            params: t.request.params,
            headers: t.request.headers,
            body: t.request.body,
            auth: t.request.auth,
            preRequestScript: t.request.preRequestScript,
            testScript: t.request.testScript,
            collectionNodeId: t.request.collectionNodeId,
          },
          response: t.response,
          error: t.error,
          scriptOutput: t.scriptOutput,
          lastRequestDetails: t.lastRequestDetails,
          isDirty: t.isDirty,
          collectionNodeId: t.collectionNodeId,
          savedSnapshot: t.savedSnapshot,
        })),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // 忽略儲存錯誤（localStorage 滿了等）
    }
  }

  /** 從 localStorage 恢復 tab 狀態 */
  function restoreTabs(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false

      const data = JSON.parse(raw)
      if (!data.tabs || !Array.isArray(data.tabs) || data.tabs.length === 0) return false

      tabs.value = data.tabs.map((t: any) => ({
        id: t.id,
        title: t.title || 'Untitled',
        request: {
          collectionNodeId: t.request?.collectionNodeId ?? t.collectionNodeId ?? null,
          method: t.request?.method || 'GET',
          url: t.request?.url || '',
          params: t.request?.params || [],
          headers: t.request?.headers?.length
            ? t.request.headers
            : [{ id: crypto.randomUUID(), key: 'Content-Type', value: 'application/json', enabled: true }],
          body: t.request?.body || { type: 'none' },
          auth: t.request?.auth || { type: 'none' },
          preRequestScript: t.request?.preRequestScript || '',
          testScript: t.request?.testScript || '',
          activeTab: 'params',
          isSending: false,
        },
        response: t.response ?? null,
        error: t.error ?? null,
        scriptOutput: t.scriptOutput ?? '',
        lastRequestDetails: t.lastRequestDetails ?? null,
        isDirty: t.isDirty ?? false,
        collectionNodeId: t.collectionNodeId ?? null,
        savedSnapshot: t.savedSnapshot ?? null,
      }))

      activeTabId.value = data.activeTabId && tabs.value.some(t => t.id === data.activeTabId)
        ? data.activeTabId
        : tabs.value[0].id

      return true
    } catch {
      return false
    }
  }

  /* ── Helpers ── */

  /** 將請求的可儲存部分序列化為 JSON（用於 dirty 比對） */
  function snapshotRequest(req: ReturnType<typeof createEmptyRequest>): string {
    return JSON.stringify({
      method: req.method,
      url: req.url,
      params: req.params,
      headers: req.headers,
      body: req.body,
      auth: req.auth,
      preRequestScript: req.preRequestScript,
      testScript: req.testScript,
    })
  }

  /* ── Actions ── */

  /** 初始化：先嘗試從 localStorage 恢復，恢復失敗則建一個空白 tab */
  function init() {
    if (tabs.value.length === 0) {
      const restored = restoreTabs()
      if (!restored) {
        createTab()
      }
    }
  }

  /** 新建空白 tab 並切換 */
  function createTab(title?: string): string {
    const id = crypto.randomUUID()
    const tab: TabState = {
      id,
      title: title || 'Untitled',
      request: createEmptyRequest(),
      response: null,
      error: null,
      scriptOutput: '',
      lastRequestDetails: null,
      isDirty: false,
      collectionNodeId: null,
      savedSnapshot: null,
    }
    tabs.value.push(tab)
    activeTabId.value = id
    persistTabs()
    return id
  }

  /** 從 Collection 開啟（已開的就切過去） */
  function openFromCollection(nodeId: string, request: SavedRequest, name: string): string {
    // 已開的 tab 就切過去
    const existing = tabs.value.find(t => t.collectionNodeId === nodeId)
    if (existing) {
      activeTabId.value = existing.id
      return existing.id
    }

    const id = crypto.randomUUID()
    const activeReq = {
      collectionNodeId: nodeId,
      method: request.method || 'GET' as const,
      url: request.url || '',
      params: request.params || [],
      headers: request.headers?.length
        ? request.headers
        : [{ id: crypto.randomUUID(), key: 'Content-Type', value: 'application/json', enabled: true }],
      body: request.body || { type: 'none' as const },
      auth: request.auth || { type: 'none' as const },
      preRequestScript: request.preRequestScript || '',
      testScript: request.testScript || '',
      activeTab: 'params' as const,
      isSending: false,
    }

    const snapshot = snapshotRequest(activeReq)

    const tab: TabState = {
      id,
      title: name,
      request: activeReq,
      response: null,
      error: null,
      scriptOutput: '',
      lastRequestDetails: null,
      isDirty: false,
      collectionNodeId: nodeId,
      savedSnapshot: snapshot,
    }

    tabs.value.push(tab)
    activeTabId.value = id
    persistTabs()
    return id
  }

  /** 從歷史紀錄開新 tab */
  function openFromHistory(entry: {
    method: string
    url: string
    requestHeaders?: Record<string, string>
    requestBody?: string | null
    response?: HttpResponse | null
  }): string {
    const id = crypto.randomUUID()

    // 將 headers record 轉為 KeyValuePair[]
    const headers = entry.requestHeaders
      ? Object.entries(entry.requestHeaders).map(([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value,
          enabled: true,
        }))
      : [{ id: crypto.randomUUID(), key: 'Content-Type', value: 'application/json', enabled: true }]

    const req = createEmptyRequest()
    req.method = (entry.method as any) || 'GET'
    req.url = entry.url || ''
    req.headers = headers

    // 嘗試恢復 body
    if (entry.requestBody) {
      req.body = { type: 'raw', raw: entry.requestBody, rawType: 'json' }
    }

    // 截取 URL 作為 title
    let title = 'Untitled'
    try {
      const url = new URL(entry.url)
      title = url.pathname.length > 1 ? url.pathname : url.host
    } catch {
      title = entry.url?.substring(0, 40) || 'Untitled'
    }

    const tab: TabState = {
      id,
      title,
      request: req,
      response: entry.response ?? null,
      error: null,
      scriptOutput: '',
      lastRequestDetails: null,
      isDirty: false,
      collectionNodeId: null,
      savedSnapshot: null,
    }

    tabs.value.push(tab)
    activeTabId.value = id
    persistTabs()
    return id
  }

  /** 關閉 tab */
  function closeTab(tabId: string): boolean {
    const index = tabs.value.findIndex(t => t.id === tabId)
    if (index === -1) return false

    tabs.value.splice(index, 1)

    if (activeTabId.value === tabId) {
      if (tabs.value.length === 0) {
        createTab()
      } else {
        const newIndex = Math.min(index, tabs.value.length - 1)
        activeTabId.value = tabs.value[newIndex].id
      }
    }

    persistTabs()
    return true
  }

  /** 切換 active tab */
  function switchTab(tabId: string) {
    activeTabId.value = tabId
    persistTabs()
  }

  /** 標記已存檔 */
  function markSaved(tabId: string, collectionNodeId: string, title?: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) return

    tab.collectionNodeId = collectionNodeId
    tab.request.collectionNodeId = collectionNodeId
    tab.savedSnapshot = snapshotRequest(tab.request)
    tab.isDirty = false
    if (title) tab.title = title
    persistTabs()
  }

  /** 更新 tab dirty 狀態 */
  function updateDirty(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) return

    if (!tab.savedSnapshot) {
      // 未儲存的 tab：只要有 URL 就算 dirty
      tab.isDirty = tab.request.url.trim() !== ''
    } else {
      tab.isDirty = snapshotRequest(tab.request) !== tab.savedSnapshot
    }
    persistTabs()
  }

  /** 重新命名 tab */
  function renameTab(tabId: string, title: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.title = title
      persistTabs()
    }
  }

  /** 拖曳排序：將 dragId 移到 targetId 的位置前方 */
  function moveTab(dragId: string, targetId: string) {
    const fromIndex = tabs.value.findIndex(t => t.id === dragId)
    const toIndex = tabs.value.findIndex(t => t.id === targetId)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return

    const [moved] = tabs.value.splice(fromIndex, 1)
    tabs.value.splice(toIndex, 0, moved)
    persistTabs()
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    init,
    createTab,
    openFromCollection,
    openFromHistory,
    closeTab,
    switchTab,
    markSaved,
    updateDirty,
    renameTab,
    snapshotRequest,
    persistTabs,
    moveTab,
  }
})
