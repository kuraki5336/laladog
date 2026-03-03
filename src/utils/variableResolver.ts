/**
 * 解析 {{variable}} 語法
 * 將字串中的 {{key}} 替換為對應的值
 */
export function resolveVariables(input: string, variables: Record<string, string>): string {
  return input.replace(/\{\{([\w.:-]+)\}\}/g, (match, key) => {
    return key in variables ? variables[key] : match
  })
}
