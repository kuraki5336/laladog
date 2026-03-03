# LalaDog API Client — 使用說明書

> 版本：0.1.0 | 最後更新：2026-03-03

LalaDog 是一款免費的桌面 API 測試工具，用於取代 Postman。支援 HTTP 請求、WebSocket 連線、環境變數管理、Collection 管理及深色模式。

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
10. [深色模式](#10-深色模式)
11. [Google 登入與團隊協作](#11-google-登入與團隊協作)
12. [匯入 Postman Collection](#12-匯入-postman-collection)
13. [快捷鍵](#13-快捷鍵)
14. [常見問題](#14-常見問題)

---

## 1. 安裝與啟動

### Windows 安裝

提供兩種安裝方式：

| 安裝檔 | 說明 |
|--------|------|
| `LalaDog_0.1.0_x64-setup.exe` | NSIS 安裝程式（推薦），雙擊後依提示安裝 |
| `LalaDog_0.1.0_x64_en-US.msi` | MSI 安裝包，適合企業環境批量部署 |

安裝完成後，從開始選單或桌面捷徑啟動 **LalaDog**。

### 免安裝執行

直接執行 `laladog.exe`（約 14MB）即可使用，無需安裝。

---

## 2. 介面總覽

啟動後畫面分為四大區域：

```
┌──────────────────────────────────────────────────────────┐
│  Logo   LalaDog API Client    環境選擇  🌙  G Login     │  ← 頂部列
├────────────┬─────────────────────────────────────────────┤
│            │  [HTTP] [WebSocket]                         │
│ Collections│  [GET ▼] [URL 輸入欄]              [Send]  │
│ History    │  Params | Headers | Body | Auth | ...       │  ← 請求面板
│            │─────────────────────────────────────────────│
│  左側面板   │  Response  200 OK  120ms  1.2KB            │
│            │  Body | Headers                             │  ← 回應面板
│            │                                             │
├────────────┴─────────────────────────────────────────────┤
│  Ready                                     History: 0   │  ← 狀態列
└──────────────────────────────────────────────────────────┘
```

| 區域 | 說明 |
|------|------|
| **頂部列** | Logo、環境變數切換、深色模式開關、Google 登入 |
| **左側面板** | Collections（資料夾樹）和 History（歷史紀錄）切換 |
| **請求面板** | 設定 HTTP 方法、URL、參數、Headers、Body、Auth |
| **回應面板** | 顯示回應狀態碼、時間、大小、Body 和 Headers |
| **狀態列** | 顯示連線狀態與歷史紀錄數量 |

---

## 3. 發送 HTTP 請求

### 基本步驟

1. **選擇方法**：點擊左側綠色下拉選單，選擇 HTTP 方法
   - 支援：`GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`HEAD`、`OPTIONS`

2. **輸入 URL**：在 URL 欄位輸入完整的 API 網址
   - 範例：`https://api.example.com/users`
   - 支援環境變數：`{{base_url}}/users`

3. **點擊 Send**：右側藍色按鈕發送請求

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
| **form-data** | 表單資料（key-value 對） |
| **x-www-form-urlencoded** | URL 編碼表單 |

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

### Headers 標籤

以表格形式顯示所有回應 Header（Key / Value）。

---

## 5. Collection 管理

Collection 是組織 API 請求的資料夾結構，類似 Postman 的 Collection。

### 建立 Collection

1. 點擊左側 **+ New Collection** 按鈕
2. 輸入 Collection 名稱
3. 按 Enter 確認

### 資料夾結構

- Collection 內可建立 **Folder**（子資料夾）和 **Request**（請求）
- 支援多層巢狀結構
- 點擊資料夾名稱可展開/收合

### 右鍵選單

在 Collection / Folder / Request 上右鍵：

| 選項 | 說明 |
|------|------|
| **New Folder** | 建立子資料夾 |
| **New Request** | 建立新請求 |
| **Rename** | 重新命名 |
| **Duplicate** | 複製一份 |
| **Delete** | 刪除（需確認） |

### 載入請求

點擊 Collection 中的任意 Request，會自動載入到請求面板中進行編輯和發送。

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

發送請求時，`{{base_url}}` 會自動替換為當前環境的值。

### 切換環境

點擊頂部右側的環境下拉選單，快速切換：

- `No Environment`（不使用變數）
- `Local`
- `Dev`
- `Staging`
- `Prod`

### 全域變數

全域變數在所有環境中都可使用，不受環境切換影響。

---

## 7. 請求歷史

每次發送請求後，系統自動記錄到歷史中。

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
| **點擊** | 載入該歷史請求到請求面板 |
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
- 訊息按時間順序排列
- 支援 JSON 格式化顯示

### 中斷連線

點擊 **Disconnect** 按鈕關閉 WebSocket 連線。

---

## 9. Pre-request Script / Tests

### Pre-request Script

在請求發送「之前」執行的腳本，用於：
- 動態產生 Token
- 計算簽名
- 設定時間戳

在 **Pre-request** 標籤中撰寫 JavaScript 程式碼。

### Tests

在請求發送「之後」執行的腳本，用於：
- 驗證回應狀態碼
- 檢查回應 Body
- 提取值並設為變數

在 **Tests** 標籤中撰寫 JavaScript 程式碼。

> **注意**：此功能目前為 Phase 2 預留的腳本編輯區，完整執行引擎將在後續版本實作。

---

## 10. 深色模式

### 切換方式

點擊頂部列的 **月亮圖示** 🌙 切換深色模式：

| 圖示 | 模式 |
|------|------|
| 🌙 月亮 | 點擊切換到深色模式 |
| ☀️ 太陽 | 點擊切換到淺色模式 |

### 特色

- 深色背景（#0F172A）減少眼睛疲勞
- 所有面板、按鈕、輸入框均支援深色主題
- 設定會自動記住，下次啟動時保持上次的選擇

---

## 11. Google 登入與團隊協作

### 登入

1. 點擊右上角 **G Login** 按鈕
2. 在彈出的 Google 登入頁面中選擇帳號
3. 登入成功後顯示大頭貼和名稱

### 登出

點擊名稱旁的 **Logout** 按鈕。

### 團隊協作（即將推出）

- 建立團隊 Workspace
- 邀請成員加入
- 分享 Collection 給團隊
- 權限控制：Owner / Editor / Viewer
- 本地優先，背景同步到雲端

> **注意**：Google OAuth 需要後端 FastAPI 服務配合，目前為 UI 預備狀態。

---

## 12. 匯入 Postman Collection

支援匯入 Postman Collection v2.1 JSON 格式。

### 匯入步驟

1. 從 Postman 匯出 Collection（選擇 v2.1 格式）
2. 在 LalaDog 左側面板右鍵選擇 **Import**
3. 選擇匯出的 JSON 檔案
4. 匯入完成後，Collection 結構自動建立

### 支援的匯入內容

| 項目 | 支援 |
|------|------|
| Collection 資料夾結構 | 是 |
| Request（方法/URL/Headers/Body） | 是 |
| 環境變數 | 是 |
| Pre-request Script | 結構匯入（執行待實作） |
| Tests | 結構匯入（執行待實作） |

---

## 13. 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl + Enter` | 發送請求 |
| `Ctrl + N` | 新增請求 |
| `Ctrl + S` | 儲存請求到 Collection |
| `Ctrl + L` | 聚焦 URL 輸入欄 |

---

## 14. 常見問題

### Q: 出現「Command plugin:sql|load not allowed by ACL」錯誤？

**原因**：Tauri 安全性設定未開放 SQL 插件權限。

**解決**：已在 `src-tauri/capabilities/default.json` 中加入 `sql:default`、`sql:allow-load`、`sql:allow-execute`、`sql:allow-select`、`sql:allow-close` 權限。重新打包即可修復。

### Q: OPTIONS 請求失敗？

**說明**：在瀏覽器開發模式下，OPTIONS 請求會被 CORS 策略攔截。這是瀏覽器的安全限制，非程式錯誤。打包為桌面應用後，所有 HTTP 方法（包含 OPTIONS）都能正常發送。

### Q: 離線可以使用嗎？

**可以**。LalaDog 的核心功能（HTTP 請求、Collection 管理、環境變數、歷史紀錄）完全在本機運行，不需要網路連線。唯獨 Google 登入和團隊協作需要網路。

### Q: 資料儲存在哪裡？

所有資料（Collection、歷史、環境變數）儲存在本機 SQLite 資料庫中：
- Windows: `%APPDATA%\com.laladog.api-client\laladog.db`

### Q: 如何更新？

下載最新版本的安裝檔，直接覆蓋安裝即可。Collection 和歷史紀錄不會遺失。
