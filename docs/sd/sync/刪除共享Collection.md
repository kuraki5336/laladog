# 刪除共享 Collection

## 版本資訊

| 項目     | 說明                                            |
| -------- | ----------------------------------------------- |
| API 路徑 | `DELETE /sync/collections/{collection_id}`      |
| 版本     | v1.0                                           |
| 建立日期 | 2026-03-03                                     |
| 最後更新 | 2026-03-03                                     |
| 狀態     | 已實作                                         |

---

## 相關資料表

| 資料表              | 用途                                                    |
| ------------------- | ------------------------------------------------------- |
| shared_collections  | 刪除指定的共享 Collection 記錄                          |
| team_members        | 驗證當前使用者是否為該 Collection 所屬團隊的 owner      |

---

## API 總覽

刪除一個已存在的共享 Collection。需要 JWT 認證，且當前使用者在該 Collection 所屬團隊的角色必須為 `owner`。此為最高權限操作，`editor` 和 `viewer` 皆無法執行。

---

## Request 規格

### HTTP Method & Path

```
DELETE /sync/collections/{collection_id}
```

### Headers

| 名稱          | 必填 | 說明                       |
| ------------- | ---- | -------------------------- |
| Authorization | 是   | `Bearer {JWT token}`       |

### Path Parameters

| 參數          | 型別   | 必填 | 說明                          |
| ------------- | ------ | ---- | ----------------------------- |
| collection_id | string | 是   | 要刪除的 Collection ID（UUID）|

### Query Parameters

無。

### Request Body

無。

---

## Response 規格

### 成功回應 — 200 OK

回傳刪除成功訊息。

```json
{
  "message": "Collection deleted"
}
```

### 回應欄位說明

| 欄位    | 型別   | 說明               |
| ------- | ------ | ------------------ |
| message | string | 操作結果訊息       |

---

## 實作說明

### 處理流程

1. 從 JWT token 中取得當前使用者 ID（`current_user["sub"]`）
2. 以 `collection_id` 查詢 `shared_collections` 資料表
3. 若找不到該 Collection，回傳 404 錯誤
4. 從找到的 Collection 記錄中取得 `team_id`
5. 查詢 `team_members` 資料表，驗證該使用者在對應團隊中的角色是否為 `owner`
6. 若角色不是 `owner`，回傳 403 錯誤
7. 刪除該 Collection 記錄並提交資料庫變更

### 關鍵程式碼位置

- 路由函式：`backend/routers/sync.py` → `delete_shared_collection()`
- 資料模型：`backend/models/team.py` → `SharedCollection`, `TeamMember`

### 權限驗證邏輯

本 API 的權限驗證流程與其他 Sync API 不同——先查 Collection 再驗權限，且角色限定為 `owner`：

```python
# Step 1: 先查詢 Collection 是否存在
result = await db.execute(
    select(SharedCollection).where(SharedCollection.id == collection_id)
)
collection = result.scalar_one_or_none()
if not collection:
    raise HTTPException(status_code=404, detail="Collection not found")

# Step 2: 從 Collection 取得 team_id，驗證 owner 角色
result = await db.execute(
    select(TeamMember).where(
        TeamMember.team_id == collection.team_id,
        TeamMember.user_id == user_id,
        TeamMember.role == "owner",
    )
)
if not result.scalar_one_or_none():
    raise HTTPException(status_code=403, detail="Only owner can delete")
```

- `team_id` 從 Collection 記錄中取得，而非從 Request Body
- 僅允許 `owner` 角色，`editor` 也不可刪除

### 刪除邏輯

```python
await db.delete(collection)
await db.commit()
```

- 使用 SQLAlchemy 的 `db.delete()` 直接刪除 ORM 物件

---

## 錯誤代碼

| HTTP 狀態碼 | 錯誤訊息                  | 觸發條件                                      |
| ----------- | ------------------------- | --------------------------------------------- |
| 401         | Unauthorized              | 未提供或無效的 JWT token                      |
| 403         | Only owner can delete     | 使用者不是團隊 owner（包含 editor / viewer / 非成員） |
| 404         | Collection not found      | 指定的 collection_id 不存在                   |

---

## 測試案例

### 正常情境

| # | 測試案例                                     | 預期結果                                    |
| - | -------------------------------------------- | ------------------------------------------- |
| 1 | owner 角色刪除 Collection                    | 200，回傳 `{"message": "Collection deleted"}` |
| 2 | 刪除後再次查詢該 Collection                  | 404 Collection not found                    |
| 3 | 刪除後列出團隊 Collection，確認已不包含      | 200，回傳的列表中不再包含已刪除的 Collection |

### 異常情境

| # | 測試案例                                     | 預期結果                                    |
| - | -------------------------------------------- | ------------------------------------------- |
| 1 | 未攜帶 JWT token                             | 401 Unauthorized                            |
| 2 | JWT token 過期或無效                         | 401 Unauthorized                            |
| 3 | editor 角色嘗試刪除                          | 403 Only owner can delete                   |
| 4 | viewer 角色嘗試刪除                          | 403 Only owner can delete                   |
| 5 | 非團隊成員嘗試刪除                           | 403 Only owner can delete                   |
| 6 | collection_id 不存在                         | 404 Collection not found                    |
| 7 | 重複刪除同一個 Collection                    | 404 Collection not found（第二次）          |

---

## 變更歷史

| 日期       | 版本 | 變更說明           | 修改者 |
| ---------- | ---- | ------------------ | ------ |
| 2026-03-03 | v1.0 | 初版建立           | —      |
