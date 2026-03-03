# HTTP 請求面板

## 文件資訊

| 項目     | 說明                          |
| -------- | ----------------------------- |
| 功能名稱 | HTTP 請求面板                  |
| 版本     | 1.2                          |
| 建立日期 | 2026-03-03                    |
| 狀態     | 已實作                        |

---

## 1. 功能概述

HTTP 請求面板是應用程式的核心功能區域，位於主面板中央位置，分為上方的「請求面板（Request Panel）」與下方的「回應面板（Response Panel）」。使用者在請求面板中設定 HTTP Method、URL、參數、標頭、Body、認證、腳本等資訊，點擊 Send 送出請求後，回應結果顯示於回應面板中。

---

## 2. 使用情境

| 情境編號 | 情境說明                                                              |
| -------- | --------------------------------------------------------------------- |
| UC-01    | 使用者輸入 URL 並選擇 HTTP Method，點擊 Send 發送 API 請求            |
| UC-02    | 使用者透過 Params 分頁設定 Query Parameters                           |
| UC-03    | 使用者透過 Headers 分頁設定自訂請求標頭                                |
| UC-04    | 使用者透過 Body 分頁設定請求本體（JSON/XML/Form 等格式）               |
| UC-05    | 使用者透過 Auth 分頁設定認證方式（Bearer Token / Basic Auth / API Key）|
| UC-06    | 使用者撰寫 Pre-request Script 於請求發送前執行前置邏輯                 |
| UC-07    | 使用者撰寫 Tests 腳本驗證回應結果                                      |
| UC-08    | 使用者檢視回應的狀態碼、回應時間、Body 大小                            |
| UC-09    | 使用者以 Pretty / Raw / Preview 模式檢視回應 Body                      |
| UC-10    | 使用者檢視回應標頭                                                     |
| UC-11    | 使用者複製回應 Body 至剪貼簿                                           |

---

## 3. 畫面總覽

```
┌─────────────────────────────────────────────────────────────┐
│                     請求面板 (Request Panel)                  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌────────────────────────────┐ ┌──────┐┌──────┐┌────────┐│
│ │  GET ▾   │ │ {{url-gateway}}/Auth/login  │ │ Save ││ cURL ││  Send  ││
│ └─────────┘ └────────────────────────────┘ └──────┘└──────┘└────────┘│
│ → https://wowprime0.shop.twkuraki.com:18151/Auth/login         │
├─────────────────────────────────────────────────────────────┤
│ [Params] [Headers (3)] [Body] [Auth] [Pre-request] [Tests] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  （分頁內容區域）                                             │
│                                                             │
├═════════════════════════════════════════════════════════════┤
│                     回應面板 (Response Panel)                 │
├─────────────────────────────────────────────────────────────┤
│ Response  200 OK  123 ms  1.2 KB   [Body] [Headers] [Scripts]│
├─────────────────────────────────────────────────────────────┤
│ [Pretty] [Raw] [Preview]                           [Copy]  │
│                                                             │
│  {                                                          │
│    "id": 1,                                                 │
│    "name": "John Doe"                                       │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 區域劃分

### 4.1 URL Bar 區域

| 區域     | 說明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 位置     | 請求面板最頂部，帶有底部 border 分隔線                                  |
| 組件     | `UrlBar.vue`                                                            |
| 功能     | 提供 HTTP Method 選擇器、URL 輸入框、Save 儲存按鈕（從 Collection 載入時顯示）、Send 發送按鈕；URL 包含 `{{variable}}` 時下方顯示解析後的完整 URL 預覽 |

### 4.2 請求分頁列

| 區域     | 說明                                                                       |
| -------- | -------------------------------------------------------------------------- |
| 位置     | URL Bar 下方                                                                |
| 組件     | `RequestPanel.vue`                                                          |
| 功能     | 六個分頁切換按鈕：Params / Headers / Body / Auth / Pre-request / Tests      |
| 選中樣式 | 底部 2px `border-secondary` 色條 + `text-secondary`                         |
| 未選樣式 | `text-text-muted`，hover 時為 `text-text-primary`                           |

### 4.3 請求分頁內容區域

| 區域     | 說明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 位置     | 分頁列下方，可捲動區域                                                  |
| 組件     | 依當前分頁動態切換對應子元件                                             |
| 功能     | 顯示當前選中分頁的編輯內容                                               |

### 4.4 回應面板 Meta 列

| 區域     | 說明                                                                       |
| -------- | -------------------------------------------------------------------------- |
| 位置     | 回應面板頂部                                                                |
| 組件     | `ResponsePanel.vue`                                                         |
| 功能     | 顯示回應標題「Response」、狀態碼、回應時間、Body 大小，以及 Body/Headers/Scripts 分頁切換 |

### 4.5 回應內容區域

| 區域     | 說明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 位置     | 回應 Meta 列下方，可捲動區域                                            |
| 組件     | `ResponseBody.vue` / `ResponseHeaders.vue` / 內嵌 Script 輸出           |
| 功能     | 依分頁切換顯示回應 Body（含 Pretty/Raw/Preview 模式切換）、回應標頭表格、或 Script 執行結果  |

---

## 5. 欄位規格

### 5.1 URL Bar

| 欄位名稱     | 數據類型   | UI 元件  | 必填 | 預設值 | 佔位符                                                       | 檢核規則              | 備註                                                                                                                       |
| ------------ | ---------- | -------- | ---- | ------ | ------------------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| HTTP Method  | HttpMethod | select   | 是   | `GET`  | --                                                           | --                    | 可選值：`GET` / `POST` / `PUT` / `PATCH` / `DELETE` / `HEAD` / `OPTIONS`；依 method 顯示對應背景色與文字色                  |
| URL          | string     | input    | 是   | `""`   | Enter URL or paste text (e.g. https://api.example.com/users) | 發送時不可為空白       | 支援 `{{variable}}` 語法，發送前會解析環境變數；按 Enter 等同點擊 Send                                                       |
| URL 解析預覽 | string     | span     | --   | --     | --                                                           | --                    | 僅在 URL 包含 `{{` 時顯示；以 `→` 前綴顯示解析後的完整 URL；字體大小 `text-[11px]`，顏色 `text-text-muted`                   |
| Save 按鈕    | --         | button   | --   | --     | --                                                           | --                    | 僅從 Collection 載入的請求才顯示（`collectionNodeId` 不為 null）；點擊後儲存當前所有編輯回 Collection；儲存後短暫顯示「Saved!」綠色提示 |
| cURL 按鈕    | --         | button   | --   | --     | --                                                           | --                    | URL 不為空時顯示；點擊後解析所有環境變數，組裝完整 cURL 指令並複製至剪貼簿；複製成功後短暫顯示「Copied!」綠色提示                |
| Send 按鈕    | --         | button   | --   | --     | --                                                           | --                    | 發送中顯示「Sending...」，disabled 狀態；URL 為空時 disabled；正常狀態顯示「Send」                                           |

**HTTP Method 顏色對照表（URL Bar）：**

| Method  | 背景色           | 文字色           |
| ------- | ---------------- | ---------------- |
| GET     | `bg-green-100`   | `text-green-700` |
| POST    | `bg-yellow-100`  | `text-yellow-700`|
| PUT     | `bg-blue-100`    | `text-blue-700`  |
| PATCH   | `bg-purple-100`  | `text-purple-700`|
| DELETE  | `bg-red-100`     | `text-red-700`   |
| HEAD    | `bg-gray-100`    | `text-gray-600`  |
| OPTIONS | `bg-gray-100`    | `text-gray-600`  |

### 5.2 請求分頁列

| 欄位名稱     | 數據類型 | UI 元件 | 預設值   | 備註                                                                                          |
| ------------ | -------- | ------- | -------- | --------------------------------------------------------------------------------------------- |
| 當前分頁     | string   | button  | `params` | 可選值：`params` / `headers` / `body` / `auth` / `pre-request` / `tests`                      |
| Headers 徽章 | number   | span    | --       | 顯示已啟用的 Headers 數量；僅 `headers.filter(h => h.enabled).length > 0` 時顯示圓角徽章      |

### 5.3 Params 分頁

| 欄位名稱        | 數據類型        | UI 元件          | 必填 | 預設值 | 佔位符    | 備註                                                    |
| --------------- | --------------- | ---------------- | ---- | ------ | --------- | ------------------------------------------------------- |
| 標題文字        | --              | div              | --   | --     | --        | 固定顯示「Query Parameters」                             |
| 參數列表        | KeyValuePair[]  | KeyValueEditor   | 否   | `[]`   | --        | Key-Value 編輯器，每列包含啟用勾選框、Key、Value、刪除按鈕 |

**KeyValueEditor 每列欄位：**

| 欄位名稱 | 數據類型 | UI 元件   | 必填 | 預設值 | 佔位符    | 備註                                    |
| -------- | -------- | --------- | ---- | ------ | --------- | --------------------------------------- |
| 啟用     | boolean  | checkbox  | --   | `true` | --        | 控制該參數是否生效                       |
| Key      | string   | input     | 否   | `""`   | Parameter | 參數名稱                                |
| Value    | string   | input     | 否   | `""`   | Value     | 參數值；支援 `{{variable}}` 語法         |
| 刪除     | --       | button    | --   | --     | --        | 顯示「✕」，hover 時文字變紅色            |
| 新增列   | --       | button    | --   | --     | --        | 顯示「+ Add」，點擊在列表末尾新增空白列  |

### 5.4 Headers 分頁

| 欄位名稱        | 數據類型        | UI 元件          | 必填 | 預設值                                               | 佔位符  | 備註                                                    |
| --------------- | --------------- | ---------------- | ---- | ---------------------------------------------------- | ------- | ------------------------------------------------------- |
| 標題文字        | --              | div              | --   | --                                                   | --      | 固定顯示「Headers」                                      |
| 標頭列表        | KeyValuePair[]  | KeyValueEditor   | 否   | 預設含一列 `Content-Type: application/json (enabled)` | --      | Key-Value 編輯器，結構同 Params                           |

**KeyValueEditor 每列欄位：**

| 欄位名稱 | 數據類型 | UI 元件   | 必填 | 預設值 | 佔位符 | 備註                                    |
| -------- | -------- | --------- | ---- | ------ | ------ | --------------------------------------- |
| 啟用     | boolean  | checkbox  | --   | `true` | --     | 控制該標頭是否生效                       |
| Key      | string   | input     | 否   | `""`   | Header | 標頭名稱                                |
| Value    | string   | input     | 否   | `""`   | Value  | 標頭值；支援 `{{variable}}` 語法         |
| 刪除     | --       | button    | --   | --     | --     | 顯示「✕」                                |
| 新增列   | --       | button    | --   | --     | --     | 顯示「+ Add」                            |

### 5.5 Body 分頁

#### 5.5.1 Body Type 選擇器

| 欄位名稱     | 數據類型 | UI 元件 | 必填 | 預設值 | 備註                                                             |
| ------------ | -------- | ------- | ---- | ------ | ---------------------------------------------------------------- |
| Body 類型    | string   | radio   | 是   | `none` | 可選值：`none` / `raw` / `form-data` / `x-www-form-urlencoded`   |

#### 5.5.2 Body Type = none

| 欄位名稱 | 數據類型 | UI 元件 | 備註                                     |
| -------- | -------- | ------- | ---------------------------------------- |
| 提示文字 | --       | div     | 顯示「This request does not have a body」|

#### 5.5.3 Body Type = raw

| 欄位名稱       | 數據類型 | UI 元件   | 必填 | 預設值 | 佔位符             | 備註                                                  |
| -------------- | -------- | --------- | ---- | ------ | ------------------ | ----------------------------------------------------- |
| Raw 格式       | string   | select    | 是   | --     | --                 | 可選值：`JSON` / `XML` / `TEXT`；顯示為大寫            |
| Format 按鈕    | --       | button    | --   | --     | --                 | 僅 `rawType === 'json'` 時顯示；點擊後以 `JSON.parse()` → `JSON.stringify(parsed, null, 2)` 格式化 Body 內容；解析失敗時行內顯示紅色「Invalid JSON」提示，2 秒後自動消失 |
| Raw 內容       | string   | textarea  | 否   | `""`   | `{ "key": "value" }` | 高度固定 `h-48`，等寬字體 `font-mono`；支援 `{{variable}}` 語法 |

#### 5.5.4 Body Type = form-data

| 欄位名稱        | 數據類型        | UI 元件          | 必填 | 預設值 | 佔位符 | 備註                              |
| --------------- | --------------- | ---------------- | ---- | ------ | ------ | --------------------------------- |
| Form Data 列表  | KeyValuePair[]  | KeyValueEditor   | 否   | `[]`   | --     | Key-Value 編輯器，結構同 Params    |

**KeyValueEditor 每列欄位：**

| 欄位名稱 | 數據類型 | UI 元件   | 必填 | 預設值 | 佔位符 | 備註       |
| -------- | -------- | --------- | ---- | ------ | ------ | ---------- |
| 啟用     | boolean  | checkbox  | --   | `true` | --     |            |
| Key      | string   | input     | 否   | `""`   | Key    |            |
| Value    | string   | input     | 否   | `""`   | Value  |            |
| 刪除     | --       | button    | --   | --     | --     | 顯示「✕」  |
| 新增列   | --       | button    | --   | --     | --     | 顯示「+ Add」 |

#### 5.5.5 Body Type = x-www-form-urlencoded

| 欄位名稱           | 數據類型        | UI 元件          | 必填 | 預設值 | 佔位符 | 備註                              |
| ------------------ | --------------- | ---------------- | ---- | ------ | ------ | --------------------------------- |
| URL Encoded 列表   | KeyValuePair[]  | KeyValueEditor   | 否   | `[]`   | --     | Key-Value 編輯器，結構同 Params    |

**KeyValueEditor 每列欄位同 5.5.4。**

### 5.6 Auth 分頁

#### 5.6.1 Auth Type 選擇器

| 欄位名稱   | 數據類型 | UI 元件 | 必填 | 預設值 | 備註                                                          |
| ---------- | -------- | ------- | ---- | ------ | ------------------------------------------------------------- |
| 認證類型   | string   | select  | 是   | `none` | 可選值：`No Auth` / `Bearer Token` / `Basic Auth` / `API Key` |

#### 5.6.2 Auth Type = none（No Auth）

| 欄位名稱 | 數據類型 | UI 元件 | 備註                          |
| -------- | -------- | ------- | ----------------------------- |
| 提示文字 | --       | div     | 顯示「No authentication」     |

#### 5.6.3 Auth Type = bearer（Bearer Token）

| 欄位名稱 | 數據類型 | UI 元件 | 必填 | 預設值 | 佔位符      | 備註                                               |
| -------- | -------- | ------- | ---- | ------ | ----------- | -------------------------------------------------- |
| Token    | string   | input   | 是   | `""`   | Enter token | 等寬字體 `font-mono`；支援 `{{variable}}` 語法      |

#### 5.6.4 Auth Type = basic（Basic Auth）

| 欄位名稱 | 數據類型 | UI 元件        | 必填 | 預設值 | 佔位符   | 備註                              |
| -------- | -------- | -------------- | ---- | ------ | -------- | --------------------------------- |
| Username | string   | input (text)   | 是   | `""`   | Username | 支援 `{{variable}}` 語法          |
| Password | string   | input (password) | 是 | `""`   | Password | 密碼遮罩顯示；支援 `{{variable}}` 語法 |

#### 5.6.5 Auth Type = apikey（API Key）

| 欄位名稱   | 數據類型 | UI 元件 | 必填 | 預設值   | 佔位符         | 備註                                                     |
| ---------- | -------- | ------- | ---- | -------- | -------------- | -------------------------------------------------------- |
| Key        | string   | input   | 是   | `""`     | e.g. X-API-Key | API Key 的名稱（如 Header name 或 Query param name）      |
| Value      | string   | input   | 是   | `""`     | API Key value  | API Key 的值；等寬字體 `font-mono`                        |
| Add to     | string   | select  | 是   | --       | --             | 可選值：`Header` / `Query Params`；決定 API Key 附加位置  |

### 5.7 Pre-request Script 分頁

| 欄位名稱       | 數據類型 | UI 元件   | 必填 | 預設值 | 佔位符                                                                                                             | 備註                                                                                         |
| -------------- | -------- | --------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 分頁標題       | --       | span      | --   | --     | --                                                                                                                 | 顯示「Pre-request Script」                                                                    |
| Run 按鈕       | --       | button    | --   | --     | --                                                                                                                 | 執行中顯示「Running...」並 disabled；正常顯示「Run」                                           |
| 腳本編輯區     | string   | textarea  | 否   | `""`   | `// Pre-request Script` `// Available: pm.environment.set(key, value)` `// pm.variables.get(key)` `// pm.request.headers` | 等寬字體 `font-mono`，無拼字檢查 `spellcheck="false"`；背景色 `bg-bg-stripe`                   |
| 輸出 Console   | string   | pre       | --   | `""`   | Output will appear here...                                                                                         | 深色背景 `bg-primary-90`，綠色文字 `text-green-400`；高度固定 `h-24`，可捲動                    |

**Pre-request Script 沙盒 pm 物件 API：**

| API                              | 說明                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pm.environment.set(key, value)` | 設定環境變數；實際呼叫 `environmentStore.updateVariable()` 或 `addVariable()`，真正寫入環境變數     |
| `pm.environment.get(key)`        | 取得環境變數；從 `environmentStore.allVariables` 讀取                                              |
| `pm.variables.get(key)`          | 取得變數（同 `pm.environment.get`）                                                                |
| `console.log(...args)`           | 輸出日誌                                                                                          |
| `console.error(...args)`         | 輸出錯誤訊息（前綴 [ERROR]）                                                                       |
| `console.warn(...args)`          | 輸出警告訊息（前綴 [WARN]）                                                                        |

### 5.8 Tests 分頁

| 欄位名稱       | 數據類型 | UI 元件   | 必填 | 預設值 | 佔位符                                                                                                                                        | 備註                                      |
| -------------- | -------- | --------- | ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 分頁標題       | --       | span      | --   | --     | --                                                                                                                                            | 顯示「Tests」                              |
| Run 按鈕       | --       | button    | --   | --     | --                                                                                                                                            | 同 Pre-request Script                      |
| 腳本編輯區     | string   | textarea  | 否   | `""`   | `// Tests` `// Available: pm.response.status` `// pm.response.json()` `// pm.test(name, fn)` `// pm.expect(value)`                            | 同 Pre-request Script 樣式                 |
| 輸出 Console   | string   | pre       | --   | `""`   | Output will appear here...                                                                                                                    | 同 Pre-request Script 樣式                 |

**Tests 沙盒 pm 物件 API（除 Pre-request 已有之 API 外）：**

| API                                    | 說明                                                     |
| -------------------------------------- | -------------------------------------------------------- |
| `pm.response.status`                   | 回應狀態碼（number）                                      |
| `pm.response.statusText`               | 回應狀態文字（如 `OK`）                                   |
| `pm.response.headers`                  | 回應標頭（`Record<string, string>`）                      |
| `pm.response.body`                     | 回應 Body 原始字串                                        |
| `pm.response.json()`                   | 回應 Body 解析為 JSON；解析失敗拋出 Error                  |
| `pm.test(name, fn)`                    | 定義測試案例；通過顯示 `✓ name`，失敗顯示 `✗ name: error` |
| `pm.expect(value).to.equal(v)`         | 斷言值相等                                                |
| `pm.expect(value).to.not.equal(v)`     | 斷言值不相等                                              |
| `pm.expect(value).to.be.true`          | 斷言值為 true                                             |
| `pm.expect(value).to.be.false`         | 斷言值為 false                                            |
| `pm.expect(value).to.be.above(n)`      | 斷言值大於 n                                              |
| `pm.expect(value).to.be.below(n)`      | 斷言值小於 n                                              |
| `pm.expect(value).to.include(str)`     | 斷言字串或陣列包含 str                                    |

### 5.9 回應面板 - Meta 列

| 欄位名稱     | 數據類型 | UI 元件 | 備註                                                                                               |
| ------------ | -------- | ------- | -------------------------------------------------------------------------------------------------- |
| 標題         | --       | span    | 固定顯示「Response」                                                                                |
| 狀態碼       | number   | span    | 格式：`{status} {statusText}`（如 `200 OK`）；顏色依狀態碼範圍變化                                   |
| 回應時間     | number   | span    | 格式：`{duration} ms`                                                                               |
| Body 大小    | number   | span    | 自動格式化：< 1024 顯示 `B`，< 1MB 顯示 `KB`（1位小數），>= 1MB 顯示 `MB`（1位小數）                |
| 分頁切換     | string   | button  | 可選值：`body` / `headers` / `scripts`（Scripts 僅在有 Script 輸出時顯示）；選中樣式 `bg-secondary-10 text-secondary` |

**狀態碼顏色對照表：**

| 狀態碼範圍 | CSS Class       | 語義     |
| ---------- | --------------- | -------- |
| 2xx        | `text-success`  | 成功     |
| 3xx        | `text-info`     | 重導向   |
| 4xx        | `text-warning`  | 用戶端錯誤 |
| 5xx        | `text-danger`   | 伺服器錯誤 |

### 5.10 回應面板 - Body 內容

| 欄位名稱       | 數據類型         | UI 元件  | 預設值   | 備註                                                                                               |
| -------------- | ---------------- | -------- | -------- | -------------------------------------------------------------------------------------------------- |
| 檢視模式       | ResponseViewMode | button   | `pretty` | 可選值：`pretty` / `raw` / `preview`；三個按鈕橫排切換                                              |
| 複製按鈕       | --               | button   | --       | 顯示「Copy」，點擊將原始回應 Body 複製至系統剪貼簿 (`navigator.clipboard.writeText`)                 |
| Pretty 檢視    | string           | pre/code | --       | 嘗試以 `JSON.parse` 解析後以 `JSON.stringify(parsed, null, 2)` 格式化顯示；解析失敗則原樣顯示        |
| Raw 檢視       | string           | pre/code | --       | 原始回應 Body 文字，不做任何格式化處理                                                               |
| Preview 檢視   | string           | iframe   | --       | 以 `srcdoc` 方式將回應 Body 渲染為 HTML；iframe 高度 `h-64`；`sandbox=""` 確保安全隔離               |

### 5.11 回應面板 - Headers 表格

| 欄位名稱   | 數據類型              | UI 元件 | 備註                                                  |
| ---------- | --------------------- | ------- | ----------------------------------------------------- |
| Key 欄位   | string                | td      | 字體加粗 `font-medium`，文字色 `text-primary`          |
| Value 欄位 | string                | td      | 等寬字體 `font-mono`，允許文字斷行 `break-all`         |

### 5.12 回應面板 - Scripts 輸出

| 欄位名稱       | 數據類型 | UI 元件 | 備註                                                                                                    |
| -------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------- |
| 顯示條件       | --       | --      | 僅在 `store.scriptOutput` 有值時，回應面板才顯示「Scripts」分頁按鈕                                      |
| Script 輸出    | string   | pre     | 等寬字體 `font-mono text-xs`，綠色文字 `text-green-400`；顯示 Pre-request Script 與 Tests 的執行結果     |
| 區段分隔       | --       | --      | 若同時有 Pre-request 與 Tests 輸出，以 `--- Tests ---` 分隔                                              |

### 5.13 回應面板 - 空狀態

| 欄位名稱 | 數據類型 | UI 元件 | 備註                                                                          |
| -------- | -------- | ------- | ----------------------------------------------------------------------------- |
| 空狀態   | --       | div     | 火箭圖示（文字 3xl） + 提示文字「Send a request to see the response」；置中顯示 |

### 5.14 回應面板 - 錯誤狀態

| 欄位名稱   | 數據類型 | UI 元件 | 備註                                                                  |
| ---------- | -------- | ------- | --------------------------------------------------------------------- |
| 錯誤訊息   | string   | div     | 圓角背景 `bg-danger-light`，文字色 `text-danger`；顯示 store.error 內容 |

---

## 6. 操作流程

### 6.1 發送 HTTP 請求

```
使用者選擇 HTTP Method（預設 GET）
  → 輸入目標 URL
  → （可選）設定 Params / Headers / Body / Auth / Pre-request Script / Tests
  → 點擊「Send」按鈕或在 URL 輸入框按 Enter
  → Send 按鈕切換為「Sending...」disabled 狀態
  → 呼叫 requestStore.sendRequest()
  → [自動] 若有 Pre-request Script，先執行（可動態設定環境變數）
  → 解析 {{variable}} 語法替換環境變數（含 Pre-request Script 新設定的變數）
  → 根據 Body type 自動補充 Content-Type（若使用者未手動設定）
  → 發送 HTTP 請求
  → 回應結果寫入 store.response
  → [自動] 若有 Tests Script，以真實 response 執行（可擷取回應值存為環境變數）
  → Script 執行結果寫入 store.scriptOutput，回應面板出現「Scripts」分頁
  → 回應面板自動顯示 status、duration、size
  → Send 按鈕恢復正常狀態
```

### 6.2 切換請求分頁

```
使用者點擊分頁按鈕（Params / Headers / Body / Auth / Pre-request / Tests）
  → store.activeRequest.activeTab 更新為對應值
  → 分頁內容區域切換顯示對應的編輯元件
```

### 6.3 編輯 Key-Value 參數

```
使用者在 KeyValueEditor 中操作：
  → 勾選/取消勾選 checkbox 控制該列是否啟用
  → 輸入 Key 和 Value
  → 點擊「✕」按鈕刪除該列
  → 點擊「+ Add」按鈕新增空白列
```

### 6.4 設定 Body

```
使用者選擇 Body Type（radio 按鈕）：
  → none: 顯示提示文字，不發送 Body
  → raw: 選擇格式（JSON/XML/TEXT），在 textarea 中編輯內容
  → form-data: 使用 KeyValueEditor 編輯表單資料
  → x-www-form-urlencoded: 使用 KeyValueEditor 編輯 URL 編碼資料
```

### 6.5 設定認證

```
使用者選擇 Auth Type（下拉選單）：
  → No Auth: 顯示提示文字，不附加認證資訊
  → Bearer Token: 輸入 Token 值
  → Basic Auth: 輸入 Username 與 Password
  → API Key: 輸入 Key 名稱、Value 值，選擇附加位置（Header / Query Params）
```

### 6.6 手動執行腳本

```
使用者在 Pre-request 或 Tests 分頁中撰寫 JavaScript 腳本
  → 點擊「Run」按鈕（手動測試用）
  → 建立沙盒化環境（mock console + 真實 pm 物件）
  → pm.environment.set() 實際寫入 environmentStore
  → pm.response 使用真實 response 資料（Tests 模式）
  → 以 new Function() 執行使用者腳本
  → 執行結果輸出至下方 Console 區域
  → 若執行錯誤，顯示「Error: {message}」
  → 若無輸出，顯示「Script executed successfully (no output)」
```

**備註**：除手動點擊 Run 外，Script 也會在 Send 時自動執行（見 6.1 流程）。

### 6.7 檢視回應

```
請求完成後：
  → 回應面板 Meta 列顯示 status、duration、size
  → 預設顯示 Body 分頁的 Pretty 模式
  → 使用者可切換 Pretty / Raw / Preview 模式
  → 使用者可點擊「Copy」複製回應至剪貼簿
  → 使用者可切換至 Headers 分頁檢視回應標頭
  → 若有 Script 執行結果，可切換至 Scripts 分頁檢視
若請求失敗：
  → 顯示紅色錯誤訊息區塊
```

### 6.8 儲存請求至 Collection

```
使用者從左側 Collection 樹載入一個請求
  → URL Bar 出現「Save」按鈕（位於 Send 左側）
  → 使用者修改 URL / Headers / Body / Auth / Scripts 等內容
  → 點擊「Save」按鈕
  → 按鈕切換為「Saving...」disabled 狀態
  → 呼叫 requestStore.saveToCollection()
  → 將當前所有欄位（含 preRequestScript、testScript）寫回 collectionStore
  → Tauri 環境下同步更新 SQLite
  → 按鈕短暫顯示「Saved!」綠色文字（1.5 秒後恢復）
```

**備註**：新建的空請求（未關聯 Collection）不顯示 Save 按鈕。

### 6.9 複製為 cURL 指令

```
使用者在 URL Bar 輸入 URL（URL 不為空時出現「cURL」按鈕）
  → 點擊「cURL」按鈕
  → 解析所有環境變數（URL、Query Params、Headers、Auth、Body）
  → 自動補充 Content-Type（邏輯與 sendRequest 一致）
  → 呼叫 generateCurl() 產生 cURL 指令字串
  → 寫入系統剪貼簿 (navigator.clipboard.writeText)
  → 按鈕短暫顯示「Copied!」綠色文字（1.5 秒後恢復）
```

**cURL 產生規則：**
- GET 方法不加 `-X`；其他方法加 `-X {METHOD}`
- 每個 Header 加 `-H 'key: value'`
- Body 加 `-d 'content'`（GET/HEAD 不加）
- 值中的單引號以 `'\''` 轉義（bash 安全）
- 超過 3 段時以 `\` 換行排列

### 6.10 格式化 JSON Body

```
使用者切換 Body Type 為 raw 且 Raw 格式為 JSON
  → 「Format」按鈕出現於格式選擇器右側
  → 使用者貼入 minified JSON 內容
  → 點擊「Format」按鈕
  → JSON.parse() 解析內容
  → 解析成功：以 JSON.stringify(parsed, null, 2) 格式化後寫回 textarea
  → 解析失敗：行內顯示紅色「Invalid JSON」提示，2 秒後自動消失
```

### 6.11 Console 紀錄自動產生

```
使用者發送任何 HTTP 請求（成功或失敗）
  → requestStore.sendRequest() 完成後
  → 自動呼叫 consoleStore.addEntry() 記錄完整細節
  → 紀錄包含：method、解析後 URL、request headers、request body、
    response status/headers/body、duration、size
  → 最新紀錄在前，上限 500 筆（自動移除最舊的）
  → 回應 Body 超過 100KB 時截斷（防記憶體爆炸）
  → 使用者可在 Sidebar「Console」分頁查看所有紀錄
  → 點擊紀錄展開完整細節（使用 <details> 收合式面板）
  → 「Clear」按鈕一鍵清空所有紀錄
```

---

## 7. 涉及元件

| 元件路徑                                             | 說明                    |
| ---------------------------------------------------- | ----------------------- |
| `src/components/request/RequestPanel.vue`            | 請求面板容器與分頁管理   |
| `src/components/request/UrlBar.vue`                  | URL Bar（Method + URL + Send） |
| `src/components/request/ParamsEditor.vue`            | Params 分頁              |
| `src/components/request/HeadersEditor.vue`           | Headers 分頁             |
| `src/components/request/BodyEditor.vue`              | Body 分頁                |
| `src/components/request/AuthEditor.vue`              | Auth 分頁                |
| `src/components/request/ScriptEditor.vue`            | Pre-request / Tests 分頁 |
| `src/components/common/KeyValueEditor.vue`           | 通用 Key-Value 編輯器    |
| `src/components/response/ResponsePanel.vue`          | 回應面板容器             |
| `src/components/response/ResponseBody.vue`           | 回應 Body 顯示           |
| `src/components/response/ResponseHeaders.vue`        | 回應 Headers 表格        |
| `src/stores/requestStore.ts`                         | 請求狀態管理             |
| `src/stores/consoleStore.ts`                         | Console 紀錄管理（純記憶體）|
| `src/types/collection.ts`                            | 型別定義（Request 相關） |
| `src/types/request.ts`                               | ActiveRequest 型別       |
| `src/types/response.ts`                              | Response 型別            |
| `src/types/console.ts`                               | ConsoleEntry 型別        |
| `src/utils/variableResolver.ts`                      | 環境變數解析工具         |
| `src/utils/curlGenerator.ts`                         | cURL 指令產生工具        |
