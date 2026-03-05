/** 工作區 */
export interface Workspace {
  id: string
  name: string
  isActive: boolean
  teamId: string | null
  /** 此 workspace 啟用的環境 ID（切換 workspace 時環境跟著切換） */
  activeEnvironmentId: string | null
  createdAt: string
  updatedAt: string
}
