import type { HttpMethod } from './collection'

/** Console 紀錄項目 — 記錄每次 HTTP 請求的完整細節 */
export interface ConsoleEntry {
  id: string
  timestamp: string
  method: HttpMethod
  /** 解析後的實際 URL（含環境變數替換） */
  url: string
  requestHeaders: Record<string, string>
  requestBody: string | null
  status: number
  statusText: string
  responseHeaders: Record<string, string>
  responseBody: string
  duration: number
  size: number
}
