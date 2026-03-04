# LalaDog — 團隊協作 API Client 技術總結

## 專案定位

LalaDog 是一款桌面端 API 測試工具，類似 Postman，但具備團隊協作功能。使用者可在本機管理 API Collection，透過 Google 登入後與團隊成員即時同步共享。

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
│  ┌──────────┐ ┌────────┐ ┌───────────┐ │
│  │Google    │ │ Team   │ │Collection │ │
│  │OAuth     │ │ CRUD   │ │  Sync     │ │
│  └──────────┘ └────────┘ └───────────┘ │
│           │                              │
│     ┌─────┴─────┐                       │
│     │ PostgreSQL │                       │
│     └───────────┘                       │
└─────────────────────────────────────────┘
```

---

## 技術棧

| 層級 | 技術 | 用途 |
|------|------|------|
| **前端 UI** | Vue 3 + TypeScript + Tailwind CSS | SPA 介面，深色/淺色主題切換 |
| **狀態管理** | Pinia | Collections、環境變數、請求歷史、認證狀態 |
| **桌面框架** | Tauri v2 (Rust) | 打包為原生桌面應用，處理 HTTP Proxy 與 OAuth callback |
| **本機資料庫** | SQLite (tauri-plugin-sql) | 儲存本地 workspace、collection、歷史紀錄 |
| **後端 API** | FastAPI (Python) | 團隊管理、成員邀請、Collection 同步 |
| **後端資料庫** | PostgreSQL (async) | 使用者帳號、團隊、共享 Collection |
| **ORM** | SQLAlchemy 2.0 (async) | 全部使用 Mapped type + mapped_column 語法 |
| **認證** | Google OAuth 2.0 + JWT | 前端透過 Tauri Rust 層做 PKCE flow，後端驗證 id_token |

---

## CI/CD 雙軌部署

### 後端 API — Jenkins + Docker

- `Dockerfile`：Python 3.12-slim，安裝 FastAPI + uvicorn
- `Jenkinsfile`：build → deploy 兩階段，docker run 掛載 `/opt/envs/laladog/.env`
- 部署位置：`https://domain:4094`

### 桌面應用 — GitHub Actions + GitHub Releases

- 觸發方式：推送 `v*` tag
- 自動跨平台編譯：Windows (.msi / .exe)、macOS (.dmg)、Linux (.AppImage / .deb)
- 產出物自動上傳至 GitHub Releases，使用者直接下載安裝

```bash
# 發版流程
git tag v0.1.0
git push origin v0.1.0
# → GitHub Actions 自動編譯三平台 → Releases 頁面可下載
```

---

## 核心功能模組

### 1. HTTP / WebSocket 測試

- 支援 GET、POST、PUT、PATCH、DELETE、HEAD、OPTIONS
- Request：Params、Headers、Body（JSON/Form/Raw）、Auth（Bearer/Basic/OAuth）
- Response：Body（JSON 高亮）、Headers、狀態碼、耗時
- WebSocket 即時連線測試
- Pre-request / Tests 腳本

### 2. Collection 管理

- 樹狀結構組織 API 請求
- 支援 Postman Collection 匯入
- 本機 SQLite 儲存，可選擇同步至雲端

### 3. 環境變數系統

- 多環境切換（Dev / Staging / Production）
- 變數解析 `{{variable}}` 自動替換至 URL、Headers、Body

### 4. 團隊協作

- Google OAuth 登入
- 建立團隊、邀請成員（支援 Pending Invitation — 未註冊也可先邀請）
- 首次登入自動加入被邀請的團隊
- 角色權限：Owner / Editor / Viewer
- Collection 雲端同步共享（自動推送 / 自動拉取）

### 5. 其他

- 深色 / 淺色主題切換
- 請求歷史紀錄
- Console 面板（查看請求日誌）
- cURL 指令產生

---

## Pending Invitation 設計亮點

傳統做法要求被邀請者必須先註冊才能加入團隊。LalaDog 採用延遲綁定機制：

1. **邀請時**：若 email 尚未註冊 → 存入 `pending_invitations` 表（以 email 為鍵，不依賴 user_id FK）
2. **首次登入時**：Google OAuth 完成後，自動查詢 pending_invitations → 批次建立 TeamMember → 刪除 pending 紀錄
3. **成員列表**：同時回傳 active 成員與 pending 邀請，前端以黃色 `pending` 標籤區分

---

## Collection 雲端同步機制

### 推送（Owner / Editor → 雲端）

- Workspace 首次分享時，自動將本地 Collection 推送至 PostgreSQL `shared_collections` 表
- 後續新增、修改、刪除 Collection 節點時，自動 debounce 1.5 秒後推送更新
- 以整個 Workspace 的 Collection 樹序列化為 JSON 儲存，一個 Team 對應一筆 SharedCollection

### 拉取（Team 成員 ← 雲端）

- 成員啟動 App 時，自動載入所屬團隊列表
- 若本地沒有對應 Team 的 Workspace → 自動建立
- 從 `GET /sync/{team_id}/collections` 拉取雲端資料，覆蓋本地 SQLite
- 切換 Workspace 時，若為 Team Workspace 也會即時拉取最新

### 同步端點

| Method | Path | 說明 |
|--------|------|------|
| GET | `/sync/{team_id}/collections` | 列出團隊所有共享 Collection |
| POST | `/sync/collections` | 上傳新的共享 Collection |
| PUT | `/sync/collections/{id}` | 更新共享 Collection |
| DELETE | `/sync/collections/{id}` | 刪除共享 Collection（僅 Owner） |

---

## 環境變數配置

| 變數 | 用途 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `JWT_SECRET` | JWT 簽章密鑰 |

前端透過 `.env.production` 的 `VITE_API_BASE` 指定後端 API 位置，編譯時 bake 進應用。
