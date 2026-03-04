import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CollectionNode, CollectionNodeType, SavedRequest } from '@/types'
import { useWorkspaceStore } from './workspaceStore'
import { useAuthStore } from './authStore'
import { apiCall } from '@/utils/api'

const isTauri = !!(window as any).__TAURI_INTERNALS__

/** 雲端 SharedCollection 回傳格式 */
interface SharedCollectionResp {
  id: string
  team_id: string
  name: string
  data: string
  updated_by: string
  updated_at: string
}

export const useCollectionStore = defineStore('collection', () => {
  const nodes = ref<CollectionNode[]>([])
  const selectedNodeId = ref<string | null>(null)
  const isSyncing = ref(false)

  /** 取得樹狀結構（依 activeWorkspace 篩選頂層 collection） */
  const tree = computed(() => {
    const wsStore = useWorkspaceStore()
    const activeWsId = wsStore.activeWorkspace?.id || null
    return buildTree(nodes.value, null, activeWsId)
  })

  function buildTree(allNodes: CollectionNode[], parentId: string | null, workspaceId: string | null): CollectionNode[] {
    return allNodes
      .filter((n) => {
        if (n.parentId !== parentId) return false
        // 頂層節點（parentId === null）依 workspaceId 篩選
        if (parentId === null && workspaceId) {
          return n.workspaceId === workspaceId
        }
        return true
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((n) => ({
        ...n,
        children: buildTree(allNodes, n.id, workspaceId),
      }))
  }

  async function getDb() {
    const Database = (await import('@tauri-apps/plugin-sql')).default
    return await Database.load('sqlite:laladog.db')
  }

  /** 載入所有節點 */
  async function loadAll() {
    if (!isTauri) return
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM collection_nodes ORDER BY sort_order')
    nodes.value = rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.node_type as CollectionNodeType,
      parentId: r.parent_id,
      sortOrder: r.sort_order,
      workspaceId: r.workspace_id || null,
      request: r.request_data ? JSON.parse(r.request_data) : undefined,
      isExpanded: false,
    }))
  }

  /** 新增節點 */
  async function addNode(
    name: string,
    type: CollectionNodeType,
    parentId: string | null,
    request?: SavedRequest,
  ) {
    const id = crypto.randomUUID()
    const siblings = nodes.value.filter((n) => n.parentId === parentId)
    const sortOrder = siblings.length

    // 頂層 collection 節點自動帶入當前 workspace
    const wsStore = useWorkspaceStore()
    const workspaceId = type === 'collection' ? (wsStore.activeWorkspace?.id || null) : null

    if (isTauri) {
      const db = await getDb()
      await db.execute(
        'INSERT INTO collection_nodes (id, name, node_type, parent_id, sort_order, request_data, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, type, parentId, sortOrder, request ? JSON.stringify(request) : null, workspaceId],
      )
    }

    nodes.value.push({
      id,
      name,
      type,
      parentId,
      sortOrder,
      workspaceId,
      request,
      isExpanded: false,
    })

    // 自動同步到雲端
    scheduleSyncToCloud()

    return id
  }

  /** 重命名節點 */
  async function renameNode(id: string, name: string) {
    if (isTauri) {
      const db = await getDb()
      await db.execute('UPDATE collection_nodes SET name = ?, updated_at = datetime("now") WHERE id = ?', [name, id])
    }
    const node = nodes.value.find((n) => n.id === id)
    if (node) node.name = name
    scheduleSyncToCloud()
  }

  /** 刪除節點（含子節點） */
  async function deleteNode(id: string) {
    if (isTauri) {
      const db = await getDb()
      // SQLite ON DELETE CASCADE 會處理子節點
      await db.execute('DELETE FROM collection_nodes WHERE id = ?', [id])
    }
    // 前端移除本身及所有子孫
    const toRemove = new Set<string>()
    function collectIds(nodeId: string) {
      toRemove.add(nodeId)
      nodes.value.filter((n) => n.parentId === nodeId).forEach((n) => collectIds(n.id))
    }
    collectIds(id)
    nodes.value = nodes.value.filter((n) => !toRemove.has(n.id))
    scheduleSyncToCloud()
  }

  /** 更新請求資料 */
  async function updateRequest(id: string, request: SavedRequest) {
    if (isTauri) {
      const db = await getDb()
      await db.execute(
        'UPDATE collection_nodes SET request_data = ?, updated_at = datetime("now") WHERE id = ?',
        [JSON.stringify(request), id],
      )
    }
    const node = nodes.value.find((n) => n.id === id)
    if (node) node.request = request
    scheduleSyncToCloud()
  }

  /** 切換展開/收合 */
  function toggleExpand(id: string) {
    const node = nodes.value.find((n) => n.id === id)
    if (node) node.isExpanded = !node.isExpanded
  }

  /** 批次匯入節點（Postman Import 用） */
  async function importNodes(newNodes: CollectionNode[]) {
    // 匯入的頂層 collection 節點帶入當前 workspace
    const wsStore = useWorkspaceStore()
    const activeWsId = wsStore.activeWorkspace?.id || null

    if (isTauri) {
      const db = await getDb()
      for (const n of newNodes) {
        const wsId = n.type === 'collection' ? activeWsId : null
        await db.execute(
          'INSERT INTO collection_nodes (id, name, node_type, parent_id, sort_order, request_data, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [n.id, n.name, n.type, n.parentId, n.sortOrder, n.request ? JSON.stringify(n.request) : null, wsId],
        )
      }
    }
    for (const n of newNodes) {
      const wsId = n.type === 'collection' ? activeWsId : null
      nodes.value.push({ ...n, workspaceId: wsId, isExpanded: false })
    }
    scheduleSyncToCloud()
  }

  // ─── 雲端同步 ─────────────────────────────────────────

  /** debounce timer，避免頻繁同步 */
  let syncTimer: ReturnType<typeof setTimeout> | null = null

  /** 排程同步到雲端（debounce 1.5 秒） */
  function scheduleSyncToCloud() {
    const wsStore = useWorkspaceStore()
    const authStore = useAuthStore()
    if (!wsStore.activeWorkspace?.teamId || !authStore.isLoggedIn) return

    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      pushToCloud()
    }, 1500)
  }

  /** 收集指定 workspace 的所有 collection nodes，序列化為 JSON */
  function serializeWorkspaceCollections(workspaceId: string): string {
    // 找出屬於此 workspace 的所有頂層 collection
    const topCollections = nodes.value.filter(
      (n) => n.parentId === null && n.workspaceId === workspaceId,
    )
    // 遞迴收集所有子孫節點
    function collectSubtree(nodeId: string): CollectionNode[] {
      const children = nodes.value.filter((n) => n.parentId === nodeId)
      const result: CollectionNode[] = []
      for (const child of children) {
        result.push(child)
        result.push(...collectSubtree(child.id))
      }
      return result
    }
    const allNodes: CollectionNode[] = []
    for (const top of topCollections) {
      allNodes.push(top)
      allNodes.push(...collectSubtree(top.id))
    }
    // 序列化（移除 isExpanded / children 等前端狀態）
    return JSON.stringify(
      allNodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        parentId: n.parentId,
        sortOrder: n.sortOrder,
        workspaceId: n.workspaceId,
        request: n.request,
      })),
    )
  }

  /** 推送當前 workspace 的 collections 到雲端 */
  async function pushToCloud() {
    const wsStore = useWorkspaceStore()
    const authStore = useAuthStore()
    const ws = wsStore.activeWorkspace
    if (!ws?.teamId || !authStore.isLoggedIn) return

    isSyncing.value = true
    try {
      const data = serializeWorkspaceCollections(ws.id)

      // 先查雲端是否已有此 team 的 shared collections
      const listResp = await apiCall('GET', `/sync/${ws.teamId}/collections`)
      if (listResp.status >= 400) {
        console.error('[Sync] Failed to list shared collections:', listResp.body)
        return
      }

      const existing: SharedCollectionResp[] = JSON.parse(listResp.body)

      if (existing.length > 0) {
        // 已有 → 更新第一筆（一個 workspace 對應一筆 SharedCollection）
        await apiCall('PUT', `/sync/collections/${existing[0].id}`, {
          team_id: ws.teamId,
          name: ws.name,
          data,
        })
        console.log('[Sync] Updated shared collection to cloud')
      } else {
        // 沒有 → 新建
        await apiCall('POST', '/sync/collections', {
          team_id: ws.teamId,
          name: ws.name,
          data,
        })
        console.log('[Sync] Created shared collection on cloud')
      }
    } catch (e) {
      console.error('[Sync] Push to cloud failed:', e)
    } finally {
      isSyncing.value = false
    }
  }

  /** 從雲端拉取 shared collections 並匯入本地（覆蓋） */
  async function pullFromCloud(teamId: string, workspaceId: string) {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return

    isSyncing.value = true
    try {
      const resp = await apiCall('GET', `/sync/${teamId}/collections`)
      if (resp.status >= 400) {
        console.error('[Sync] Failed to pull from cloud:', resp.body)
        return
      }

      const collections: SharedCollectionResp[] = JSON.parse(resp.body)
      if (collections.length === 0) {
        console.log('[Sync] No shared collections on cloud')
        return
      }

      // 解析雲端節點
      const cloudNodes: CollectionNode[] = JSON.parse(collections[0].data)
      if (!Array.isArray(cloudNodes) || cloudNodes.length === 0) return

      // 清除本地此 workspace 的所有 collection nodes
      if (isTauri) {
        const db = await getDb()
        // 先找出此 workspace 下的所有頂層 collection ids
        const topRows = await db.select<any[]>(
          'SELECT id FROM collection_nodes WHERE workspace_id = ? AND parent_id IS NULL',
          [workspaceId],
        )
        for (const row of topRows) {
          // CASCADE 會刪除子節點
          await db.execute('DELETE FROM collection_nodes WHERE id = ?', [row.id])
        }

        // 匯入雲端節點
        for (const n of cloudNodes) {
          await db.execute(
            'INSERT INTO collection_nodes (id, name, node_type, parent_id, sort_order, request_data, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              n.id,
              n.name,
              n.type,
              n.parentId,
              n.sortOrder,
              n.request ? JSON.stringify(n.request) : null,
              n.type === 'collection' ? workspaceId : (n.workspaceId || null),
            ],
          )
        }
      }

      // 更新前端 nodes：移除本 workspace 的舊節點，加入雲端節點
      const wsTopIds = new Set(
        nodes.value
          .filter((n) => n.workspaceId === workspaceId && n.parentId === null)
          .map((n) => n.id),
      )
      // 收集此 workspace 下所有 node ids（含子孫）
      const toRemove = new Set<string>()
      function collectIds(nodeId: string) {
        toRemove.add(nodeId)
        nodes.value.filter((n) => n.parentId === nodeId).forEach((n) => collectIds(n.id))
      }
      wsTopIds.forEach((id) => collectIds(id))
      nodes.value = nodes.value.filter((n) => !toRemove.has(n.id))

      // 加入雲端節點
      for (const n of cloudNodes) {
        nodes.value.push({
          ...n,
          workspaceId: n.type === 'collection' ? workspaceId : (n.workspaceId || null),
          isExpanded: false,
        })
      }

      console.log(`[Sync] Pulled ${cloudNodes.length} nodes from cloud`)
    } catch (e) {
      console.error('[Sync] Pull from cloud failed:', e)
    } finally {
      isSyncing.value = false
    }
  }

  return {
    nodes,
    selectedNodeId,
    tree,
    isSyncing,
    loadAll,
    addNode,
    renameNode,
    deleteNode,
    updateRequest,
    toggleExpand,
    importNodes,
    pushToCloud,
    pullFromCloud,
  }
})
