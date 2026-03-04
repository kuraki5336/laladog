import { invoke } from '@tauri-apps/api/core'
import { useAuthStore } from '@/stores/authStore'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export interface ApiResponse {
  status: number
  body: string
}

/** 透過 Rust proxy 呼叫後端 API（避免 Tauri webview fetch 限制） */
export async function apiCall(method: string, path: string, body?: unknown): Promise<ApiResponse> {
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
