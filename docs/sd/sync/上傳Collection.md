# 上傳 Collection

## 版本資訊

| 項目     | 說明                        |
| -------- | --------------------------- |
| API 路徑 | `POST /sync/collections`    |
| 版本     | v1.0                       |
| 建立日期 | 2026-03-03                 |
| 最後更新 | 2026-03-03                 |
| 狀態     | 已實作                     |

---

## 相關資料表

| 資料表              | 用途                                            |
| ------------------- | ----------------------------------------------- |
| shared_collections  | 新增一筆共享 Collection 記錄                    |
| team_members        | 驗證當前使用者是否為該團隊的 editor 或 owner    |

---

## API 總覽

上傳（建立）一個新的共享 Collection 到指定團隊。需要 JWT 認證，且當前使用者在該團隊的角色必須為 `editor` 或 `owner`。

---

## Request 規格

### HTTP Method & Path

```
POST /sync/collections
```

### Headers

| 名稱          | 必填 | 說明                       |
| ------------- | ---- | -------------------------- |
| Authorization | 是   | `Bearer {JWT token}`       |
| Content-Type  | 是   | `application/json`         |

### Path Parameters

無。

### Query Parameters

無。

### Request Body

```json
{
  "team_id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "name": "My New Collection",
  "data": "{\"folders\":[],\"requests\":[]}"
}
```

### Request Body 欄位說明

| 欄位    | 型別   | 必填 | 說明                                        |
| ------- | ------ | ---- | ------------------------------------------- |
| team_id | string | 是   | 目標團隊 ID（UUID）                         |
| name    | string | 是   | Collection 名稱                             |
| data    | string | 是   | Collection 樹狀結構的 JSON 字串             |

---

## Response 規格

### 成功回應 — 200 OK

回傳新建立的 SharedCollection 完整資料。

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "team_id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "name": "My New Collection",
  "data": "{\"folders\":[],\"requests\":[]}",
  "updated_by": "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "updated_at": "2026-03-03T08:30:00+00:00"
}
```

### 回應欄位說明

| 欄位       | 型別   | 說明                                    |
| ---------- | ------ | --------------------------------------- |
| id         | string | 新建立的 SharedCollection UUID          |
| team_id    | string | 所屬團隊 ID                             |
| name       | string | Collection 名稱                         |
| data       | string | Collection 樹狀結構的 JSON 字串         |
| updated_by | string | 建立者（當前使用者）的 ID               |
| updated_at | string | 建立時間（ISO 8601 格式）               |

---

## 實作說明

### 處理流程

1. 從 JWT token 中取得當前使用者 ID（`current_user["sub"]`）
2. 查詢 `team_members` 資料表，驗證該使用者在指定 `team_id` 中的角色為 `owner` 或 `editor`
3. 若角色不符（viewer 或非成員），回傳 403 錯誤
4. 建立新的 `SharedCollection` 記錄：
   - `id`：自動產生 UUID
   - `team_id`、`name`、`data`：來自 Request Body
   - `updated_by`：設為當前使用者 ID
   - `updated_at`：自動設為 UTC 當前時間
5. 寫入資料庫並回傳完整記錄

### 關鍵程式碼位置

- 路由函式：`backend/routers/sync.py` → `sync_collection()`
- 資料模型：`backend/models/team.py` → `SharedCollection`, `TeamMember`
- Request Schema：`backend/routers/sync.py` → `SyncCollectionRequest`

### 權限驗證邏輯

```python
result = await db.execute(
    select(TeamMember).where(
        TeamMember.team_id == body.team_id,
        TeamMember.user_id == user_id,
        TeamMember.role.in_(["owner", "editor"]),
    )
)
if not result.scalar_one_or_none():
    raise HTTPException(status_code=403, detail="Requires editor or owner role")
```

- 同時驗證成員資格與角色，viewer 或非成員皆會被拒絕

---

## 錯誤代碼

| HTTP 狀態碼 | 錯誤訊息                       | 觸發條件                                    |
| ----------- | ------------------------------ | ------------------------------------------- |
| 401         | Unauthorized                   | 未提供或無效的 JWT token                    |
| 403         | Requires editor or owner role  | 使用者不是團隊成員，或角色為 viewer         |
| 422         | Validation Error               | Request Body 格式錯誤或缺少必填欄位         |

---

## 測試案例

### 正常情境

| # | 測試案例                                     | 預期結果                                    |
| - | -------------------------------------------- | ------------------------------------------- |
| 1 | owner 角色上傳新 Collection                  | 200，回傳新建立的 Collection 完整資料        |
| 2 | editor 角色上傳新 Collection                 | 200，回傳新建立的 Collection 完整資料        |
| 3 | data 為空 JSON 物件字串 `"{}"`               | 200，成功建立                                |
| 4 | data 為包含巢狀結構的大型 JSON 字串          | 200，成功建立                                |

### 異常情境

| # | 測試案例                                     | 預期結果                                    |
| - | -------------------------------------------- | ------------------------------------------- |
| 1 | 未攜帶 JWT token                             | 401 Unauthorized                            |
| 2 | JWT token 過期或無效                         | 401 Unauthorized                            |
| 3 | viewer 角色嘗試上傳                          | 403 Requires editor or owner role           |
| 4 | 非團隊成員嘗試上傳                           | 403 Requires editor or owner role           |
| 5 | Request Body 缺少 `name` 欄位               | 422 Validation Error                        |
| 6 | Request Body 缺少 `team_id` 欄位            | 422 Validation Error                        |
| 7 | Request Body 缺少 `data` 欄位               | 422 Validation Error                        |

---

## 變更歷史

| 日期       | 版本 | 變更說明           | 修改者 |
| ---------- | ---- | ------------------ | ------ |
| 2026-03-03 | v1.0 | 初版建立           | —      |
