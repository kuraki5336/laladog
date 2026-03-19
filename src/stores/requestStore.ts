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
import { sendHttp, sendMultipart } from '@/utils/httpSender'
import type { FormPart } from '@/utils/httpSender'
import { createExpect } from '@/utils/scriptAssertions'
import CryptoJS from 'crypto-js'
import * as _ from 'lodash-es'
import { XMLParser } from 'fast-xml-parser'

const isTauri = !!(window as any).__TAURI_INTERNALS__

/** Script 執行時的 request context */
interface ScriptRequestContext {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: string | null
  bodyType?: string
  bodyRawType?: string
  formData?: Array<{ key: string; value: string }>
  urlencoded?: Array<{ key: string; value: string }>
}

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

  /** 正規化 header 輸入（支援 Postman 的 [{key,value}] 陣列格式） */
  function normalizeHeaders(headerInput: any): Record<string, string> {
    if (!headerInput) return {}
    if (Array.isArray(headerInput)) {
      const result: Record<string, string> = {}
      for (const h of headerInput) {
        if (h.key) result[h.key] = h.value || ''
      }
      return result
    }
    return headerInput
  }

  /** 建構結構化 body 物件（Postman 相容） */
  function buildStructuredBody(ctx?: ScriptRequestContext) {
    if (!ctx) return { mode: 'raw' as const, raw: '', urlencoded: [] as any[], formdata: [] as any[], toString: () => '' }
    const mode = ctx.bodyType === 'x-www-form-urlencoded' ? 'urlencoded' as const
               : ctx.bodyType === 'form-data' ? 'formdata' as const
               : 'raw' as const
    const raw = ctx.body || ''
    return {
      mode,
      raw,
      urlencoded: ctx.urlencoded || [],
      formdata: ctx.formData || [],
      toString: () => raw,
    }
  }

  /** 執行 script（pre-request 或 tests），支援 async（pm.sendRequest） */
  async function executeScript(
    scriptCode: string,
    responseData?: HttpResponse | null,
    requestContext?: ScriptRequestContext,
  ): Promise<string> {
    const logs: string[] = []
    const envStore = useEnvironmentStore()

    const mockConsole = {
      log: (...args: any[]) => logs.push(args.map(String).join(' ')),
      error: (...args: any[]) => logs.push(`[ERROR] ${args.map(String).join(' ')}`),
      warn: (...args: any[]) => logs.push(`[WARN] ${args.map(String).join(' ')}`),
    }

    // collectionVariables / globals 共用的 set/get helper
    const varHelper = {
      set: (k: string, v: string) => {
        const activeEnv = envStore.activeEnvironment
        if (!activeEnv) {
          logs.push(`[ENV] ⚠ No active environment, cannot set "${k}"`)
          return
        }
        const existing = activeEnv.variables.find((ev: any) => ev.key === k)
        if (existing) {
          envStore.updateVariable(existing.id, k, String(v), true)
        } else {
          envStore.addVariable(activeEnv.id, k, String(v))
        }
      },
      get: (k: string) => envStore.allVariables[k] || '',
      unset: (k: string) => {
        const activeEnv = envStore.activeEnvironment
        if (!activeEnv) return
        const existing = activeEnv.variables.find((ev: any) => ev.key === k)
        if (existing) {
          envStore.updateVariable(existing.id, k, '', false)
        }
      },
    }

    const pm: any = {
      environment: {
        set: (k: string, v: string) => { varHelper.set(k, v); logs.push(`[ENV] ✓ ${k}`) },
        get: (k: string) => varHelper.get(k),
      },
      variables: {
        get: (k: string) => varHelper.get(k),
        set: (k: string, v: string) => varHelper.set(k, v),
      },
      collectionVariables: {
        get: (k: string) => varHelper.get(k),
        set: (k: string, v: string) => varHelper.set(k, v),
        unset: (k: string) => varHelper.unset(k),
      },
      globals: {
        get: (k: string) => varHelper.get(k),
        set: (k: string, v: string) => varHelper.set(k, v),
        unset: (k: string) => varHelper.unset(k),
      },
      request: {
        method: requestContext?.method || '',
        url: requestContext?.url || '',
        headers: requestContext?.headers || {},
        body: buildStructuredBody(requestContext),
      },
      response: {
        status: responseData?.status ?? 0,
        code: responseData?.status ?? 0,
        statusText: responseData?.statusText ?? '',
        headers: responseData?.headers ?? {},
        body: responseData?.body ?? '',
        json: () => {
          try { return JSON.parse(responseData?.body || '{}') }
          catch { throw new Error('Response body is not valid JSON') }
        },
      },
      test: (name: string, fn: Function) => {
        try {
          const result = fn()
          // 支援 async test callback
          if (result && typeof result.then === 'function') {
            return result.then(() => logs.push(`✓ ${name}`)).catch((e: any) => logs.push(`✗ ${name}: ${e.message}`))
          }
          logs.push(`✓ ${name}`)
        } catch (e: any) {
          logs.push(`✗ ${name}: ${e.message}`)
        }
      },
      expect: createExpect,
      sendRequest: (requestOrUrl: string | object, callback?: Function) => {
        let opts: { method: string; url: string; headers: Record<string, string>; body: string | null }
        if (typeof requestOrUrl === 'string') {
          opts = { method: 'GET', url: requestOrUrl, headers: {}, body: null }
        } else {
          const req = requestOrUrl as any
          opts = {
            method: (req.method || 'GET').toUpperCase(),
            url: req.url,
            headers: normalizeHeaders(req.header || req.headers),
            body: typeof req.body === 'object' ? (req.body?.raw || JSON.stringify(req.body)) : (req.body || null),
          }
        }

        logs.push(`[HTTP] → ${opts.method} ${opts.url}`)

        const promise = sendHttp(opts).then(result => {
          const responseObj = {
            status: result.status,
            code: result.status,
            statusText: result.statusText,
            headers: result.headers,
            body: result.body,
            json: () => {
              try { return JSON.parse(result.body) }
              catch { throw new Error('Response body is not valid JSON') }
            },
          }
          logs.push(`[HTTP] ← ${result.status} ${result.statusText} (${result.duration}ms)`)
          if (callback) callback(null, responseObj)
          return responseObj
        }).catch(err => {
          logs.push(`[HTTP] ✗ ${err.message}`)
          if (callback) callback(err)
          throw err
        })

        return promise
      },
    }

    try {
      const xmlParser = new XMLParser({ ignoreAttributes: false })
      const xml2Json = (xml: string) => xmlParser.parse(xml)

      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
      const fn = new AsyncFunction('console', 'pm', 'CryptoJS', 'atob', 'btoa', '_', 'xml2Json', scriptCode)
      const SCRIPT_TIMEOUT = 30_000
      await Promise.race([
        fn(mockConsole, pm, CryptoJS, atob, btoa, _, xml2Json),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Script timeout (30s)')), SCRIPT_TIMEOUT)),
      ])
    } catch (e: any) {
      logs.push(`[ERROR] ${e.message}`)
    }

    return logs.join('\n')
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
        const reqCtx: ScriptRequestContext = {
          method: tab.request.method,
          url: tab.request.url,
          headers: Object.fromEntries(
            (tab.request.headers || []).filter((h: any) => h.enabled && h.key).map((h: any) => [h.key, h.value]),
          ),
          body: tab.request.body?.raw || null,
          bodyType: tab.request.body?.type || 'none',
          bodyRawType: tab.request.body?.rawType,
          formData: (tab.request.body?.formData || []).filter((i: any) => i.enabled).map((i: any) => ({ key: i.key, value: i.value })),
          urlencoded: (tab.request.body?.urlencoded || []).filter((i: any) => i.enabled).map((i: any) => ({ key: i.key, value: i.value })),
        }
        const preOutput = await executeScript(tab.request.preRequestScript, null, reqCtx)
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
        }
        // form-data 不手動設 Content-Type，由 multipart 自動帶 boundary
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
      }

      // form-data 走 multipart 路徑
      let multipartParts: FormPart[] | null = null
      if (tab.request.body.type === 'form-data') {
        multipartParts = (tab.request.body.formData || [])
          .filter((item: any) => item.enabled)
          .map((item: any) => ({
            key: resolveVariables(item.key, vars),
            value: item.fieldType === 'file' ? item.value : resolveVariables(item.value, vars),
            field_type: (item.fieldType || 'text') as 'text' | 'file',
          }))
      }

      // 記錄已解析的請求細節
      tab.lastRequestDetails = {
        method: tab.request.method,
        url: resolvedUrl,
        headers: { ...resolvedHeaders },
        body: multipartParts ? JSON.stringify(multipartParts) : resolvedBody,
      }

      const result = multipartParts
        ? await sendMultipart({
            method: tab.request.method,
            url: resolvedUrl,
            headers: resolvedHeaders,
            parts: multipartParts,
          })
        : await sendHttp({
            method: tab.request.method,
            url: resolvedUrl,
            headers: resolvedHeaders,
            body: resolvedBody,
          })

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
        const testOutput = await executeScript(tab.request.testScript, tab.response)
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
