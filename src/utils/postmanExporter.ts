import type { CollectionNode, SavedRequest, KeyValuePair } from '@/types'

/**
 * 將樹狀 CollectionNode 轉為 Postman Collection v2.1 JSON 格式
 * （postmanImporter.ts 的反向操作）
 */
export function exportToPostmanV21(collection: CollectionNode): object {
  return {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: convertChildren(collection.children || []),
  }
}

function convertChildren(nodes: CollectionNode[]): any[] {
  return nodes.map((node) => {
    if (node.type === 'folder') {
      return {
        name: node.name,
        item: convertChildren(node.children || []),
      }
    }
    // request
    const result: any = {
      name: node.name,
      request: convertRequest(node.request),
      response: [],
    }
    // Pre-request / test scripts
    const events = buildEvents(node.request)
    if (events.length > 0) {
      result.event = events
    }
    return result
  })
}

function convertRequest(req?: SavedRequest): any {
  if (!req) return { method: 'GET', header: [], url: { raw: '' } }

  const result: any = {
    method: req.method,
    header: convertKeyValues(req.headers),
    url: buildUrl(req),
  }

  // Body
  if (req.body && req.body.type !== 'none') {
    result.body = convertBody(req.body)
  }

  // Auth
  if (req.auth && req.auth.type !== 'none') {
    result.auth = convertAuth(req.auth)
  }

  return result
}

function buildUrl(req: SavedRequest): any {
  const url: any = { raw: req.url }
  const enabledParams = req.params.filter((p) => p.key)
  if (enabledParams.length > 0) {
    url.query = enabledParams.map((p) => ({
      key: p.key,
      value: p.value,
      ...(p.description ? { description: p.description } : {}),
      ...(!p.enabled ? { disabled: true } : {}),
    }))
  }
  return url
}

function convertKeyValues(kvs: KeyValuePair[]): any[] {
  return kvs
    .filter((kv) => kv.key)
    .map((kv) => ({
      key: kv.key,
      value: kv.value,
      ...(kv.description ? { description: kv.description } : {}),
      ...(!kv.enabled ? { disabled: true } : {}),
    }))
}

function convertBody(body: SavedRequest['body']): any {
  switch (body.type) {
    case 'raw':
      return {
        mode: 'raw',
        raw: body.raw || '',
        options: { raw: { language: body.rawType || 'text' } },
      }
    case 'form-data':
      return {
        mode: 'formdata',
        formdata: convertKeyValues(body.formData || []),
      }
    case 'x-www-form-urlencoded':
      return {
        mode: 'urlencoded',
        urlencoded: convertKeyValues(body.urlencoded || []),
      }
    default:
      return {}
  }
}

function convertAuth(auth: SavedRequest['auth']): any {
  switch (auth.type) {
    case 'bearer':
      return {
        type: 'bearer',
        bearer: [{ key: 'token', value: auth.bearer?.token || '', type: 'string' }],
      }
    case 'basic':
      return {
        type: 'basic',
        basic: [
          { key: 'username', value: auth.basic?.username || '', type: 'string' },
          { key: 'password', value: auth.basic?.password || '', type: 'string' },
        ],
      }
    case 'apikey':
      return {
        type: 'apikey',
        apikey: [
          { key: 'key', value: auth.apikey?.key || '', type: 'string' },
          { key: 'value', value: auth.apikey?.value || '', type: 'string' },
          { key: 'in', value: auth.apikey?.addTo || 'header', type: 'string' },
        ],
      }
    default:
      return { type: 'noauth' }
  }
}

function buildEvents(req?: SavedRequest): any[] {
  const events: any[] = []
  if (req?.preRequestScript) {
    events.push({
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: req.preRequestScript.split('\n'),
      },
    })
  }
  if (req?.testScript) {
    events.push({
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: req.testScript.split('\n'),
      },
    })
  }
  return events
}
