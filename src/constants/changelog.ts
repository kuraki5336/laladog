export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: 'v0.3.7',
    date: '2026-03-06',
    changes: [
      '側邊欄清單項目間距微調（增加上下 2px）',
      '面板分隔線改為膠囊把手樣式（更易辨識與拖動）',
    ],
  },
  {
    version: 'v0.3.6',
    date: '2026-03-06',
    changes: [
      'Request / Response 區域可拖曳調整高度（雙擊重置）',
      '側邊欄寬度可拖曳調整（左右拉動分隔線）',
      '對齊側邊欄與主面板標籤列高度',
    ],
  },
  {
    version: 'v0.3.5',
    date: '2026-03-05',
    changes: [
      'Request 分頁右鍵選單（關閉其他 / 關閉右側 / 複製分頁 / 重新命名）',
      'Collection 匯入 OpenAPI 3.x / Swagger 2.0（支援 JSON + YAML）',
      'Response Body 搜尋功能（Ctrl+F 高亮 + 上下跳轉）',
      'JSON Response 樹狀收合/展開檢視',
      '深色模式色彩對比修正（Primary/Secondary 色系全面調整）',
      '修正 Collection 右鍵選單推擠側邊欄問題（改為浮動式選單）',
      '修正 URL 輸入框變數高亮層級導致文字不可見問題',
      '更新應用程式圖示（新版 Logo）',
      '側邊欄 Collection / Folder 圖示改為 SVG（統一 Heroicons 風格）',
    ],
  },
  {
    version: 'v0.3.4',
    date: '2026-03-05',
    changes: [
      '修正自動更新下載失敗問題（Vue Proxy 與 ES6 private fields 衝突）',
    ],
  },
  {
    version: 'v0.3.3',
    date: '2026-03-05',
    changes: [
      '自動更新修正：repo 改為 Public 以支援 release 下載',
      '更新檢查失敗時顯示錯誤訊息（不再誤顯示「已是最新版本」）',
    ],
  },
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
