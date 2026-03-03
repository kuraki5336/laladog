# Google OAuth 登入

## 1. 功能概述

提供 Google 帳號登入功能，讓使用者透過 Google OAuth 2.0 進行身份驗證，以啟用團隊協作相關功能。LalaDog 為本地優先（Local-first）架構，未登入時所有本地功能（建立 Collection、發送請求、管理環境變數等）皆可正常使用；登入後方可存取團隊協作功能（建立團隊、共享 Collection 等）。

### 適用平台

- Tauri 2 桌面應用程式（Windows / macOS / Linux）

### 技術棧

| 層級 | 技術 |
|------|------|
| 前端 UI | Vue 3 + TypeScript + Pinia |
| 桌面端 | Tauri 2 (Rust) |
| 後端 | FastAPI + SQLAlchemy Async + SQLite |
| 認證 | Google OAuth 2.0 + JWT |

---

## 2. 使用情境

| 編號 | 情境 | 說明 |
|------|------|------|
| UC-01 | 未登入使用者點擊登入 | 使用者點擊頂部工具列的「Login」按鈕，觸發 Google OAuth 流程 |
| UC-02 | Google 授權成功 | 系統取得 id_token，向後端驗證並取得 JWT，顯示已登入狀態 |
| UC-03 | Google 授權失敗或取消 | 顯示錯誤提示，維持未登入狀態 |
| UC-04 | 已登入使用者登出 | 點擊「Logout」按鈕，清除本地登入狀態 |
| UC-05 | 應用程式重啟恢復登入 | 從 localStorage 讀取已保存的 JWT 與使用者資訊，自動恢復已登入狀態 |
| UC-06 | 未登入使用離線模式 | 使用者不登入，所有本地功能正常運作（Local-only 模式） |

---

## 3. 畫面總覽

本功能影響的畫面區域位於應用程式頂部工具列（Top Bar / Header）的右側區域。

```
+---------------------------------------------------------------------+
| LalaDog API Client    | [EnvEditor] [EnvSelector] [Theme] [Auth區] |
+---------------------------------------------------------------------+
| Sidebar |                  Main Panel                               |
|         |                                                           |
+---------+-----------------------------------------------------------+
|                         Status Bar                                  |
+---------------------------------------------------------------------+
```

---

## 4. 區域劃分

### 4.1 頂部工具列 — 認證區域（Auth Area）

位於 `AppLayout.vue` 頂部 `<header>` 的最右側，與 EnvSelector、暗色模式切換按鈕同列。

#### 4.1.1 未登入狀態（Login Button）

```
+-------------------------------------------+
| [G] Login                                 |
+-------------------------------------------+
```

| 元素 | 說明 |
|------|------|
| [G] | Google 圖示（SVG，四色 Google "G" logo） |
| Login | 按鈕文字，登入進行中時顯示 "Logging in..." |

#### 4.1.2 已登入狀態（User Info + Logout）

```
+-------------------------------------------+
| [Avatar] UserName  Logout                 |
+-------------------------------------------+
```

| 元素 | 說明 |
|------|------|
| [Avatar] | 使用者 Google 頭像（圓形，28x28px） |
| UserName | 使用者名稱（文字） |
| Logout | 登出按鈕（文字按鈕，hover 變紅色） |

---

## 5. 欄位規格

### 5.1 未登入狀態 — 登入按鈕

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| Google 圖示 | SVG Icon | -- | -- | -- | -- | Google "G" 四色 SVG | 尺寸 14x14px (h-3.5 w-3.5) |
| 按鈕文字 | string | -- | -- | -- | -- | `Login` / `Logging in...` | 根據 `authStore.isLoading` 狀態切換 |

**按鈕樣式規格：**

| 屬性 | 值 |
|------|-----|
| 高度 | 32px (h-8) |
| 內邊距 | 水平 12px (px-3) |
| 背景色 | `bg-primary` |
| 文字色 | `text-text-inverse` |
| 字體大小 | 12px (text-xs) |
| 字重 | 500 (font-medium) |
| 圓角 | `rounded-button`（依主題變數） |
| 元素間距 | 6px (gap-1.5) |
| Hover | `opacity-90` |
| Disabled | `authStore.isLoading === true` 時禁用 |

### 5.2 已登入狀態 — 使用者資訊

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| 使用者頭像 | string (URL) | -- | 否 | `v-if="authStore.user?.picture"` | -- | Google 帳號頭像 URL | 僅在有 picture 時顯示；圓形 28x28px，帶邊框 |
| 使用者名稱 | string | -- | 否 | -- | -- | `authStore.user?.name` | 文字色 text-text-secondary，字體大小 text-xs |
| 登出按鈕 | button | -- | -- | -- | -- | `Logout` | 文字色 text-text-muted，hover 時 text-danger |

**使用者頭像規格：**

| 屬性 | 值 |
|------|-----|
| 尺寸 | 28x28px (h-7 w-7) |
| 圓角 | 完全圓形 (rounded-full) |
| 邊框 | 1px solid border (border border-border) |
| alt 屬性 | `authStore.user.name` |

### 5.3 localStorage 持久化欄位

| Key | 數據類型 | 說明 |
|-----|----------|------|
| `laladog_token` | string | JWT access token，用於後續 API 認證 |
| `laladog_user` | string (JSON) | 使用者資訊的 JSON 序列化字串 |

**`laladog_user` JSON 結構：**

| 欄位 | 數據類型 | 必填 | 說明 |
|------|----------|------|------|
| id | string (UUID) | 是 | 後端 User 表主鍵 |
| email | string | 是 | Google 帳號 email |
| name | string | 是 | Google 帳號顯示名稱 |
| picture | string \| null | 否 | Google 帳號頭像 URL |

---

## 6. 操作流程

### 6.1 登入流程

```
使用者                Tauri (Rust)              系統瀏覽器              FastAPI 後端             Google
  |                      |                        |                      |                      |
  |  1. 點擊 Login 按鈕  |                        |                      |                      |
  |--------------------->|                        |                      |                      |
  |                      |  2. invoke('google_oauth_login')               |                      |
  |                      |  3. 產生 OAuth URL     |                      |                      |
  |                      |----------------------->|                      |                      |
  |                      |                        |  4. 使用者登入 Google |                      |
  |                      |                        |--------------------->|                      |
  |                      |                        |                      |                      |
  |                      |                        |  5. 授權同意          |                      |
  |                      |                        |--------------------->|                      |
  |                      |                        |                      |                      |
  |                      |  6. 取得 authorization code (via redirect)     |                      |
  |                      |<-----------------------|                      |                      |
  |                      |  7. 用 code 換取 id_token                     |                      |
  |                      |--------------------------------------------------------------------->|
  |                      |  8. 回傳 id_token      |                      |                      |
  |  9. 回傳 id_token    |<---------------------------------------------------------------------|
  |<---------------------|                        |                      |                      |
  |  10. POST /auth/google { id_token }           |                      |                      |
  |-------------------------------------------------------------->|                             |
  |                      |                        |  11. 驗證 id_token   |                      |
  |                      |                        |                      |--------------------->|
  |                      |                        |  12. 驗證結果        |                      |
  |                      |                        |                      |<---------------------|
  |                      |                        |  13. 查找/建立 User  |                      |
  |                      |                        |  14. 產生 JWT        |                      |
  |  15. 回傳 { access_token, user }              |                      |                      |
  |<--------------------------------------------------------------|                             |
  |  16. 儲存至 localStorage                      |                      |                      |
  |  17. 更新 UI 為已登入狀態                      |                      |                      |
  |                      |                        |                      |                      |
```

**流程步驟說明：**

| 步驟 | 描述 | 錯誤處理 |
|------|------|----------|
| 1 | 使用者點擊「Login」按鈕，`isLoading` 設為 `true`，按鈕文字變為 "Logging in..." 並禁用 | -- |
| 2-8 | Tauri Rust 端呼叫 `google_oauth_login` 命令，開啟系統瀏覽器進行 OAuth | 若 Google Client ID 未設定，回傳錯誤訊息 |
| 9 | Tauri 端取得 `id_token` 後回傳給前端 | 若使用者取消授權或逾時，`invoke` 拋出錯誤 |
| 10-14 | 前端以 `id_token` 呼叫後端 `POST /auth/google`，後端向 Google 驗證 token 有效性，查找或新建 User 記錄，產生 JWT | HTTP 401：token 無效；HTTP 500：伺服器錯誤 |
| 15-17 | 前端取得 `access_token` 與 `user` 資訊，存入 localStorage 並更新 Pinia store | -- |

### 6.2 登出流程

```
使用者                 authStore               localStorage
  |                      |                        |
  |  1. 點擊 Logout      |                        |
  |--------------------->|                        |
  |                      |  2. 清除 token/user     |
  |                      |  3. removeItem          |
  |                      |----------------------->|
  |  4. UI 切換為未登入   |                        |
  |<---------------------|                        |
```

| 步驟 | 描述 |
|------|------|
| 1 | 使用者點擊「Logout」文字按鈕 |
| 2 | `authStore.token` 與 `authStore.user` 設為 `null` |
| 3 | 移除 `localStorage` 中的 `laladog_token` 和 `laladog_user` |
| 4 | UI 自動切換為顯示「Login」按鈕（Vue 響應式更新） |

### 6.3 應用程式啟動恢復流程

```
App 啟動              authStore               localStorage
  |                      |                        |
  |  1. onMounted        |                        |
  |--------------------->|                        |
  |                      |  2. getItem             |
  |                      |----------------------->|
  |                      |  3. 回傳已存資料        |
  |                      |<-----------------------|
  |                      |  4. 若存在，恢復狀態     |
  |  5. UI 顯示已登入    |                        |
  |<---------------------|                        |
```

| 步驟 | 描述 |
|------|------|
| 1 | `AppLayout.vue` 的 `onMounted` 呼叫 `authStore.init()` |
| 2-3 | 從 `localStorage` 讀取 `laladog_token` 和 `laladog_user` |
| 4 | 若兩者皆存在，將值寫回 Pinia store（`token.value`、`user.value`） |
| 5 | `isLoggedIn` computed 屬性自動計算為 `true`，UI 顯示已登入狀態 |

---

## 7. 權限設定

| 條件 | 說明 |
|------|------|
| 未登入 | 所有本地功能正常運作（Collection 管理、Request 發送、環境變數、歷史記錄等），不可使用團隊協作功能 |
| 已登入 | 本地功能 + 團隊協作功能全部可用 |

---

## 8. 後端 API 介面摘要

### POST /auth/google

| 項目 | 說明 |
|------|------|
| 路徑 | `/auth/google` |
| 方法 | POST |
| 認證 | 不需要（此為登入端點） |

**Request Body：**

| 欄位 | 數據類型 | 必填 | 說明 |
|------|----------|------|------|
| id_token | string | 是 | 由 Tauri 端 Google OAuth 流程取得的 id_token |

**Response Body (200)：**

| 欄位 | 數據類型 | 說明 |
|------|----------|------|
| access_token | string | JWT token，有效期 7 天 |
| token_type | string | 固定值 `"bearer"` |
| user | object | 使用者資訊 |
| user.id | string (UUID) | 使用者 ID |
| user.email | string | Email |
| user.name | string | 顯示名稱 |
| user.picture | string \| null | 頭像 URL |

**錯誤回應：**

| HTTP 狀態碼 | 說明 |
|-------------|------|
| 401 | Google id_token 驗證失敗（Invalid Google token） |
| 500 | 伺服器內部錯誤 |

---

## 9. 資料模型

### Users 表

| 欄位 | 數據類型 | 約束 | 說明 |
|------|----------|------|------|
| id | string (UUID) | PK, auto-generated | 使用者主鍵 |
| email | string | UNIQUE, NOT NULL | Google 帳號 email |
| name | string | NOT NULL | Google 顯示名稱 |
| picture | string \| null | NULLABLE | Google 頭像 URL |
| google_id | string | UNIQUE, NOT NULL | Google 帳號唯一識別碼 (sub) |
| created_at | datetime | NOT NULL, auto | 建立時間（UTC） |

---

## 10. 前端狀態管理

### authStore (Pinia)

**檔案位置：** `src/stores/authStore.ts`

| 狀態 | 數據類型 | 初始值 | 說明 |
|------|----------|--------|------|
| user | `User \| null` | `null` | 目前登入的使用者資訊 |
| token | `string \| null` | `null` | JWT access token |
| isLoading | `boolean` | `false` | 登入流程進行中標記 |

| 計算屬性 | 數據類型 | 說明 |
|----------|----------|------|
| isLoggedIn | `boolean` | `!!token.value`，是否已登入 |

| 方法 | 說明 |
|------|------|
| `init()` | 從 localStorage 恢復登入狀態 |
| `loginWithGoogle()` | 觸發 Google OAuth 登入流程 |
| `logout()` | 清除登入狀態 |
| `authHeaders()` | 回傳帶 Authorization header 的物件，供其他 API 呼叫使用 |

### User 介面

```typescript
interface User {
  id: string
  email: string
  name: string
  picture?: string
}
```

---

## 11. Tauri 命令

### google_oauth_login

**檔案位置：** `src-tauri/src/commands/oauth.rs`

| 項目 | 說明 |
|------|------|
| 命令名稱 | `google_oauth_login` |
| 回傳型別 | `Result<String, String>` |
| 成功回傳 | Google id_token 字串 |
| 失敗回傳 | 錯誤訊息字串 |

**執行流程：**

1. 產生 Google OAuth 授權 URL（包含 client_id、redirect_uri、scope 等參數）
2. 開啟系統預設瀏覽器導向該 URL
3. 監聽 redirect callback（localhost 臨時 HTTP server 或 deep link）
4. 從 callback 中取得 authorization code
5. 以 authorization code 向 Google Token Endpoint 換取 id_token
6. 回傳 id_token 給前端

**所需環境變數：**

| 變數 | 說明 |
|------|------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console 的 OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console 的 OAuth 2.0 Client Secret |

---

## 12. 備註

1. **離線模式**：應用程式在未登入狀態下可完整使用所有本地功能，Google 登入僅為團隊協作功能的前置條件。
2. **JWT 有效期**：後端簽發的 JWT 有效期為 7 天（`JWT_EXPIRE_MINUTES = 10080`），過期後需重新登入。
3. **Token 驗證**：目前前端啟動時僅檢查 localStorage 是否有已保存的 token，不主動驗證 token 是否過期；token 過期時後端 API 會回傳 401，前端應於此時引導使用者重新登入。
4. **後端 API 基底位址**：硬編碼為 `http://localhost:8000`，定義於 `authStore.ts` 的 `API_BASE` 常數。
5. **Google OAuth 實作狀態**：Tauri 端的 `google_oauth_login` 命令目前為 placeholder，待 Google Cloud Console 設定完成後實作完整 OAuth 流程。
