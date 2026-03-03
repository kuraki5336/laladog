import type { HttpMethod } from './collection'
import type { HttpResponse } from './response'

/** 請求歷史紀錄 */
export interface HistoryEntry {
  id: string
  method: HttpMethod
  url: string
  status: number
  duration: number
  timestamp: string
  requestHeaders: Record<string, string>
  requestBody: string | null
  response: HttpResponse
}
