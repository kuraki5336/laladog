import type { CollectionNode, SavedRequest, KeyValuePair, HttpMethod } from '@/types'

const SUPPORTED_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const

/**
 * 解析 OpenAPI 3.x / Swagger 2.0 規格
 * 回傳扁平化的 CollectionNode 陣列（與 postmanImporter 相同結構）
 */
export function parseOpenAPISpec(spec: any): CollectionNode[] {
  if (!spec || typeof spec !== 'object') {
    throw new Error('Invalid OpenAPI specification')
  }

  // 判斷 OpenAPI 版本
  const isSwagger2 = spec.swagger && spec.swagger.startsWith('2')
  const isOpenAPI3 = spec.openapi && spec.openapi.startsWith('3')

  if (!isSwagger2 && !isOpenAPI3) {
    throw new Error('Unsupported specification: must be OpenAPI 3.x or Swagger 2.0')
  }

  const nodes: CollectionNode[] = []
  const collectionId = crypto.randomUUID()
  const title = spec.info?.title || 'Imported API'

  // Base URL
  const baseUrl = resolveBaseUrl(spec, isSwagger2)

  // 頂層 Collection
  nodes.push({
    id: collectionId,
    name: title,
    type: 'collection',
    parentId: null,
    sortOrder: 0,
  })

  // 收集 tag → folder 映射
  const tagFolders = new Map<string, string>() // tag name → folder id
  let folderSort = 0

  // 預先建立 tag folders（若有定義 tags）
  if (spec.tags && Array.isArray(spec.tags)) {
    for (const tag of spec.tags) {
      const folderId = crypto.randomUUID()
      tagFolders.set(tag.name, folderId)
      nodes.push({
        id: folderId,
        name: tag.name,
        type: 'folder',
        parentId: collectionId,
        sortOrder: folderSort++,
      })
    }
  }

  // 遍歷 paths
  const paths = spec.paths || {}
  let requestSort = 0

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue

    for (const method of SUPPORTED_METHODS) {
      const operation = (pathItem as any)[method]
      if (!operation) continue

      const httpMethod = method.toUpperCase() as HttpMethod
      const operationName = operation.summary || operation.operationId || `${httpMethod} ${path}`

      // 決定父節點（依第一個 tag 分組）
      let parentId: string = collectionId
      const tags: string[] = operation.tags || []
      if (tags.length > 0) {
        const tagName = tags[0]
        if (!tagFolders.has(tagName)) {
          // 動態建立未預定義的 tag folder
          const folderId = crypto.randomUUID()
          tagFolders.set(tagName, folderId)
          nodes.push({
            id: folderId,
            name: tagName,
            type: 'folder',
            parentId: collectionId,
            sortOrder: folderSort++,
          })
        }
        parentId = tagFolders.get(tagName)!
      }

      // 解析 request
      const request = buildRequest(httpMethod, path, baseUrl, operation, pathItem, spec, isSwagger2)

      nodes.push({
        id: crypto.randomUUID(),
        name: operationName,
        type: 'request',
        parentId,
        sortOrder: requestSort++,
        request,
      })
    }
  }

  return nodes
}

/** 解析 base URL */
function resolveBaseUrl(spec: any, isSwagger2: boolean): string {
  if (isSwagger2) {
    const scheme = spec.schemes?.[0] || 'https'
    const host = spec.host || 'localhost'
    const basePath = spec.basePath || ''
    return `${scheme}://${host}${basePath}`
  }

  // OpenAPI 3.x
  if (spec.servers && spec.servers.length > 0) {
    let url = spec.servers[0].url || ''
    // 替換 server variables
    const variables = spec.servers[0].variables
    if (variables) {
      for (const [key, variable] of Object.entries(variables)) {
        const defaultVal = (variable as any).default || ''
        url = url.replace(`{${key}}`, defaultVal)
      }
    }
    return url
  }

  return ''
}

/** 建構 SavedRequest */
function buildRequest(
  method: HttpMethod,
  path: string,
  baseUrl: string,
  operation: any,
  pathItem: any,
  spec: any,
  isSwagger2: boolean,
): SavedRequest {
  const url = `${baseUrl}${path}`

  // 合併 path-level + operation-level parameters
  const allParams: any[] = [
    ...((pathItem as any).parameters || []),
    ...(operation.parameters || []),
  ]

  // 解析 $ref parameters
  const resolvedParams = allParams.map(p => resolveRef(p, spec))

  // Query Params
  const params: KeyValuePair[] = resolvedParams
    .filter(p => p.in === 'query')
    .map(p => ({
      id: crypto.randomUUID(),
      key: p.name || '',
      value: p.example !== undefined ? String(p.example) : '',
      description: p.description || '',
      enabled: p.required !== false,
    }))

  // Headers
  const headers: KeyValuePair[] = resolvedParams
    .filter(p => p.in === 'header')
    .map(p => ({
      id: crypto.randomUUID(),
      key: p.name || '',
      value: p.example !== undefined ? String(p.example) : '',
      description: p.description || '',
      enabled: true,
    }))

  // Body
  const body = parseBody(operation, spec, isSwagger2)

  // Auth
  const auth = parseAuth(operation, spec)

  return { method, url, params, headers, body, auth }
}

/** 解析 request body */
function parseBody(operation: any, spec: any, isSwagger2: boolean): SavedRequest['body'] {
  if (isSwagger2) {
    // Swagger 2.0: body 在 parameters 中
    const bodyParam = (operation.parameters || [])
      .map((p: any) => resolveRef(p, spec))
      .find((p: any) => p.in === 'body')

    if (bodyParam?.schema) {
      const example = generateExample(bodyParam.schema, spec)
      return {
        type: 'raw',
        raw: example ? JSON.stringify(example, null, 2) : '',
        rawType: 'json',
      }
    }

    // formData parameters
    const formParams = (operation.parameters || [])
      .map((p: any) => resolveRef(p, spec))
      .filter((p: any) => p.in === 'formData')

    if (formParams.length > 0) {
      const consumes = operation.consumes || spec.consumes || []
      if (consumes.includes('multipart/form-data')) {
        return {
          type: 'form-data',
          formData: formParams.map((p: any) => ({
            id: crypto.randomUUID(),
            key: p.name || '',
            value: p.example !== undefined ? String(p.example) : '',
            enabled: true,
          })),
        }
      }
      return {
        type: 'x-www-form-urlencoded',
        urlencoded: formParams.map((p: any) => ({
          id: crypto.randomUUID(),
          key: p.name || '',
          value: p.example !== undefined ? String(p.example) : '',
          enabled: true,
        })),
      }
    }

    return { type: 'none' }
  }

  // OpenAPI 3.x
  const requestBody = resolveRef(operation.requestBody, spec)
  if (!requestBody?.content) return { type: 'none' }

  const content = requestBody.content

  // JSON
  if (content['application/json']) {
    const schema = resolveRef(content['application/json'].schema, spec)
    const example = content['application/json'].example
      || content['application/json'].examples
      || (schema ? generateExample(schema, spec) : null)

    return {
      type: 'raw',
      raw: example ? JSON.stringify(example, null, 2) : '',
      rawType: 'json',
    }
  }

  // XML
  if (content['application/xml'] || content['text/xml']) {
    return {
      type: 'raw',
      raw: '',
      rawType: 'xml',
    }
  }

  // Form data
  if (content['multipart/form-data']) {
    const schema = resolveRef(content['multipart/form-data'].schema, spec)
    const properties = schema?.properties || {}
    return {
      type: 'form-data',
      formData: Object.entries(properties).map(([key, _prop]) => ({
        id: crypto.randomUUID(),
        key,
        value: '',
        enabled: true,
      })),
    }
  }

  // URL encoded
  if (content['application/x-www-form-urlencoded']) {
    const schema = resolveRef(content['application/x-www-form-urlencoded'].schema, spec)
    const properties = schema?.properties || {}
    return {
      type: 'x-www-form-urlencoded',
      urlencoded: Object.entries(properties).map(([key, _prop]) => ({
        id: crypto.randomUUID(),
        key,
        value: '',
        enabled: true,
      })),
    }
  }

  // 其他純文字
  if (content['text/plain']) {
    return { type: 'raw', raw: '', rawType: 'text' }
  }

  return { type: 'none' }
}

/** 解析 auth */
function parseAuth(operation: any, spec: any): SavedRequest['auth'] {
  const securityReqs = operation.security || spec.security
  if (!securityReqs || securityReqs.length === 0) return { type: 'none' }

  const securitySchemes = spec.components?.securitySchemes
    || spec.securityDefinitions
    || {}

  for (const req of securityReqs) {
    for (const schemeName of Object.keys(req)) {
      const scheme = securitySchemes[schemeName]
      if (!scheme) continue

      // Bearer Token (OpenAPI 3.x)
      if (scheme.type === 'http' && scheme.scheme === 'bearer') {
        return { type: 'bearer', bearer: { token: '' } }
      }

      // OAuth2 bearer (Swagger 2.0)
      if (scheme.type === 'oauth2') {
        return { type: 'bearer', bearer: { token: '' } }
      }

      // Basic Auth
      if (scheme.type === 'http' && scheme.scheme === 'basic') {
        return { type: 'basic', basic: { username: '', password: '' } }
      }
      if (scheme.type === 'basic') {
        // Swagger 2.0
        return { type: 'basic', basic: { username: '', password: '' } }
      }

      // API Key
      if (scheme.type === 'apiKey') {
        return {
          type: 'apikey',
          apikey: {
            key: scheme.name || '',
            value: '',
            addTo: scheme.in === 'query' ? 'query' : 'header',
          },
        }
      }
    }
  }

  return { type: 'none' }
}

/** 解析 $ref 引用 */
function resolveRef(obj: any, spec: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (!obj.$ref) return obj

  const refPath = obj.$ref
  if (!refPath.startsWith('#/')) return obj

  const parts = refPath.slice(2).split('/')
  let current = spec
  for (const part of parts) {
    const decoded = part.replace(/~1/g, '/').replace(/~0/g, '~')
    current = current?.[decoded]
  }

  return current || obj
}

/** 從 schema 產生範例值（簡易版） */
function generateExample(schema: any, spec: any, depth = 0): any {
  if (!schema || depth > 5) return undefined

  const resolved = resolveRef(schema, spec)
  if (!resolved) return undefined

  if (resolved.example !== undefined) return resolved.example

  switch (resolved.type) {
    case 'object': {
      if (!resolved.properties) return {}
      const obj: Record<string, any> = {}
      for (const [key, prop] of Object.entries(resolved.properties)) {
        const val = generateExample(prop, spec, depth + 1)
        if (val !== undefined) obj[key] = val
      }
      return obj
    }
    case 'array': {
      const itemExample = generateExample(resolved.items, spec, depth + 1)
      return itemExample !== undefined ? [itemExample] : []
    }
    case 'string':
      return resolved.enum?.[0] || ''
    case 'integer':
    case 'number':
      return resolved.enum?.[0] || 0
    case 'boolean':
      return false
    default:
      return undefined
  }
}

/**
 * 判斷內容是否為 OpenAPI/Swagger 格式
 */
export function isOpenAPISpec(data: any): boolean {
  if (!data || typeof data !== 'object') return false
  return !!(data.openapi || data.swagger)
}
