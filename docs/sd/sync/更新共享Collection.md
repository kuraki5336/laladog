# 更新共享 Collection

## 版本資訊

| 項目     | 說明                                          |
| -------- | --------------------------------------------- |
| API 路徑 | `PUT /sync/collections/{collection_id}`       |
| 版本     | v1.0                                         |
| 建立日期 | 2026-03-03                                   |
| 最後更新 | 2026-03-03                                   |
| 狀態     | 已實作                                       |

---

## 相關資料表

| 資料表              | 用途                                            |
| ------------------- | ----------------------------------------------- |
| shared_collections  | 更新指定的共享 Collection 記錄                  |
| team_members        | 驗證當前使用者是否為該團隊的 editor 或 owner    |

---

## API 總覽

更新一個已存在的共享 Collection。需要 JWT 認證，且當前使用者在該團隊的角色必須為 `editor` 或 `owner`。更新時會同步設定 `updated_by` 為當前使用者、`updated_at` 為當前時間。

---

## Request 規格

### HTTP Method & Path

```
PUT /sync/collections/{collection_id}
```

### Headers

| 名稱          | 必填 | 說明                       |
| ------------- | ---- | -------------------------- |
| Authorization | 是   | `Bearer {JWT token}`       |
| Content-Type  | 是   | `application/json`         |

### Path Parameters

| 參數          | 型別   | 必填 | 說明                          |
| ------------- | ------ | ---- | ----------------------------- |
| collection_id | string | 是   | 要更新的 Collection ID（UUID）|

### Query Parameters

無。

### Request Body

```json
{
  "team_id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "name": "Updated Collection Name",
  "data": "{\"folders\":[{\"name\":\"folder1\"}],\"requests\":[]}"
}
```

### Request Body 欄位說明

| 欄位    | 型別   | 必填 | 說明                                        |
| ------- | ------ | ---- | ------------------------------------------- |
| team_id | string | 是   | 團隊 ID（UUID），用於權限驗證               |
| name    | string | 是   | 更新後的 Collection 名稱                    |
| data    | string | 是   | 更新後的 Collection 樹狀結構 JSON 字串      |

---

## Response 規格

### 成功回應 — 200 OK

回傳更新後的 SharedCollection 完整資料。

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "team_id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "name": "Updated Collection Name",
  "data": "{\"folders\":[{\"name\":\"folder1\"}],\"requests\":[]}",
  "updated_by": "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "updated_at": "2026-03-03T10:15:00+00:00"
}
```

### 回應欄位說明

| 欄位       | 型別   | 說明                                    |
| ---------- | ------ | --------------------------------------- |
| id         | string | SharedCollection 的 UUID                |
| team_id    | string | 所屬團隊 ID                             |
| name       | string | 更新後的 Collection 名稱                |
| data       | string | 更新後的 Collection 樹狀結構 JSON 字串  |
| updated_by | string | 執行更新的使用者 ID                     |
| updated_at | string | 更新時間（ISO 8601 格式）               |

---

## 實作說明

### 處理流程

1. 從 JWT token 中取得當前使用者 ID（`current_user["sub"]`）
2. 查詢 `team_members` 資料表，驗證該使用者在 Request Body 中指定的 `team_id` 團隊中角色為 `owner` 或 `editor`
3. 若角色不符（viewer 或非成員），回傳 403 錯誤
4. 以 `collection_id` 查詢 `shared_collections` 資料表
5. 若找不到該 Collection，回傳 404 錯誤
6. 更新 Collection 的以下欄位：
   - `name`：來自 Request Body
   - `data`：來自 Request Body
   - `updated_by`：設為當前使用者 ID
   - `updated_at`：設為 UTC 當前時間（`datetime.now(timezone.utc)`）
7. 寫入資料庫並回傳更新後的完整記錄

### 關鍵程式碼位置

- 路由函式：`backend/routers/sync.py` → `update_shared_collection()`
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

- 權限驗證使用 Request Body 中的 `team_id`，而非從 Collection 記錄中取得

### 更新邏輯

```python
collection.name = body.name
collection.data = body.data
collection.updated_by = user_id
collection.updated_at = datetime.now(timezone.utc)
await db.commit()
```

---

## 錯誤代碼

| HTTP 狀態碼 | 錯誤訊息                       | 觸發條件                                    |
| ----------- | ------------------------------ | ------------------------------------------- |
| 401         | Unauthorized                   | 未提供或無效的 JWT token                    |
| 403         | Requires editor or owner role  | 使用者不是團隊成員，或角色為 viewer         |
| 404         | Collection not found           | 指定的 collection_id 不存在                 |
| 422         | Validation Error               | Request Body 格式錯誤或缺少必填欄位         |

---

## 測試案例

### 正常情境

| # | 測試案例                                     | 預期結果                                        |
| - | -------------------------------------------- | ----------------------------------------------- |
| 1 | owner 角色更新 Collection 名稱               | 200，回傳更新後的 Collection，name 已變更        |
| 2 | editor 角色更新 Collection data              | 200，回傳更新後的 Collection，data 已變更        |
| 3 | 同時更新 name 和 data                        | 200，兩個欄位皆已更新                            |
| 4 | 確認 updated_by 為當前使用者 ID              | 200，updated_by 為執行更新的使用者               |
| 5 | 確認 updated_at 已更新為新時間               | 200，updated_at 為最新的 UTC 時間                |

### 異常情境

| # | 測試案例                                     | 預期結果                                        |
| - | -------------------------------------------- | ----------------------------------------------- |
| 1 | 未攜帶 JWT token                             | 401 Unauthorized                                |
| 2 | JWT token 過期或無效                         | 401 Unauthorized                                |
| 3 | viewer 角色嘗試更新                          | 403 Requires editor or owner role               |
| 4 | 非團隊成員嘗試更新                           | 403 Requires editor or owner role               |
| 5 | collection_id 不存在                         | 404 Collection not found                        |
| 6 | Request Body 缺少必填欄位                    | 422 Validation Error                            |

---

## 變更歷史

| 日期       | 版本 | 變更說明           | 修改者 |
| ---------- | ---- | ------------------ | ------ |
| 2026-03-03 | v1.0 | 初版建立           | —      |
