import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ActiveRequest } from '@/types/request'
import type { HttpResponse } from '@/types/response'
import { createEmptyRequest } from '@/types/request'
import { useEnvironmentStore } from './environmentStore'
import { useCollectionStore } from './collectionStore'
import { useHistoryStore } from './historyStore'
import { useConsoleStore } from './consoleStore'
import { resolveVariables } from '@/utils/variableResolver'

/** 偵測是否在 Tauri 環境中 */
const isTauri = !!(window as any).__TAURI_INTERNALS__

export const useRequestStore = defineStore('request', () => {
  const activeRequest = ref<ActiveRequest>(createEmptyRequest())
  const response = ref<HttpResponse | null>(null)
  const error = ref<string | null>(null)
  const scriptOutput = ref<string>('')

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
    body: string | null, bodyType: string,
  ) {
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<{
      status: number; status_text: string; headers: Record<string, string>
      body: string; duration: number; size: number
    }>('send_http_request', {
      payload: { method, url, headers, body, body_type: bodyType },
    })
    return {
      status: result.status,
      statusText: result.status_text,
      headers: result.headers,
      body: result.body,
      duration: result.duration,
      size: result.size,
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
    }
  }

  /** 發送 HTTP 請求 */
  async function sendRequest() {
    error.value = null
    response.value = null
    scriptOutput.value = ''
    activeRequest.value.isSending = true

    // 提升到 try 外層，以便 catch 區塊也能記錄 console
    let resolvedUrl = ''
    let resolvedHeaders: Record<string, string> = {}
    let resolvedBody: string | null = null

    try {
      // Pre-request Script
      if (activeRequest.value.preRequestScript) {
        const preOutput = executeScript(activeRequest.value.preRequestScript)
        scriptOutput.value = preOutput
      }

      const envStore = useEnvironmentStore()
      const vars = envStore.allVariables

      // 解析環境變數
      resolvedUrl = resolveVariables(activeRequest.value.url, vars)

      // 附加 Query Params
      const enabledParams = (activeRequest.value.params || []).filter(p => p.enabled && p.key)
      if (enabledParams.length > 0) {
        const url = new URL(resolvedUrl)
        for (const p of enabledParams) {
          url.searchParams.append(resolveVariables(p.key, vars), resolveVariables(p.value, vars))
        }
        resolvedUrl = url.toString()
      }

      resolvedHeaders = {}
      for (const h of activeRequest.value.headers) {
        if (h.enabled && h.key) {
          resolvedHeaders[resolveVariables(h.key, vars)] = resolveVariables(h.value, vars)
        }
      }

      // Auth → 加入 Headers
      const auth = activeRequest.value.auth
      if (auth.type === 'bearer' && auth.bearer?.token) {
        resolvedHeaders['Authorization'] = `Bearer ${resolveVariables(auth.bearer.token, vars)}`
      } else if (auth.type === 'basic' && auth.basic) {
        const user = resolveVariables(auth.basic.username || '', vars)
        const pass = resolveVariables(auth.basic.password || '', vars)
        resolvedHeaders['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`
      }

      // 根據 Body type 自動補 Content-Type（若使用者未手動設定）
      const hasContentType = Object.keys(resolvedHeaders).some(k => k.toLowerCase() === 'content-type')
      if (!hasContentType && activeRequest.value.body.type !== 'none') {
        if (activeRequest.value.body.type === 'raw') {
          const rawType = activeRequest.value.body.rawType || 'text'
          if (rawType === 'json') resolvedHeaders['Content-Type'] = 'application/json'
          else if (rawType === 'xml') resolvedHeaders['Content-Type'] = 'application/xml'
          else resolvedHeaders['Content-Type'] = 'text/plain'
        } else if (activeRequest.value.body.type === 'x-www-form-urlencoded') {
          resolvedHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
        } else if (activeRequest.value.body.type === 'form-data') {
          resolvedHeaders['Content-Type'] = 'multipart/form-data'
        }
      }

      resolvedBody = null
      if (activeRequest.value.body.type === 'raw' && activeRequest.value.body.raw) {
        resolvedBody = resolveVariables(activeRequest.value.body.raw, vars)
      } else if (activeRequest.value.body.type === 'x-www-form-urlencoded') {
        const params = new URLSearchParams()
        for (const item of activeRequest.value.body.urlencoded || []) {
          if (item.enabled) {
            params.append(resolveVariables(item.key, vars), resolveVariables(item.value, vars))
          }
        }
        resolvedBody = params.toString()
      } else if (activeRequest.value.body.type === 'form-data') {
        const formParts = (activeRequest.value.body.formData || [])
          .filter((item: any) => item.enabled)
          .map((item: any) => ({
            key: resolveVariables(item.key, vars),
            value: resolveVariables(item.value, vars),
          }))
        resolvedBody = JSON.stringify(formParts)
      }

      // Tauri 環境用 invoke，瀏覽器用 fetch fallback
      const result = isTauri
        ? await sendViaTauri(activeRequest.value.method, resolvedUrl, resolvedHeaders, resolvedBody, activeRequest.value.body.type)
        : await sendViaFetch(activeRequest.value.method, resolvedUrl, resolvedHeaders, resolvedBody)

      response.value = {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: result.body,
        duration: result.duration,
        size: result.size,
      }

      // Tests Script（回應後自動執行）
      if (activeRequest.value.testScript) {
        const testOutput = executeScript(activeRequest.value.testScript, response.value)
        scriptOutput.value = scriptOutput.value
          ? scriptOutput.value + '\n--- Tests ---\n' + testOutput
          : testOutput
      }

      // 記錄歷史（Tauri 環境才寫 SQLite）
      if (isTauri) {
        const historyStore = useHistoryStore()
        await historyStore.addEntry({
          method: activeRequest.value.method,
          url: resolvedUrl,
          status: result.status,
          duration: result.duration,
          requestHeaders: resolvedHeaders,
          requestBody: resolvedBody,
          response: response.value,
        })
      }

      // Console 紀錄（永遠記錄）
      const consoleStore = useConsoleStore()
      consoleStore.addEntry({
        method: activeRequest.value.method,
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
      error.value = typeof e === 'string' ? e : e.message || 'Unknown error'

      // Console 紀錄（錯誤）
      const consoleStore = useConsoleStore()
      consoleStore.addEntry({
        method: activeRequest.value.method,
        url: resolvedUrl || activeRequest.value.url,
        requestHeaders: resolvedHeaders,
        requestBody: resolvedBody,
        status: 0,
        statusText: 'Error',
        responseHeaders: {},
        responseBody: error.value || 'Unknown error',
        duration: 0,
        size: 0,
      })
    } finally {
      activeRequest.value.isSending = false
    }
  }

  /** 載入已存的請求到編輯區 */
  function loadFromCollection(nodeId: string, request: ActiveRequest['method'] extends string ? any : never) {
    activeRequest.value = {
      collectionNodeId: nodeId,
      method: request.method || 'GET',
      url: request.url || '',
      params: request.params || [],
      headers: request.headers || [
        { id: crypto.randomUUID(), key: 'Content-Type', value: 'application/json', enabled: true },
      ],
      body: request.body || { type: 'none' },
      auth: request.auth || { type: 'none' },
      preRequestScript: request.preRequestScript || '',
      testScript: request.testScript || '',
      activeTab: 'params',
      isSending: false,
    }
    response.value = null
    error.value = null
  }

  /** 儲存當前請求回 Collection */
  async function saveToCollection() {
    const nodeId = activeRequest.value.collectionNodeId
    if (!nodeId) return false
    const collectionStore = useCollectionStore()
    await collectionStore.updateRequest(nodeId, {
      method: activeRequest.value.method,
      url: activeRequest.value.url,
      params: activeRequest.value.params,
      headers: activeRequest.value.headers,
      body: activeRequest.value.body,
      auth: activeRequest.value.auth,
      preRequestScript: activeRequest.value.preRequestScript,
      testScript: activeRequest.value.testScript,
    })
    return true
  }

  /** 重設為空請求 */
  function reset() {
    activeRequest.value = createEmptyRequest()
    response.value = null
    error.value = null
  }

  return {
    activeRequest,
    response,
    error,
    scriptOutput,
    executeScript,
    sendRequest,
    saveToCollection,
    loadFromCollection,
    reset,
  }
})
