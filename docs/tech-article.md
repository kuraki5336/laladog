# 我用 Tauri + Vue 3 做了一款免費的 Postman 替代品

> 一個人用兩週打造桌面 API Client，支援團隊即時協作、跨平台自動發版

---

## 為什麼要做這個？

Postman 從 2023 年開始大幅限縮免費功能，團隊協作要收費、Collection 數量有上限、離線使用受限。作為一個每天都要測 API 的開發者，我決定自己做一個。

**設定的目標：**
- 完全免費、開源
- 本機優先，不依賴雲端也能使用
- 支援團隊即時同步共享
- 跨平台（Windows / macOS / Linux）
- 安裝包要小（< 15MB）

---

## 技術選型

### 為什麼選 Tauri 而不是 Electron？

| 比較 | Electron | Tauri |
|------|----------|-------|
| 打包大小 | ~150MB+ | ~12MB |
| 記憶體占用 | ~200MB | ~60MB |
| 後端語言 | Node.js | Rust |
| Chromium | 內嵌 | 使用系統 WebView |

Tauri v2 的決定性優勢：**安裝包小、啟動快、記憶體省**。用 Rust 處理 HTTP 請求還能繞過瀏覽器的 CORS 限制。

### 技術棧總覽

```
┌─ Frontend ─────────────────────────┐
│  Vue 3 (Composition API)           │
│  TypeScript + Tailwind CSS v4      │
│  Pinia (狀態管理) + Monaco Editor  │
│  Vite (建置工具)                   │
└──────────────┬─────────────────────┘
               │ IPC (Tauri Commands)
┌──────────────┴─────────────────────┐
│  Tauri v2 (Rust)                   │
│  reqwest (HTTP Client)             │
│  SQLite (tauri-plugin-sql)         │
│  OAuth / WebSocket / Auto-Update   │
└──────────────┬─────────────────────┘
               │ HTTPS
┌──────────────┴─────────────────────┐
│  Backend API (FastAPI + PostgreSQL) │
│  團隊管理 / Collection 同步        │
└────────────────────────────────────┘
```

---

## 核心技術挑戰與解法

### 1. 用 Rust 繞過 CORS

瀏覽器中的 `fetch()` 受 CORS 限制，測試第三方 API 幾乎都會被擋。Tauri 的解法很優雅：**在 Rust 層發 HTTP 請求**。

```rust
#[tauri::command]
async fn send_http_request(
    method: String, url: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
) -> Result<HttpResponse, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)  // 允許自簽憑證
        .build()
        .map_err(|e| e.to_string())?;

    let mut request = client.request(method.parse().unwrap(), &url);
    for (key, value) in headers {
        request = request.header(&key, &value);
    }
    // ...發送並回傳結果
}
```

前端透過 Tauri IPC 呼叫這個 Rust Command，完全不受瀏覽器安全策略限制。對開發者來說就像在用原生 HTTP Client。

### 2. 桌面應用的 Google OAuth（PKCE Flow）

桌面應用做 OAuth 比 Web 困難，因為沒有固定的 redirect URI。我的解法：

1. **Rust 層啟動臨時 HTTP Server**（隨機 port）
2. 用系統瀏覽器開啟 Google OAuth URL（redirect_uri 指向 `http://localhost:{port}`）
3. 使用者在瀏覽器完成 Google 登入
4. Google redirect 回 localhost → Rust 接收 auth code
5. Rust 用 auth code 換取 id_token，送到後端驗證
6. 後端回傳 JWT → 前端儲存

```
使用者 → 點擊 Login → 系統瀏覽器開啟 Google
                         ↓ (授權後)
Google → redirect → localhost:隨機port → Rust 接收 code
                                          ↓
                         Rust → 後端 API → 取得 JWT
                                          ↓
                         前端收到 JWT → 登入成功
```

這個流程完全遵循 OAuth 2.0 PKCE 規範，安全且不需要嵌入 WebView 做登入。

### 3. WebSocket 即時同步

團隊成員的 Collection 修改需要即時同步。架構如下：

- **後端**：FastAPI 維護每個 Team 的 WebSocket 房間
- **前端**：Pinia `syncStore` 管理 WebSocket 生命週期
- **同步策略**：Local-first — 本地 SQLite 先寫入，再推送到雲端
- **衝突處理**：以最後修改者為準（Last-Write-Wins）
- **斷線重連**：指數退避（1s → 2s → 4s → ...最大 30s）+ 心跳保活

```typescript
// syncStore.ts 核心邏輯
connect(teamId: string) {
  const ws = new WebSocket(`wss://api.domain/ws/${teamId}`)
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'collection_update') {
      collectionStore.mergeFromCloud(data.payload)
    }
  }
}
```

### 4. SQLite 漸進式遷移

本地資料庫需要隨版本演進。Tauri 的 `tauri-plugin-sql` 支援 Migration 機制：

```rust
let migrations = vec![
    Migration { version: 1, sql: "CREATE TABLE collection_nodes ...", ... },
    Migration { version: 2, sql: "CREATE TABLE workspaces ...", ... },
    Migration { version: 3, sql: "ALTER TABLE workspaces ADD COLUMN team_id ...", ... },
    Migration { version: 4, sql: "ALTER TABLE workspaces ADD COLUMN active_environment_id ...", ... },
    Migration { version: 5, sql: "ALTER TABLE environments ADD COLUMN workspace_id ...", ... },
];
```

每次 App 啟動時自動檢查 migration 版本，只執行未套用的 migration。使用者更新 App 後資料無痛升級。

### 5. 自動更新與簽名驗證

使用 `tauri-plugin-updater` 實現：

1. App 啟動時靜默檢查 GitHub Releases 的 `latest.json`
2. 比對版本號，有新版則彈出更新對話框
3. 下載安裝包 + 驗證 Ed25519 簽名
4. 使用者確認後重啟安裝

**注意事項**：Vue 的 Proxy 會包裹 `Update` 物件，導致 ES6 private fields 無法存取。解法是用 `shallowRef` 避免深度 Proxy。

### 6. 深色模式與 CSS 變數系統

使用 Tailwind CSS v4 的 `@theme` directive 定義設計 Token：

```css
@theme {
  --color-bg-page: #FFFFFF;
  --color-text-primary: #1E293B;
  --color-primary: #00416A;
  /* ...40+ 個 token */
}

.dark {
  --color-bg-page: #0F172A;
  --color-text-primary: #F1F5F9;
  --color-primary: #8DC8ED;  /* 深色模式反轉為亮色調 */
}
```

所有元件使用語義化 class（如 `text-text-primary`、`bg-bg-card`），切換主題時只需加/移除 `.dark` class。

---

## CI/CD 跨平台自動發版

```yaml
# .github/workflows/release.yml（簡化版）
on:
  push:
    tags: ['v*']

jobs:
  release:
    strategy:
      matrix:
        include:
          - platform: windows-latest
          - platform: macos-latest      # Intel
          - platform: macos-14          # Apple Silicon
          - platform: ubuntu-22.04
    steps:
      - uses: tauri-apps/tauri-action@v0
        env:
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
```

推送 `v*` tag 即觸發四平台自動編譯 + 簽名 + 上傳到 GitHub Releases。使用者下載後，App 內建的自動更新機制會偵測到新版。

**發版流程：**
```bash
# 1. 更新版本號（package.json + Cargo.toml + tauri.conf.json）
# 2. 更新 changelog
# 3. 本地 build 驗證
npm run tauri build
# 4. Commit + Tag + Push
git tag v0.3.5
git push && git push --tags
# → GitHub Actions 自動完成剩下的一切
```

---

## 專案數據

| 指標 | 數字 |
|------|------|
| Vue 元件 | 33 個 |
| Pinia Store | 11 個 |
| 前端程式碼 | ~8,800 行（TypeScript + Vue） |
| Rust 後端 | ~650 行 |
| SQLite Migration | 5 版 |
| 已發布版本 | 6 個（v0.1.0 → v0.3.5） |
| 安裝包大小 | ~12MB（Windows） |

---

## 已實作功能總覽

| 分類 | 功能 |
|------|------|
| **HTTP 測試** | 7 種 HTTP 方法、Query/Headers/Body/Auth、Pre-request Script、Tests |
| **回應檢視** | JSON 高亮 + 樹狀收合展開、搜尋高亮（Ctrl+F）、Headers、Console |
| **WebSocket** | 連線測試、傳送/接收訊息 |
| **Collection** | 樹狀管理、拖曳排序、搜尋過濾、匯入 Postman/OpenAPI、匯出 Postman |
| **環境變數** | 多環境切換、`{{variable}}` 語法、全域變數 |
| **多分頁** | Tab 管理、拖曳排序、右鍵選單、重新命名 |
| **團隊協作** | Google OAuth、團隊建立/邀請/權限、WebSocket 即時同步 |
| **其他** | 深色模式、自動更新、請求歷史、cURL 複製、多 Workspace |

---

## 未來規劃

- GraphQL 測試支援
- gRPC 測試支援
- Mock Server
- API 文件自動產生
- Proxy 設定
- 請求排程執行
- 測試報告匯出

---

## 總結

用 Tauri + Vue 3 做桌面應用的體驗非常好。Rust 帶來的效能優勢（安裝包小、啟動快、記憶體省）是 Electron 無法比擬的。搭配 GitHub Actions 的跨平台 CI/CD，一個人也能維護四平台的桌面應用。

如果你也受夠了 Postman 的付費限制，歡迎試試 LalaDog：

**GitHub**: [github.com/kuraki5336/laladog](https://github.com/kuraki5336/laladog)
