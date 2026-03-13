import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Workspace } from '@/types/workspace'

const isTauri = !!(window as any).__TAURI_INTERNALS__

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([])

  const activeWorkspace = computed(() =>
    workspaces.value.find(w => w.isActive) || workspaces.value[0] || null
  )

  async function getDb() {
    const Database = (await import('@tauri-apps/plugin-sql')).default
    return await Database.load('sqlite:laladog.db')
  }

  /** 載入本地工作區（雲端 workspace 由 ensureTeamWorkspaces 動態建立） */
  async function loadAll() {
    if (!isTauri) return
    const db = await getDb()

    // 清除殘留的雲端 workspace row（環境變數已改走 API，不再需要 FK）
    await db.execute('DELETE FROM workspaces WHERE team_id IS NOT NULL')

    const rows = await db.select<any[]>('SELECT * FROM workspaces ORDER BY created_at')
    workspaces.value = rows.map(r => ({
      id: r.id,
      name: r.name,
      isActive: !!r.is_active,
      teamId: r.team_id || null,
      activeEnvironmentId: r.active_environment_id || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  }

  /** 切換啟用的工作區 */
  async function setActive(id: string) {
    const ws = workspaces.value.find(w => w.id === id)
    if (isTauri && !ws?.teamId) {
      // 只更新本地 workspace 的 SQLite
      const db = await getDb()
      await db.execute('UPDATE workspaces SET is_active = 0')
      await db.execute('UPDATE workspaces SET is_active = 1 WHERE id = ?', [id])
    }
    for (const w of workspaces.value) {
      w.isActive = w.id === id
    }
  }

  /** 新增工作區 */
  async function addWorkspace(name: string) {
    const id = crypto.randomUUID()
    if (isTauri) {
      const db = await getDb()
      // 先取消所有啟用
      await db.execute('UPDATE workspaces SET is_active = 0')
      await db.execute(
        'INSERT INTO workspaces (id, name, is_active) VALUES (?, ?, 1)',
        [id, name],
      )
    }
    // 前端更新
    for (const w of workspaces.value) {
      w.isActive = false
    }
    workspaces.value.push({
      id,
      name,
      isActive: true,
      teamId: null,
      activeEnvironmentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return id
  }

  /** 重命名工作區 */
  async function renameWorkspace(id: string, name: string) {
    if (isTauri) {
      const db = await getDb()
      await db.execute(
        'UPDATE workspaces SET name = ?, updated_at = datetime("now") WHERE id = ?',
        [name, id],
      )
    }
    const ws = workspaces.value.find(w => w.id === id)
    if (ws) ws.name = name
  }

  /** 刪除工作區（不能刪除最後一個） */
  async function deleteWorkspace(id: string) {
    if (workspaces.value.length <= 1) return false
    if (isTauri) {
      const db = await getDb()
      await db.execute('DELETE FROM workspaces WHERE id = ?', [id])
    }
    const idx = workspaces.value.findIndex(w => w.id === id)
    const wasActive = workspaces.value[idx]?.isActive
    workspaces.value.splice(idx, 1)

    // 如果刪除的是啟用中的，自動啟用第一個
    if (wasActive && workspaces.value.length > 0) {
      await setActive(workspaces.value[0].id)
    }
    return true
  }

  /** 設定當前 workspace 的啟用環境 */
  async function setActiveEnvironment(envId: string | null) {
    const ws = activeWorkspace.value
    if (!ws) return
    if (isTauri && !ws.teamId) {
      // 只更新本地 workspace 的 SQLite
      const db = await getDb()
      await db.execute(
        'UPDATE workspaces SET active_environment_id = ?, updated_at = datetime("now") WHERE id = ?',
        [envId, ws.id],
      )
    }
    ws.activeEnvironmentId = envId
  }

  /** 關聯 workspace 到 team（本地→雲端，從 SQLite 移除） */
  async function linkTeam(workspaceId: string, teamId: string) {
    if (isTauri) {
      const db = await getDb()
      // 從 SQLite 移除（雲端 workspace 不需要本地 row）
      await db.execute('DELETE FROM workspaces WHERE id = ?', [workspaceId])
    }
    const ws = workspaces.value.find(w => w.id === workspaceId)
    if (ws) {
      ws.teamId = teamId
    }
  }

  /**
   * 確保團隊成員有對應的 workspace（純記憶體，不寫 SQLite）
   * 回傳 { teamId → workspaceId } mapping
   */
  async function ensureTeamWorkspaces(
    teams: Array<{ id: string; name: string }>,
  ): Promise<Map<string, string>> {
    const mapping = new Map<string, string>()
    const currentTeamIds = new Set(teams.map(t => t.id))

    // 清理已不存在的 team workspace（被踢出團隊等情況）
    workspaces.value = workspaces.value.filter(w => !w.teamId || currentTeamIds.has(w.teamId))

    for (const team of teams) {
      const existing = workspaces.value.find(w => w.teamId === team.id)

      if (existing) {
        // 更新名稱（團隊名可能改了）
        if (existing.name !== team.name) {
          existing.name = team.name
        }
        mapping.set(team.id, existing.id)
      } else {
        // 新建 workspace（純記憶體）
        const id = crypto.randomUUID()
        workspaces.value.push({
          id,
          name: team.name,
          isActive: false,
          teamId: team.id,
          activeEnvironmentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        mapping.set(team.id, id)
      }
    }

    return mapping
  }

  return {
    workspaces,
    activeWorkspace,
    loadAll,
    setActive,
    addWorkspace,
    renameWorkspace,
    deleteWorkspace,
    setActiveEnvironment,
    linkTeam,
    ensureTeamWorkspaces,
  }
})
