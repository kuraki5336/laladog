# 深色模式（Dark Mode）

## 功能概述

深色模式為 LalaDog 應用程式提供淺色與深色兩種主題切換功能。使用者可透過頂部工具列的切換按鈕（月亮/太陽圖示）手動切換主題。系統首次載入時會偵測作業系統的色彩偏好設定（`prefers-color-scheme`），自動套用對應主題。使用者的主題偏好儲存於 `localStorage`，後續造訪時優先採用已儲存的偏好。

主題切換透過在 `<html>` 元素上添加或移除 `.dark` CSS class 實現，所有顏色透過 CSS 變數（Design Token）覆寫，確保全域一致性。

## 使用情境

| 情境 | 說明 |
|------|------|
| 手動切換主題 | 使用者點擊頂部工具列的主題切換按鈕，在淺色與深色模式之間切換 |
| 首次載入自動偵測 | 使用者首次使用應用程式時，系統偵測 OS 的 `prefers-color-scheme` 設定，自動套用對應主題 |
| 偏好持久化 | 切換主題後，偏好值寫入 `localStorage`，下次開啟應用程式時直接套用，無需再次偵測系統設定 |
| 夜間工作 | 在低光源環境下使用深色模式降低眼睛疲勞 |

## 畫面總覽

深色模式切換按鈕位於應用程式頂部工具列（Header）的右側區域，與環境選擇器、使用者登入按鈕相鄰。

### 畫面結構

```
┌──────────────────────────────────────────────────────┐
│  LalaDog API Client    [EnvEditor] [EnvSelector] [🌙] [User] │  ← Header
├──────────────────────────────────────────────────────┤
│                                                      │
│                    主內容區域                          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## 區域劃分

### 區域 A：主題切換按鈕

位於頂部工具列右側，為一個圖示按鈕。

| 欄位 | 數據類型 | 語言切換 | 必填 | 檢核 | 佔位符 | 值 | 備註 |
|------|----------|----------|------|------|--------|-----|------|
| 切換按鈕 | 圖示按鈕 | - | - | - | - | 依狀態顯示不同圖示 | 尺寸 `h-8 w-8`，圖示 `h-4 w-4`；圓角 `rounded-button`；樣式 `text-text-muted hover:bg-bg-hover hover:text-text-primary` |
| 月亮圖示 | SVG Icon | - | - | - | - | 月亮形狀 SVG | 當 `themeStore.isDark === false` 時顯示（表示點擊可切換至深色模式）；`viewBox="0 0 20 20" fill="currentColor"` |
| 太陽圖示 | SVG Icon | - | - | - | - | 太陽形狀 SVG | 當 `themeStore.isDark === true` 時顯示（表示點擊可切換至淺色模式）；`viewBox="0 0 20 20" fill="currentColor"` |
| Tooltip | 文字提示 | - | - | - | - | 依狀態切換 | 深色模式時：`Switch to Light Mode`；淺色模式時：`Switch to Dark Mode`；透過 `title` 屬性實現 |

#### 互動行為

| 操作 | 行為 |
|------|------|
| 點擊按鈕 | 呼叫 `themeStore.toggle()`：反轉 `isDark` 狀態、寫入 `localStorage`、在 `<html>` 上切換 `.dark` class |
| Hover | 背景變更為 `bg-bg-hover`，文字顏色變更為 `text-text-primary` |

## 主題色彩規格

### 淺色模式色彩（預設）

| Token | CSS 變數 | 色碼 | 用途 |
|-------|----------|------|------|
| bg-page | `--color-bg-page` | `#F4FAFD` | 頁面背景 |
| bg-card | `--color-bg-card` | `#FFFFFF` | 卡片 / 面板背景 |
| bg-sidebar | `--color-bg-sidebar` | `#FFFFFF` | 側邊欄背景 |
| bg-hover | `--color-bg-hover` | `#F1F5F9` | Hover 狀態背景 |
| bg-stripe | `--color-bg-stripe` | `#F8FAFC` | 斑馬紋背景 |
| text-primary | `--color-text-primary` | `#475569` | 主要文字（Slate 600） |
| text-secondary | `--color-text-secondary` | `#64748B` | 次要文字（Slate 500） |
| text-muted | `--color-text-muted` | `#94A3B8` | 淡化文字（Slate 400） |
| text-placeholder | `--color-text-placeholder` | `#CBD5E1` | 佔位符文字（Slate 300） |
| text-inverse | `--color-text-inverse` | `#FFFFFF` | 反白文字 |
| border | `--color-border` | `#E2E8F0` | 邊框（Slate 200） |
| border-light | `--color-border-light` | `#F1F5F9` | 淡邊框 |
| border-focus | `--color-border-focus` | `#3298DC` | 聚焦邊框 |
| success-light | `--color-success-light` | `#EDF7ED` | 成功狀態淺底 |
| warning-light | `--color-warning-light` | `#FFF8E1` | 警告狀態淺底 |
| danger-light | `--color-danger-light` | `#FDECED` | 錯誤狀態淺底 |
| info-light | `--color-info-light` | `#E8F4FC` | 資訊狀態淺底 |

### 深色模式色彩（.dark class 覆寫）

| Token | CSS 變數 | 色碼 | 用途 |
|-------|----------|------|------|
| bg-page | `--color-bg-page` | `#0F172A` | 頁面背景（Slate 900） |
| bg-card | `--color-bg-card` | `#1E293B` | 卡片 / 面板背景（Slate 800） |
| bg-sidebar | `--color-bg-sidebar` | `#1E293B` | 側邊欄背景（Slate 800） |
| bg-hover | `--color-bg-hover` | `#334155` | Hover 狀態背景（Slate 700） |
| bg-stripe | `--color-bg-stripe` | `#1E293B` | 斑馬紋背景（Slate 800） |
| text-primary | `--color-text-primary` | `#F1F5F9` | 主要文字（Slate 100） |
| text-secondary | `--color-text-secondary` | `#CBD5E1` | 次要文字（Slate 300） |
| text-muted | `--color-text-muted` | `#64748B` | 淡化文字（Slate 500） |
| text-placeholder | `--color-text-placeholder` | `#475569` | 佔位符文字（Slate 600） |
| border | `--color-border` | `#334155` | 邊框（Slate 700） |
| border-light | `--color-border-light` | `#1E293B` | 淡邊框（Slate 800） |
| border-focus | `--color-border-focus` | `#3298DC` | 聚焦邊框（不變） |
| success-light | `--color-success-light` | `#14532D` | 成功狀態深底 |
| warning-light | `--color-warning-light` | `#422006` | 警告狀態深底 |
| danger-light | `--color-danger-light` | `#450A0A` | 錯誤狀態深底 |
| info-light | `--color-info-light` | `#0E3F6B` | 資訊狀態深底 |

### 不隨主題變化的色彩

| Token | CSS 變數 | 色碼 | 用途 |
|-------|----------|------|------|
| primary | `--color-primary` | `#00416A` | 品牌主色 |
| secondary | `--color-secondary` | `#3298DC` | 品牌次色 |
| success | `--color-success` | `#4CAF50` | 成功色 |
| warning | `--color-warning` | `#FFC107` | 警告色 |
| danger | `--color-danger` | `#E63946` | 危險色 |
| info | `--color-info` | `#3298DC` | 資訊色 |

## 技術實現

### 主題切換機制

1. **CSS 變數覆寫**：在 `src/assets/styles/main.css` 中，透過 `@theme` 定義淺色模式的 Design Token，再透過 `.dark` 選擇器覆寫對應的 CSS 變數值
2. **HTML class 切換**：在 `<html>` 元素上添加或移除 `dark` class，觸發 CSS 變數覆寫
3. **深色模式輸入框**：`.dark input, .dark textarea, .dark select` 覆寫背景色、文字色與邊框色
4. **部分元件額外處理**：部分元件（如 WebSocketPanel）使用 Tailwind 的 `dark:` 前綴針對深色模式設定額外樣式

### 狀態管理（themeStore）

| 屬性/方法 | 型別 | 說明 |
|----------|------|------|
| `isDark` | `Ref<boolean>` | 當前是否為深色模式 |
| `init()` | `() => void` | 初始化：讀取 `localStorage`，若無儲存值則偵測系統偏好，最後套用主題 |
| `toggle()` | `() => void` | 切換主題：反轉 `isDark`、儲存至 `localStorage`、套用主題 |
| `applyTheme()` | `() => void`（內部） | 在 `document.documentElement` 上切換 `dark` class |

### localStorage 儲存規格

| Key | 可能的值 | 說明 |
|-----|---------|------|
| `laladog_theme` | `'dark'` / `'light'` | 使用者手動設定的主題偏好；首次造訪時此 key 不存在 |

## 操作流程

### 初始化流程

1. `AppLayout` 元件 `onMounted` 時呼叫 `themeStore.init()`
2. 讀取 `localStorage.getItem('laladog_theme')`
3. 判斷邏輯：
   - 若值為 `'dark'` -> 設定 `isDark = true`
   - 若值為 `'light'` -> 維持 `isDark = false`（預設值）
   - 若值為 `null`（首次造訪） -> 執行 `window.matchMedia('(prefers-color-scheme: dark)').matches` 偵測系統偏好
4. 呼叫 `applyTheme()` 在 `<html>` 上設定 `dark` class

### 手動切換流程

1. 使用者點擊頂部工具列的主題切換按鈕
2. 呼叫 `themeStore.toggle()`
3. 反轉 `isDark` 值
4. 將新值寫入 `localStorage.setItem('laladog_theme', isDark ? 'dark' : 'light')`
5. 呼叫 `applyTheme()` 更新 `<html>` 的 class
6. 所有使用 CSS 變數的元件即時反映新主題
7. 按鈕圖示隨 `isDark` 狀態切換為太陽或月亮

## 涉及元件

| 元件 | 路徑 | 說明 |
|------|------|------|
| AppLayout | `src/components/layout/AppLayout.vue` | 頂部工具列，包含主題切換按鈕 |
| themeStore | `src/stores/themeStore.ts` | 主題狀態管理（Pinia） |
| main.css | `src/assets/styles/main.css` | CSS 變數定義與 `.dark` 覆寫 |

## 限制與規則

- 僅支援淺色與深色兩種主題，不支援自訂主題
- 主題偏好儲存於 `localStorage`，不同步至後端或雲端
- 系統偏好偵測僅在首次造訪（`localStorage` 無儲存值）時執行
- 不監聽系統偏好的即時變更（使用者在 OS 設定中切換深色模式時，應用程式不會自動跟隨）
- `border-focus` 顏色在兩種主題下保持一致（`#3298DC`）
- 品牌色（primary、secondary）與功能色（success、warning、danger、info）在兩種主題下保持一致，僅淺底色（`*-light`）會隨主題切換
