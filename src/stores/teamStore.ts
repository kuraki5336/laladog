import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiCall } from '@/utils/api'

interface TeamMember {
  user_id: string
  email: string
  name: string
  role: string
  status?: string
}

interface Team {
  id: string
  name: string
  owner_id: string
  role: string
  members: TeamMember[]
}

export const useTeamStore = defineStore('team', () => {
  const teams = ref<Team[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** 列出使用者所屬的所有團隊 */
  async function loadTeams() {
    isLoading.value = true
    error.value = null
    try {
      const resp = await apiCall('GET', '/teams/')
      if (resp.status >= 400) throw new Error(`Failed to load teams: ${resp.status}`)
      teams.value = JSON.parse(resp.body)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      isLoading.value = false
    }
  }

  /** 載入團隊成員 */
  async function loadMembers(teamId: string): Promise<TeamMember[]> {
    error.value = null
    try {
      const resp = await apiCall('GET', `/teams/${teamId}/members`)
      if (resp.status >= 400) throw new Error(`Failed to load members: ${resp.status}`)
      return JSON.parse(resp.body)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
      return []
    }
  }

  /** 建立團隊 */
  async function createTeam(name: string): Promise<Team | null> {
    error.value = null
    try {
      const resp = await apiCall('POST', '/teams/', { name })
      if (resp.status >= 400) throw new Error(`Failed to create team: ${resp.status}`)
      const team = JSON.parse(resp.body)
      teams.value.push(team)
      return team
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    }
  }

  /** 邀請成員 */
  async function inviteMember(teamId: string, email: string, role: string = 'editor'): Promise<boolean> {
    error.value = null
    try {
      const resp = await apiCall('POST', `/teams/${teamId}/invite`, { email: email.toLowerCase(), role })
      if (resp.status >= 400) {
        const data = JSON.parse(resp.body)
        throw new Error(data.detail || `Invite failed: ${resp.status}`)
      }
      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    }
  }

  /** 移除成員 */
  async function removeMember(teamId: string, memberUserId: string): Promise<boolean> {
    error.value = null
    try {
      const resp = await apiCall('DELETE', `/teams/${teamId}/members/${memberUserId}`)
      if (resp.status >= 400) throw new Error(`Failed to remove member: ${resp.status}`)
      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    }
  }

  /** 離開團隊（自我移除） */
  async function leaveTeam(teamId: string, userId: string): Promise<boolean> {
    error.value = null
    try {
      const resp = await apiCall('DELETE', `/teams/${teamId}/members/${userId}`)
      if (resp.status >= 400) {
        const data = JSON.parse(resp.body)
        throw new Error(data.detail || `Failed to leave: ${resp.status}`)
      }
      // 從本地移除該 team
      teams.value = teams.value.filter(t => t.id !== teamId)
      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    }
  }

  /** 刪除整個團隊（僅 admin） */
  async function deleteTeam(teamId: string): Promise<boolean> {
    error.value = null
    try {
      const resp = await apiCall('DELETE', `/teams/${teamId}`)
      if (resp.status >= 400) {
        const data = JSON.parse(resp.body)
        throw new Error(data.detail || `Failed to delete team: ${resp.status}`)
      }
      // 從本地移除該 team
      teams.value = teams.value.filter(t => t.id !== teamId)
      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    }
  }

  return { teams, isLoading, error, loadTeams, loadMembers, createTeam, inviteMember, removeMember, leaveTeam, deleteTeam }
})
