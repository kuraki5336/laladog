/** Collection 樹節點類型 */
export type CollectionNodeType = 'collection' | 'folder' | 'request'

/** HTTP 請求方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/** Collection 樹節點 */
export interface CollectionNode {
  id: string
  name: string
  type: CollectionNodeType
  parentId: string | null
  sortOrder: number
  /** 僅頂層 collection 節點有值，folder/request 透過 parentId 隱式歸屬 */
  workspaceId?: string | null
  /** 僅 type=request 有值 */
  request?: SavedRequest
  children?: CollectionNode[]
  isExpanded?: boolean
}

/** 儲存的請求 */
export interface SavedRequest {
  method: HttpMethod
  url: string
  params: KeyValuePair[]
  headers: KeyValuePair[]
  body: RequestBody
  auth: RequestAuth
  preRequestScript?: string
  testScript?: string
}

/** Key-Value 對（用於 params / headers） */
export interface KeyValuePair {
  id: string
  key: string
  value: string
  description?: string
  enabled: boolean
  /** form-data 專用：text（預設）或 file */
  fieldType?: 'text' | 'file'
}

/** 請求 Body */
export interface RequestBody {
  type: 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary'
  raw?: string
  rawType?: 'json' | 'xml' | 'text'
  formData?: KeyValuePair[]
  urlencoded?: KeyValuePair[]
  binaryPath?: string
}

/** 認證設定 */
export interface RequestAuth {
  type: 'none' | 'bearer' | 'basic' | 'apikey'
  bearer?: { token: string }
  basic?: { username: string; password: string }
  apikey?: { key: string; value: string; addTo: 'header' | 'query' }
}
