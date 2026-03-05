export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: 'v0.3.2',
    date: '2026-03-05',
    changes: [
      '環境變數隨 Workspace 切換',
      'Collection 匯出（Postman / LalaDog 格式）',
      'Bearer Token / Body 預設 JSON / 變數語法高亮修正',
      'HTTP Response 計時與大小計算修正（與 Postman 一致）',
    ],
  },
  {
    version: 'v0.3.0',
    date: '2026-03-05',
    changes: [
      '多分頁系統 (Tab) — 支援拖曳排序、重新命名、鍵盤快捷鍵',
      '側邊欄 Collection 樹狀拖曳排序',
      '側邊欄搜尋過濾 API',
      'Response 另存新檔 (Save to File)',
      'cURL 複製移至次要選單',
      '漢堡選單 + 關於我們 + 贊助作者',
      '應用程式自動更新功能',
    ],
  },
  {
    version: 'v0.2.0',
    date: '2026-02-20',
    changes: [
      'WebSocket 即時同步團隊協作',
      'Collection 雲端同步',
      '角色權限控制 (admin/editor/viewer)',
      '團隊邀請功能',
    ],
  },
  {
    version: 'v0.1.0',
    date: '2026-02-01',
    changes: [
      '基礎 API 測試功能 (GET/POST/PUT/PATCH/DELETE)',
      'Collection 管理 + Postman 匯入',
      '環境變數系統',
      'Google OAuth 登入',
      'Pre-request / Tests 腳本',
    ],
  },
]
