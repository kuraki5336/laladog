# Google 登入 API

## 版本資訊

| 項目       | 內容                       |
| ---------- | -------------------------- |
| API 名稱   | Google OAuth 登入          |
| 版本       | 1.0.0                     |
| 最後更新   | 2026-03-03                 |
| 負責人     | —                          |
| 狀態       | 已實作                     |

---

## 相關資料表

### users

| 欄位       | 型別          | 約束               | 說明                         |
| ---------- | ------------- | ------------------ | ---------------------------- |
| id         | String (UUID) | PK, 自動產生       | 使用者唯一識別碼（UUID v4）  |
| email      | String        | UNIQUE, NOT NULL   | 使用者電子郵件               |
| name       | String        | NOT NULL           | 使用者顯示名稱               |
| picture    | String        | NULLABLE           | 使用者頭像 URL               |
| google_id  | String        | UNIQUE, NOT NULL   | Google 帳號唯一識別碼（sub） |
| created_at | DateTime      | 自動產生（UTC）    | 帳號建立時間                 |

---

## API 總覽

| 項目         | 內容                                       |
| ------------ | ------------------------------------------ |
| 端點         | `POST /auth/google`                        |
| 說明         | 使用 Google id_token 驗證身份並登入或註冊  |
| 認證需求     | 不需要                                     |
| Content-Type | `application/json`                         |
| 標籤         | auth                                       |

### 流程概述

```
前端（Tauri）                       後端（FastAPI）                    Google API
    |                                   |                                  |
    |  1. 使用者點擊 Google 登入        |                                  |
    |  2. 取得 Google id_token          |                                  |
    |                                   |                                  |
    |  3. POST /auth/google             |                                  |
    |   { id_token: "xxx" }             |                                  |
    |---------------------------------->|                                  |
    |                                   |  4. GET /tokeninfo?id_token=xxx  |
    |                                   |--------------------------------->|
    |                                   |  5. 回傳 Google 使用者資訊       |
    |                                   |<---------------------------------|
    |                                   |                                  |
    |                                   |  6. Upsert 使用者                |
    |                                   |  7. 簽發 JWT                     |
    |                                   |                                  |
    |  8. 回傳 access_token + user      |                                  |
    |<----------------------------------|                                  |
```

---

## Request 規格

### HTTP 方法與路徑

```
POST /auth/google
```

### Request Headers

| Header         | 值                 | 必填 | 說明         |
| -------------- | ------------------ | ---- | ------------ |
| Content-Type   | application/json   | 是   | 請求格式     |

### Request Body

| 欄位     | 型別   | 必填 | 說明                                          |
| -------- | ------ | ---- | --------------------------------------------- |
| id_token | String | 是   | 前端透過 Google OAuth 流程取得的 id_token 字串 |

### Request Body 範例

```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiYXpwIjoiMTIzNDU2Nzg5MC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsImF1ZCI6IjEyMzQ1Njc4OTAuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTc3MzAxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGdtYWlsLmNvbSIsIm5hbWUiOiJKb2huIERvZSIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9kZWZhdWx0IiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE2MTYyNDI2MjJ9.signature"
}
```

### Pydantic Schema

```python
class GoogleTokenRequest(BaseModel):
    """從前端 Tauri 取得的 Google OAuth token"""
    id_token: str
```

---

## Response 規格

### 成功回應（200 OK）

| 欄位                | 型別   | 說明                                |
| ------------------- | ------ | ----------------------------------- |
| access_token        | String | JWT access token                    |
| token_type          | String | 固定值 `"bearer"`                   |
| user                | Object | 使用者資訊物件                      |
| user.id             | String | 使用者 ID（UUID v4）                |
| user.email          | String | 使用者電子郵件                      |
| user.name           | String | 使用者顯示名稱                      |
| user.picture        | String \| null | 使用者頭像 URL               |

### 成功回應範例

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBhOGQwMC0xYjJjLTRkM2UtYTRmNS02Nzg5MGFiY2RlZjAiLCJlbWFpbCI6InVzZXJAZ21haWwuY29tIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNjE2ODQzODIyfQ.signature",
  "token_type": "bearer",
  "user": {
    "id": "550a8d00-1b2c-4d3e-a4f5-67890abcdef0",
    "email": "user@gmail.com",
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/a/default"
  }
}
```

### Pydantic Schema

```python
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
```

### 錯誤回應

#### 401 Unauthorized — Google token 驗證失敗

```json
{
  "detail": "Invalid Google token"
}
```

#### 422 Unprocessable Entity — 請求格式不正確

```json
{
  "detail": [
    {
      "loc": ["body", "id_token"],
      "msg": "Field required",
      "type": "missing"
    }
  ]
}
```

---

## 實作說明

### 程式碼位置

- **路由**：`backend/routers/auth.py`
- **模型**：`backend/models/user.py`
- **安全工具**：`backend/core/security.py`
- **設定**：`backend/core/config.py`

### 處理流程

#### Step 1：接收 id_token

接收前端傳入的 `id_token`，由 Pydantic 自動驗證請求格式。

#### Step 2：向 Google 驗證 id_token

使用 `httpx.AsyncClient` 向 Google tokeninfo API 發送 GET 請求：

```
GET https://oauth2.googleapis.com/tokeninfo?id_token={id_token}
```

- 若 Google 回傳 HTTP 200，表示 token 有效，取得使用者資訊
- 若 Google 回傳非 200，拋出 `HTTPException(401, "Invalid Google token")`

#### Step 3：提取 Google 使用者資訊

從 Google 回傳的 JSON 中提取以下欄位：

| Google 欄位 | 對應用途           | 備註                         |
| ----------- | ------------------ | ---------------------------- |
| `sub`       | `google_id`        | Google 帳號唯一識別碼        |
| `email`     | `email`            | 使用者電子郵件               |
| `name`      | `name`             | 若無則以 email 作為預設值    |
| `picture`   | `picture`          | 使用者頭像 URL，可能為 null  |

#### Step 4：Upsert 使用者

以 `google_id` 查詢 `users` 資料表：

- **使用者不存在**：建立新的 `User` 記錄，包含 email、name、picture、google_id，`id` 自動產生 UUID v4，`created_at` 自動設定為當前 UTC 時間
- **使用者已存在**：更新 `name` 與 `picture` 欄位，確保與 Google 帳號資訊同步

#### Step 5：簽發 JWT

呼叫 `create_access_token()` 產生 JWT：

```python
token = create_access_token({
    "sub": user.id,      # UUID 字串
    "email": user.email,
    "name": user.name
})
```

JWT 簽發邏輯（`security.py`）：

- 複製傳入的 claims dict
- 加入 `exp` claim：當前 UTC 時間 + `JWT_EXPIRE_MINUTES`（預設 10080 分鐘 = 7 天）
- 使用 `JWT_SECRET` 與 `JWT_ALGORITHM`（HS256）簽名
- 回傳編碼後的 JWT 字串

#### Step 6：回傳 TokenResponse

組裝回應物件，包含 `access_token`、`token_type`（固定為 `"bearer"`）、以及 `user` 物件（id、email、name、picture）。

---

## 錯誤代碼

| HTTP 狀態碼 | 錯誤訊息              | 觸發條件                                        | 處理建議                           |
| ----------- | --------------------- | ----------------------------------------------- | ---------------------------------- |
| 401         | Invalid Google token  | Google tokeninfo API 回傳非 200 狀態碼          | 前端提示使用者重新進行 Google 登入 |
| 422         | Validation Error      | 請求 body 缺少 `id_token` 欄位或格式不符        | 前端檢查請求格式是否正確           |
| 500         | Internal Server Error | 資料庫寫入失敗或 Google API 無法連線等非預期錯誤 | 檢查伺服器日誌，確認資料庫與網路狀態 |

---

## 測試案例

### TC-1：首次 Google 登入（新使用者註冊）

| 項目       | 內容                                                     |
| ---------- | -------------------------------------------------------- |
| 前置條件   | 資料庫中不存在該 Google 帳號的使用者                     |
| 測試步驟   | 發送 `POST /auth/google`，body 為有效的 `id_token`       |
| 預期結果   | 回傳 200，新建使用者記錄，回傳 `access_token` 與使用者資訊 |
| 驗證要點   | 1. 資料庫新增一筆 `users` 記錄<br>2. 回傳的 `user.id` 為合法 UUID<br>3. `access_token` 可被正確解碼 |

### TC-2：再次 Google 登入（既有使用者）

| 項目       | 內容                                                               |
| ---------- | ------------------------------------------------------------------ |
| 前置條件   | 資料庫中已存在該 Google 帳號的使用者                               |
| 測試步驟   | 發送 `POST /auth/google`，body 為有效的 `id_token`                 |
| 預期結果   | 回傳 200，不新建使用者，更新 `name` 與 `picture`，回傳 JWT         |
| 驗證要點   | 1. 資料庫 `users` 記錄數量不變<br>2. `name` 與 `picture` 已更新<br>3. 回傳的 `user.id` 與既有記錄一致 |

### TC-3：無效的 Google id_token

| 項目       | 內容                                                   |
| ---------- | ------------------------------------------------------ |
| 前置條件   | 無                                                     |
| 測試步驟   | 發送 `POST /auth/google`，body 為無效或過期的 `id_token` |
| 預期結果   | 回傳 401，body 為 `{"detail": "Invalid Google token"}` |
| 驗證要點   | 1. 資料庫無任何新增記錄<br>2. 回傳 401 狀態碼          |

### TC-4：缺少 id_token 欄位

| 項目       | 內容                                                   |
| ---------- | ------------------------------------------------------ |
| 前置條件   | 無                                                     |
| 測試步驟   | 發送 `POST /auth/google`，body 為空 `{}` 或缺少 `id_token` |
| 預期結果   | 回傳 422 Validation Error                              |
| 驗證要點   | 1. 錯誤訊息指出 `id_token` 欄位缺失                    |

### TC-5：Google 帳號無 name 欄位

| 項目       | 內容                                                               |
| ---------- | ------------------------------------------------------------------ |
| 前置條件   | Google 帳號的 tokeninfo 回傳中不包含 `name` 欄位                   |
| 測試步驟   | 發送 `POST /auth/google`，模擬 Google 回傳無 `name` 的情境         |
| 預期結果   | 回傳 200，使用者的 `name` 欄位以 `email` 作為預設值                |
| 驗證要點   | 1. 資料庫中的 `name` 等於 `email`<br>2. 回傳的 `user.name` 等於 `email` |

### TC-6：JWT Token 內容驗證

| 項目       | 內容                                                                 |
| ---------- | -------------------------------------------------------------------- |
| 前置條件   | 成功登入取得 `access_token`                                          |
| 測試步驟   | 解碼回傳的 `access_token`                                            |
| 預期結果   | JWT payload 包含正確的 `sub`、`email`、`name`、`exp` claims          |
| 驗證要點   | 1. `sub` 等於使用者 ID<br>2. `exp` 為當前時間 + 7 天<br>3. 使用 HS256 演算法 |

---

## 變更歷史

| 日期       | 版本  | 說明             | 修改人 |
| ---------- | ----- | ---------------- | ------ |
| 2026-03-03 | 1.0.0 | 初版建立         | —      |
