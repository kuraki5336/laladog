# WebSocket 測試（WebSocket Testing）

## 功能概述

WebSocket 測試面板提供與 WebSocket 伺服器建立連線、收發訊息的完整功能。使用者可在主面板頂部透過 HTTP / WebSocket 模式切換按鈕進入 WebSocket 測試模式。面板包含連線管理、錯誤提示、訊息收發顯示與訊息發送等功能區域。底層使用瀏覽器原生 `WebSocket` API 實現，元件卸載時自動斷開連線。

## 使用情境

| 情境 | 說明 |
|------|------|
| 測試 WebSocket 伺服器 | 開發者輸入 WebSocket URL 並建立連線，測試伺服器的連線與訊息回應 |
| 即時收發訊息 | 連線建立後，透過發送區傳送訊息並在訊息區域即時查看收到的回應 |
| 除錯連線問題 | 連線失敗時，錯誤訊息顯示於紅色提示列，協助開發者排查問題 |
| 清空訊息記錄 | 長時間測試後清空訊息區域，便於觀察新一輪的訊息交互 |

## 畫面總覽

WebSocket 測試面板佔據主面板的全部高度，採用垂直堆疊佈局。當使用者在主面板頂部的模式切換列選擇「WebSocket」時，原本的 HTTP 請求/回應面板被替換為 WebSocket 測試面板。

### 畫面結構

```
┌─────────────────────────────────────────────┐
│  [HTTP] [WebSocket]                         │  ← 模式切換列（MainPanel）
├─────────────────────────────────────────────┤
│  🟢 [ws://localhost:8080        ] [Connect] │  ← 連線列
├─────────────────────────────────────────────┤
│  Connection failed                          │  ← 錯誤列（條件顯示）
├─────────────────────────────────────────────┤
│  Messages                          [Clear]  │
│  ┌─────────────────────────────────────┐    │
│  │ ↑ Sent           14:32:01          │    │
│  │ {"action": "ping"}                  │    │
│  ├─────────────────────────────────────┤    │
│  │ ↓ Received       14:32:02          │    │  ← 訊息區域
│  │ {"action": "pong"}                  │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│  ┌──────────────────────────────┐  [Send]  │  ← 發送列
│  │ Type a message...            │          │
│  └──────────────────────────────┘          │
└─────────────────────────────────────────────┘
```

## 區域劃分

### 區域 A：模式切換列

位於主面板最頂部（屬於 `MainPanel.vue`），用於在 HTTP 與 WebSocket 模式之間切換。

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| HTTP 按鈕 | 切換按鈕 | - | - | - | - | `HTTP` | 選中時樣式 `bg-primary text-text-inverse`，未選中時 `text-text-muted hover:text-text-primary`；點擊設定 `mode = 'http'` |
| WebSocket 按鈕 | 切換按鈕 | - | - | - | - | `WebSocket` | 選中時樣式 `bg-primary text-text-inverse`，未選中時 `text-text-muted hover:text-text-primary`；點擊設定 `mode = 'websocket'` |

按鈕共用樣式：`rounded-sm px-3 py-1 text-xs font-medium transition-colors`，外層容器帶底部邊框 `border-b border-border bg-bg-card`。

### 區域 B：連線列

位於 WebSocket 面板頂部，包含連線狀態指示燈、URL 輸入欄與連線/斷開按鈕。帶底部邊框。

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| 連線狀態指示燈 | 圓形指示器 | - | - | - | - | 綠色 / 灰色圓點 | 尺寸 `h-2 w-2 rounded-full shrink-0`；已連線時 `bg-success`（綠色 `#4CAF50`），未連線時 `bg-text-muted`（灰色） |
| URL 輸入欄 | `<input>` 文字輸入 | - | 是 | 需為有效的 WebSocket URL（ws:// 或 wss://） | `ws://localhost:8080` | `url` ref | 高度 `h-9`，`flex-1`；樣式 `rounded-button border border-border px-3 text-sm outline-none focus:border-border-focus`；深色模式：`dark:border-slate-600 dark:bg-slate-800 dark:text-white`；已連線時 `disabled`（禁止修改） |
| Connect 按鈕 | 按鈕 | - | - | - | - | `Connect` | 未連線時顯示；高度 `h-9`，樣式 `rounded-button bg-success px-4 text-sm font-medium text-white hover:opacity-90 active:scale-[0.97]`；點擊呼叫 `connect()` |
| Disconnect 按鈕 | 按鈕 | - | - | - | - | `Disconnect` | 已連線時顯示（與 Connect 互斥）；高度 `h-9`，樣式 `rounded-button bg-danger px-4 text-sm font-medium text-white hover:opacity-90 active:scale-[0.97]`；點擊呼叫 `disconnect()` |

### 區域 C：錯誤顯示列

位於連線列下方，僅在發生連線錯誤時條件顯示。

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| 錯誤訊息 | 靜態文字 | - | - | - | - | `error` ref 的值 | 顯示條件：`error` ref 不為 `null`；預設錯誤訊息為 `Connection failed`；樣式 `bg-danger-light px-3 py-1 text-xs text-danger`；深色模式：`dark:bg-red-900/30` |

### 區域 D：訊息區域

位於錯誤列下方，佔據面板的主要空間（`flex-1`），可垂直捲動。包含訊息標題、清空按鈕與訊息列表。

#### 標題行

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| 標題文字 | 靜態文字 | - | - | - | - | `Messages` | 樣式 `text-xs font-medium text-text-secondary`；深色模式：`dark:text-slate-400` |
| Clear 按鈕 | 按鈕 | - | - | - | - | `Clear` | 點擊呼叫 `clearMessages()` 清空 `messages` ref 陣列；樣式 `text-xs text-text-muted hover:text-text-primary`；深色模式：`dark:text-slate-500` |

#### 訊息項目（每筆訊息）

每筆訊息以卡片形式呈現，包含方向標籤、時間戳記與訊息內容。

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| 方向標籤 | 靜態文字 | - | - | - | - | 已傳送：`↑ Sent` / 已接收：`↓ Received` | 字重 `font-medium`；已傳送文字色 `text-secondary`（藍色），已接收文字色 `text-success`（綠色） |
| 時間戳記 | 靜態文字 | - | - | - | - | 格式化的時間 | 呼叫 `formatTime()` 將 ISO 時間轉為 `zh-TW` 格式的 `HH:mm:ss`；樣式 `text-text-muted`；深色模式：`dark:text-slate-500` |
| 訊息內容 | 預格式文字 | - | - | - | - | `msg.message` | 使用 `<pre>` 標籤，樣式 `whitespace-pre-wrap break-all font-mono text-text-primary`；深色模式：`dark:text-slate-300` |
| 訊息卡片背景 | - | - | - | - | - | - | 已傳送：`bg-secondary-10`（淺藍底），深色模式 `dark:bg-blue-900/20`；已接收：`bg-bg-stripe`（淺灰底），深色模式 `dark:bg-slate-800`；共用樣式 `mb-1 rounded-sm p-2 text-xs` |

#### 系統訊息

連線與斷線事件會以特殊訊息形式顯示在訊息區域中。

| 事件 | 方向 | 訊息內容 | 說明 |
|------|------|----------|------|
| 連線成功 | `received` | `Connected`（含綠色圓形 emoji） | WebSocket `onopen` 事件觸發時自動新增 |
| 連線斷開 | `received` | `Disconnected`（含紅色圓形 emoji） | WebSocket `onclose` 事件觸發時自動新增 |

### 區域 E：發送列

位於面板底部，帶頂部邊框，包含訊息輸入區與發送按鈕。

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| 訊息輸入區 | `<textarea>` | - | 否（但發送時需非空白） | 發送前檢查 `messageInput.trim()` 非空 | `Type a message...` | `messageInput` ref | 高度 `h-16`，`flex-1 resize-none`；樣式 `rounded-button border border-border p-2 font-mono text-xs outline-none focus:border-border-focus`；深色模式：`dark:border-slate-600 dark:bg-slate-800 dark:text-white`；未連線時 `disabled` |
| Send 按鈕 | 按鈕 | - | - | - | - | `Send` | 高度 `h-9`；樣式 `rounded-button bg-secondary px-4 text-sm font-medium text-white hover:bg-secondary-60 active:scale-[0.97]`；`disabled` 條件：未連線 (`!isConnected`) 或輸入為空 (`!messageInput.trim()`)；disabled 樣式 `disabled:cursor-not-allowed disabled:opacity-50`；點擊呼叫 `sendMessage()` |
| 鍵盤快捷鍵 | 事件監聽 | - | - | - | - | `Ctrl+Enter` | 在 textarea 上監聽 `@keydown.ctrl.enter`，觸發 `sendMessage()`；等同於點擊 Send 按鈕 |

## 資料結構

### WsMessage 介面

```typescript
interface WsMessage {
  direction: 'sent' | 'received'   // 訊息方向
  message: string                   // 訊息內容
  timestamp: string                 // ISO 8601 時間字串
}
```

### 元件狀態

| 狀態 | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| `url` | `Ref<string>` | `'ws://localhost:8080'` | WebSocket 伺服器 URL |
| `messageInput` | `Ref<string>` | `''` | 訊息輸入欄內容 |
| `messages` | `Ref<WsMessage[]>` | `[]` | 所有訊息列表（含傳送與接收） |
| `isConnected` | `Ref<boolean>` | `false` | 當前連線狀態 |
| `error` | `Ref<string \| null>` | `null` | 錯誤訊息，`null` 表示無錯誤 |
| `ws` | `WebSocket \| null` | `null` | WebSocket 實例（非 reactive） |

## 操作流程

### 建立連線

1. 使用者在 URL 輸入欄輸入 WebSocket URL
2. 點擊「Connect」按鈕
3. 清除先前的錯誤訊息（`error = null`）
4. 建立新的 `WebSocket` 實例：`new WebSocket(url.value)`
5. 註冊事件處理器：
   - `onopen`：設定 `isConnected = true`，新增系統訊息「Connected」
   - `onmessage`：將收到的訊息新增至 `messages` 陣列（`direction: 'received'`）
   - `onclose`：設定 `isConnected = false`，新增系統訊息「Disconnected」
   - `onerror`：設定 `error = 'Connection failed'`，設定 `isConnected = false`
6. 連線建立後，URL 輸入欄變為 disabled 狀態，Connect 按鈕替換為 Disconnect 按鈕
7. 若建立過程發生例外，捕獲錯誤並設定 `error = e.message`

### 傳送訊息

1. 使用者在 textarea 輸入訊息
2. 點擊「Send」按鈕或按下 `Ctrl+Enter`
3. 檢查前置條件：WebSocket 實例存在 且 輸入非空白
4. 透過 `ws.send(messageInput.value)` 傳送訊息
5. 將訊息新增至 `messages` 陣列（`direction: 'sent'`）
6. 清空輸入欄（`messageInput = ''`）

### 斷開連線

1. 使用者點擊「Disconnect」按鈕
2. 呼叫 `ws.close()` 關閉 WebSocket 連線
3. 將 `ws` 設為 `null`
4. WebSocket 的 `onclose` 事件自動觸發，更新 `isConnected = false` 並新增「Disconnected」系統訊息

### 清空訊息

1. 使用者點擊「Clear」按鈕
2. 呼叫 `clearMessages()`
3. 重設 `messages = []`

### 元件卸載清理

1. 元件 `onUnmounted` 生命週期觸發
2. 呼叫 `ws?.close()` 關閉仍在連線中的 WebSocket
3. 防止記憶體洩漏與背景連線殘留

## 涉及元件

| 元件 | 路徑 | 說明 |
|------|------|------|
| MainPanel | `src/components/layout/MainPanel.vue` | 主面板容器，包含 HTTP/WebSocket 模式切換邏輯 |
| WebSocketPanel | `src/components/request/WebSocketPanel.vue` | WebSocket 測試面板完整實作 |

## 限制與規則

- 使用瀏覽器原生 `WebSocket` API，不透過 Tauri 後端
- 僅支援文字訊息（Text Frame），不支援二進位訊息（Binary Frame）
- 不支援 WebSocket 子協議（Sub-protocol）設定
- 不支援自訂 Headers（WebSocket 握手時無法附加自訂標頭）
- 訊息僅存在於元件記憶體中，不持久化至 SQLite
- 連線列的 URL 在連線狀態下不可修改，需先斷線才能更改
- 不支援自動重連（Auto-reconnect）機制
- 不支援多 WebSocket 連線並行（同一時間僅可建立一個連線）
- 元件卸載時自動斷開連線，切換回 HTTP 模式等同於斷線
