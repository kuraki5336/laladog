# Postman Collection 匯入（Postman Import）

## 功能概述

Postman Collection 匯入功能允許使用者將 Postman Collection v2.1 格式的 JSON 檔案匯入至 LalaDog 應用程式。系統會遞迴解析 JSON 中的資料夾結構與請求定義，將其映射為內部的 `CollectionNode` 樹狀結構，並持久化儲存至本地 SQLite 資料庫。支援資料夾階層、請求 Body（raw / form-data / x-www-form-urlencoded）、認證設定（Bearer Token / Basic Auth / API Key）、Headers、Query Params、以及 Pre-request Script 與 Tests Script 的完整匯入。

## 使用情境

| 情境 | 說明 |
|------|------|
| 從 Postman 遷移 | 使用者將 Postman 匯出的 Collection v2.1 JSON 檔案匯入 LalaDog，保留原有的資料夾結構與請求設定 |
| 團隊協作 | 團隊成員分享 Postman Collection JSON 檔案，其他成員匯入至各自的 LalaDog 實例 |
| 備份還原 | 透過匯入 JSON 檔案還原先前匯出的 API Collection |

## 畫面總覽

匯入功能的進入點位於側邊欄 Collections 分頁的頂部區域。使用者透過觸發檔案選擇器，選取 Postman Collection v2.1 JSON 檔案後，系統自動解析並匯入。

### 畫面結構

```
┌──────────────────────────┐
│  [+ New Collection]      │  ← Collections 區域頂部
│  [Import]                │  ← 匯入按鈕（觸發檔案選擇器）
├──────────────────────────┤
│                          │
│  （匯入後的 Collection   │
│    樹狀結構顯示於此）     │
│                          │
└──────────────────────────┘
```

## 區域劃分

### 區域 A：匯入觸發區

位於側邊欄 Collections 分頁頂部，與「New Collection」按鈕相鄰。

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| Import 按鈕 | 按鈕 | - | - | - | - | `Import` | 點擊後開啟系統原生檔案選擇對話框；僅接受 `.json` 檔案 |
| 隱藏 File Input | `<input type="file">` | - | - | `accept=".json"` | - | - | 隱藏元素，由 Import 按鈕代理觸發；選取檔案後觸發 `change` 事件進行解析 |

### 區域 B：檔案選擇對話框（系統原生）

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| 檔案選擇器 | 系統原生對話框 | 依系統語言 | 是（需選擇檔案） | 僅接受 `.json` 副檔名 | - | - | 使用系統原生檔案選擇器；單選模式；選取後讀取檔案內容進行 JSON 解析 |

## 匯入解析規格

### 支援的 Postman Collection 格式

- **格式版本**：Postman Collection v2.1（`info.schema` 包含 `v2.1.0`）
- **頂層結構**：`info` + `item[]`

### 解析映射規則

#### Collection 頂層

| Postman 欄位 | 映射目標 | 說明 |
|-------------|---------|------|
| `info.name` | `CollectionNode.name` | Collection 名稱；若不存在則預設為 `Imported Collection` |
| - | `CollectionNode.type` | 固定為 `'collection'` |
| - | `CollectionNode.id` | 自動產生 UUID（`crypto.randomUUID()`） |
| - | `CollectionNode.parentId` | `null`（頂層節點） |
| - | `CollectionNode.sortOrder` | `0` |

#### 資料夾（Folder）

判斷條件：`item` 物件中包含 `item` 子陣列（遞迴結構）。

| Postman 欄位 | 映射目標 | 說明 |
|-------------|---------|------|
| `item.name` | `CollectionNode.name` | 資料夾名稱；若不存在則預設為 `Folder` |
| - | `CollectionNode.type` | 固定為 `'folder'` |
| - | `CollectionNode.id` | 自動產生 UUID |
| `item.item[]` | 遞迴解析子項目 | 子資料夾與請求遞迴處理 |
| 陣列索引 | `CollectionNode.sortOrder` | 以 `forEach` 的 `index` 作為排序值 |

#### 請求（Request）

判斷條件：`item` 物件中包含 `request` 屬性（非巢狀 `item`）。

| Postman 欄位 | 映射目標 | 說明 |
|-------------|---------|------|
| `item.name` | `CollectionNode.name` | 請求名稱；若不存在則預設為 `Request` |
| - | `CollectionNode.type` | 固定為 `'request'` |
| - | `CollectionNode.id` | 自動產生 UUID |
| `item.request` | `CollectionNode.request` | 解析為 `SavedRequest` 結構 |
| `item.event[]` | `SavedRequest.preRequestScript` / `testScript` | 解析 event 陣列中的 scripts（見下方 Event Scripts 章節） |

### SavedRequest 欄位映射

#### Method 與 URL

| Postman 欄位 | 映射目標 | 數據類型 | 檢核 | 備註 |
|-------------|---------|----------|------|------|
| `request.method` | `SavedRequest.method` | `HttpMethod` | 轉為大寫 | 預設值為 `'GET'` |
| `request.url`（字串） | `SavedRequest.url` | `string` | - | 若 `url` 為字串則直接使用 |
| `request.url.raw` | `SavedRequest.url` | `string` | - | 若 `url` 為物件則取 `raw` 欄位 |

#### Headers

| Postman 欄位 | 映射目標 | 數據類型 | 檢核 | 備註 |
|-------------|---------|----------|------|------|
| `request.header[].key` | `KeyValuePair.key` | `string` | - | 預設為空字串 |
| `request.header[].value` | `KeyValuePair.value` | `string` | - | 預設為空字串 |
| `request.header[].disabled` | `KeyValuePair.enabled` | `boolean` | 反轉邏輯 | `enabled = !disabled` |
| - | `KeyValuePair.id` | `string` | - | 自動產生 UUID |

#### Query Params

| Postman 欄位 | 映射目標 | 數據類型 | 檢核 | 備註 |
|-------------|---------|----------|------|------|
| `request.url.query[].key` | `KeyValuePair.key` | `string` | - | 預設為空字串 |
| `request.url.query[].value` | `KeyValuePair.value` | `string` | - | 預設為空字串 |
| `request.url.query[].disabled` | `KeyValuePair.enabled` | `boolean` | 反轉邏輯 | `enabled = !disabled` |
| - | `KeyValuePair.id` | `string` | - | 自動產生 UUID |

#### Body

| Postman `body.mode` | 映射的 `RequestBody.type` | 說明 |
|---------------------|--------------------------|------|
| `raw` | `'raw'` | 取 `body.raw` 為內容 |
| `formdata` | `'form-data'` | 解析 `body.formdata[]` 陣列 |
| `urlencoded` | `'x-www-form-urlencoded'` | 解析 `body.urlencoded[]` 陣列 |
| 其他 / 不存在 | `'none'` | 預設無 Body |

##### Raw Body 欄位

| Postman 欄位 | 映射目標 | 數據類型 | 檢核 | 備註 |
|-------------|---------|----------|------|------|
| `body.raw` | `RequestBody.raw` | `string` | - | 預設為空字串 |
| `body.options.raw.language` | `RequestBody.rawType` | `'json' \| 'xml' \| 'text'` | - | `'json'` 映射為 `json`、`'xml'` 映射為 `xml`、其餘映射為 `text` |

##### Form Data / URL Encoded 欄位

| Postman 欄位 | 映射目標 | 數據類型 | 檢核 | 備註 |
|-------------|---------|----------|------|------|
| `[].key` | `KeyValuePair.key` | `string` | - | 預設為空字串 |
| `[].value` | `KeyValuePair.value` | `string` | - | 預設為空字串 |
| `[].disabled` | `KeyValuePair.enabled` | `boolean` | 反轉邏輯 | `enabled = !disabled` |
| - | `KeyValuePair.id` | `string` | - | 自動產生 UUID |

#### Auth 認證

| Postman `auth.type` | 映射的 `RequestAuth.type` | 說明 |
|---------------------|--------------------------|------|
| `bearer` | `'bearer'` | 取 Bearer Token |
| `basic` | `'basic'` | 取 username + password |
| 其他 / 不存在 | `'none'` | 預設無認證 |

##### Bearer Token

| Postman 欄位 | 映射目標 | 數據類型 | 備註 |
|-------------|---------|----------|------|
| `auth.bearer[0].value` | `RequestAuth.bearer.token` | `string` | 預設為空字串 |

##### Basic Auth

| Postman 欄位 | 映射目標 | 數據類型 | 備註 |
|-------------|---------|----------|------|
| `auth.basic[]` 中 `key === 'username'` 的 `value` | `RequestAuth.basic.username` | `string` | 預設為空字串 |
| `auth.basic[]` 中 `key === 'password'` 的 `value` | `RequestAuth.basic.password` | `string` | 預設為空字串 |

#### Event Scripts（Pre-request / Tests）

Postman 的 Script 資訊存放於 `item.event` 陣列中（與 `item.request` 同層級，非 `request` 內部）。

| Postman 欄位 | 映射目標 | 數據類型 | 檢核 | 備註 |
|-------------|---------|----------|------|------|
| `item.event[]` 中 `listen === 'prerequest'` 的 `script.exec` | `SavedRequest.preRequestScript` | `string` | `exec` 須為陣列 | `exec` 陣列以 `\n` 合併為字串 |
| `item.event[]` 中 `listen === 'test'` 的 `script.exec` | `SavedRequest.testScript` | `string` | `exec` 須為陣列 | `exec` 陣列以 `\n` 合併為字串 |

**Postman Event 結構範例：**

```json
{
  "name": "Login",
  "event": [
    {
      "listen": "prerequest",
      "script": { "exec": ["console.log('Before request');"] }
    },
    {
      "listen": "test",
      "script": { "exec": [
        "const res = pm.response.json();",
        "pm.environment.set('token', res.data.accessToken);"
      ]}
    }
  ],
  "request": { ... }
}
```

## 操作流程

### 匯入流程

1. 使用者點擊側邊欄 Collections 區域的「Import」按鈕
2. 系統開啟原生檔案選擇對話框，僅顯示 `.json` 檔案
3. 使用者選取 Postman Collection v2.1 JSON 檔案
4. 前端透過 `FileReader` 讀取檔案內容
5. 呼叫 `JSON.parse()` 解析 JSON 字串
6. 呼叫 `parsePostmanCollection(json)` 進行遞迴解析
7. 解析結果為扁平化的 `CollectionNode[]` 陣列
8. 逐一呼叫 `collectionStore.addNode()` 將節點寫入 SQLite
9. 匯入完成後，Collection Tree 自動更新顯示匯入的結構

### 解析流程（parsePostmanCollection）

1. 建立頂層 Collection 節點（`type: 'collection'`）
2. 遞迴呼叫 `parseItems(json.item, collectionId, nodes)`
3. 對每個 item 判斷：
   - 若含有 `item` 子陣列 -> 建立 Folder 節點，遞迴處理子項目
   - 若含有 `request` 屬性 -> 建立 Request 節點，呼叫 `parseRequest()` 解析請求細節
4. 回傳扁平化的 `CollectionNode[]`

## 資料結構

### 輸入格式（Postman Collection v2.1 JSON）

```json
{
  "info": {
    "name": "My Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "User APIs",
      "item": [
        {
          "name": "Get User",
          "request": {
            "method": "GET",
            "url": { "raw": "https://api.example.com/users/1", "query": [] },
            "header": [],
            "auth": { "type": "bearer", "bearer": [{ "value": "token123" }] }
          }
        }
      ]
    }
  ]
}
```

### 輸出格式（CollectionNode[]）

```typescript
interface CollectionNode {
  id: string                    // UUID
  name: string                  // 節點名稱
  type: CollectionNodeType      // 'collection' | 'folder' | 'request'
  parentId: string | null       // 父節點 ID
  sortOrder: number             // 排序順序
  request?: SavedRequest        // 僅 type='request' 時有值
  children?: CollectionNode[]   // 前端樹狀結構用
  isExpanded?: boolean          // 前端展開狀態
}
```

## 涉及元件

| 元件 | 路徑 | 說明 |
|------|------|------|
| CollectionTree | `src/components/collection/CollectionTree.vue` | Collection 樹狀結構元件，匯入按鈕位於此 |
| postmanImporter | `src/utils/postmanImporter.ts` | Postman Collection 解析工具函式 |
| collectionStore | `src/stores/collectionStore.ts` | Collection 資料狀態管理（Pinia） |

## 限制與規則

- 僅支援 Postman Collection v2.1 格式，不支援 v1.0 或其他格式
- Auth 類型僅支援 `bearer` 與 `basic`，不支援 `apikey`、`oauth2`、`digest` 等其他類型
- Body 模式僅支援 `raw`、`formdata`、`urlencoded`，不支援 `file`、`graphql` 等模式
- 匯入為覆蓋模式（新增），不會與既有 Collection 合併或去重
- 解析過程中遇到缺失欄位一律使用預設值，不中斷匯入流程
- 環境變數（`{{variable}}`）於匯入時保留原始語法，需搭配匯入 Postman Environment 才能正確解析
