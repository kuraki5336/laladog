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

  /** 載入所有工作區 */
  async function loadAll() {
    if (!isTauri) return
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM workspaces ORDER BY created_at')
    workspaces.value = rows.map(r => ({
      id: r.id,
      name: r.name,
      isActive: !!r.is_active,
      teamId: r.team_id || null,
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

  /** 關聯 workspace 到 team */
  async function linkTeam(workspaceId: string, teamId: string) {
    if (isTauri) {
      const db = await getDb()
      await db.execute(
        'UPDATE workspaces SET team_id = ?, updated_at = datetime("now") WHERE id = ?',
        [teamId, workspaceId],
      )
    }
    const ws = workspaces.value.find(w => w.id === workspaceId)
    if (ws) ws.teamId = teamId
  }

  return {
    workspaces,
    activeWorkspace,
    loadAll,
    setActive,
    addWorkspace,
    renameWorkspace,
    deleteWorkspace,
    linkTeam,
  }
})
