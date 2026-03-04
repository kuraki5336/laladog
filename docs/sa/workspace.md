# Workspace 工作區

## 文件資訊

| 項目     | 說明                          |
| -------- | ----------------------------- |
| 功能名稱 | Workspace 工作區               |
| 版本     | 1.0                          |
| 建立日期 | 2026-03-03                    |
| 狀態     | 已實作                        |

---

## 1. 功能概述

Workspace 工作區功能讓使用者將 Collection 依專案或團隊分類管理。每個 Workspace 包含獨立的 Collection 集合，切換 Workspace 後左側樹狀結構只顯示該 Workspace 的 Collection。環境變數與歷史紀錄維持全域共用。

應用初次啟動時自動建立「My Workspace」作為預設工作區，既有的所有 Collection 歸入該工作區。

---

## 2. 使用情境

| 情境編號 | 情境說明                                                              |
| -------- | --------------------------------------------------------------------- |
| UC-01    | 使用者新建 Workspace 管理不同專案的 API Collection                      |
| UC-02    | 使用者切換 Workspace 查看不同專案的 Collection                          |
| UC-03    | 使用者在特定 Workspace 下新增 Collection，自動歸屬                      |
| UC-04    | 使用者匯入 Postman Collection，自動歸屬當前 Workspace                   |
| UC-05    | 使用者重命名或刪除 Workspace                                            |

---

## 3. 畫面總覽

```
┌─────────────────────────────────────────────────────────────┐
│ 🐕 LalaDog │ [My Workspace ▾]    [EnvEditor] [Env ▾] 🌙 👤 │
├────────────────┬────────────────────────────────────────────┤
│  Collections   │                                            │
│  History       │        Main Panel                          │
│                │                                            │
│ ───────────── │                                            │
│  Collection A  │                                            │
│  Collection B  │                                            │
└────────────────┴────────────────────────────────────────────┘
```

WorkspaceSelector 位於 Header 左側，Logo 右方，以分隔線（`|`）與 Logo 區隔。

---

## 4. 區域劃分

### 4.1 WorkspaceSelector

| 區域     | 說明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 位置     | Header 左側，Logo 右方                                                  |
| 組件     | `WorkspaceSelector.vue`                                                 |
| 功能     | 下拉選單顯示所有 Workspace + 「+ New Workspace」選項；切換時即時更新 Collection 樹 |

---

## 5. 欄位規格

### 5.1 WorkspaceSelector

| 欄位名稱           | 數據類型 | UI 元件 | 必填 | 預設值         | 備註                                                  |
| ------------------ | -------- | ------- | ---- | -------------- | ----------------------------------------------------- |
| 工作區下拉         | string   | select  | 是   | activeWorkspace | 列出所有 Workspace 名稱；選擇後呼叫 `setActive(id)`   |
| + New Workspace    | --       | option  | --   | --             | 選擇後切換為行內輸入模式                               |

### 5.2 新增工作區（行內模式）

| 欄位名稱       | 數據類型 | UI 元件 | 必填 | 預設值 | 佔位符          | 備註                                    |
| -------------- | -------- | ------- | ---- | ------ | --------------- | --------------------------------------- |
| Workspace 名稱 | string   | input   | 是   | `""`   | Workspace name  | 按 Enter 或點擊 OK 送出；按 Escape 取消 |
| OK 按鈕        | --       | button  | --   | --     | --              | 確認新增                                 |
| Cancel 按鈕    | --       | button  | --   | --     | --              | 取消新增                                 |

### 5.3 Workspace 資料結構

| 欄位名稱   | 數據類型 | 說明                                 |
| ---------- | -------- | ------------------------------------ |
| id         | string   | UUID，主鍵                           |
| name       | string   | 工作區名稱                           |
| isActive   | boolean  | 是否為當前啟用的工作區                |
| createdAt  | string   | 建立時間                             |
| updatedAt  | string   | 更新時間                             |

---

## 6. 操作流程

### 6.1 切換工作區

```
使用者點擊 WorkspaceSelector 下拉選單
  → 選擇目標 Workspace
  → workspaceStore.setActive(id)
  → 更新 DB：所有 workspace is_active = 0，選中的 = 1
  → collectionStore.tree computed 自動依 activeWorkspace 篩選
  → 左側 Collection 樹即時更新，只顯示該 Workspace 的 Collection
```

### 6.2 新增工作區

```
使用者點擊「+ New Workspace」選項
  → 下拉選單切換為行內輸入框
  → 輸入工作區名稱
  → 按 Enter 或點擊 OK
  → workspaceStore.addWorkspace(name)
  → 新 Workspace 自動設為啟用
  → Collection 樹更新為空（新 Workspace 尚無 Collection）
  → 輸入框消失，恢復下拉選單
```

### 6.3 自動歸屬

```
使用者在某 Workspace 下操作：
  → 新增 Collection → 自動帶入 activeWorkspace.id
  → 匯入 Postman Collection → 頂層 Collection 自動帶入 activeWorkspace.id
  → 新增 Folder / Request → 不帶 workspace_id（透過 parentId 隱式歸屬）
```

### 6.4 刪除工作區

```
使用者請求刪除某 Workspace
  → 不可刪除最後一個 Workspace（workspaces.length <= 1 時拒絕）
  → workspaceStore.deleteWorkspace(id)
  → 刪除 DB 中的 workspace 紀錄
  → 對應 Collection 的 workspace_id 被 SET NULL（ON DELETE SET NULL）
  → 若刪除的是當前啟用的，自動啟用剩餘的第一個
```

---

## 7. 涉及元件

| 元件路徑                                             | 說明                    |
| ---------------------------------------------------- | ----------------------- |
| `src/components/workspace/WorkspaceSelector.vue`     | Workspace 下拉選單       |
| `src/components/layout/AppLayout.vue`                | Header 整合 Workspace    |
| `src/stores/workspaceStore.ts`                       | Workspace CRUD + 切換    |
| `src/stores/collectionStore.ts`                      | Collection 樹 workspace 感知 |
| `src/types/workspace.ts`                             | Workspace 型別           |
| `src/types/collection.ts`                            | CollectionNode 加 workspaceId |

---

## 8. 技術備註

### 8.1 資料庫 Schema（Migration V2）

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE collection_nodes ADD COLUMN workspace_id TEXT
  REFERENCES workspaces(id) ON DELETE SET NULL;
```

### 8.2 設計決策

| 項目                    | 決策                                                     |
| ----------------------- | -------------------------------------------------------- |
| workspace_id 儲存層級   | 僅頂層 collection 節點帶 workspace_id，folder/request 透過 parentId 隱式歸屬 |
| 環境變數歸屬            | 維持全域，不分 workspace                                  |
| 歷史紀錄歸屬            | 維持全域，不分 workspace                                  |
| Console 紀錄歸屬        | 每次請求綁定，位於 Response Panel                          |
| 資料載入策略            | 所有 collection nodes 一次載入記憶體，tree computed 依 activeWorkspace 篩選 |
| 切換效能                | 前端 computed 篩選，即時切換無需重查 DB                    |
| 刪除孤立 collection    | ON DELETE SET NULL，孤立 collection 不會被刪除             |
| 預設 Workspace         | Migration 自動建立「My Workspace」並將既有 Collection 指派 |
