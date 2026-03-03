import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useAuthStore } from './authStore'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

interface TeamMember {
  user_id: string
  email: string
  name: string
  role: string
}

interface Team {
  id: string
  name: string
  owner_id: string
  role: string
  members: TeamMember[]
}

interface ApiResponse {
  status: number
  body: string
}

/** Helper: call backend API through Rust proxy to avoid Tauri webview fetch restrictions */
async function apiCall(method: string, path: string, body?: unknown): Promise<ApiResponse> {
  const auth = useAuthStore()
  const hdrs: Record<string, string> = {
    'Content-Type': 'application/json',
    ...auth.authHeaders(),
  }
  return invoke<ApiResponse>('api_request', {
    request: {
      method,
      url: `${API_BASE}${path}`,
      headers: hdrs,
      body: body ? JSON.stringify(body) : null,
    },
  })
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
      const resp = await apiCall('POST', `/teams/${teamId}/invite`, { email, role })
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

  return { teams, isLoading, error, loadTeams, loadMembers, createTeam, inviteMember, removeMember }
})
