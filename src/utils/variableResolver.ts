/**
 * 解析 {{variable}} 語法
 * 將字串中的 {{key}} 替換為對應的值
 * 支援 Postman 動態變數：{{$guid}}, {{$timestamp}}, {{$randomInt}} 等
 */
export function resolveVariables(input: string, variables: Record<string, string>): string {
  return input.replace(/\{\{([\w.$:-]+)\}\}/g, (match, key) => {
    // 動態變數（$ 前綴）
    if (key.startsWith('$')) {
      return resolveDynamic(key) ?? match
    }
    return key in variables ? variables[key] : match
  })
}

/** Postman 內建動態變數 */
function resolveDynamic(key: string): string | undefined {
  switch (key) {
    case '$guid':
    case '$randomUUID':
      return crypto.randomUUID()
    case '$timestamp':
      return Math.floor(Date.now() / 1000).toString()
    case '$isoTimestamp':
      return new Date().toISOString()
    case '$randomInt':
      return Math.floor(Math.random() * 1000).toString()
    case '$randomBoolean':
      return String(Math.random() >= 0.5)
    case '$randomColor':
      return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')
    case '$randomAlphaNumeric':
      return Math.random().toString(36).charAt(2) || 'a'
    case '$randomAbbreviation':
      return ['SQL', 'PCI', 'JSON', 'HTTP', 'TCP', 'XML', 'SMS', 'CSS', 'HTML', 'API'][Math.floor(Math.random() * 10)]
    case '$randomIP':
      return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.')
    case '$randomIPV6':
      return Array.from({ length: 8 }, () => Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0')).join(':')
    case '$randomUserAgent':
      return 'Mozilla/5.0 (compatible; Laladog/1.0)'
    case '$randomHexColor':
      return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')
    case '$randomPassword':
      return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    case '$randomEmail':
      return `user${Math.floor(Math.random() * 10000)}@example.com`
    case '$randomFirstName':
      return ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'][Math.floor(Math.random() * 8)]
    case '$randomLastName':
      return ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'][Math.floor(Math.random() * 8)]
    case '$randomFullName': {
      const first = resolveDynamic('$randomFirstName') || 'User'
      const last = resolveDynamic('$randomLastName') || 'Name'
      return `${first} ${last}`
    }
    default:
      return undefined
  }
}
