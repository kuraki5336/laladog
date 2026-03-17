export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: 'v0.5.4',
    date: '2026-03-17',
    changes: [
      '側邊欄右鍵選單新增 Duplicate 功能（支援 Request / Folder / Collection 深層複製）',
    ],
  },
  {
    version: 'v0.5.3',
    date: '2026-03-16',
    changes: [
      'Payload / Tests / Pre-request Script 編輯器支援 Ctrl+/ 快速切換註解',
    ],
  },
  {
    version: 'v0.5.2',
    date: '2026-03-14',
    changes: [
      '雲端環境變數同步 — 新增/修改/刪除環境變數即時同步到雲端（WebSocket + HTTP）',
      '修復啟動時雲端 workspace 消失的問題（loadTeams 失敗自動重試）',
      '修復切換 workspace 時環境變數未跟隨切換的問題',
      '修復環境變數編輯器各環境輸入框互相連動的 bug',
    ],
  },
  {
    version: 'v0.5.1',
    date: '2026-03-13',
    changes: [
      '雲端 workspace 環境變數持久化 — 重啟 app 不再遺失',
      '雲端 workspace 使用穩定 ID（team-{teamId}），確保環境變數跨 session 保留',
    ],
  },
  {
    version: 'v0.5.0',
    date: '2026-03-13',
    changes: [
      '修復 Admin 無法取消邀請或移除成員的問題',
      '移除/取消操作新增反饋訊息提示',
      'Admin 可移除任何非自己的成員（含 pending 邀請與其他 admin）',
    ],
  },
  {
    version: 'v0.4.9',
    date: '2026-03-13',
    changes: [
      '支援 Postman Export from API 格式的環境變數匯入（外層有 environment 包裝）',
      '修復雲端 workspace 環境變數匯入失敗的問題（外鍵約束衝突）',
    ],
  },
  {
    version: 'v0.4.7',
    date: '2026-03-12',
    changes: [
      '支援批次匯入多個 Collection 檔案 — 可一次選取多個 JSON/YAML 檔案匯入',
    ],
  },
  {
    version: 'v0.4.6',
    date: '2026-03-12',
    changes: [
      '修正雲端 workspace 匯入 Postman Collection 失敗的問題 — 雲端 workspace 的 collection 操作不再寫入本地 SQLite',
      '修正後端邀請成員 Email 大小寫敏感問題 — SQL 查詢改用 func.lower() 比對',
    ],
  },
  {
    version: 'v0.4.5',
    date: '2026-03-12',
    changes: [
      '修正 Workspace 下拉選單顯示重複雲端項目的問題',
      '雲端 team workspace 改為純記憶體管理 — 不再寫入本地 SQLite',
      '登入後從 API 建立雲端 workspace，登出即消失',
      '啟動時自動清理殘留在 DB 中的雲端 workspace 資料',
    ],
  },
  {
    version: 'v0.4.4',
    date: '2026-03-12',
    changes: [
      '支援 Postman Export from API 格式匯入（外層多包 collection wrapper 的 JSON）',
    ],
  },
  {
    version: 'v0.4.3',
    date: '2026-03-12',
    changes: [
      '修正邀請成員 Email 大小寫敏感問題 — 送出前統一轉為小寫',
      '修正成員列表中自身身份比對的大小寫問題',
    ],
  },
  {
    version: 'v0.4.2',
    date: '2026-03-12',
    changes: [
      '修正 HTTP Redirect 保留 Authorization header — 改為手動 follow redirect，完整保留所有 headers',
      '支援 .NET http→https 跨 port/scheme 重導向，與 Postman 行為完全一致',
      '遵循 HTTP 規範：301/302 POST→GET 自動轉換、303 強制 GET',
    ],
  },
  {
    version: 'v0.4.1',
    date: '2026-03-11',
    changes: [
      '修正 HTTP Redirect 時 Authorization header 被移除導致 401 的問題',
      'Redirect 行為與 Postman 一致 — http→https 跨 port 重導向保留完整 headers',
    ],
  },
  {
    version: 'v0.4.0',
    date: '2026-03-07',
    changes: [
      'pm.sendRequest() — Script 內發送額外 HTTP 請求（async/await + callback 雙模式）',
      'Chai 風格斷言鏈 — .to.equal/.eql/.have.property/.be.an/.not 等完整支援',
      '動態變數 — {{$guid}} / {{$timestamp}} / {{$randomInt}} 等 20+ 種',
      'pm.request.body 結構化 — .mode / .raw / .urlencoded / .formdata',
      'atob() / btoa() Base64 編解碼',
      'pm.response.code（status 別名）',
      'Lodash (_) 工具庫內建',
      'xml2Json() XML 轉 JSON',
      'Monaco Editor 取代 textarea — 語法高亮 + pm.* 自動補全',
      'Script API Reference 面板 — ? 按鈕展開語法大全，可點擊插入範例',
    ],
  },
  {
    version: 'v0.3.11',
    date: '2026-03-07',
    changes: [
      'Pre-request Script 新增 pm.request（body / url / method / headers）',
      'Pre-request Script 新增 pm.collectionVariables / pm.globals（get / set / unset）',
      'Pre-request Script 新增 CryptoJS 支援（HmacSHA256、Base64 等）',
    ],
  },
  {
    version: 'v0.3.10',
    date: '2026-03-06',
    changes: [
      '修正 WebSocket 多重連線競爭條件（Race Condition）',
      '非團隊成員（4003）自動停止 WS 重連，避免無限循環',
      '分享 Workspace 後自動清除本地 SQLite 副本（避免雲端/地端重複）',
      '啟動時自動清除孤兒 teamId（不存在的 team → 回歸純本地 Workspace）',
    ],
  },
  {
    version: 'v0.3.9',
    date: '2026-03-06',
    changes: [
      '修正自動更新無法覆蓋舊版問題（移除 MSI，統一使用 NSIS 安裝包）',
      '修正 WebSocket 連線驗證失敗回傳 HTTP 403 問題（改為正確的 WS close code）',
      'WebSocket Token 過期時自動停止重連（避免無限循環）',
      '同步與 WebSocket 連線新增除錯日誌',
    ],
  },
  {
    version: 'v0.3.8',
    date: '2026-03-06',
    changes: [
      '變數 Hover Popover — 滑過 {{variable}} 即時顯示值、可臨時修改或寫回環境',
      'Body 編輯器支援變數語法高亮與 Popover',
      'JSON Response 預設全層級展開、長文字自動換行',
      '未儲存分頁關閉前二次確認（Ctrl+W / 點擊關閉）',
      'Ctrl+S 快捷鍵儲存 Request',
      '自動偵測分頁變更狀態（dirty tracking）',
      '移除 Response Body 樹狀/文字切換按鈕',
    ],
  },
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
