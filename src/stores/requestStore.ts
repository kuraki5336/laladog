import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { ActiveRequest } from '@/types/request'
import type { HttpResponse } from '@/types/response'
import type { SavedRequest } from '@/types/collection'
import { createEmptyRequest } from '@/types/request'
import { useEnvironmentStore } from './environmentStore'
import { useCollectionStore } from './collectionStore'
import { useHistoryStore } from './historyStore'
import { useConsoleStore } from './consoleStore'
import { useTabStore } from './tabStore'
import { resolveVariables } from '@/utils/variableResolver'

/** 偵測是否在 Tauri 環境中 */
const isTauri = !!(window as any).__TAURI_INTERNALS__

export const useRequestStore = defineStore('request', () => {
  // tabStore 在函式內呼叫（Pinia 支援延遲取用）
  function getTabStore() {
    return useTabStore()
  }

  /* ── Facade: 代理到 activeTab ── */

  const activeRequest = computed<ActiveRequest>({
    get: () => {
      const tabStore = getTabStore()
      return tabStore.activeTab?.request ?? createEmptyRequest()
    },
    set: (val: ActiveRequest) => {
      const tabStore = getTabStore()
      if (tabStore.activeTab) {
        tabStore.activeTab.request = val
      }
    },
  })

  const response = computed<HttpResponse | null>({
    get: () => {
      const tabStore = getTabStore()
      return tabStore.activeTab?.response ?? null
    },
    set: (val: HttpResponse | null) => {
      const tabStore = getTabStore()
      if (tabStore.activeTab) {
        tabStore.activeTab.response = val
      }
    },
  })

  const error = computed<string | null>({
    get: () => {
      const tabStore = getTabStore()
      return tabStore.activeTab?.error ?? null
    },
    set: (val: string | null) => {
      const tabStore = getTabStore()
      if (tabStore.activeTab) {
        tabStore.activeTab.error = val
      }
    },
  })

  const scriptOutput = computed<string>({
    get: () => {
      const tabStore = getTabStore()
      return tabStore.activeTab?.scriptOutput ?? ''
    },
    set: (val: string) => {
      const tabStore = getTabStore()
      if (tabStore.activeTab) {
        tabStore.activeTab.scriptOutput = val
      }
    },
  })

  const lastRequestDetails = computed<{
    method: string; url: string; headers: Record<string, string>; body: string | null
  } | null>({
    get: () => {
      const tabStore = getTabStore()
      return tabStore.activeTab?.lastRequestDetails ?? null
    },
    set: (val) => {
      const tabStore = getTabStore()
      if (tabStore.activeTab) {
        tabStore.activeTab.lastRequestDetails = val
      }
    },
  })

  /** 執行 script（pre-request 或 tests） */
  function executeScript(scriptCode: string, responseData?: HttpResponse | null): string {
    const logs: string[] = []
    const envStore = useEnvironmentStore()

    const mockConsole = {
      log: (...args: any[]) => logs.push(args.map(String).join(' ')),
      error: (...args: any[]) => logs.push(`[ERROR] ${args.map(String).join(' ')}`),
      warn: (...args: any[]) => logs.push(`[WARN] ${args.map(String).join(' ')}`),
    }

    const pm = {
      environment: {
        set: (k: string, v: string) => {
          const activeEnv = envStore.activeEnvironment
          if (!activeEnv) {
            logs.push(`[ENV] ⚠ No active environment, cannot set "${k}"`)
            return
          }
          const existing = activeEnv.variables.find((ev: any) => ev.key === k)
          if (existing) {
            envStore.updateVariable(existing.id, k, String(v), true)
            logs.push(`[ENV] ✓ Updated ${k}`)
          } else {
            envStore.addVariable(activeEnv.id, k, String(v))
            logs.push(`[ENV] ✓ Created ${k}`)
          }
        },
        get: (k: string) => envStore.allVariables[k] || '',
      },
      variables: {
        get: (k: string) => envStore.allVariables[k] || '',
      },
      response: {
        status: responseData?.status ?? 0,
        statusText: responseData?.statusText ?? '',
        headers: responseData?.headers ?? {},
        body: responseData?.body ?? '',
        json: () => {
          try { return JSON.parse(responseData?.body || '{}') }
          catch { throw new Error('Response body is not valid JSON') }
        },
      },
      test: (name: string, fn: Function) => {
        try { fn(); logs.push(`✓ ${name}`) }
        catch (e: any) { logs.push(`✗ ${name}: ${e.message}`) }
      },
      expect: (val: any) => ({
        to: {
          equal: (expected: any) => {
            if (val !== expected) throw new Error(`Expected ${expected}, got ${val}`)
          },
          not: { equal: (expected: any) => { if (val === expected) throw new Error(`Expected not ${expected}`) } },
          be: {
            true: () => { if (!val) throw new Error('Expected true') },
            false: () => { if (val) throw new Error('Expected false') },
            above: (n: number) => { if (val <= n) throw new Error(`Expected > ${n}, got ${val}`) },
            below: (n: number) => { if (val >= n) throw new Error(`Expected < ${n}, got ${val}`) },
          },
          include: (str: string) => {
            if (typeof val === 'string' && !val.includes(str)) throw new Error(`Expected to include "${str}"`)
          },
        },
      }),
    }

    try {
      const fn = new Function('console', 'pm', scriptCode)
      fn(mockConsole, pm)
    } catch (e: any) {
      logs.push(`[ERROR] ${e.message}`)
    }

    return logs.join('\n')
  }

  /** 透過 Tauri Command 發送 */
  async function sendViaTauri(
    method: string, url: string, headers: Record<string, string>,
    body: string | null, _bodyType: string,
  ) {
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<{
      status: number; status_text: string; headers: Record<string, string>
      body: string; duration: number; size: number; body_encoding?: string
    }>('send_http_request', {
      payload: { method, url, headers, body },
    })
    return {
      status: result.status,
      statusText: result.status_text,
      headers: result.headers,
      body: result.body,
      duration: result.duration,
      size: result.size,
      bodyEncoding: (result.body_encoding || 'text') as 'text' | 'base64',
    }
  }

  /** 瀏覽器 fallback（開發用，受 CORS 限制） */
  async function sendViaFetch(
    method: string, url: string, headers: Record<string, string>,
    body: string | null,
  ) {
    const start = performance.now()
    const fetchOptions: RequestInit = { method, headers }
    if (body && !['GET', 'HEAD'].includes(method)) {
      fetchOptions.body = body
    }
    const resp = await fetch(url, fetchOptions)
    const duration = Math.round(performance.now() - start)
    const respBody = await resp.text()
    const respHeaders: Record<string, string> = {}
    resp.headers.forEach((v, k) => { respHeaders[k] = v })
    return {
      status: resp.status,
      statusText: resp.statusText,
      headers: respHeaders,
      body: respBody,
      duration,
      size: new Blob([respBody]).size,
      bodyEncoding: 'text' as const,
    }
  }

  /** 發送 HTTP 請求（寫入特定 tab，避免切 tab 後寫錯） */
  async function sendRequest() {
    const tabStore = getTabStore()
    const currentTabId = tabStore.activeTabId
    const tab = tabStore.tabs.find((t: any) => t.id === currentTabId)
    if (!tab) return

    tab.error = null
    tab.response = null
    tab.scriptOutput = ''
    tab.request.isSending = true

    let resolvedUrl = ''
    let resolvedHeaders: Record<string, string> = {}
    let resolvedBody: string | null = null

    try {
      // Pre-request Script
      if (tab.request.preRequestScript) {
        const preOutput = executeScript(tab.request.preRequestScript)
        tab.scriptOutput = preOutput
      }

      const envStore = useEnvironmentStore()
      const vars = envStore.allVariables

      // 解析環境變數
      resolvedUrl = resolveVariables(tab.request.url, vars)

      // 附加 Query Params
      const enabledParams = (tab.request.params || []).filter((p: any) => p.enabled && p.key)
      if (enabledParams.length > 0) {
        const url = new URL(resolvedUrl)
        for (const p of enabledParams) {
          url.searchParams.append(resolveVariables(p.key, vars), resolveVariables(p.value, vars))
        }
        resolvedUrl = url.toString()
      }

      resolvedHeaders = {}
      for (const h of tab.request.headers) {
        if (h.enabled && h.key) {
          resolvedHeaders[resolveVariables(h.key, vars)] = resolveVariables(h.value, vars)
        }
      }

      // Auth → 加入 Headers
      const auth = tab.request.auth
      if (auth.type === 'bearer' && auth.bearer?.token) {
        resolvedHeaders['Authorization'] = `Bearer ${resolveVariables(auth.bearer.token, vars)}`
      } else if (auth.type === 'basic' && auth.basic) {
        const user = resolveVariables(auth.basic.username || '', vars)
        const pass = resolveVariables(auth.basic.password || '', vars)
        resolvedHeaders['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`
      }

      // 根據 Body type 自動補 Content-Type
      const hasContentType = Object.keys(resolvedHeaders).some(k => k.toLowerCase() === 'content-type')
      if (!hasContentType && tab.request.body.type !== 'none') {
        if (tab.request.body.type === 'raw') {
          const rawType = tab.request.body.rawType || 'text'
          if (rawType === 'json') resolvedHeaders['Content-Type'] = 'application/json'
          else if (rawType === 'xml') resolvedHeaders['Content-Type'] = 'application/xml'
          else resolvedHeaders['Content-Type'] = 'text/plain'
        } else if (tab.request.body.type === 'x-www-form-urlencoded') {
          resolvedHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
        } else if (tab.request.body.type === 'form-data') {
          resolvedHeaders['Content-Type'] = 'multipart/form-data'
        }
      }

      resolvedBody = null
      if (tab.request.body.type === 'raw' && tab.request.body.raw) {
        resolvedBody = resolveVariables(tab.request.body.raw, vars)
      } else if (tab.request.body.type === 'x-www-form-urlencoded') {
        const params = new URLSearchParams()
        for (const item of tab.request.body.urlencoded || []) {
          if (item.enabled) {
            params.append(resolveVariables(item.key, vars), resolveVariables(item.value, vars))
          }
        }
        resolvedBody = params.toString()
      } else if (tab.request.body.type === 'form-data') {
        const formParts = (tab.request.body.formData || [])
          .filter((item: any) => item.enabled)
          .map((item: any) => ({
            key: resolveVariables(item.key, vars),
            value: resolveVariables(item.value, vars),
          }))
        resolvedBody = JSON.stringify(formParts)
      }

      // 記錄已解析的請求細節
      tab.lastRequestDetails = {
        method: tab.request.method,
        url: resolvedUrl,
        headers: { ...resolvedHeaders },
        body: resolvedBody,
      }

      // Tauri 環境用 invoke，瀏覽器用 fetch fallback
      const result = isTauri
        ? await sendViaTauri(tab.request.method, resolvedUrl, resolvedHeaders, resolvedBody, tab.request.body.type)
        : await sendViaFetch(tab.request.method, resolvedUrl, resolvedHeaders, resolvedBody)

      tab.response = {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: result.body,
        duration: result.duration,
        size: result.size,
        bodyEncoding: result.bodyEncoding,
      }

      // Tests Script
      if (tab.request.testScript) {
        const testOutput = executeScript(tab.request.testScript, tab.response)
        tab.scriptOutput = tab.scriptOutput
          ? tab.scriptOutput + '\n--- Tests ---\n' + testOutput
          : testOutput
      }

      // 記錄歷史
      if (isTauri) {
        const historyStore = useHistoryStore()
        await historyStore.addEntry({
          method: tab.request.method,
          url: resolvedUrl,
          status: result.status,
          duration: result.duration,
          requestHeaders: resolvedHeaders,
          requestBody: resolvedBody,
          response: tab.response,
        })
      }

      // Console 紀錄
      const consoleStore = useConsoleStore()
      consoleStore.addEntry({
        method: tab.request.method,
        url: resolvedUrl,
        requestHeaders: resolvedHeaders,
        requestBody: resolvedBody,
        status: result.status,
        statusText: result.statusText,
        responseHeaders: result.headers,
        responseBody: result.body,
        duration: result.duration,
        size: result.size,
      })
    } catch (e: any) {
      tab.error = typeof e === 'string' ? e : e.message || 'Unknown error'

      // Console 紀錄（錯誤）
      const consoleStore = useConsoleStore()
      consoleStore.addEntry({
        method: tab.request.method,
        url: resolvedUrl || tab.request.url,
        requestHeaders: resolvedHeaders,
        requestBody: resolvedBody,
        status: 0,
        statusText: 'Error',
        responseHeaders: {},
        responseBody: tab.error || 'Unknown error',
        duration: 0,
        size: 0,
      })
    } finally {
      tab.request.isSending = false
      tabStore.persistTabs()
    }
  }

  /** 載入已存的請求到編輯區（委派到 tabStore） */
  function loadFromCollection(nodeId: string, request: SavedRequest) {
    const tabStore = getTabStore()
    const collectionStore = useCollectionStore()
    // 從 collection 取得名稱
    const node = collectionStore.nodes.find((n: any) => n.id === nodeId)
    const name = node?.name || 'Untitled'
    tabStore.openFromCollection(nodeId, request, name)
  }

  /** 儲存當前請求回 Collection */
  async function saveToCollection() {
    const tabStore = getTabStore()
    const tab = tabStore.activeTab
    if (!tab) return false

    const nodeId = tab.collectionNodeId
    if (!nodeId) return false

    const collectionStore = useCollectionStore()
    await collectionStore.updateRequest(nodeId, {
      method: tab.request.method,
      url: tab.request.url,
      params: tab.request.params,
      headers: tab.request.headers,
      body: tab.request.body,
      auth: tab.request.auth,
      preRequestScript: tab.request.preRequestScript,
      testScript: tab.request.testScript,
    })

    tabStore.markSaved(tab.id, nodeId)
    return true
  }

  /** 重設為空請求 */
  function reset() {
    const tabStore = getTabStore()
    tabStore.createTab()
  }

  return {
    activeRequest,
    response,
    error,
    scriptOutput,
    lastRequestDetails,
    executeScript,
    sendRequest,
    saveToCollection,
    loadFromCollection,
    reset,
  }
})
