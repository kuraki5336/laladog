/** 環境變數 */
export interface Environment {
  id: string
  name: string
  variables: EnvVariable[]
  isActive: boolean
}

/** 單一環境變數 */
export interface EnvVariable {
  id: string
  key: string
  value: string
  enabled: boolean
}

/** 全域變數 */
export interface GlobalVariables {
  variables: EnvVariable[]
}
