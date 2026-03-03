import type { CollectionNode, SavedRequest, KeyValuePair, HttpMethod } from '@/types'

/**
 * 匯入 Postman Collection v2.1 JSON
 * 回傳扁平化的 CollectionNode 陣列
 */
export function parsePostmanCollection(json: any): CollectionNode[] {
  const nodes: CollectionNode[] = []
  const collectionId = crypto.randomUUID()

  // 頂層 Collection
  nodes.push({
    id: collectionId,
    name: json.info?.name || 'Imported Collection',
    type: 'collection',
    parentId: null,
    sortOrder: 0,
  })

  // 遞迴解析 items
  if (json.item) {
    parseItems(json.item, collectionId, nodes)
  }

  return nodes
}

function parseItems(items: any[], parentId: string, nodes: CollectionNode[]) {
  items.forEach((item, index) => {
    const id = crypto.randomUUID()

    if (item.item) {
      // Folder
      nodes.push({
        id,
        name: item.name || 'Folder',
        type: 'folder',
        parentId,
        sortOrder: index,
      })
      parseItems(item.item, id, nodes)
    } else if (item.request) {
      // Request
      const request = parseRequest(item.request)
      // 解析 Postman event scripts（pre-request / tests）
      if (item.event && Array.isArray(item.event)) {
        for (const evt of item.event) {
          const scriptLines = evt.script?.exec
          if (Array.isArray(scriptLines)) {
            const code = scriptLines.join('\n')
            if (evt.listen === 'prerequest') {
              request.preRequestScript = code
            } else if (evt.listen === 'test') {
              request.testScript = code
            }
          }
        }
      }
      nodes.push({
        id,
        name: item.name || 'Request',
        type: 'request',
        parentId,
        sortOrder: index,
        request,
      })
    }
  })
}

function parseRequest(raw: any): SavedRequest {
  const method = (raw.method || 'GET').toUpperCase() as HttpMethod

  // URL
  let url = ''
  if (typeof raw.url === 'string') {
    url = raw.url
  } else if (raw.url?.raw) {
    url = raw.url.raw
  }

  // Headers
  const headers: KeyValuePair[] = (raw.header || []).map((h: any) => ({
    id: crypto.randomUUID(),
    key: h.key || '',
    value: h.value || '',
    enabled: !h.disabled,
  }))

  // Params (from URL query)
  const params: KeyValuePair[] = (raw.url?.query || []).map((q: any) => ({
    id: crypto.randomUUID(),
    key: q.key || '',
    value: q.value || '',
    enabled: !q.disabled,
  }))

  // Body
  let body: SavedRequest['body'] = { type: 'none' }
  if (raw.body) {
    switch (raw.body.mode) {
      case 'raw':
        body = {
          type: 'raw',
          raw: raw.body.raw || '',
          rawType: detectRawType(raw.body.options?.raw?.language),
        }
        break
      case 'formdata':
        body = {
          type: 'form-data',
          formData: (raw.body.formdata || []).map((f: any) => ({
            id: crypto.randomUUID(),
            key: f.key || '',
            value: f.value || '',
            enabled: !f.disabled,
          })),
        }
        break
      case 'urlencoded':
        body = {
          type: 'x-www-form-urlencoded',
          urlencoded: (raw.body.urlencoded || []).map((u: any) => ({
            id: crypto.randomUUID(),
            key: u.key || '',
            value: u.value || '',
            enabled: !u.disabled,
          })),
        }
        break
    }
  }

  // Auth
  let auth: SavedRequest['auth'] = { type: 'none' }
  if (raw.auth) {
    switch (raw.auth.type) {
      case 'bearer':
        auth = {
          type: 'bearer',
          bearer: {
            token: raw.auth.bearer?.[0]?.value || '',
          },
        }
        break
      case 'basic':
        auth = {
          type: 'basic',
          basic: {
            username: raw.auth.basic?.find((b: any) => b.key === 'username')?.value || '',
            password: raw.auth.basic?.find((b: any) => b.key === 'password')?.value || '',
          },
        }
        break
    }
  }

  return { method, url, params, headers, body, auth }
}

function detectRawType(language?: string): 'json' | 'xml' | 'text' {
  if (language === 'json') return 'json'
  if (language === 'xml') return 'xml'
  return 'text'
}

/**
 * 匯入 Postman Environment JSON
 * 支援單一環境或多環境匯出格式
 */
export function parsePostmanEnvironment(json: any): {
  name: string
  variables: { key: string; value: string; enabled: boolean }[]
}[] {
  // 單一環境格式: { name, values: [...] }
  if (json.name && json.values) {
    return [{
      name: json.name,
      variables: (json.values || []).map((v: any) => ({
        key: v.key || '',
        value: v.value || '',
        enabled: v.enabled !== false,
      })),
    }]
  }

  // 多環境格式: { environments: [...] }（Postman bulk export）
  if (json.environments && Array.isArray(json.environments)) {
    return json.environments.map((env: any) => ({
      name: env.name || 'Imported Environment',
      variables: (env.values || []).map((v: any) => ({
        key: v.key || '',
        value: v.value || '',
        enabled: v.enabled !== false,
      })),
    }))
  }

  // 嘗試當作 values 陣列
  if (Array.isArray(json)) {
    return [{
      name: 'Imported Environment',
      variables: json.map((v: any) => ({
        key: v.key || '',
        value: v.value || '',
        enabled: v.enabled !== false,
      })),
    }]
  }

  throw new Error('Unrecognized Postman environment format')
}
