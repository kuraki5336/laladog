# Collection 管理

## 文件資訊

| 項目     | 說明                          |
| -------- | ----------------------------- |
| 功能名稱 | Collection 管理               |
| 版本     | 1.0                          |
| 建立日期 | 2026-03-03                    |
| 狀態     | 已實作                        |

---

## 1. 功能概述

Collection 管理功能位於應用程式左側邊欄（Sidebar），提供樹狀結構來組織與管理 API 請求。使用者可以建立 Collection、在其下建立 Folder 與 Request，並透過展開/收合、右鍵選單、行內重新命名等操作來維護整體結構。側邊欄同時提供 Collections 與 History 兩個分頁切換。

---

## 2. 使用情境

| 情境編號 | 情境說明                                                           |
| -------- | ------------------------------------------------------------------ |
| UC-01    | 使用者建立新的 Collection 來分組管理不同專案的 API 請求             |
| UC-02    | 使用者在 Collection 或 Folder 下新增 Request 節點                  |
| UC-03    | 使用者在 Collection 下新增 Folder 進行更細粒度的分類               |
| UC-04    | 使用者點擊 Request 節點以載入該請求至主面板進行編輯與發送           |
| UC-05    | 使用者透過右鍵選單重新命名或刪除節點                               |
| UC-06    | 使用者展開/收合 Collection 或 Folder 來瀏覽樹狀結構                 |
| UC-07    | 使用者在 Collections 與 History 分頁間切換                          |

---

## 3. 畫面總覽

整體佈局為左側邊欄固定寬度 `w-72`（288px），內含上方分頁列與下方可捲動的內容區域。

```
┌──────────────────────────────┐
│  [ Collections ] [ History ] │  ← 分頁切換列
├──────────────────────────────┤
│  [ + New Collection ]        │  ← 新增 Collection 按鈕
│  ┌────────────────────────┐  │
│  │ (Inline 新增輸入框)     │  │  ← 條件顯示
│  └────────────────────────┘  │
│                              │
│  📦 My API Collection     ⋯  │  ← Collection 節點
│    📁 User Module         ⋯  │  ← Folder 節點
│      GET  Get Users       ⋯  │  ← Request 節點
│      POST Create User     ⋯  │  ← Request 節點
│    📁 Auth Module         ⋯  │  ← 收合狀態 Folder
│  📦 Another Collection    ⋯  │
│                              │
│  (No collections yet)        │  ← 空狀態提示
│                              │
└──────────────────────────────┘
```

---

## 4. 區域劃分

### 4.1 分頁切換列

| 區域     | 說明                                                                              |
| -------- | --------------------------------------------------------------------------------- |
| 位置     | 側邊欄頂部                                                                         |
| 組件     | `Sidebar.vue`                                                                      |
| 功能     | 提供「Collections」與「History」兩個分頁按鈕，點擊切換下方內容區域顯示的面板       |
| 選中樣式 | 選中分頁顯示底部 2px `border-secondary` 色條 + 文字為 `text-secondary`             |
| 未選樣式 | `text-text-muted`，hover 時為 `text-text-primary`                                  |

### 4.2 新增 Collection 區域

| 區域     | 說明                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| 位置     | Collections 面板頂部                                                                      |
| 組件     | `CollectionTree.vue`                                                                      |
| 功能     | 點擊「+ New Collection」按鈕展開行內輸入表單，輸入名稱後建立新 Collection                 |

### 4.3 樹狀節點列表

| 區域     | 說明                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| 位置     | 新增區域下方，可捲動區域                                                                  |
| 組件     | `CollectionTree.vue` + `CollectionItem.vue`（遞迴）                                       |
| 功能     | 以遞迴方式渲染 Collection → Folder → Request 的樹狀結構                                   |

### 4.4 右鍵選單（Context Menu）

| 區域     | 說明                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| 位置     | 點擊節點右方「⋯」按鈕或右鍵時，顯示於節點下方                                            |
| 組件     | `CollectionItem.vue` 內建                                                                 |
| 功能     | 依節點類型提供不同操作選項                                                                |

### 4.5 行內新增子節點表單

| 區域     | 說明                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| 位置     | 透過 Context Menu 的「Add Request」觸發，顯示於該節點的子層級位置                         |
| 組件     | `CollectionItem.vue` 內建                                                                 |
| 功能     | 行內輸入 Request 名稱並建立                                                               |

---

## 5. 欄位規格

### 5.1 分頁切換列

| 欄位名稱 | 數據類型 | UI 元件 | 必填 | 預設值        | 備註                                            |
| -------- | -------- | ------- | ---- | ------------- | ----------------------------------------------- |
| 當前分頁 | string   | button  | 是   | `collections` | 可選值：`collections` / `history`，點擊切換面板 |

### 5.2 新增 Collection 按鈕

| 欄位名稱         | 數據類型 | UI 元件 | 必填 | 預設值  | 佔位符           | 備註                                                                 |
| ---------------- | -------- | ------- | ---- | ------- | ---------------- | -------------------------------------------------------------------- |
| 顯示新增表單     | boolean  | button  | --   | `false` | --               | 點擊「+ New Collection」按鈕切換顯示/隱藏新增表單                    |
| Collection 名稱  | string   | input   | 是   | `""`    | Collection name  | 不可為空白；按 Enter 或點擊「Add」按鈕送出；送出前執行 `trim()` 處理 |

### 5.3 樹狀節點（CollectionItem）

| 欄位名稱       | 數據類型           | UI 元件        | 必填 | 預設值  | 備註                                                                                                    |
| -------------- | ------------------ | -------------- | ---- | ------- | ------------------------------------------------------------------------------------------------------- |
| 節點 ID        | string (UUID)      | --             | 是   | 自動產生 | 由 `crypto.randomUUID()` 產生                                                                           |
| 節點名稱       | string             | span / input   | 是   | --      | 正常狀態為 `<span>` 顯示，重新命名模式切換為 `<input>`；文字超出寬度時 truncate                         |
| 節點類型       | CollectionNodeType | --             | 是   | --      | 可選值：`collection` / `folder` / `request`                                                              |
| 父節點 ID      | string \| null     | --             | 是   | `null`  | 頂層 Collection 的 parentId 為 `null`                                                                    |
| 排序順序       | number             | --             | 是   | 自動計算 | 根據同層級已有節點數量自動遞增                                                                           |
| 展開狀態       | boolean            | --             | --   | `false` | 僅 `collection` 與 `folder` 類型有效；點擊節點列切換展開/收合                                            |
| 請求資料       | SavedRequest       | --             | 條件 | --      | 僅 `type === 'request'` 時有值，包含 method, url, params, headers, body, auth                            |
| 選中狀態       | boolean            | --             | --   | `false` | 選中節點列以 `bg-secondary-10` 背景高亮顯示；由 store 的 `selectedNodeId` 控制                           |

### 5.4 展開/收合指示器

| 欄位名稱     | 數據類型 | UI 元件 | 備註                                                                                         |
| ------------ | -------- | ------- | -------------------------------------------------------------------------------------------- |
| 展開箭頭     | --       | span    | Collection 與 Folder 顯示「▶」，展開時加上 `rotate-90` 旋轉動畫；Request 節點不顯示箭頭      |
| 節點圖示     | --       | span    | Collection 顯示 📦，Folder 顯示 📁，Request 不顯示圖示                                       |

### 5.5 HTTP Method 徽章

| 欄位名稱    | 數據類型   | UI 元件 | 備註                                                                           |
| ----------- | ---------- | ------- | ------------------------------------------------------------------------------ |
| Method 標籤 | HttpMethod | span    | 僅 Request 節點顯示；寬度固定 `w-10`，字體 `text-[10px] font-bold`             |

**Method 顏色對照表：**

| Method  | CSS Class          | 顏色說明 |
| ------- | ------------------ | -------- |
| GET     | `text-green-600`   | 綠色     |
| POST    | `text-yellow-600`  | 黃色     |
| PUT     | `text-blue-600`    | 藍色     |
| PATCH   | `text-purple-600`  | 紫色     |
| DELETE  | `text-danger`      | 紅色     |
| HEAD    | `text-text-muted`  | 灰色     |
| OPTIONS | `text-text-muted`  | 灰色     |

### 5.6 右鍵選單（Context Menu）

| 選單項目     | 顯示條件                  | 說明                                                            |
| ------------ | ------------------------- | --------------------------------------------------------------- |
| Add Request  | `node.type !== 'request'` | 展開行內新增子 Request 的輸入表單                                |
| Add Folder   | `node.type !== 'request'` | 直接在該節點下新增名為「New Folder」的資料夾節點                 |
| Rename       | 所有節點類型              | 將名稱欄位切換為 `<input>` 進入行內編輯模式                      |
| Delete       | 所有節點類型              | 刪除該節點及其所有子節點（含 DB cascade delete）；文字為紅色危險色 |

### 5.7 行內重新命名

| 欄位名稱 | 數據類型 | UI 元件 | 必填 | 佔位符 | 檢核規則                                                         |
| -------- | -------- | ------- | ---- | ------ | ---------------------------------------------------------------- |
| 編輯名稱 | string   | input   | 是   | --     | 預填入當前節點名稱；blur 或 Enter 時送出；`trim()` 後不可為空白 |

### 5.8 行內新增子 Request 表單

| 欄位名稱     | 數據類型 | UI 元件 | 必填 | 預設值 | 佔位符       | 檢核規則                                                           |
| ------------ | -------- | ------- | ---- | ------ | ------------ | ------------------------------------------------------------------ |
| Request 名稱 | string   | input   | 是   | `""`   | Request name | 不可為空白；按 Enter 或點擊「+」按鈕送出；新建 Request 預設 method 為 `GET`，url 為空字串 |

### 5.9 空狀態

| 欄位名稱 | 數據類型 | UI 元件 | 備註                                                          |
| -------- | -------- | ------- | ------------------------------------------------------------- |
| 空狀態   | --       | div     | 當 `store.tree.length === 0` 時顯示「No collections yet」提示文字 |

---

## 6. 操作流程

### 6.1 建立新 Collection

```
使用者點擊「+ New Collection」
  → 展開行內輸入表單
  → 輸入 Collection 名稱
  → 按 Enter 或點擊「Add」按鈕
  → 呼叫 store.addNode(name, 'collection', null)
  → 寫入 SQLite DB（collection_nodes 表）
  → 前端 nodes 陣列新增節點
  → 清空輸入框、隱藏表單
```

### 6.2 新增子 Request

```
使用者右鍵點擊 Collection 或 Folder 節點
  → 選擇「Add Request」
  → 展開行內新增子 Request 表單
  → 輸入 Request 名稱
  → 按 Enter 或點擊「+」按鈕
  → 呼叫 store.addNode(name, 'request', parentId, defaultRequest)
  → 新 Request 預設：method=GET, url='', params=[], headers=[], body={type:'none'}, auth={type:'none'}
```

### 6.3 新增子 Folder

```
使用者右鍵點擊 Collection 或 Folder 節點
  → 選擇「Add Folder」
  → 直接呼叫 store.addNode('New Folder', 'folder', parentId)
  → 前端即時新增節點
```

### 6.4 重新命名

```
使用者右鍵點擊節點 → 選擇「Rename」
  → 節點名稱切換為 <input> 行內編輯模式
  → 預填入當前名稱
  → 使用者編輯後按 Enter 或點擊其他位置（blur）
  → trim() 後若不為空白，呼叫 store.renameNode(id, newName)
  → 更新 SQLite DB 的 name 與 updated_at
```

### 6.5 刪除節點

```
使用者右鍵點擊節點 → 選擇「Delete」
  → 呼叫 store.deleteNode(id)
  → 執行 DB DELETE（SQLite CASCADE 處理子節點）
  → 前端遞迴收集所有子孫 ID 並移除
```

### 6.6 載入 Request

```
使用者點擊 Request 節點
  → store.selectedNodeId 設為該節點 ID
  → 呼叫 requestStore.loadFromCollection(nodeId, savedRequest)
  → 主面板載入該請求的 method, url, params, headers, body, auth
```

### 6.7 展開/收合

```
使用者點擊 Collection 或 Folder 節點
  → 呼叫 store.toggleExpand(id)
  → 切換 isExpanded 布林值
  → 子節點區塊依據 isExpanded 條件渲染
```

---

## 7. 資料持久化

| 項目     | 說明                                                  |
| -------- | ----------------------------------------------------- |
| 儲存方式 | SQLite（透過 `@tauri-apps/plugin-sql`）                |
| 資料庫   | `sqlite:laladog.db`                                    |
| 資料表   | `collection_nodes`                                     |
| 欄位     | id, name, node_type, parent_id, sort_order, request_data (JSON), created_at, updated_at |
| 刪除策略 | ON DELETE CASCADE（刪除父節點時自動刪除子節點）         |

---

## 8. 涉及元件

| 元件路徑                                          | 說明                     |
| ------------------------------------------------- | ------------------------ |
| `src/components/layout/Sidebar.vue`               | 側邊欄容器與分頁切換     |
| `src/components/collection/CollectionTree.vue`    | Collection 樹根層級容器  |
| `src/components/collection/CollectionItem.vue`    | 遞迴樹節點元件           |
| `src/stores/collectionStore.ts`                   | Collection 狀態管理      |
| `src/types/collection.ts`                         | 型別定義                 |
