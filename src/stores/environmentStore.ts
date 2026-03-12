import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { Environment, EnvVariable } from '@/types'
import { useWorkspaceStore } from './workspaceStore'

const isTauri = !!(window as any).__TAURI_INTERNALS__

/** 當前 workspace 是否為雲端（有 teamId）→ 不寫本地 SQLite */
function isCloudWs(): boolean {
  const wsStore = useWorkspaceStore()
  return !!wsStore.activeWorkspace?.teamId
}

export const useEnvironmentStore = defineStore('environment', () => {
  const environments = ref<Environment[]>([])
  const globalVariables = ref<EnvVariable[]>([])
  /** 本地臨時覆蓋值（不寫回 DB / 不同步雲端） */
  const localOverrides = reactive<Record<string, string>>({})

  /** 依當前 workspace 的 activeEnvironmentId 取得啟用環境 */
  const activeEnvironment = computed(() => {
    const wsStore = useWorkspaceStore()
    const activeEnvId = wsStore.activeWorkspace?.activeEnvironmentId
    if (!activeEnvId) return null
    return environments.value.find((e) => e.id === activeEnvId) || null
  })

  /** 合併全域 + 環境變數 + 本地覆蓋（本地覆蓋最優先） */
  const sharedVariables = computed(() => {
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

  const allVariables = computed(() => {
    return { ...sharedVariables.value, ...localOverrides }
  })

  /** 取得變數的共享值（不含本地覆蓋） */
  function getSharedValue(key: string): string | undefined {
    return sharedVariables.value[key]
  }

  /** 設定本地臨時覆蓋 */
  function setLocalOverride(key: string, value: string) {
    localOverrides[key] = value
  }

  /** 清除本地覆蓋，恢復共享值 */
  function clearLocalOverride(key: string) {
    delete localOverrides[key]
  }

  /** 將本地覆蓋值寫回環境變數 store */
  async function updateSharedValue(key: string, value: string) {
    // 優先更新環境變數
    if (activeEnvironment.value) {
      const envVar = activeEnvironment.value.variables.find((v) => v.key === key && v.enabled)
      if (envVar) {
        await updateVariable(envVar.id, key, value, true)
        delete localOverrides[key]
        return
      }
    }
    // 其次更新全域變數
    const globalVar = globalVariables.value.find((v) => v.key === key && v.enabled)
    if (globalVar) {
      if (isTauri) {
        const db = await getDb()
        await db.execute('UPDATE global_variables SET value = ? WHERE id = ?', [value, globalVar.id])
      }
      globalVar.value = value
      delete localOverrides[key]
    }
  }

  /** 取得變數來源資訊 */
  function getVariableSource(key: string): { source: 'environment' | 'global' | 'unknown'; envName?: string } {
    if (activeEnvironment.value) {
      const envVar = activeEnvironment.value.variables.find((v) => v.key === key && v.enabled)
      if (envVar) return { source: 'environment', envName: activeEnvironment.value.name }
    }
    const globalVar = globalVariables.value.find((v) => v.key === key && v.enabled)
    if (globalVar) return { source: 'global' }
    return { source: 'unknown' }
  }

  async function getDb() {
    const Database = (await import('@tauri-apps/plugin-sql')).default
    return await Database.load('sqlite:laladog.db')
  }

  /** 載入當前 workspace 的環境 */
  async function loadAll() {
    if (!isTauri) return
    const db = await getDb()
    const wsStore = useWorkspaceStore()
    const wsId = wsStore.activeWorkspace?.id

    // 載入該 workspace 的環境
    const envRows = wsId
      ? await db.select<any[]>('SELECT * FROM environments WHERE workspace_id = ? ORDER BY name', [wsId])
      : await db.select<any[]>('SELECT * FROM environments ORDER BY name')
    const envIds = envRows.map((e: any) => e.id)
    const varRows = envIds.length > 0
      ? await db.select<any[]>(`SELECT * FROM env_variables WHERE environment_id IN (${envIds.map(() => '?').join(',')})`, envIds)
      : []

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

  /** 新增環境（歸屬當前 workspace） */
  async function addEnvironment(name: string) {
    const id = crypto.randomUUID()
    const wsStore = useWorkspaceStore()
    const wsId = wsStore.activeWorkspace?.id || null
    if (isTauri && !isCloudWs()) {
      const db = await getDb()
      await db.execute('INSERT INTO environments (id, name, workspace_id) VALUES (?, ?, ?)', [id, name, wsId])
    }
    environments.value.push({ id, name, isActive: false, variables: [] })
    return id
  }

  /** 切換啟用環境（委託 workspaceStore 記錄） */
  async function setActive(id: string) {
    const wsStore = useWorkspaceStore()
    await wsStore.setActiveEnvironment(id)
  }

  /** 清除啟用環境（設為 No Environment） */
  async function clearActive() {
    const wsStore = useWorkspaceStore()
    await wsStore.setActiveEnvironment(null)
  }

  /** 新增環境變數 */
  async function addVariable(envId: string, key: string, value: string) {
    const id = crypto.randomUUID()
    if (isTauri && !isCloudWs()) {
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
    if (isTauri && !isCloudWs()) {
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
    if (isTauri && !isCloudWs()) {
      const db = await getDb()
      await db.execute('DELETE FROM environments WHERE id = ?', [id])
    }
    environments.value = environments.value.filter((e) => e.id !== id)

    // 如果刪除的環境是當前 workspace 的 active env，在 memory 中清除
    // （DB 端由 ON DELETE SET NULL 處理）
    const wsStore = useWorkspaceStore()
    if (wsStore.activeWorkspace?.activeEnvironmentId === id) {
      wsStore.activeWorkspace.activeEnvironmentId = null
    }
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
    localOverrides,
    activeEnvironment,
    sharedVariables,
    allVariables,
    loadAll,
    addEnvironment,
    setActive,
    clearActive,
    addVariable,
    updateVariable,
    deleteEnvironment,
    importEnvironment,
    getSharedValue,
    setLocalOverride,
    clearLocalOverride,
    updateSharedValue,
    getVariableSource,
  }
})
