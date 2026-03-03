# Teams 模組 - 系統設計總覽

## 模組資訊

| 項目       | 說明                     |
| ---------- | ------------------------ |
| 模組名稱   | Teams（團隊管理）        |
| 負責功能   | 團隊建立、成員管理       |
| Base Path  | `/teams`                 |
| 認證方式   | JWT Bearer Token         |
| 最後更新   | 2026-03-03               |

## 模組說明

Teams 模組提供團隊協作的基礎功能，包含團隊的建立、列出使用者所屬團隊、邀請成員加入團隊、以及移除成員。所有 API 皆需要 JWT 認證，部分操作（邀請、移除）僅限團隊擁有者（owner）執行。

## 相關資料表

### teams

| 欄位       | 型別     | 說明                          |
| ---------- | -------- | ----------------------------- |
| id         | String   | 主鍵，UUID v4 自動產生        |
| name       | String   | 團隊名稱，不可為空            |
| owner_id   | String   | 團隊擁有者 user ID（FK → users.id） |
| created_at | DateTime | 建立時間，預設 UTC now        |

### team_members

| 欄位      | 型別     | 說明                                         |
| --------- | -------- | -------------------------------------------- |
| id        | String   | 主鍵，UUID v4 自動產生                       |
| team_id   | String   | 所屬團隊 ID（FK → teams.id, CASCADE DELETE） |
| user_id   | String   | 使用者 ID（FK → users.id）                   |
| role      | String   | 角色：owner / editor / viewer，預設 viewer   |
| joined_at | DateTime | 加入時間，預設 UTC now                       |

### users（參照）

| 欄位      | 型別          | 說明                   |
| --------- | ------------- | ---------------------- |
| id        | String        | 主鍵，UUID v4          |
| email     | String        | 電子郵件，唯一值       |
| name      | String        | 使用者名稱             |
| picture   | String (null) | 頭像網址               |
| google_id | String        | Google OAuth ID，唯一值 |

## API 端點總覽

| 方法   | 路徑                                   | 說明             | 權限需求      | 文件連結                     |
| ------ | -------------------------------------- | ---------------- | ------------- | ---------------------------- |
| GET    | `/teams/`                              | 列出使用者所屬團隊 | 登入使用者    | [列出團隊](列出團隊.md)     |
| POST   | `/teams/`                              | 建立新團隊       | 登入使用者    | [建立團隊](建立團隊.md)     |
| POST   | `/teams/{team_id}/invite`              | 邀請成員加入團隊 | 團隊 owner    | [邀請成員](邀請成員.md)     |
| DELETE | `/teams/{team_id}/members/{member_user_id}` | 移除團隊成員     | 團隊 owner    | [移除成員](移除成員.md)     |

## 角色權限矩陣

| 操作         | owner | editor | viewer |
| ------------ | ----- | ------ | ------ |
| 列出所屬團隊 | O     | O      | O      |
| 建立新團隊   | O     | O      | O      |
| 邀請成員     | O     | X      | X      |
| 移除成員     | O     | X      | X      |

> 備註：建立團隊為任何登入使用者皆可操作，建立者自動成為該團隊的 owner。

## 技術架構

- **框架**：FastAPI (Python)
- **ORM**：SQLAlchemy 2.0 Async
- **資料庫**：SQLite（非同步）
- **認證**：JWT Bearer Token（python-jose）
- **路由前綴**：`/teams`
- **路由標籤**：`teams`

## 共用 Schema

### TeamResponse

```python
class TeamResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    role: str
    members: list[dict] = []
```

### CreateTeamRequest

```python
class CreateTeamRequest(BaseModel):
    name: str
```

### InviteMemberRequest

```python
class InviteMemberRequest(BaseModel):
    email: str
    role: str = "viewer"  # editor / viewer
```

## 變更歷史

| 日期       | 版本 | 變更說明         |
| ---------- | ---- | ---------------- |
| 2026-03-03 | 1.0  | 初版建立         |
