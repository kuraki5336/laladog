/**
 * cURL 指令產生器
 * 將 HTTP 請求轉換為可在終端機執行的 cURL 指令
 */

interface CurlOptions {
  method: string
  url: string
  headers: Record<string, string>
  body: string | null
}

/** 轉義 shell 單引號 */
function escapeShell(str: string): string {
  return str.replace(/'/g, "'\\''")
}

/** 產生 cURL 指令字串 */
export function generateCurl({ method, url, headers, body }: CurlOptions): string {
  const parts: string[] = ['curl']

  // Method（GET 不需要 -X）
  if (method !== 'GET') {
    parts.push(`-X ${method}`)
  }

  // URL
  parts.push(`'${escapeShell(url)}'`)

  // Headers
  for (const [key, value] of Object.entries(headers)) {
    parts.push(`-H '${escapeShell(key)}: ${escapeShell(value)}'`)
  }

  // Body
  if (body && !['GET', 'HEAD'].includes(method)) {
    parts.push(`-d '${escapeShell(body)}'`)
  }

  // 如果只有 2-3 段就單行，否則換行排列
  if (parts.length <= 3) {
    return parts.join(' ')
  }

  return parts.join(' \\\n  ')
}
