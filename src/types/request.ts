import type { HttpMethod, KeyValuePair, RequestBody, RequestAuth } from './collection'

/** 當前編輯中的請求（活躍的 tab） */
export interface ActiveRequest {
  /** 對應 CollectionNode.id，null 表示尚未儲存 */
  collectionNodeId: string | null
  method: HttpMethod
  url: string
  params: KeyValuePair[]
  headers: KeyValuePair[]
  body: RequestBody
  auth: RequestAuth
  preRequestScript: string
  testScript: string
  /** UI 狀態 */
  activeTab: 'params' | 'headers' | 'body' | 'auth' | 'pre-request' | 'tests'
  isSending: boolean
}

/** 建立預設的空請求 */
export function createEmptyRequest(): ActiveRequest {
  return {
    collectionNodeId: null,
    method: 'GET',
    url: '',
    params: [],
    headers: [
      { id: crypto.randomUUID(), key: 'Content-Type', value: 'application/json', enabled: true },
    ],
    body: { type: 'raw', rawType: 'json', raw: '' },
    auth: { type: 'none' },
    preRequestScript: '',
    testScript: '',
    activeTab: 'params',
    isSending: false,
  }
}
