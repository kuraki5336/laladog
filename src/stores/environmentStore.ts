import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { Environment, EnvVariable } from '@/types'
import { useWorkspaceStore } from './workspaceStore'

const isTauri = !!(window as any).__TAURI_INTERNALS__

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
      if (isTauri && !isCloudWs()) {
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

  /** 載入當前 workspace 的環境（本地 workspace 讀 SQLite，雲端從 pullFromCloud 取得） */
  async function loadAll() {
    if (isCloudWs()) return // 雲端環境變數由 pullFromCloud 處理
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
    if (isCloudWs()) {
      // 雲端：只改記憶體 + 同步
      environments.value.push({ id, name, isActive: false, variables: [] })
      scheduleSyncToCloud()
      return id
    }
    const wsStore = useWorkspaceStore()
    const wsId = wsStore.activeWorkspace?.id || null
    if (isTauri) {
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
    if (isCloudWs()) {
      const env = environments.value.find((e) => e.id === envId)
      if (env) {
        env.variables.push({ id, key, value, enabled: true })
        scheduleSyncToCloud()
      }
      return
    }
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
    if (isCloudWs()) {
      for (const env of environments.value) {
        const v = env.variables.find((v) => v.id === varId)
        if (v) {
          v.key = key
          v.value = value
          v.enabled = enabled
          break
        }
      }
      scheduleSyncToCloud()
      return
    }
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
    if (isCloudWs()) {
      environments.value = environments.value.filter((e) => e.id !== id)
      const wsStore = useWorkspaceStore()
      if (wsStore.activeWorkspace?.activeEnvironmentId === id) {
        wsStore.activeWorkspace.activeEnvironmentId = null
      }
      scheduleSyncToCloud()
      return
    }
    if (isTauri) {
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

  // ── 雲端同步 ──

  let syncTimer: ReturnType<typeof setTimeout> | null = null

  /** 排程同步到雲端（debounce 1 秒，排程時立即快照資料和 teamId） */
  function scheduleSyncToCloud() {
    const wsStore = useWorkspaceStore()
    const teamId = wsStore.activeWorkspace?.teamId
    if (!teamId) return

    // 立即快照當前資料，避免 debounce 期間切換 workspace 導致推送錯誤資料
    const snapshot = serializeEnvironments()

    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      pushToCloud(teamId, snapshot)
    }, 1000)
  }

  /** 序列化所有環境為 JSON */
  function serializeEnvironments(): string {
    return JSON.stringify(
      environments.value.map((e) => ({
        id: e.id,
        name: e.name,
        variables: e.variables.map((v) => ({
          id: v.id,
          key: v.key,
          value: v.value,
          enabled: v.enabled,
        })),
      })),
    )
  }

  /** 推送環境變數到雲端（WS 優先，HTTP fallback） */
  async function pushToCloud(teamId: string, data: string) {
    try {
      // 優先走 WebSocket
      const { useSyncStore } = await import('./syncStore')
      const syncStore = useSyncStore()
      if (syncStore.status === 'connected') {
        const sent = syncStore.pushEnvViaWs(data)
        if (sent) {
          console.log('[EnvSync] Pushed via WebSocket')
          return
        }
      }

      // Fallback: HTTP
      const { apiCall } = await import('@/utils/api')
      await apiCall('PUT', `/sync/${teamId}/environments`, { data })
      console.log('[EnvSync] Pushed via HTTP (fallback)')
    } catch (e) {
      console.error('[EnvSync] Push to cloud failed:', e)
    }
  }

  /** 從雲端拉取環境變數 */
  async function pullFromCloud(teamId: string) {
    const { useAuthStore } = await import('./authStore')
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return

    // 先清空，避免殘留前一個 workspace 的環境變數
    environments.value = []

    try {
      const { apiCall } = await import('@/utils/api')
      const resp = await apiCall('GET', `/sync/${teamId}/environments`)
      if (resp.status >= 400) {
        console.error('[EnvSync] Failed to pull from cloud:', resp.body)
        return
      }

      const result = JSON.parse(resp.body)
      if (!result || !result.data) {
        console.log('[EnvSync] No shared environments on cloud')
        environments.value = []
        return
      }

      const cloudEnvs: Environment[] = JSON.parse(result.data)
      if (!Array.isArray(cloudEnvs)) return

      environments.value = cloudEnvs.map((e) => ({
        id: e.id,
        name: e.name,
        isActive: false,
        variables: (e.variables || []).map((v) => ({
          id: v.id,
          key: v.key,
          value: v.value,
          enabled: v.enabled,
        })),
      }))

      console.log(`[EnvSync] Pulled ${cloudEnvs.length} environments from cloud`)
    } catch (e) {
      console.error('[EnvSync] Pull from cloud failed:', e)
    }
  }

  /** 套用遠端 WebSocket 推送的環境變數更新 */
  function applyRemoteUpdate(dataJson: string) {
    try {
      const cloudEnvs: Environment[] = JSON.parse(dataJson)
      if (!Array.isArray(cloudEnvs)) return

      environments.value = cloudEnvs.map((e) => ({
        id: e.id,
        name: e.name,
        isActive: false,
        variables: (e.variables || []).map((v) => ({
          id: v.id,
          key: v.key,
          value: v.value,
          enabled: v.enabled,
        })),
      }))

      console.log(`[EnvSync] Applied remote update: ${cloudEnvs.length} environments`)
    } catch (e) {
      console.error('[EnvSync] Failed to apply remote update:', e)
    }
  }

  /** 將本地環境變數推上雲端（Share workspace 時使用） */
  async function pushLocalToCloud(teamId: string) {
    try {
      const data = serializeEnvironments()
      const { apiCall } = await import('@/utils/api')
      await apiCall('PUT', `/sync/${teamId}/environments`, { data })
      console.log('[EnvSync] Pushed local environments to cloud')
    } catch (e) {
      console.error('[EnvSync] Failed to push local to cloud:', e)
    }
  }

  /** 清除本地 SQLite 中的環境資料（Share workspace 後使用） */
  async function clearLocalEnvironments(workspaceId: string) {
    if (!isTauri) return
    try {
      const db = await getDb()
      // 先刪變數再刪環境（FK 約束）
      const envRows = await db.select<any[]>('SELECT id FROM environments WHERE workspace_id = ?', [workspaceId])
      for (const row of envRows) {
        await db.execute('DELETE FROM env_variables WHERE environment_id = ?', [row.id])
      }
      await db.execute('DELETE FROM environments WHERE workspace_id = ?', [workspaceId])
      console.log(`[EnvSync] Cleared local environments for workspace ${workspaceId}`)
    } catch (e) {
      console.error('[EnvSync] Failed to clear local environments:', e)
    }
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
    pullFromCloud,
    applyRemoteUpdate,
    pushLocalToCloud,
    clearLocalEnvironments,
  }
})
