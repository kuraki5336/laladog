# Sync 模組 — 系統設計總覽

## 模組資訊

| 項目       | 說明                                          |
| ---------- | --------------------------------------------- |
| 模組名稱   | Sync（共享 Collection & 環境變數同步）         |
| 路由前綴   | `/sync`                                       |
| 負責功能   | 團隊共享 Collection 與環境變數的同步管理       |
| 技術棧     | FastAPI + SQLAlchemy Async + PostgreSQL + JWT Auth |
| 建立日期   | 2026-03-03                                    |
| 最後更新   | 2026-03-14                                    |

---

## 相關資料表

### shared_collections

| 欄位        | 型別     | 說明                                   |
| ----------- | -------- | -------------------------------------- |
| id          | String (UUID, PK) | 主鍵，自動產生 UUID              |
| team_id     | String (FK → teams.id) | 所屬團隊，CASCADE 刪除       |
| name        | String   | Collection 名稱                        |
| data        | Text     | Collection 樹狀結構的 JSON 字串，預設 `{}` |
| updated_by  | String (FK → users.id) | 最後更新者的使用者 ID         |
| updated_at  | DateTime | 最後更新時間，預設 UTC now              |

### shared_environments

| 欄位        | 型別     | 說明                                   |
| ----------- | -------- | -------------------------------------- |
| id          | String (UUID, PK) | 主鍵，自動產生 UUID              |
| team_id     | String (FK → teams.id) | 所屬團隊，CASCADE 刪除       |
| data        | Text     | 環境變數 JSON 字串，預設 `[]`           |
| updated_by  | String (FK → users.id) | 最後更新者的使用者 ID         |
| updated_at  | DateTime | 最後更新時間，預設 UTC now              |

### team_members（依賴）

| 欄位      | 型別     | 說明                                    |
| --------- | -------- | --------------------------------------- |
| id        | String (UUID, PK) | 主鍵，自動產生 UUID               |
| team_id   | String (FK → teams.id) | 所屬團隊，CASCADE 刪除        |
| user_id   | String (FK → users.id) | 成員的使用者 ID               |
| role      | String   | 角色：`admin` / `editor` / `viewer`     |
| joined_at | DateTime | 加入時間，預設 UTC now                   |

---

## API 端點總覽

| 方法   | 路徑                                | 功能說明               | 最低權限要求        | 文件連結                          |
| ------ | ----------------------------------- | ---------------------- | ------------------- | --------------------------------- |
| GET    | `/sync/{team_id}/collections`       | 列出團隊共享 Collection | team member (任意角色) | [列出共享Collection](./列出共享Collection.md) |
| POST   | `/sync/collections`                 | 上傳新的共享 Collection | admin / editor      | [上傳Collection](./上傳Collection.md)         |
| PUT    | `/sync/collections/{collection_id}` | 更新共享 Collection     | admin / editor      | [更新共享Collection](./更新共享Collection.md) |
| DELETE | `/sync/collections/{collection_id}` | 刪除共享 Collection     | admin               | [刪除共享Collection](./刪除共享Collection.md) |
| GET    | `/sync/{team_id}/environments`      | 取得團隊環境變數         | team member (任意角色) | [取得共享環境變數](./取得共享環境變數.md)       |
| PUT    | `/sync/{team_id}/environments`      | 更新團隊環境變數         | admin / editor      | [更新共享環境變數](./更新共享環境變數.md)       |

---

## 權限模型

本模組的所有 API 皆需要 JWT 認證（透過 `get_current_user` 依賴注入）。各端點的權限依據 `team_members.role` 欄位控制：

### Collection API

| 角色     | 列出 | 上傳 | 更新 | 刪除 |
| -------- | ---- | ---- | ---- | ---- |
| admin    | O    | O    | O    | O    |
| editor   | O    | O    | O    | X    |
| viewer   | O    | X    | X    | X    |
| 非成員   | X    | X    | X    | X    |

### 環境變數 API

| 角色     | 取得 | 更新 |
| -------- | ---- | ---- |
| admin    | O    | O    |
| editor   | O    | O    |
| viewer   | O    | X    |
| 非成員   | X    | X    |

---

## 共用 Schema

### SyncCollectionRequest（請求 Body）

```python
class SyncCollectionRequest(BaseModel):
    team_id: str
    name: str
    data: str  # JSON string of collection tree
```

### CollectionResponse（回應格式）

```python
class CollectionResponse(BaseModel):
    id: str
    team_id: str
    name: str
    data: str
    updated_by: str
    updated_at: str  # ISO 8601 格式
```

### SyncEnvironmentRequest（環境變數請求 Body）

```python
class SyncEnvironmentRequest(BaseModel):
    data: str  # JSON string of environments array
```

### EnvironmentResponse（環境變數回應格式）

```python
class EnvironmentResponse(BaseModel):
    id: str
    team_id: str
    data: str
    updated_by: str
    updated_at: str  # ISO 8601 格式
```

---

## 檔案結構

```
backend/
├── models/
│   └── team.py              # Team, TeamMember, SharedCollection, SharedEnvironment 模型
├── routers/
│   └── sync.py              # Sync 模組路由
└── core/
    ├── database.py           # 資料庫連線 (get_db)
    └── security.py           # JWT 認證 (get_current_user)
```
