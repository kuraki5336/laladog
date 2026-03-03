import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Environment, EnvVariable } from '@/types'

const isTauri = !!(window as any).__TAURI_INTERNALS__

export const useEnvironmentStore = defineStore('environment', () => {
  const environments = ref<Environment[]>([])
  const globalVariables = ref<EnvVariable[]>([])

  const activeEnvironment = computed(() => environments.value.find((e) => e.isActive) || null)

  /** 合併全域 + 環境變數（環境變數優先） */
  const allVariables = computed(() => {
    const vars: Record<string, string> = {}
    for (const v of globalVariables.value) {
      if (v.enabled) vars[v.key] = v.value
    }
    if (activeEnvironment.value) {
      for (const v of activeEnvironment.value.variables) {
        if (v.enabled) vars[v.key] = v.value
      }
    }
    return vars
  })

  async function getDb() {
    const Database = (await import('@tauri-apps/plugin-sql')).default
    return await Database.load('sqlite:laladog.db')
  }

  /** 載入所有環境 */
  async function loadAll() {
    if (!isTauri) return
    const db = await getDb()

    // 載入環境
    const envRows = await db.select<any[]>('SELECT * FROM environments ORDER BY name')
    const varRows = await db.select<any[]>('SELECT * FROM env_variables')

    environments.value = envRows.map((e) => ({
      id: e.id,
      name: e.name,
      isActive: !!e.is_active,
      variables: varRows
        .filter((v) => v.environment_id === e.id)
        .map((v) => ({
          id: v.id,
          key: v.key,
          value: v.value,
          enabled: !!v.enabled,
        })),
    }))

    // 載入全域變數
    const globalRows = await db.select<any[]>('SELECT * FROM global_variables')
    globalVariables.value = globalRows.map((v) => ({
      id: v.id,
      key: v.key,
      value: v.value,
      enabled: !!v.enabled,
    }))
  }

  /** 新增環境 */
  async function addEnvironment(name: string) {
    const id = crypto.randomUUID()
    if (isTauri) {
      const db = await getDb()
      await db.execute('INSERT INTO environments (id, name) VALUES (?, ?)', [id, name])
    }
    environments.value.push({ id, name, isActive: false, variables: [] })
    return id
  }

  /** 切換啟用環境 */
  async function setActive(id: string) {
    if (isTauri) {
      const db = await getDb()
      await db.execute('UPDATE environments SET is_active = 0')
      await db.execute('UPDATE environments SET is_active = 1 WHERE id = ?', [id])
    }
    environments.value.forEach((e) => (e.isActive = e.id === id))
  }

  /** 新增環境變數 */
  async function addVariable(envId: string, key: string, value: string) {
    const id = crypto.randomUUID()
    if (isTauri) {
      const db = await getDb()
      await db.execute(
        'INSERT INTO env_variables (id, environment_id, key, value) VALUES (?, ?, ?, ?)',
        [id, envId, key, value],
      )
    }
    const env = environments.value.find((e) => e.id === envId)
    if (env) {
      env.variables.push({ id, key, value, enabled: true })
    }
  }

  /** 更新環境變數 */
  async function updateVariable(varId: string, key: string, value: string, enabled: boolean) {
    if (isTauri) {
      const db = await getDb()
      await db.execute('UPDATE env_variables SET key = ?, value = ?, enabled = ? WHERE id = ?', [
        key,
        value,
        enabled ? 1 : 0,
        varId,
      ])
    }
    for (const env of environments.value) {
      const v = env.variables.find((v) => v.id === varId)
      if (v) {
        v.key = key
        v.value = value
        v.enabled = enabled
        break
      }
    }
  }

  /** 刪除環境 */
  async function deleteEnvironment(id: string) {
    if (isTauri) {
      const db = await getDb()
      await db.execute('DELETE FROM environments WHERE id = ?', [id])
    }
    environments.value = environments.value.filter((e) => e.id !== id)
  }

  /** 匯入 Postman 環境（含變數） */
  async function importEnvironment(name: string, variables: { key: string; value: string; enabled: boolean }[]) {
    const envId = await addEnvironment(name)
    for (const v of variables) {
      if (v.key) {
        await addVariable(envId, v.key, v.value)
      }
    }
    return envId
  }

  return {
    environments,
    globalVariables,
    activeEnvironment,
    allVariables,
    loadAll,
    addEnvironment,
    setActive,
    addVariable,
    updateVariable,
    deleteEnvironment,
    importEnvironment,
  }
})
