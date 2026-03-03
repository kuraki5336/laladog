import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface User {
  id: string
  email: string
  name: string
  picture?: string
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  /** 初始化：從 localStorage 恢復 session */
  function init() {
    const savedToken = localStorage.getItem('laladog_token')
    const savedUser = localStorage.getItem('laladog_user')
    if (savedToken && savedUser) {
      token.value = savedToken
      user.value = JSON.parse(savedUser)
    }
  }

  const loginError = ref<string | null>(null)

  /** Google OAuth 登入 — 透過 Tauri 開啟 OAuth 視窗取得 id_token */
  async function loginWithGoogle() {
    isLoading.value = true
    loginError.value = null
    try {
      // Tauri command: 完成整個 OAuth 流程（含呼叫後端），直接回傳 JWT + user
      const data = await invoke<{ access_token: string; user: User }>('google_oauth_login', {
        apiBase: API_BASE,
      })

      token.value = data.access_token
      user.value = data.user

      // 持久化
      localStorage.setItem('laladog_token', data.access_token)
      localStorage.setItem('laladog_user', JSON.stringify(data.user))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[Auth] Login failed:', message)
      loginError.value = message
    } finally {
      isLoading.value = false
    }
  }

  /** 登出 */
  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('laladog_token')
    localStorage.removeItem('laladog_user')
  }

  /** 取得帶 Auth header 的 fetch 選項 */
  function authHeaders(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  return { user, token, isLoggedIn, isLoading, loginError, init, loginWithGoogle, logout, authHeaders }
})
