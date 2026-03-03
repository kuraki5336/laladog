/** 工作區 */
export interface Workspace {
  id: string
  name: string
  isActive: boolean
  teamId: string | null
  createdAt: string
  updatedAt: string
}
