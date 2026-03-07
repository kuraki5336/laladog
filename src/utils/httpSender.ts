/**
 * 可重用的 HTTP 發送邏輯
 * 供 requestStore.sendRequest() 與 pm.sendRequest() 共用
 */

export interface HttpSendOptions {
  method: string
  url: string
  headers: Record<string, string>
  body: string | null
}

export interface HttpSendResult {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  duration: number
  size: number
  bodyEncoding: 'text' | 'base64'
}

const isTauri = !!(window as any).__TAURI_INTERNALS__

async function sendViaTauri(
  method: string, url: string, headers: Record<string, string>,
  body: string | null,
): Promise<HttpSendResult> {
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

async function sendViaFetch(
  method: string, url: string, headers: Record<string, string>,
  body: string | null,
): Promise<HttpSendResult> {
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

export async function sendHttp(options: HttpSendOptions): Promise<HttpSendResult> {
  return isTauri
    ? sendViaTauri(options.method, options.url, options.headers, options.body)
    : sendViaFetch(options.method, options.url, options.headers, options.body)
}
