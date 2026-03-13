# 環境變數管理

## 文件資訊

| 項目     | 說明                          |
| -------- | ----------------------------- |
| 功能名稱 | 環境變數管理                   |
| 版本     | 2.0                          |
| 建立日期 | 2026-03-03                    |
| 最後更新 | 2026-03-14                    |
| 狀態     | 已實作                        |

---

## 1. 功能概述

環境變數管理功能讓使用者能夠定義多組環境（如 Development、Staging、Production），每組環境各自擁有一組 Key-Value 變數。使用者可透過頂部工具列的環境選擇器快速切換當前啟用的環境，並透過「Manage Environments」按鈕開啟 Modal 視窗來管理所有環境與其變數。系統同時支援全域變數（Global Variables），全域變數在所有環境中皆可存取，且當同名變數同時存在於全域與環境中時，環境變數優先覆蓋全域變數。所有支援 `{{variable}}` 語法的欄位（URL、Headers、Body 等）在請求發送前會自動解析替換。

**v2.0 新增：雲端同步**
當 workspace 轉為雲端（關聯 team）後，環境變數自動改為雲端同步模式：所有 CRUD 操作不再寫入本地 SQLite，而是透過 WebSocket 即時推送（HTTP API 為 fallback）同步至後端 PostgreSQL。同團隊的所有成員共享同一份環境變數，任何成員的修改都會即時廣播給其他在線成員。本地 workspace 的環境變數仍維持 SQLite 儲存，不受影響。

---

## 2. 使用情境

| 情境編號 | 情境說明                                                                  |
| -------- | ------------------------------------------------------------------------- |
| UC-01    | 使用者建立不同環境（如 Dev / Staging / Prod）分別管理 API base URL 等設定  |
| UC-02    | 使用者透過頂部下拉選單快速切換當前啟用的環境                               |
| UC-03    | 使用者在環境中新增、編輯、啟用/停用、刪除變數                              |
| UC-04    | 使用者在 URL 中使用 `{{baseUrl}}/users` 語法引用環境變數                   |
| UC-05    | 使用者在 Headers 或 Body 中使用 `{{variable}}` 語法引用變數                |
| UC-06    | 使用者設定全域變數作為跨環境共用的基礎變數                                 |
| UC-07    | 使用者刪除不再需要的環境                                                   |
| UC-08    | 使用者在雲端 workspace 中新增/修改環境變數，變數自動同步至雲端               |
| UC-09    | 團隊成員 A 修改環境變數，成員 B 即時收到更新                                |
| UC-10    | 使用者將本地 workspace 轉為雲端，本地環境變數自動推送至雲端                  |
| UC-11    | 使用者重新啟動應用程式，雲端 workspace 的環境變數從雲端拉取回來              |

---

## 3. 畫面總覽

### 3.1 頂部工具列 - 環境選擇器區域

```
┌──────────────────────────────────────────────────────────┐
│  Environment: [ No Environment ▾ ]  [Manage Environments]│
└──────────────────────────────────────────────────────────┘
```

### 3.2 Manage Environments Modal

```
┌──────────────────────────────────────────────────────┐
│  Environments                                    ✕   │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────┐  ┌─────┐         │
│  │ New environment name           │  │ Add │         │
│  └────────────────────────────────┘  └─────┘         │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Development              [Active]           │    │
│  │                     [Set Active] [Delete]     │    │
│  │  ┌────────────┬──────────────┬──┐            │    │
│  │  │ Key        │ Value        │✓ │            │    │
│  │  ├────────────┼──────────────┼──┤            │    │
│  │  │ baseUrl    │ http://lo... │☑ │            │    │
│  │  │ apiKey     │ dev-key-123  │☑ │            │    │
│  │  └────────────┴──────────────┴──┘            │    │
│  │  ┌──────┐ ┌──────┐ ┌─┐                      │    │
│  │  │ Key  │ │ Value│ │+│  ← 新增變數列         │    │
│  │  └──────┘ └──────┘ └─┘                      │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Production                                   │    │
│  │                     [Set Active] [Delete]     │    │
│  │  （變數表格...）                                │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 4. 區域劃分

### 4.1 環境選擇器

| 區域     | 說明                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| 位置     | 應用程式頂部工具列                                                             |
| 組件     | `EnvSelector.vue`                                                              |
| 功能     | 下拉選單顯示所有環境，選擇後切換當前啟用的環境                                  |

### 4.2 Manage Environments 按鈕

| 區域     | 說明                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| 位置     | 環境選擇器旁邊                                                                 |
| 組件     | `EnvEditor.vue`                                                                |
| 功能     | 點擊開啟環境管理 Modal 視窗                                                     |

### 4.3 環境管理 Modal

| 區域     | 說明                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| 位置     | 全螢幕遮罩層上方，置中顯示                                                      |
| 組件     | `EnvEditor.vue`（Teleport to body）                                            |
| 功能     | 提供新增環境、管理環境變數、設定啟用環境、刪除環境等功能                          |
| 尺寸     | 寬度 `w-[600px]`，最大高度 `max-h-[80vh]`，超出時可捲動                         |

### 4.4 新增環境區域

| 區域     | 說明                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| 位置     | Modal 標題列下方                                                               |
| 功能     | 輸入環境名稱，點擊 Add 或按 Enter 新增環境                                     |

### 4.5 環境卡片區域

| 區域     | 說明                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| 位置     | 新增環境區域下方，依環境數量垂直排列                                             |
| 功能     | 每個環境以卡片形式呈現，包含環境名稱、啟用標籤、操作按鈕、變數表格、新增變數表單   |

### 4.6 變數表格

| 區域     | 說明                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| 位置     | 環境卡片內部                                                                   |
| 功能     | 以表格形式顯示該環境的所有變數，支援行內編輯 Key/Value 與啟用/停用切換            |

---

## 5. 欄位規格

### 5.1 環境選擇器（EnvSelector）

| 欄位名稱       | 數據類型 | UI 元件 | 必填 | 預設值 | 備註                                                                                       |
| -------------- | -------- | ------- | ---- | ------ | ------------------------------------------------------------------------------------------ |
| 標籤文字       | --       | span    | --   | --     | 固定顯示「Environment:」；樣式 `text-xs text-text-muted`                                     |
| 環境選擇       | string   | select  | 否   | `""`   | 第一個選項為「No Environment」（value 為空字串）；其餘依 `store.environments` 動態渲染         |

### 5.2 Manage Environments 按鈕

| 欄位名稱           | 數據類型 | UI 元件 | 備註                                                                        |
| ------------------ | -------- | ------- | --------------------------------------------------------------------------- |
| Manage Environments | --      | button  | 文字「Manage Environments」；邊框按鈕樣式 `border border-border`；hover 背景 `bg-bg-hover` |

### 5.3 Modal - 標題列

| 欄位名稱   | 數據類型 | UI 元件 | 備註                                                   |
| ---------- | -------- | ------- | ------------------------------------------------------ |
| 標題       | --       | h2      | 固定顯示「Environments」；`text-base font-bold`          |
| 關閉按鈕   | --       | button  | 顯示「✕」，點擊關閉 Modal                               |

### 5.4 Modal - 新增環境表單

| 欄位名稱   | 數據類型 | UI 元件 | 必填 | 預設值 | 佔位符               | 檢核規則                                | 備註                            |
| ---------- | -------- | ------- | ---- | ------ | -------------------- | --------------------------------------- | ------------------------------- |
| 環境名稱   | string   | input   | 是   | `""`   | New environment name | 不可為空白；送出前執行 `trim()` 處理     | 按 Enter 或點擊「Add」按鈕送出   |
| Add 按鈕   | --       | button  | --   | --     | --                   | --                                      | 顯示「Add」                      |

### 5.5 Modal - 環境卡片

| 欄位名稱       | 數據類型 | UI 元件 | 備註                                                                                             |
| -------------- | -------- | ------- | ------------------------------------------------------------------------------------------------ |
| 環境名稱       | string   | span    | `text-sm font-medium`                                                                             |
| Active 標籤    | --       | span    | 僅當 `env.isActive === true` 時顯示；綠色圓角標籤 `bg-success-light text-success`；文字「Active」   |
| Set Active 按鈕 | --      | button  | 僅當 `env.isActive === false` 時顯示；點擊呼叫 `store.setActive(env.id)`                           |
| Delete 按鈕    | --       | button  | 紅色文字 `text-danger`；點擊呼叫 `store.deleteEnvironment(env.id)`；同時刪除該環境下所有變數         |

### 5.6 Modal - 變數表格

**表格標頭：**

| 欄位名稱 | 寬度   | 備註                                       |
| -------- | ------ | ------------------------------------------ |
| Key      | 自動   | `font-medium text-text-muted`               |
| Value    | 自動   | `font-medium text-text-muted`               |
| （啟用） | `w-8`  | 無標頭文字，僅預留 checkbox 寬度             |

**表格每列欄位：**

| 欄位名稱 | 數據類型 | UI 元件        | 必填 | 預設值 | 備註                                                                                  |
| -------- | -------- | -------------- | ---- | ------ | ------------------------------------------------------------------------------------- |
| Key      | string   | input          | 是   | `""`   | 行內編輯；透明背景 `bg-transparent`；change 事件觸發更新                                |
| Value    | string   | input          | 否   | `""`   | 行內編輯；等寬字體 `font-mono`；透明背景 `bg-transparent`；change 事件觸發更新           |
| 啟用     | boolean  | checkbox       | --   | `true` | 控制該變數是否生效；change 事件觸發 `store.updateVariable`                               |

### 5.7 Modal - 新增變數表單

| 欄位名稱   | 數據類型 | UI 元件 | 必填 | 預設值 | 佔位符 | 檢核規則                               | 備註                                          |
| ---------- | -------- | ------- | ---- | ------ | ------ | -------------------------------------- | --------------------------------------------- |
| Key        | string   | input   | 是   | `""`   | Key    | 不可為空白；送出前執行 `trim()` 處理    | focus 時自動設定 `editingEnvId` 為當前環境 ID   |
| Value      | string   | input   | 否   | `""`   | Value  | --                                     | focus 時自動設定 `editingEnvId` 為當前環境 ID   |
| 新增按鈕   | --       | button  | --   | --     | --     | --                                     | 顯示「+」；點擊呼叫 `addVariable()`            |

---

## 6. 操作流程

### 6.1 切換環境

```
使用者在頂部工具列的環境選擇器下拉選單中選擇目標環境
  → 觸發 change 事件
  → 呼叫 store.setActive(envId)
  → 執行 DB：先將所有環境的 is_active 設為 0
  → 再將目標環境的 is_active 設為 1
  → 前端更新所有環境的 isActive 狀態
  → 後續請求發送時自動使用該環境的變數
```

### 6.2 新增環境

```
使用者點擊「Manage Environments」按鈕
  → 開啟 Modal 視窗
  → 在新增環境輸入框輸入名稱
  → 按 Enter 或點擊「Add」按鈕
  → trim() 檢核不為空白
  → 呼叫 store.addEnvironment(name)
  → 【本地 workspace】寫入 SQLite DB（environments 表）
  → 【雲端 workspace】更新記憶體 + 排程同步到雲端（debounce 1 秒）
  → 前端新增環境物件（isActive 預設為 false，variables 為空陣列）
  → 清空輸入框
```

### 6.3 新增變數

```
使用者在目標環境卡片的新增變數區域輸入 Key 和 Value
  → focus 輸入框時自動綁定 editingEnvId 為當前環境 ID
  → 點擊「+」按鈕
  → trim() 檢核 Key 不為空白
  → 呼叫 store.addVariable(envId, key, value)
  → 【本地 workspace】寫入 SQLite DB（env_variables 表）
  → 【雲端 workspace】更新記憶體 + 排程同步到雲端
  → 前端新增變數物件（enabled 預設為 true）
  → 清空 Key 和 Value 輸入框
```

### 6.4 編輯變數

```
使用者直接在變數表格中修改 Key 或 Value 輸入框的內容
  → 觸發 change 事件
  → 呼叫 store.updateVariable(varId, key, value, enabled)
  → 【本地 workspace】更新 SQLite DB（env_variables 表）
  → 【雲端 workspace】更新記憶體 + 排程同步到雲端
  → 前端同步更新對應變數物件
```

### 6.5 啟用/停用變數

```
使用者勾選或取消勾選變數的 checkbox
  → 觸發 change 事件
  → 呼叫 store.updateVariable(varId, key, value, newEnabled)
  → 【本地 workspace】更新 SQLite DB 的 enabled 欄位
  → 【雲端 workspace】更新記憶體 + 排程同步到雲端
  → 已停用的變數不參與 {{variable}} 解析
```

### 6.6 刪除環境

```
使用者點擊環境卡片上的「Delete」按鈕
  → 呼叫 store.deleteEnvironment(envId)
  → 【本地 workspace】執行 DB DELETE（CASCADE 自動刪除所屬變數）
  → 【雲端 workspace】更新記憶體 + 排程同步到雲端
  → 前端移除該環境物件
```

### 6.8 雲端同步流程

```
環境變數 CRUD 操作（雲端 workspace）
  → 記憶體更新
  → scheduleSyncToCloud()（debounce 1 秒）
  → pushToCloud()
    → 序列化所有環境為 JSON
    → 優先透過 WebSocket 推送（pushEnvViaWs）
    → 若 WebSocket 不可用，fallback 至 HTTP PUT /sync/{team_id}/environments
  → 後端寫入 shared_environments 表
  → 廣播 environment_updated 給同團隊其他成員
```

### 6.9 啟動拉取流程

```
應用程式啟動 / 切換至雲端 workspace
  → syncTeamCollections() 中對每個 team 呼叫 envStore.pullFromCloud(teamId)
  → GET /sync/{team_id}/environments
  → 反序列化 JSON → 更新記憶體中的環境列表
  → 不寫入 SQLite（雲端 workspace 僅記憶體）
```

### 6.10 即時同步接收

```
其他成員推送環境變數更新
  → WebSocket 收到 environment_updated 訊息
  → syncStore.handleRemoteEnvironmentUpdate()
  → envStore.applyRemoteUpdate(data)
  → 反序列化 JSON → 替換記憶體中的環境列表
  → 畫面即時反映最新變數
```

### 6.7 設定啟用環境

```
使用者點擊環境卡片上的「Set Active」按鈕
  → 呼叫 store.setActive(envId)
  → 流程同 6.1 切換環境
  → 卡片上顯示綠色「Active」標籤
  → 「Set Active」按鈕隱藏
```

---

## 7. 變數解析機制

### 7.1 語法規則

| 項目       | 說明                                                            |
| ---------- | --------------------------------------------------------------- |
| 語法格式   | `{{variableName}}`                                               |
| 正則表達式 | `/\{\{(\w+)\}\}/g`                                               |
| 變數名稱   | 僅支援 `\w` 字元（英數字 + 底線）                                 |
| 未匹配行為 | 若變數名稱不存在於已合併的變數集合中，保留原始 `{{variableName}}` 不替換 |

### 7.2 變數合併規則

| 優先順序 | 來源         | 說明                                          |
| -------- | ------------ | --------------------------------------------- |
| 1（低）  | 全域變數     | `globalVariables` 中 `enabled === true` 的變數 |
| 2（高）  | 環境變數     | 當前啟用環境中 `enabled === true` 的變數        |

合併邏輯：先載入全域變數，再載入環境變數。當全域與環境存在同名 Key 時，環境變數的 Value 覆蓋全域變數的 Value。

### 7.3 支援解析的欄位

| 欄位                | 組件                  | 說明                          |
| ------------------- | --------------------- | ----------------------------- |
| URL                 | UrlBar.vue            | 請求目標網址                   |
| Params Value        | ParamsEditor.vue      | Query Parameter 的值           |
| Headers Value       | HeadersEditor.vue     | 請求標頭的值                   |
| Body Raw            | BodyEditor.vue        | Raw 格式的請求本體內容          |
| Body Form Value     | BodyEditor.vue        | Form-data 與 URL Encoded 的值  |
| Auth Token / Value  | AuthEditor.vue        | 認證相關的 Token 或 API Key 值  |

---

## 8. 資料持久化

### 8.0 儲存策略總覽

| Workspace 類型 | 儲存方式                                        | 說明                                    |
| -------------- | ----------------------------------------------- | --------------------------------------- |
| 本地 workspace | SQLite（透過 `@tauri-apps/plugin-sql`）          | 環境與變數存在本地 SQLite 資料庫         |
| 雲端 workspace | PostgreSQL（透過 REST API + WebSocket 同步）      | 前端僅記憶體，資料持久化在後端 PostgreSQL |

### 8.1 本地 — environments 資料表（SQLite）

| 欄位      | 型別    | 說明                               |
| --------- | ------- | ---------------------------------- |
| id        | TEXT PK | UUID，由 `crypto.randomUUID()` 產生 |
| name      | TEXT    | 環境名稱                            |
| is_active | INTEGER | 是否為啟用環境（0/1）                |

### 8.2 本地 — env_variables 資料表（SQLite）

| 欄位           | 型別    | 說明                               |
| -------------- | ------- | ---------------------------------- |
| id             | TEXT PK | UUID                                |
| environment_id | TEXT FK | 所屬環境 ID（參照 environments.id）  |
| key            | TEXT    | 變數名稱                            |
| value          | TEXT    | 變數值                              |
| enabled        | INTEGER | 是否啟用（0/1），預設為 1            |

### 8.3 本地 — global_variables 資料表（SQLite）

| 欄位    | 型別    | 說明                               |
| ------- | ------- | ---------------------------------- |
| id      | TEXT PK | UUID                                |
| key     | TEXT    | 變數名稱                            |
| value   | TEXT    | 變數值                              |
| enabled | INTEGER | 是否啟用（0/1）                      |

### 8.4 雲端 — shared_environments 資料表（PostgreSQL）

| 欄位       | 型別                       | 說明                                                   |
| ---------- | -------------------------- | ------------------------------------------------------ |
| id         | String (UUID, PK)          | 主鍵，自動產生 UUID                                     |
| team_id    | String (FK → teams.id)     | 所屬團隊，CASCADE 刪除                                  |
| data       | Text                       | 所有環境 + 變數的 JSON 字串，預設 `[]`                   |
| updated_by | String (FK → users.id)     | 最後更新者的使用者 ID                                   |
| updated_at | DateTime (timezone)        | 最後更新時間，預設 UTC now                               |

**`data` 欄位格式（JSON）：**

```json
[
  {
    "id": "uuid",
    "name": "Development",
    "variables": [
      { "id": "uuid", "key": "baseUrl", "value": "http://localhost:8000", "enabled": true }
    ]
  }
]
```

一個 team 一筆記錄，`data` 欄位存所有環境與變數（整包覆蓋模式，與 SharedCollection 同設計）。

---

## 9. 涉及元件

| 元件路徑                                             | 說明                                    |
| ---------------------------------------------------- | --------------------------------------- |
| `src/components/environment/EnvSelector.vue`         | 環境選擇器下拉選單                       |
| `src/components/environment/EnvEditor.vue`           | 環境管理 Modal                           |
| `src/stores/environmentStore.ts`                     | 環境變數狀態管理（含雲端同步邏輯）        |
| `src/stores/syncStore.ts`                            | WebSocket 即時同步（環境變數推送/接收）   |
| `src/stores/workspaceStore.ts`                       | Workspace 管理（雲端 workspace 記憶體模式）|
| `src/components/layout/AppLayout.vue`                | 啟動時拉取雲端環境變數                    |
| `src/components/workspace/TeamMembersDialog.vue`     | 分享 workspace 時推送環境變數至雲端        |
| `src/types/environment.ts`                           | 環境變數型別定義                          |
| `src/utils/variableResolver.ts`                      | `{{variable}}` 解析工具                  |
| `backend/models/team.py`                             | SharedEnvironment 資料模型               |
| `backend/routers/sync.py`                            | 環境變數 REST API（GET/PUT）             |
| `backend/routers/ws.py`                              | WebSocket 環境變數同步處理               |
