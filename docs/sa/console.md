# Console 面板

## 文件資訊

| 項目     | 說明                          |
| -------- | ----------------------------- |
| 功能名稱 | Console 面板                   |
| 版本     | 2.0                          |
| 建立日期 | 2026-03-03                    |
| 最後更新 | 2026-03-04                    |
| 狀態     | 已實作                        |

---

## 1. 功能概述

Console 面板位於右側 Response Panel 的第三個 Tab（Body / Headers / Console），用於顯示當前 API 請求的完整 HTTP 交易細節（類似 Postman Console）。每次發送請求後，Console 自動顯示該次請求的 General 資訊、Request Headers、Response Headers、Request Body，方便除錯與分析。

與 v1.0 不同，Console 不再是 Sidebar 中的獨立 Tab，而是與每次請求綁定，顯示在 Response Panel 中。

---

## 2. 使用情境

| 情境編號 | 情境說明                                                              |
| -------- | --------------------------------------------------------------------- |
| UC-01    | 使用者發送請求後，切換至 Console Tab 查看實際送出的完整 URL、Method、Headers 和 Body（含環境變數解析後的值）|
| UC-02    | 使用者查看回應的完整 Headers                                           |
| UC-03    | 使用者查看 General 資訊（URL、Method、Status、Duration、Size）         |
| UC-04    | 使用者在未發送請求前查看 Console Tab，顯示空狀態提示                    |

---

## 3. 畫面總覽

```
┌─────────────────────────────────────────────────────┐
│  Response Panel                                      │
│  [Body] [Headers] [Console] [Scripts]                │
├─────────────────────────────────────────────────────┤
│  General                                             │
│  ┌─────────────────────────────────────────────────┐│
│  │ URL       https://api.example.com/login          ││
│  │ Method    POST                                   ││
│  │ Status    200 OK                                 ││
│  │ Duration  45ms                                   ││
│  │ Size      1.2 KB                                 ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Response Headers                                    │
│  ┌─────────────────────────────────────────────────┐│
│  │ content-type    application/json                 ││
│  │ x-request-id    abc-123                          ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Request Headers                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ Content-Type    application/json                 ││
│  │ Authorization   Bearer eyJ...                    ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Request Body                                        │
│  ┌─────────────────────────────────────────────────┐│
│  │ {                                                ││
│  │   "username": "admin",                           ││
│  │   "password": "***"                              ││
│  │ }                                                ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## 4. 區域劃分

### 4.1 Response Panel Tab

| 區域     | 說明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 位置     | Response Panel 頂部 Tab 列第三個按鈕                                    |
| 組件     | `ResponsePanel.vue`                                                     |
| 功能     | 切換至 Console 內容區域                                                 |

### 4.2 Console 內容

| 區域     | 說明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 位置     | Response Panel 的 Tab 內容區域                                          |
| 組件     | `ResponseConsole.vue`                                                   |
| 功能     | 顯示當前請求的 General、Response Headers、Request Headers、Request Body |

---

## 5. 欄位規格

### 5.1 General 區塊

| 欄位名稱   | 數據類型   | UI 元件 | 備註                                                  |
| ---------- | ---------- | ------- | ----------------------------------------------------- |
| URL        | string     | span    | 請求的完整解析後 URL                                   |
| Method     | string     | span    | HTTP Method（GET、POST 等）                            |
| Status     | string     | span    | 狀態碼 + 狀態文字，依狀態碼範圍上色                    |
| Duration   | string     | span    | 格式：`{duration}ms`                                   |
| Size       | string     | span    | 回應 body 大小，自動格式化 B / KB                      |

### 5.2 Response Headers 區塊

| 欄位名稱         | 數據類型              | UI 元件  | 備註                                                  |
| ---------------- | --------------------- | -------- | ----------------------------------------------------- |
| Response Headers | Record<string,string> | table    | 以 key-value 表格逐行顯示回應的所有 header              |

### 5.3 Request Headers 區塊

| 欄位名稱         | 數據類型              | UI 元件  | 備註                                                  |
| ---------------- | --------------------- | -------- | ----------------------------------------------------- |
| Request Headers  | Record<string,string> | table    | 以 key-value 表格逐行顯示請求的所有 header              |

### 5.4 Request Body 區塊

| 欄位名稱     | 數據類型 | UI 元件  | 備註                                                  |
| ------------ | -------- | -------- | ----------------------------------------------------- |
| Request Body | string   | pre      | JSON 格式自動美化顯示；非 JSON 原文顯示                |

### 5.5 空狀態

| 欄位名稱 | 數據類型 | UI 元件 | 備註                                               |
| -------- | -------- | ------- | -------------------------------------------------- |
| 提示文字 | --       | div     | 「Send a request to see console details」           |

---

## 6. 操作流程

### 6.1 查看請求細節

```
使用者發送 HTTP 請求
  → requestStore.sendRequest() 在發送前儲存 lastRequestDetails
     （包含解析後的 method、url、headers、body）
  → 請求完成後，response 儲存於 requestStore
  → 使用者切換至 Console Tab
  → ResponseConsole 讀取 store.lastRequestDetails 和 store.response
  → 顯示 General + Response Headers + Request Headers + Request Body
```

### 6.2 切換請求

```
使用者在 Collection 樹中點擊另一個請求
  → requestStore.loadFromCollection() 清除 lastRequestDetails
  → Console Tab 顯示空狀態
  → 使用者發送新請求後，Console 顯示新的資料
```

---

## 7. 涉及元件

| 元件路徑                                           | 說明                    |
| -------------------------------------------------- | ----------------------- |
| `src/components/response/ResponseConsole.vue`      | Console 面板 UI          |
| `src/components/response/ResponsePanel.vue`        | Response Panel Tab 管理  |
| `src/stores/requestStore.ts`                       | lastRequestDetails 儲存  |

---

## 8. 技術備註

- `lastRequestDetails` 儲存於 `requestStore` 的 `ref` 中，每次發送請求前更新
- 資料為每次請求的快照，不累積歷史
- Request Body 若為有效 JSON 字串，自動以 `JSON.stringify(parsed, null, 2)` 美化顯示
- Console Tab 僅在有 `lastRequestDetails` 或 `response` 時顯示內容，否則顯示空狀態提示

## 變更歷史

| 日期       | 版本 | 變更說明                                            |
| ---------- | ---- | --------------------------------------------------- |
| 2026-03-03 | 1.0  | 初版建立（Sidebar Console Tab，累積式歷史紀錄）      |
| 2026-03-04 | 2.0  | 移至 Response Panel，改為 per-request 顯示           |
