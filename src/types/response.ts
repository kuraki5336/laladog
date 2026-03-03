/** HTTP 回應 */
export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  /** 回應時間（ms） */
  duration: number
  /** Body 大小（bytes） */
  size: number
}

/** 回應面板的顯示模式 */
export type ResponseViewMode = 'pretty' | 'raw' | 'preview'
