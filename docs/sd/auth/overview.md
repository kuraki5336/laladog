# Auth 模組 — 系統設計總覽

## 版本資訊

| 項目       | 內容                     |
| ---------- | ------------------------ |
| 模組名稱   | Auth（認證模組）         |
| 版本       | 1.0.0                   |
| 最後更新   | 2026-03-03               |
| 負責人     | —                        |
| 狀態       | 已實作                   |

---

## 功能概述

Auth 模組負責 LalaDog 應用程式的使用者認證功能。採用 Google OAuth 2.0 作為唯一的登入方式，前端（Tauri 桌面應用）取得 Google `id_token` 後，透過後端 API 驗證身份並取得 JWT access token，後續所有受保護的 API 請求皆以此 JWT 進行身份驗證。

### 技術架構

- **後端框架**：FastAPI（Python）
- **ORM**：SQLAlchemy 2.0 async
- **資料庫**：SQLite（透過 aiosqlite 非同步驅動）
- **認證方式**：Google OAuth 2.0 + JWT
- **JWT 套件**：python-jose
- **HTTP 客戶端**：httpx（非同步呼叫 Google API）

---

## 使用者故事

| 編號 | 角色   | 故事                                                                 | 驗收條件                                                       |
| ---- | ------ | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| US-1 | 使用者 | 身為使用者，我希望透過 Google 帳號登入，以便快速使用系統而不需額外註冊 | 點擊 Google 登入後，系統自動建立帳號並回傳 JWT token           |
| US-2 | 使用者 | 身為使用者，我希望再次登入時系統能辨識我的身份                       | 相同 Google 帳號登入時，系統不會重複建立帳號，並更新最新個人資訊 |
| US-3 | 使用者 | 身為使用者，我希望登入後的 token 在一段時間後自動失效以確保安全       | JWT token 在設定的有效期限（預設 7 天）後過期                   |

---

## 功能需求

### FR-1：Google OAuth 登入

- 前端透過 Google OAuth 流程取得 `id_token`
- 後端接收 `id_token` 並向 Google tokeninfo API 驗證其有效性
- 驗證成功後，提取使用者資訊（google_id、email、name、picture）

### FR-2：使用者自動建立 / 更新

- 若該 Google 帳號首次登入，系統自動建立使用者記錄（Upsert）
- 若該 Google 帳號已存在，更新使用者的 `name` 與 `picture` 欄位

### FR-3：JWT Token 簽發

- 驗證成功後，簽發包含使用者資訊的 JWT access token
- Token 包含 `sub`（使用者 ID）、`email`、`name`、`exp`（過期時間）等 claims
- 使用 HS256 演算法簽名

---

## API 端點總覽

| 方法 | 路徑           | 說明                     | 認證需求 | 文件                      |
| ---- | -------------- | ------------------------ | -------- | ------------------------- |
| POST | `/auth/google` | Google OAuth 登入/註冊   | 不需要   | [Google登入.md](./Google登入.md) |

---

## 資料結構

### User 資料表

| 欄位       | 型別        | 約束                    | 說明                   |
| ---------- | ----------- | ----------------------- | ---------------------- |
| id         | String (UUID) | PK, 自動產生            | 使用者唯一識別碼（UUID v4） |
| email      | String      | UNIQUE, NOT NULL        | 使用者電子郵件         |
| name       | String      | NOT NULL                | 使用者顯示名稱         |
| picture    | String      | NULLABLE                | 使用者頭像 URL         |
| google_id  | String      | UNIQUE, NOT NULL        | Google 帳號唯一識別碼  |
| created_at | DateTime    | 自動產生（UTC）         | 帳號建立時間           |

**SQLAlchemy Model 路徑**：`backend/models/user.py`

**資料表名稱**：`users`

### JWT Token 結構

| Claim | 型別   | 說明                         |
| ----- | ------ | ---------------------------- |
| sub   | String | 使用者 ID（UUID）            |
| email | String | 使用者電子郵件               |
| name  | String | 使用者顯示名稱               |
| exp   | Number | Token 過期時間（Unix timestamp） |

---

## 業務規則

| 編號 | 規則                                                                      |
| ---- | ------------------------------------------------------------------------- |
| BR-1 | 僅支援 Google OAuth 登入，不支援帳號密碼登入                              |
| BR-2 | 使用者以 `google_id` 作為唯一識別，同一個 Google 帳號不會建立重複使用者   |
| BR-3 | 每次登入時更新使用者的 `name` 與 `picture`，確保與 Google 帳號資訊同步    |
| BR-4 | JWT 有效期限預設為 7 天（10080 分鐘），可透過環境變數 `JWT_EXPIRE_MINUTES` 調整 |
| BR-5 | JWT 使用 HS256 演算法簽名，密鑰透過環境變數 `JWT_SECRET` 設定            |
| BR-6 | 若使用者的 Google 帳號沒有 `name`，則以 `email` 作為預設名稱              |

---

## 權限控制

| API 端點         | 認證需求 | 說明                                           |
| ---------------- | -------- | ---------------------------------------------- |
| `POST /auth/google` | 不需要   | 此為登入 API，不需要預先認證                   |
| 其他受保護 API   | 需要     | 需在 Header 帶入 `Authorization: Bearer {token}` |

### 認證流程

1. 前端透過 Google OAuth 取得 `id_token`
2. 前端呼叫 `POST /auth/google` 傳送 `id_token`
3. 後端驗證 `id_token` 並回傳 JWT `access_token`
4. 前端將 `access_token` 存儲於本地
5. 後續 API 請求於 Header 加入 `Authorization: Bearer {access_token}`
6. 後端透過 `get_current_user` 依賴項驗證並解析 JWT

---

## 錯誤代碼

| HTTP 狀態碼 | 錯誤訊息                    | 說明                                   |
| ----------- | --------------------------- | -------------------------------------- |
| 401         | Invalid Google token        | Google id_token 驗證失敗（過期或偽造） |
| 401         | Invalid or expired token    | JWT token 無效或已過期                 |
| 422         | Validation Error            | 請求格式不正確（缺少必要欄位）         |

---

## 相關設定

| 環境變數             | 預設值                    | 說明                   |
| -------------------- | ------------------------- | ---------------------- |
| `JWT_SECRET`         | `change-me-in-production` | JWT 簽名密鑰           |
| `JWT_ALGORITHM`      | `HS256`                   | JWT 簽名演算法         |
| `JWT_EXPIRE_MINUTES` | `10080`（7 天）           | JWT 有效期限（分鐘）   |
| `GOOGLE_CLIENT_ID`   | —                         | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | —                       | Google OAuth Client Secret |

---

## 相關檔案

| 檔案路徑                       | 說明                       |
| ------------------------------ | -------------------------- |
| `backend/routers/auth.py`      | Auth API 路由              |
| `backend/models/user.py`       | User ORM 模型              |
| `backend/core/security.py`     | JWT 工具函式               |
| `backend/core/config.py`       | 應用程式設定               |
| `backend/core/database.py`     | 資料庫連線設定             |

---

## 變更歷史

| 日期       | 版本  | 說明             | 修改人 |
| ---------- | ----- | ---------------- | ------ |
| 2026-03-03 | 1.0.0 | 初版建立         | —      |
