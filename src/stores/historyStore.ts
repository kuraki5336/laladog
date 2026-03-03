import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { HistoryEntry, HttpMethod } from '@/types'
import type { HttpResponse } from '@/types/response'

const isTauri = !!(window as any).__TAURI_INTERNALS__

export const useHistoryStore = defineStore('history', () => {
  const entries = ref<HistoryEntry[]>([])

  async function getDb() {
    const Database = (await import('@tauri-apps/plugin-sql')).default
    return await Database.load('sqlite:laladog.db')
  }

  /** 載入歷史（最近 200 筆） */
  async function loadAll() {
    if (!isTauri) return
    const db = await getDb()
    const rows = await db.select<any[]>(
      'SELECT * FROM history ORDER BY timestamp DESC LIMIT 200',
    )
    entries.value = rows.map((r) => ({
      id: r.id,
      method: r.method as HttpMethod,
      url: r.url,
      status: r.status,
      duration: r.duration,
      timestamp: r.timestamp,
      requestHeaders: r.request_headers ? JSON.parse(r.request_headers) : {},
      requestBody: r.request_body,
      response: {
        status: r.status,
        statusText: '',
        headers: r.response_headers ? JSON.parse(r.response_headers) : {},
        body: r.response_body || '',
        duration: r.duration,
        size: r.response_size,
      },
    }))
  }

  /** 新增歷史紀錄 */
  async function addEntry(data: {
    method: HttpMethod
    url: string
    status: number
    duration: number
    requestHeaders: Record<string, string>
    requestBody: string | null
    response: HttpResponse
  }) {
    if (!isTauri) return
    const db = await getDb()
    const id = crypto.randomUUID()
    await db.execute(
      `INSERT INTO history (id, method, url, status, duration, request_headers, request_body, response_headers, response_body, response_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.method,
        data.url,
        data.status,
        data.duration,
        JSON.stringify(data.requestHeaders),
        data.requestBody,
        JSON.stringify(data.response.headers),
        data.response.body,
        data.response.size,
      ],
    )

    entries.value.unshift({
      id,
      method: data.method,
      url: data.url,
      status: data.status,
      duration: data.duration,
      timestamp: new Date().toISOString(),
      requestHeaders: data.requestHeaders,
      requestBody: data.requestBody,
      response: data.response,
    })
  }

  /** 清空歷史 */
  async function clearAll() {
    if (isTauri) {
      const db = await getDb()
      await db.execute('DELETE FROM history')
    }
    entries.value = []
  }

  return { entries, loadAll, addEntry, clearAll }
})
