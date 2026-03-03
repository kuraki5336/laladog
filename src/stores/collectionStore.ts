import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CollectionNode, CollectionNodeType, SavedRequest } from '@/types'
import { useWorkspaceStore } from './workspaceStore'

const isTauri = !!(window as any).__TAURI_INTERNALS__

export const useCollectionStore = defineStore('collection', () => {
  const nodes = ref<CollectionNode[]>([])
  const selectedNodeId = ref<string | null>(null)

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
  }

  return {
    nodes,
    selectedNodeId,
    tree,
    loadAll,
    addNode,
    renameNode,
    deleteNode,
    updateRequest,
    toggleExpand,
    importNodes,
  }
})
