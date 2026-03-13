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

  /** 載入所有工作區（含雲端 workspace，供環境變數 FK 使用） */
  async function loadAll() {
    if (!isTauri) return
    const db = await getDb()

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
    if (isTauri) {
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
    if (isTauri) {
      const db = await getDb()
      await db.execute(
        'UPDATE workspaces SET active_environment_id = ?, updated_at = datetime("now") WHERE id = ?',
        [envId, ws.id],
      )
    }
    ws.activeEnvironmentId = envId
  }

  /** 關聯 workspace 到 team（本地→雲端） */
  async function linkTeam(workspaceId: string, teamId: string) {
    const newId = `team-${teamId}`
    if (isTauri) {
      const db = await getDb()
      // 更新 workspace 的 ID 和 team_id
      await db.execute('UPDATE workspaces SET id = ?, team_id = ? WHERE id = ?', [newId, teamId, workspaceId])
      // 同步更新 environments 的 workspace_id
      await db.execute('UPDATE environments SET workspace_id = ? WHERE workspace_id = ?', [newId, workspaceId])
      // 同步更新 collection_nodes 的 workspace_id
      await db.execute('UPDATE collection_nodes SET workspace_id = ? WHERE workspace_id = ?', [newId, workspaceId])
    }
    const ws = workspaces.value.find(w => w.id === workspaceId)
    if (ws) {
      ws.id = newId
      ws.teamId = teamId
    }
  }

  /**
   * 確保團隊成員有對應的 workspace（穩定 ID：team-{teamId}）
   * 寫入 SQLite 以支援環境變數 FK；Collections 仍走雲端同步不寫 SQLite
   * 回傳 { teamId → workspaceId } mapping
   */
  async function ensureTeamWorkspaces(
    teams: Array<{ id: string; name: string }>,
  ): Promise<Map<string, string>> {
    const mapping = new Map<string, string>()
    const currentTeamIds = new Set(teams.map(t => t.id))

    // 移除已不存在的 team workspace（被踢出團隊等情況）
    workspaces.value = workspaces.value.filter(w => !w.teamId || currentTeamIds.has(w.teamId))

    for (const team of teams) {
      const id = `team-${team.id}`
      const existing = workspaces.value.find(w => w.id === id)

      if (existing) {
        // 更新名稱（團隊名可能改了）
        existing.teamId = team.id
        if (existing.name !== team.name) {
          existing.name = team.name
          if (isTauri) {
            const db = await getDb()
            await db.execute('UPDATE workspaces SET name = ?, team_id = ? WHERE id = ?', [team.name, team.id, id])
          }
        }
      } else {
        // 新建 workspace
        if (isTauri) {
          const db = await getDb()
          await db.execute(
            'INSERT OR IGNORE INTO workspaces (id, name, is_active, team_id) VALUES (?, ?, 0, ?)',
            [id, team.name, team.id],
          )
        }
        workspaces.value.push({
          id,
          name: team.name,
          isActive: false,
          teamId: team.id,
          activeEnvironmentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }

      mapping.set(team.id, id)
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
