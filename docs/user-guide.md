# LalaDog API Client — 使用說明書

> 版本：0.3.5 | 最後更新：2026-03-05

LalaDog 是一款免費的桌面 API 測試工具，用於取代 Postman。支援 HTTP 請求、WebSocket 連線、環境變數管理、Collection 管理、團隊即時協作及深色模式。

---

## 目錄

1. [安裝與啟動](#1-安裝與啟動)
2. [介面總覽](#2-介面總覽)
3. [發送 HTTP 請求](#3-發送-http-請求)
4. [回應面板](#4-回應面板)
5. [Collection 管理](#5-collection-管理)
6. [環境變數](#6-環境變數)
7. [請求歷史](#7-請求歷史)
8. [WebSocket 測試](#8-websocket-測試)
9. [Pre-request Script / Tests](#9-pre-request-script--tests)
10. [分頁管理](#10-分頁管理)
11. [Workspace 管理](#11-workspace-管理)
12. [深色模式](#12-深色模式)
13. [Google 登入與團隊協作](#13-google-登入與團隊協作)
14. [匯入 Collection](#14-匯入-collection)
15. [自動更新](#15-自動更新)
16. [快捷鍵](#16-快捷鍵)
17. [常見問題](#17-常見問題)

---

## 1. 安裝與啟動

### Windows 安裝

提供兩種安裝方式：

| 安裝檔 | 說明 |
|--------|------|
| `LalaDog_0.3.5_x64-setup.exe` | NSIS 安裝程式（推薦），雙擊後依提示安裝 |
| `LalaDog_0.3.5_x64_en-US.msi` | MSI 安裝包，適合企業環境批量部署 |

### macOS 安裝

| 安裝檔 | 說明 |
|--------|------|
| `LalaDog_0.3.5_x64.dmg` | Intel Mac |
| `LalaDog_0.3.5_aarch64.dmg` | Apple Silicon (M1/M2/M3) |

### Linux 安裝

| 安裝檔 | 說明 |
|--------|------|
| `LalaDog_0.3.5_amd64.AppImage` | 通用格式，賦予執行權限後直接執行 |
| `LalaDog_0.3.5_amd64.deb` | Debian / Ubuntu 系列 |

下載位置：[GitHub Releases](https://github.com/kuraki5336/laladog/releases/latest)

---

## 2. 介面總覽

啟動後畫面分為五大區域：

```
┌──────────────────────────────────────────────────────────┐
│  ☰  Logo  LalaDog  | Workspace ▼ |  環境管理 環境▼ 🌙 👤 │  ← 頂部列
├────────────┬─────────────────────────────────────────────┤
│            │  [HTTP] [WebSocket]                         │
│ Collections│  [GET A ×] [GET B] [POST /login] [...]   + │  ← 分頁列
│ History    │  [GET ▼] [URL 輸入欄]         [Save] [Send]│
│            │  Params | Auth | Headers | Body | ...       │  ← 請求面板
│            │─────────────────────────────────────────────│
│  左側面板   │  Response  200 OK  120ms  1.2KB            │
│            │  Body | Headers | Console                   │  ← 回應面板
│            │                                             │
├────────────┴─────────────────────────────────────────────┤
│  Ready                              Connecting History:0 │  ← 狀態列
└──────────────────────────────────────────────────────────┘
```

| 區域 | 說明 |
|------|------|
| **頂部列** | 漢堡選單、Logo、Workspace 切換、環境管理/切換、深色模式、登入/大頭貼 |
| **左側面板** | Collections（資料夾樹 + 搜尋過濾）和 History（歷史紀錄）切換 |
| **分頁列** | 多 Tab 分頁，支援拖曳排序、右鍵選單 |
| **請求面板** | 設定 HTTP 方法、URL、參數、Headers、Body、Auth、腳本 |
| **回應面板** | 回應狀態碼、時間、大小、Body（搜尋/JSON 樹狀檢視）、Headers、Console |
| **狀態列** | 同步連線狀態與歷史紀錄數量 |

---

## 3. 發送 HTTP 請求

### 基本步驟

1. **選擇方法**：點擊左側綠色下拉選單，選擇 HTTP 方法
   - 支援：`GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`HEAD`、`OPTIONS`

2. **輸入 URL**：在 URL 欄位輸入完整的 API 網址
   - 範例：`https://api.example.com/users`
   - 支援環境變數：`{{base_url}}/users`

3. **點擊 Send**（或按 `Ctrl+Enter`）：發送請求

### Params（查詢參數）

在 Params 標籤中新增 URL 查詢參數：

| 欄位 | 說明 |
|------|------|
| Key | 參數名稱（如 `page`） |
| Value | 參數值（如 `1`） |
| Enabled | 勾選啟用/取消 |

參數會自動附加到 URL 後方（如 `?page=1&limit=10`）。

### Headers

在 Headers 標籤中設定請求標頭：

- 預設已有 `Content-Type: application/json`
- 點擊 **+ Add** 新增更多 Header
- 支援環境變數：`{{auth_token}}`

### Body

在 Body 標籤中設定請求主體，支援以下類型：

| 類型 | 說明 |
|------|------|
| **none** | 無 Body（GET/HEAD 預設） |
| **raw** | 原始文字，支援 JSON / XML / Text |
| **form-data** | 表單資料（key-value 對，支援檔案上傳） |
| **x-www-form-urlencoded** | URL 編碼表單 |
| **binary** | 二進位檔案上傳 |

> **提示**：選擇 raw 時可直接貼上 JSON，編輯器提供語法高亮。

### Auth（認證）

在 Auth 標籤中設定認證方式：

| 類型 | 說明 |
|------|------|
| **No Auth** | 不使用認證 |
| **Bearer Token** | 輸入 Token，自動加到 `Authorization: Bearer <token>` |
| **Basic Auth** | 輸入帳號密碼，自動編碼為 Base64 |
| **API Key** | 設定 Key 名稱和值，可選擇放在 Header 或 Query |

---

## 4. 回應面板

發送請求後，下方回應面板顯示：

### 狀態資訊

| 項目 | 說明 |
|------|------|
| **Status** | HTTP 狀態碼（綠色 2xx、藍色 3xx、橙色 4xx、紅色 5xx） |
| **Duration** | 回應時間（毫秒） |
| **Size** | 回應大小（自動轉換 B/KB/MB） |

### Body 標籤

- **Pretty**：JSON 自動格式化顯示，支援語法高亮
- **Raw**：原始回應文字
- **Preview**：HTML 預覽（若回應為 HTML）
- **JSON 樹狀檢視**：點擊工具列的樹狀圖示切換，支援逐層收合/展開、全部展開/收合
- **搜尋功能**：按 `Ctrl+F` 開啟搜尋列，支援高亮標記、上下跳轉（Enter / Shift+Enter）、顯示匹配數量

### Headers 標籤

以表格形式顯示所有回應 Header（Key / Value）。

### Console 標籤

顯示 Pre-request Script 和 Tests 的 `console.log()` 輸出。

---

## 5. Collection 管理

Collection 是組織 API 請求的資料夾結構，類似 Postman 的 Collection。

### 建立 Collection

1. 點擊左側 **+ New Request** 按鈕
2. 輸入名稱
3. 按 Enter 確認

### 資料夾結構

- Collection 內可建立 **Folder**（子資料夾）和 **Request**（請求）
- 支援多層巢狀結構
- 點擊資料夾名稱可展開/收合
- 支援**拖曳排序**（拖動節點改變順序或移入其他資料夾）
- 支援**搜尋過濾**（在搜尋框輸入關鍵字即時過濾）

### 右鍵選單

在 Collection / Folder / Request 上右鍵：

| 選項 | 說明 |
|------|------|
| **New Folder** | 建立子資料夾 |
| **New Request** | 建立新請求 |
| **Rename** | 重新命名 |
| **Export** | 匯出為 Postman Collection v2.1 JSON（僅 Collection 層級） |
| **Delete** | 刪除（需確認） |

### 儲存請求

編輯請求後，點擊 **Save** 按鈕可將當前請求儲存到 Collection 中。若請求尚未歸屬 Collection，會彈出對話框選擇儲存位置。

### 載入請求

點擊 Collection 中的任意 Request，會自動在新分頁中開啟。

---

## 6. 環境變數

環境變數讓你在不同環境間快速切換 API 設定。

### 建立環境

1. 點擊頂部 **Manage Environments** 按鈕
2. 點擊 **+ New Environment**
3. 輸入環境名稱（如 `Local`、`Dev`、`Staging`、`Prod`）

### 新增變數

在環境編輯面板中：

| 欄位 | 範例 |
|------|------|
| Variable | `base_url` |
| Value | `http://localhost:3000` |

### 使用變數

在 URL、Headers、Body 中使用 `{{變數名稱}}` 語法：

```
{{base_url}}/api/users
```

發送請求時，`{{base_url}}` 會自動替換為當前環境的值。URL 輸入欄中的變數會以高亮色顯示。

### 切換環境

點擊頂部右側的環境下拉選單，快速切換。每個 Workspace 可獨立設定啟用的環境。

### 全域變數

全域變數在所有環境中都可使用，不受環境切換影響。

---

## 7. 請求歷史

每次發送請求後，系統自動記錄到歷史中（最近 200 筆）。

### 查看歷史

1. 點擊左側面板的 **History** 標籤
2. 歷史按時間倒序排列

### 歷史項目顯示

每筆紀錄包含：
- HTTP 方法和狀態碼（彩色標示）
- 請求 URL
- 回應時間
- 發送時間

### 操作

| 操作 | 說明 |
|------|------|
| **點擊** | 在新分頁中載入該歷史請求 |
| **搜尋** | 在搜尋框輸入關鍵字篩選 |

> **儲存位置**：歷史紀錄儲存在本機 SQLite 資料庫，不會上傳到任何伺服器。

---

## 8. WebSocket 測試

LalaDog 支援 WebSocket 連線測試。

### 使用方式

1. 點擊請求面板上方的 **WebSocket** 標籤
2. 輸入 WebSocket URL（如 `ws://localhost:8080/ws`）
3. 點擊 **Connect** 建立連線

### 傳送訊息

1. 在輸入框中輸入訊息（文字或 JSON）
2. 點擊 **Send** 發送

### 訊息面板

- **傳送的訊息**：顯示為綠色背景
- **接收的訊息**：顯示為白色背景
- 訊息按時間順序排列，附帶時間戳
- 支援 JSON 格式化顯示

### 中斷連線

點擊 **Disconnect** 按鈕關閉 WebSocket 連線。

---

## 9. Pre-request Script / Tests

### Pre-request Script

在請求發送「之前」執行的 JavaScript 腳本，用於：
- 動態產生 Token
- 計算簽名
- 設定時間戳
- 修改環境變數

在 **Pre-request** 標籤中撰寫 JavaScript 程式碼。可透過 `pm.variables` 存取和設定環境變數。

### Tests

在請求發送「之後」執行的 JavaScript 腳本，用於：
- 驗證回應狀態碼
- 檢查回應 Body
- 提取值並設為變數

在 **Tests** 標籤中撰寫 JavaScript 程式碼。可存取 `response` 物件取得狀態碼、Headers 和 Body。

### Console 輸出

腳本中的 `console.log()`、`console.error()`、`console.warn()` 輸出會顯示在回應面板的 **Console** 標籤中。

---

## 10. 分頁管理

LalaDog 支援多分頁（Tab）同時開啟多個請求。

### 基本操作

| 操作 | 說明 |
|------|------|
| **點擊 Collection 請求** | 自動在新分頁開啟 |
| **點擊 +** | 新增空白分頁 |
| **點擊 ×** | 關閉分頁 |
| **拖曳分頁** | 調整分頁順序 |
| **雙擊分頁標題** | 重新命名 |

### 右鍵選單

在分頁上按右鍵：

| 選項 | 說明 |
|------|------|
| **Rename** | 重新命名分頁 |
| **Duplicate** | 複製一份分頁（含請求內容） |
| **Close Others** | 關閉其他所有分頁 |
| **Close to the Right** | 關閉右側所有分頁 |
| **Close** | 關閉此分頁 |

### 未儲存指示

分頁標題旁出現 `●` 圓點表示有未儲存的變更。

---

## 11. Workspace 管理

Workspace 讓你組織不同專案或環境的工作空間。

### 切換 Workspace

點擊頂部列的 Workspace 下拉選單，可在不同 Workspace 間切換。

### 建立 / 重新命名 / 刪除

在 Workspace 下拉選單中操作。每個 Workspace 有獨立的 Collection 和環境變數。

### Team Workspace

透過團隊協作功能加入團隊後，系統會自動建立對應的 Team Workspace，團隊共享的 Collection 會同步到此 Workspace。

---

## 12. 深色模式

### 切換方式

點擊頂部列的月亮/太陽圖示切換深色模式。

### 特色

- 深色背景減少眼睛疲勞
- 所有面板、按鈕、輸入框均支援深色主題
- 設定會自動記住，下次啟動時保持上次的選擇

---

## 13. Google 登入與團隊協作

### 登入

1. 點擊右上角 **Login** 按鈕
2. 在彈出的系統瀏覽器中選擇 Google 帳號
3. 登入成功後顯示大頭貼

### 登出

點擊大頭貼 → 下拉選單中點擊 **登出**。

### 團隊功能

登入後可使用團隊協作功能：

| 功能 | 說明 |
|------|------|
| **建立團隊** | 建立新團隊，自動成為 Owner |
| **邀請成員** | 輸入 Email 邀請（支援未註冊的 Email，首次登入時自動加入） |
| **角色權限** | Owner（完全控制）/ Editor（可編輯）/ Viewer（唯讀） |
| **即時同步** | Collection 修改透過 WebSocket 即時同步給所有成員 |
| **成員管理** | 查看成員列表、移除成員 |

---

## 14. 匯入 Collection

支援匯入 Postman Collection 和 OpenAPI/Swagger 規格檔。

### 匯入步驟

1. 點擊左側面板的 **...** 按鈕（Import Collection 旁）
2. 選擇檔案（支援 `.json`、`.yaml`、`.yml`）
3. 系統自動偵測格式（Postman 或 OpenAPI），匯入完成後 Collection 結構自動建立

### 支援的格式

| 格式 | 說明 |
|------|------|
| **Postman Collection v2.1** | `.json` 格式 |
| **OpenAPI 3.x** | `.json` 或 `.yaml` / `.yml` |
| **Swagger 2.0** | `.json` 或 `.yaml` / `.yml` |

### OpenAPI 匯入細節

- `paths` → 每個 path + method 產生一個 Request
- `tags` → 自動分組為 Folder
- `parameters` → 轉換為 Query/Header 參數
- `requestBody` → 轉換為 Body (JSON)
- `servers[0].url` → 作為 Base URL 前綴
- `security` → 自動設定 Auth

### 匯出

在 Collection 上右鍵 → **Export**，匯出為 Postman Collection v2.1 JSON 格式。

---

## 15. 自動更新

LalaDog 內建自動更新功能。

### 自動檢查

App 啟動時會靜默檢查是否有新版本。若有新版會自動彈出更新對話框，顯示：
- 新版本號
- 更新日期
- 更新內容

### 手動檢查

點擊左上角漢堡選單 ☰ → **檢查更新**。

### 更新流程

1. 點擊 **Download and Install** 按鈕
2. 下載完成後自動重啟安裝
3. 更新過程中 Collection 和歷史紀錄不會遺失

---

## 16. 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl + Enter` | 發送請求 |
| `Ctrl + N` | 新增請求 |
| `Ctrl + T` | 新增分頁 |
| `Ctrl + W` | 關閉當前分頁 |
| `Ctrl + S` | 儲存請求到 Collection |
| `Ctrl + L` | 聚焦 URL 輸入欄 |
| `Ctrl + F` | 搜尋回應 Body（在回應面板中） |
| `Escape` | 關閉搜尋列 |

---

## 17. 常見問題

### Q: 出現「Command plugin:sql|load not allowed by ACL」錯誤？

**原因**：Tauri 安全性設定未開放 SQL 插件權限。

**解決**：已在 `src-tauri/capabilities/default.json` 中加入對應權限。重新打包即可修復。

### Q: OPTIONS 請求失敗？

**說明**：在瀏覽器開發模式下，OPTIONS 請求會被 CORS 策略攔截。這是瀏覽器的安全限制，非程式錯誤。打包為桌面應用後，所有 HTTP 方法（包含 OPTIONS）都能正常發送。

### Q: 離線可以使用嗎？

**可以**。LalaDog 的核心功能（HTTP 請求、Collection 管理、環境變數、歷史紀錄）完全在本機運行，不需要網路連線。唯獨 Google 登入和團隊協作需要網路。

### Q: 資料儲存在哪裡？

所有資料（Collection、歷史、環境變數）儲存在本機 SQLite 資料庫中：
- Windows: `%APPDATA%\com.laladog.api-client\laladog.db`

### Q: 如何更新？

App 內建自動更新功能。啟動時會自動檢查新版本，也可以手動從漢堡選單 ☰ → **檢查更新** 觸發。更新後資料不會遺失。

### Q: 自動更新失敗怎麼辦？

可以手動從 [GitHub Releases](https://github.com/kuraki5336/laladog/releases/latest) 下載最新版本，直接覆蓋安裝即可。

### Q: 可以自行架設後端嗎？

可以。後端為 FastAPI + PostgreSQL，需設定 `DATABASE_URL`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`JWT_SECRET` 等環境變數。前端透過 `.env.production` 的 `VITE_API_BASE` 指定後端位置。
