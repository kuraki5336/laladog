import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ConsoleEntry } from '@/types/console'

const MAX_ENTRIES = 500
const MAX_BODY_SIZE = 100 * 1024 // 100KB

export const useConsoleStore = defineStore('console', () => {
  const entries = ref<ConsoleEntry[]>([])

  /** 新增紀錄（最新在前），超過上限自動移除最舊的 */
  function addEntry(entry: Omit<ConsoleEntry, 'id' | 'timestamp'>) {
    const truncatedBody = entry.responseBody.length > MAX_BODY_SIZE
      ? entry.responseBody.slice(0, MAX_BODY_SIZE) + '\n... [truncated]'
      : entry.responseBody

    entries.value.unshift({
      ...entry,
      responseBody: truncatedBody,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    })

    // 移除超出上限的紀錄
    if (entries.value.length > MAX_ENTRIES) {
      entries.value = entries.value.slice(0, MAX_ENTRIES)
    }
  }

  /** 清空所有紀錄 */
  function clearAll() {
    entries.value = []
  }

  return {
    entries,
    addEntry,
    clearAll,
  }
})
