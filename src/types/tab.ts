import type { ActiveRequest } from './request'
import type { HttpResponse } from './response'

/** 單一分頁的完整狀態 */
export interface TabState {
  /** 唯一 ID */
  id: string
  /** 顯示名稱，空白 tab 預設 "Untitled" */
  title: string
  /** 請求編輯器狀態 */
  request: ActiveRequest
  /** HTTP 回應 */
  response: HttpResponse | null
  /** 錯誤訊息 */
  error: string | null
  /** Script 執行結果 */
  scriptOutput: string
  /** 已解析的請求細節（供 Console 顯示） */
  lastRequestDetails: {
    method: string
    url: string
    headers: Record<string, string>
    body: string | null
  } | null
  /** 是否有未儲存的變更 */
  isDirty: boolean
  /** 對應的 CollectionNode ID，null 表示未儲存到 Collection */
  collectionNodeId: string | null
  /** 上次儲存時的請求快照（JSON），用於比對 dirty */
  savedSnapshot: string | null
}
