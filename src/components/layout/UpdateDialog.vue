<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { downloadAndInstall, relaunchApp, type DownloadProgress } from '@/utils/updater'

const props = defineProps<{
  version: string
  body?: string
  date?: string
  /** Update 物件（來自 @tauri-apps/plugin-updater），僅在有更新時傳入 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update?: any
  /** 手動檢查但無更新時為 true */
  noUpdate?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

type DialogState = 'found' | 'downloading' | 'ready' | 'no-update' | 'error'

const state = ref<DialogState>(props.noUpdate ? 'no-update' : 'found')
const progress = ref<DownloadProgress>({ downloaded: 0, total: undefined, percent: 0 })
const errorMessage = ref('')
const currentVersion = ref('')

onMounted(async () => {
  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    currentVersion.value = await getVersion()
  } catch {
    currentVersion.value = '0.3.0'
  }
})

const formattedSize = computed(() => {
  const bytes = progress.value.downloaded
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

const formattedTotal = computed(() => {
  const bytes = progress.value.total
  if (!bytes) return ''
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

async function startUpdate() {
  state.value = 'downloading'
  try {
    await downloadAndInstall(props.update!, (p) => {
      progress.value = p
    })
    state.value = 'ready'
  } catch (e) {
    console.error('[UpdateDialog] Download failed:', e)
    errorMessage.value = e instanceof Error ? e.message : String(e)
    state.value = 'error'
  }
}

async function restartNow() {
  try {
    await relaunchApp()
  } catch (e) {
    console.error('[UpdateDialog] Relaunch failed:', e)
  }
}

function canClose() {
  return state.value !== 'downloading'
}

function handleClose() {
  if (canClose()) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/40" @click="handleClose" />

      <!-- Dialog -->
      <div class="relative z-10 w-[420px] rounded-lg border border-border bg-bg-card shadow-xl">
        <!-- Close Button (hidden during download) -->
        <button
          v-if="canClose()"
          class="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-bg-hover hover:text-text-primary"
          @click="handleClose"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>

        <div class="p-6">
          <!-- ===== State: No Update ===== -->
          <template v-if="state === 'no-update'">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <h2 class="mb-2 text-center text-lg font-bold text-text-primary">目前已是最新版本</h2>
            <p class="mb-5 text-center text-sm text-text-secondary">
              v{{ currentVersion }} 是最新版本，無需更新。
            </p>
            <div class="flex justify-center">
              <button
                class="rounded-button bg-primary px-6 py-2 text-sm font-medium text-text-inverse hover:opacity-90"
                @click="handleClose"
              >
                確定
              </button>
            </div>
          </template>

          <!-- ===== State: Found New Version ===== -->
          <template v-else-if="state === 'found'">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
              </svg>
            </div>
            <h2 class="mb-2 text-center text-lg font-bold text-text-primary">發現新版本</h2>
            <div class="mb-3 flex justify-center">
              <span class="rounded-full bg-secondary-10 px-2.5 py-0.5 text-xs font-medium text-secondary">
                v{{ version }}
              </span>
            </div>

            <!-- Release Notes -->
            <div v-if="body" class="mb-4 max-h-40 overflow-y-auto rounded-lg border border-border bg-bg-page p-3">
              <p class="whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">{{ body }}</p>
            </div>

            <p v-if="date" class="mb-4 text-center text-[11px] text-text-muted">
              發佈日期：{{ date }}
            </p>

            <div class="flex justify-center gap-3">
              <button
                class="rounded-button border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
                @click="handleClose"
              >
                稍後再說
              </button>
              <button
                class="rounded-button bg-primary px-6 py-2 text-sm font-medium text-text-inverse hover:opacity-90"
                @click="startUpdate"
              >
                立即更新
              </button>
            </div>
          </template>

          <!-- ===== State: Downloading ===== -->
          <template v-else-if="state === 'downloading'">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h2 class="mb-2 text-center text-lg font-bold text-text-primary">正在下載更新...</h2>
            <p class="mb-4 text-center text-sm text-text-secondary">
              請勿關閉應用程式
            </p>

            <!-- Progress Bar -->
            <div class="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-bg-hover">
              <div
                class="h-full rounded-full bg-primary transition-all duration-300"
                :style="{ width: `${progress.percent}%` }"
              />
            </div>
            <div class="flex justify-between text-[11px] text-text-muted">
              <span>{{ formattedSize }}<template v-if="formattedTotal"> / {{ formattedTotal }}</template></span>
              <span>{{ progress.percent }}%</span>
            </div>
          </template>

          <!-- ===== State: Ready to Restart ===== -->
          <template v-else-if="state === 'ready'">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <h2 class="mb-2 text-center text-lg font-bold text-text-primary">更新已下載完成</h2>
            <p class="mb-5 text-center text-sm text-text-secondary">
              重新啟動應用程式後即可使用新版本。
            </p>
            <div class="flex justify-center gap-3">
              <button
                class="rounded-button border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
                @click="handleClose"
              >
                稍後重啟
              </button>
              <button
                class="rounded-button bg-primary px-6 py-2 text-sm font-medium text-text-inverse hover:opacity-90"
                @click="restartNow"
              >
                立即重啟
              </button>
            </div>
          </template>

          <!-- ===== State: Error ===== -->
          <template v-else-if="state === 'error'">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <h2 class="mb-2 text-center text-lg font-bold text-text-primary">更新失敗</h2>
            <p class="mb-2 text-center text-sm text-text-secondary">
              下載更新時發生錯誤，請稍後再試。
            </p>
            <p v-if="errorMessage" class="mb-4 text-center text-[11px] text-danger">
              {{ errorMessage }}
            </p>
            <div class="flex justify-center">
              <button
                class="rounded-button bg-primary px-6 py-2 text-sm font-medium text-text-inverse hover:opacity-90"
                @click="handleClose"
              >
                關閉
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
