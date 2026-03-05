<p align="center">
  <img src="src/assets/logo/favicon-192.png" alt="LalaDog" width="96" />
</p>

<h1 align="center">LalaDog</h1>

<p align="center">
  免費、開源的桌面 API 測試工具 — 支援團隊即時協作
</p>

<p align="center">
  <a href="https://github.com/kuraki5336/laladog/releases/latest">
    <img src="https://img.shields.io/github/v/release/kuraki5336/laladog?style=flat-square" alt="Latest Release" />
  </a>
  <a href="https://github.com/kuraki5336/laladog/releases/latest">
    <img src="https://img.shields.io/github/downloads/kuraki5336/laladog/total?style=flat-square" alt="Downloads" />
  </a>
  <a href="https://github.com/kuraki5336/laladog/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/kuraki5336/laladog?style=flat-square" alt="License" />
  </a>
</p>

---

## 功能亮點

**HTTP 測試**
- 支援 GET / POST / PUT / PATCH / DELETE / HEAD / OPTIONS
- Query Params、Headers、Body（JSON / Form-data / x-www-form-urlencoded / Binary）
- 認證：Bearer Token、Basic Auth、API Key
- Pre-request Script / Tests 腳本執行
- 回應搜尋（Ctrl+F 高亮 + 上下跳轉）、JSON 樹狀收合/展開檢視
- cURL 指令複製

**WebSocket**
- WebSocket 即時連線測試、傳送/接收訊息

**Collection 管理**
- 樹狀結構組織（Collection > Folder > Request）
- 拖曳排序、搜尋過濾
- 匯入 Postman Collection / OpenAPI 3.x / Swagger 2.0（JSON + YAML）
- 匯出 Postman Collection v2.1

**團隊協作**
- Google OAuth 登入
- 建立團隊、邀請成員（支援 Pending Invitation）
- 角色權限：Owner / Editor / Viewer
- WebSocket 即時同步共享 Collection

**多分頁系統**
- 多 Tab 同時開啟、拖曳排序、重新命名
- 右鍵選單：關閉其他 / 關閉右側 / 複製分頁

**其他**
- 多 Workspace 管理
- 環境變數系統（`{{variable}}` 語法）
- 請求歷史紀錄
- 深色 / 淺色主題切換
- 應用程式自動更新

---

## 安裝

從 [GitHub Releases](https://github.com/kuraki5336/laladog/releases/latest) 下載：

| 平台 | 安裝檔 |
|------|--------|
| **Windows** | `.exe` (NSIS) 或 `.msi` |
| **macOS** | `.dmg` (Intel / Apple Silicon) |
| **Linux** | `.AppImage` 或 `.deb` |

---

## 截圖

> 截圖待補充

---

## 技術架構

```
┌─────────────────────────────────────────┐
│           Desktop App (Tauri v2)         │
│  ┌─────────┐  ┌──────────┐  ┌────────┐ │
│  │ Vue 3   │  │ Pinia    │  │ SQLite │ │
│  │ + Vite  │  │ Store    │  │ (本機) │ │
│  └────┬────┘  └────┬─────┘  └────────┘ │
│       │            │                     │
│  ┌────┴────────────┴─────┐              │
│  │   Rust (Tauri Core)   │              │
│  │  HTTP Proxy / OAuth   │              │
│  └───────────┬───────────┘              │
└──────────────┼──────────────────────────┘
               │ HTTPS
┌──────────────┴──────────────────────────┐
│         Backend API (FastAPI)            │
│  Google OAuth / Team CRUD / Collection   │
│  Sync / WebSocket                        │
│              │                           │
│        ┌─────┴─────┐                    │
│        │ PostgreSQL │                    │
│        └───────────┘                    │
└─────────────────────────────────────────┘
```

| 層級 | 技術 |
|------|------|
| 前端 UI | Vue 3 + TypeScript + Tailwind CSS v4 |
| 狀態管理 | Pinia |
| 桌面框架 | Tauri v2 (Rust) |
| 本機資料庫 | SQLite |
| 後端 API | FastAPI (Python) + PostgreSQL |
| 認證 | Google OAuth 2.0 + JWT |
| CI/CD | GitHub Actions（跨平台自動建置 + 簽名） |

---

## 開發

### 環境需求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) >= 1.70
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

### 啟動

```bash
git clone https://github.com/kuraki5336/laladog.git
cd laladog
npm install
npm run tauri dev
```

### 編譯

```bash
npm run tauri build
```

---

## License

MIT
