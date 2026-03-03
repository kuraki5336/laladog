# Console 面板

## 文件資訊

| 項目     | 說明                          |
| -------- | ----------------------------- |
| 功能名稱 | Console 面板                   |
| 版本     | 1.0                          |
| 建立日期 | 2026-03-03                    |
| 狀態     | 已實作                        |

---

## 1. 功能概述

Console 面板位於左側 Sidebar 的第三個 Tab，用於記錄每次 HTTP 請求的完整細節（類似 Postman Console）。每當使用者發送請求（無論成功或失敗），系統自動將完整的 Request/Response 資訊記錄於此，方便除錯與分析。資料純記憶體儲存，不寫入 SQLite，關閉應用後自動清空。

---

## 2. 使用情境

| 情境編號 | 情境說明                                                              |
| -------- | --------------------------------------------------------------------- |
| UC-01    | 使用者發送請求後，查看實際送出的完整 Headers 和 Body（含環境變數解析後的值）|
| UC-02    | 使用者查看回應的完整 Headers 和 Body                                    |
| UC-03    | 使用者一鍵清空所有 Console 紀錄                                         |
| UC-04    | 使用者查看請求失敗時的錯誤細節                                          |

---

## 3. 畫面總覽

```
┌──────────────────────────────┐
│ [Collections] [History] [Console] │
├──────────────────────────────┤
│ Console                [Clear]│
├──────────────────────────────┤
│ ┌ POST https://api.ex.../lo  │
│ │ 200  45ms                   │
│ └────────────────────────────│
│   ▼ Request Headers           │
│     Content-Type: application │
│     Authorization: Bearer ... │
│   ▼ Request Body              │
│     {"username":"admin",...}   │
│   ▼ Response Headers          │
│     content-type: application │
│   ▼ Response Body             │
│     {"token":"eyJ..."}        │
│     1.2 KB                    │
├──────────────────────────────┤
│ ┌ GET  https://api.ex.../us  │
│ │ 401  12ms                   │
│ └────────────────────────────│
└──────────────────────────────┘
```

---

## 4. 區域劃分

### 4.1 Sidebar Tab

| 區域     | 說明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 位置     | Sidebar 頂部 Tab 列第三個按鈕                                          |
| 組件     | `Sidebar.vue`                                                           |
| 功能     | 切換至 Console 內容區域                                                 |

### 4.2 Console 標題列

| 區域     | 說明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 位置     | Console 面板頂部                                                        |
| 組件     | `ConsolePanel.vue`                                                      |
| 功能     | 顯示「Console」標題 + 「Clear」清空按鈕（有紀錄時才顯示）               |

### 4.3 紀錄列表

| 區域     | 說明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 位置     | 標題列下方，可捲動區域                                                  |
| 組件     | `ConsolePanel.vue`                                                      |
| 功能     | 顯示所有 Console 紀錄，最新在前；點擊展開細節                            |

---

## 5. 欄位規格

### 5.1 紀錄摘要列

| 欄位名稱   | 數據類型   | UI 元件 | 備註                                                  |
| ---------- | ---------- | ------- | ----------------------------------------------------- |
| Method     | HttpMethod | span    | 寬度固定 `w-12`，字體加粗，依 method 上色              |
| URL        | string     | span    | 解析後的完整 URL；單行截斷 `truncate`                  |
| Status     | number     | span    | 狀態碼；0 時顯示「ERR」；依狀態碼範圍上色              |
| Duration   | number     | span    | 格式：`{duration}ms`                                  |

### 5.2 展開細節區域

| 欄位名稱         | 數據類型              | UI 元件  | 備註                                                  |
| ---------------- | --------------------- | -------- | ----------------------------------------------------- |
| 時間戳記         | string                | div      | 格式：HH:MM:SS                                        |
| Request Headers  | Record<string,string> | details  | 收合式面板；以 `key: value` 格式逐行顯示               |
| Request Body     | string                | details  | 收合式面板；超過 500 字元截斷，提供「Show more」切換    |
| Response Headers | Record<string,string> | details  | 同 Request Headers                                     |
| Response Body    | string                | details  | 同 Request Body                                        |
| Size             | number                | div      | 自動格式化 B / KB                                      |

### 5.3 空狀態

| 欄位名稱 | 數據類型 | UI 元件 | 備註                                               |
| -------- | -------- | ------- | -------------------------------------------------- |
| 提示文字 | --       | div     | 「No requests recorded yet. Send a request to see details here.」|

---

## 6. 操作流程

### 6.1 自動記錄

```
使用者發送 HTTP 請求（成功或失敗）
  → requestStore.sendRequest() 完成
  → 自動呼叫 consoleStore.addEntry()
  → 成功：記錄完整 request/response 資訊
  → 失敗：記錄 status=0, statusText='Error', body=錯誤訊息
  → 紀錄自動出現在 Console 列表最上方
```

### 6.2 查看紀錄細節

```
使用者切換至 Console Tab
  → 看到所有紀錄的摘要列（method + URL + status + duration）
  → 點擊某筆紀錄
  → 展開細節（Request/Response Headers 和 Body 以 details 面板顯示）
  → 再次點擊收合
```

### 6.3 清空紀錄

```
使用者點擊「Clear」按鈕
  → consoleStore.clearAll()
  → 所有紀錄清空
  → 顯示空狀態提示
```

---

## 7. 涉及元件

| 元件路徑                                       | 說明                    |
| ---------------------------------------------- | ----------------------- |
| `src/components/console/ConsolePanel.vue`      | Console 面板 UI          |
| `src/components/layout/Sidebar.vue`            | Sidebar Tab 管理         |
| `src/stores/consoleStore.ts`                   | Console 紀錄 store       |
| `src/stores/requestStore.ts`                   | 請求發送後自動記錄       |
| `src/types/console.ts`                         | ConsoleEntry 型別        |

---

## 8. 技術備註

- 資料純記憶體儲存（`ref<ConsoleEntry[]>`），不寫入 SQLite
- 上限 500 筆，超過自動移除最舊的
- Response Body 超過 100KB 截斷，附加 `[truncated]` 標記
- 關閉應用後自動清空
- Console 紀錄在 Tauri 與瀏覽器環境皆可用
