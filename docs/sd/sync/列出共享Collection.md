# 列出共享 Collection

## 版本資訊

| 項目     | 說明                           |
| -------- | ------------------------------ |
| API 路徑 | `GET /sync/{team_id}/collections` |
| 版本     | v1.0                          |
| 建立日期 | 2026-03-03                    |
| 最後更新 | 2026-03-03                    |
| 狀態     | 已實作                        |

---

## 相關資料表

| 資料表              | 用途                                |
| ------------------- | ----------------------------------- |
| shared_collections  | 查詢指定團隊下的所有共享 Collection |
| team_members        | 驗證當前使用者是否為該團隊成員      |

---

## API 總覽

列出指定團隊的所有共享 Collection。需要 JWT 認證，且當前使用者必須是該團隊的成員（任意角色皆可）。

---

## Request 規格

### HTTP Method & Path

```
GET /sync/{team_id}/collections
```

### Headers

| 名稱          | 必填 | 說明                       |
| ------------- | ---- | -------------------------- |
| Authorization | 是   | `Bearer {JWT token}`       |

### Path Parameters

| 參數    | 型別   | 必填 | 說明              |
| ------- | ------ | ---- | ----------------- |
| team_id | string | 是   | 團隊 ID（UUID）   |

### Query Parameters

無。

### Request Body

無。

---

## Response 規格

### 成功回應 — 200 OK

回傳該團隊的所有共享 Collection 陣列。

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "team_id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "name": "My Collection",
    "data": "{\"folders\":[],\"requests\":[]}",
    "updated_by": "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "updated_at": "2026-03-03T08:30:00+00:00"
  }
]
```

### 回應欄位說明

| 欄位       | 型別   | 說明                                    |
| ---------- | ------ | --------------------------------------- |
| id         | string | SharedCollection 的 UUID                |
| team_id    | string | 所屬團隊 ID                             |
| name       | string | Collection 名稱                         |
| data       | string | Collection 樹狀結構的 JSON 字串         |
| updated_by | string | 最後更新者的使用者 ID                   |
| updated_at | string | 最後更新時間（ISO 8601 格式）           |

---

## 實作說明

### 處理流程

1. 從 JWT token 中取得當前使用者 ID（`current_user["sub"]`）
2. 查詢 `team_members` 資料表，驗證該使用者是否為指定 `team_id` 的成員
3. 若不是成員，回傳 403 錯誤
4. 查詢 `shared_collections` 資料表，取得該 `team_id` 下的所有記錄
5. 將結果轉換為 `CollectionResponse` 格式回傳，`updated_at` 轉為 ISO 8601 字串

### 關鍵程式碼位置

- 路由函式：`backend/routers/sync.py` → `list_shared_collections()`
- 資料模型：`backend/models/team.py` → `SharedCollection`, `TeamMember`

### 權限驗證邏輯

```python
result = await db.execute(
    select(TeamMember).where(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    )
)
if not result.scalar_one_or_none():
    raise HTTPException(status_code=403, detail="Not a team member")
```

- 僅檢查是否為團隊成員，不限制角色（admin / editor / viewer 皆可）

---

## 錯誤代碼

| HTTP 狀態碼 | 錯誤訊息               | 觸發條件                           |
| ----------- | ---------------------- | ---------------------------------- |
| 401         | Unauthorized           | 未提供或無效的 JWT token           |
| 403         | Not a team member      | 當前使用者不是指定團隊的成員       |

---

## 測試案例

### 正常情境

| # | 測試案例                              | 預期結果                               |
| - | ------------------------------------- | -------------------------------------- |
| 1 | admin 角色列出團隊的 Collection       | 200，回傳該團隊所有 Collection 陣列     |
| 2 | editor 角色列出團隊的 Collection      | 200，回傳該團隊所有 Collection 陣列     |
| 3 | viewer 角色列出團隊的 Collection      | 200，回傳該團隊所有 Collection 陣列     |
| 4 | 團隊無任何 Collection                 | 200，回傳空陣列 `[]`                   |

### 異常情境

| # | 測試案例                              | 預期結果                               |
| - | ------------------------------------- | -------------------------------------- |
| 1 | 未攜帶 JWT token                      | 401 Unauthorized                       |
| 2 | JWT token 過期或無效                  | 401 Unauthorized                       |
| 3 | 使用者不是該團隊成員                  | 403 Not a team member                  |
| 4 | team_id 不存在                        | 200，回傳空陣列（無資料）              |

---

## 變更歷史

| 日期       | 版本 | 變更說明           | 修改者 |
| ---------- | ---- | ------------------ | ------ |
| 2026-03-03 | v1.0 | 初版建立           | —      |
