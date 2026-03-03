# 請求歷史（Request History）

## 功能概述

請求歷史面板位於側邊欄的 History 分頁，用於記錄使用者所有已發送的 HTTP 請求。每次成功發送請求後，系統自動將該請求的方法、URL、狀態碼、回應時間、時間戳記及完整請求/回應資料寫入本地 SQLite 資料庫。使用者可透過點擊歷史紀錄，將該請求重新載入至主面板進行重送或編輯。

## 使用情境

| 情境 | 說明 |
|------|------|
| 檢視過去請求 | 使用者在側邊欄切換至 History 分頁，瀏覽最近發送過的請求清單 |
| 重新載入請求 | 點擊歷史紀錄項目，將該請求的 method、URL 與回應資料載入至當前作用中的請求面板 |
| 清空歷史紀錄 | 點擊「Clear」按鈕，清除所有歷史紀錄（SQLite 資料表與前端狀態同步清空） |
| 辨識請求狀態 | 透過 HTTP Method 顏色標籤與 Status Code 顏色快速辨識請求類型與結果 |

## 畫面總覽

請求歷史面板嵌入於側邊欄（Sidebar），當使用者點擊 History 分頁時顯示。面板由「標題列」與「歷史清單」兩個區域組成，採垂直堆疊佈局。

### 畫面結構

```
┌──────────────────────────┐
│  Recent Requests  [Clear]│  ← 標題列區域
├──────────────────────────┤
│  GET  https://api.ex...  │  ← 歷史項目
│       200   45ms  14:32  │
├──────────────────────────┤
│  POST https://api.ex...  │
│       404   120ms 14:28  │
├──────────────────────────┤
│  ...（更多項目）          │
└──────────────────────────┘
```

## 區域劃分

### 區域 A：標題列

位於面板頂部，水平排列標題文字與清空按鈕。

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| 標題文字 | 靜態文字 | - | - | - | - | `Recent Requests` | 固定顯示，樣式 `text-xs font-medium text-text-secondary` |
| Clear 按鈕 | 按鈕 | - | - | - | - | `Clear` | 僅在歷史紀錄數量 > 0 時顯示；點擊後呼叫 `historyStore.clearAll()` 清空 SQLite history 表與前端陣列；樣式 `text-xs text-text-muted hover:text-danger` |

### 區域 B：歷史清單

位於標題列下方，垂直捲動區域，依時間倒序排列所有歷史紀錄項目。每個項目為可點擊的卡片式列表項。

#### 空狀態

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| 空狀態提示 | 靜態文字 | - | - | - | - | `No history yet` | 當 `historyStore.entries.length === 0` 時顯示；置中排列，上下間距 `py-8`；樣式 `text-xs text-text-muted` |

#### 歷史項目（每筆紀錄）

每筆歷史項目為雙行結構：第一行顯示 Method + URL + Status，第二行顯示 Duration + Timestamp。

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| HTTP Method 標籤 | 靜態文字 | - | - | - | - | `entry.method` | 固定寬度 `w-12`，字級 `text-[10px] font-bold`；顏色依 method 對應：GET=`text-green-600`、POST=`text-yellow-600`、PUT=`text-blue-600`、PATCH=`text-purple-600`、DELETE=`text-danger` |
| URL | 靜態文字 | - | - | - | - | `entry.url` | `flex-1 truncate`，超出寬度以省略號截斷；樣式 `text-xs text-text-primary` |
| Status Code | 靜態文字 | - | - | - | - | `entry.status` | 字級 `text-[10px] font-bold`；顏色依狀態碼範圍：200-299=`text-success`、400+=`text-danger`、其他=`text-warning` |
| 回應時間 | 靜態文字 | - | - | - | - | `{entry.duration}ms` | 字級 `text-[10px] text-text-muted`；單位為毫秒 |
| 時間戳記 | 靜態文字 | - | - | - | - | 格式化後的時間 | 呼叫 `formatTime()` 將 ISO 時間字串轉為 `zh-TW` 格式的 `HH:mm:ss`；字級 `text-[10px] text-text-muted` |

#### 歷史項目互動行為

| 操作 | 行為 |
|------|------|
| 點擊項目 | 呼叫 `loadEntry(entry)`：將 `entry.method` 寫入 `requestStore.activeRequest.method`、`entry.url` 寫入 `requestStore.activeRequest.url`、`entry.response` 寫入 `requestStore.response` |
| Hover | 背景變更為 `bg-bg-hover`；游標顯示為 `cursor-pointer` |

## 資料結構

### HistoryEntry 型別

```typescript
interface HistoryEntry {
  id: string                          // UUID，主鍵
  method: HttpMethod                  // HTTP 方法（GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS）
  url: string                         // 請求 URL
  status: number                      // HTTP 狀態碼
  duration: number                    // 回應時間（毫秒）
  timestamp: string                   // ISO 8601 時間字串
  requestHeaders: Record<string, string>  // 請求標頭（JSON）
  requestBody: string | null          // 請求 Body
  response: HttpResponse              // 完整回應資料
}
```

### SQLite 資料表：history

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | TEXT PRIMARY KEY | UUID |
| `method` | TEXT NOT NULL | HTTP 方法 |
| `url` | TEXT NOT NULL | 請求 URL |
| `status` | INTEGER NOT NULL | HTTP 狀態碼 |
| `duration` | INTEGER NOT NULL | 回應時間（ms） |
| `timestamp` | TEXT NOT NULL | 預設 `datetime('now')` |
| `request_headers` | TEXT | JSON 序列化的請求標頭 |
| `request_body` | TEXT | 請求 Body 原始字串 |
| `response_headers` | TEXT | JSON 序列化的回應標頭 |
| `response_body` | TEXT | 回應 Body 原始字串 |
| `response_size` | INTEGER NOT NULL DEFAULT 0 | 回應大小（bytes） |

索引：`idx_history_timestamp ON history(timestamp DESC)`

## 操作流程

### 載入歷史

1. 元件 `onMounted` 時自動呼叫 `historyStore.loadAll()`
2. Store 透過 `@tauri-apps/plugin-sql` 連接 `sqlite:laladog.db`
3. 執行 `SELECT * FROM history ORDER BY timestamp DESC LIMIT 200`
4. 將查詢結果映射為 `HistoryEntry[]` 並存入 `entries` ref

### 新增歷史紀錄

1. 使用者發送 HTTP 請求後，系統自動呼叫 `historyStore.addEntry(data)`
2. 產生 UUID 作為 `id`
3. 執行 INSERT SQL 寫入 SQLite
4. 使用 `unshift` 將新項目插入前端陣列首位

### 清空歷史

1. 使用者點擊「Clear」按鈕
2. 呼叫 `historyStore.clearAll()`
3. 執行 `DELETE FROM history` 清空資料表
4. 前端陣列重設為空陣列

### 載入歷史請求

1. 使用者點擊歷史項目
2. 呼叫 `loadEntry(entry)`
3. 將 method、url 寫入 `requestStore.activeRequest`
4. 將 response 寫入 `requestStore.response`
5. 主面板即時反映載入的請求資料

## 涉及元件

| 元件 | 路徑 | 說明 |
|------|------|------|
| HistoryPanel | `src/components/history/HistoryPanel.vue` | 歷史面板 UI 元件 |
| historyStore | `src/stores/historyStore.ts` | 歷史資料狀態管理（Pinia） |
| Sidebar | `src/components/layout/Sidebar.vue` | 側邊欄容器，包含 Collections / History 分頁切換 |

## 限制與規則

- 歷史紀錄最多載入 200 筆（SQL LIMIT 200）
- 排序固定為時間倒序（最新在前）
- 歷史紀錄僅儲存於本地 SQLite，不同步至遠端
- 載入歷史請求時僅還原 method、url 與 response，不還原 headers、body、auth 等完整設定
