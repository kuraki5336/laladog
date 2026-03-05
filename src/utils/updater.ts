import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export interface UpdateInfo {
  available: boolean
  version?: string
  body?: string
  date?: string
  update?: Update
}

export interface DownloadProgress {
  downloaded: number
  total: number | undefined
  percent: number
}

/**
 * 檢查是否有新版本可用
 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  try {
    const update = await check()

    if (update) {
      return {
        available: true,
        version: update.version,
        body: update.body ?? undefined,
        date: update.date ?? undefined,
        update,
      }
    }

    return { available: false }
  } catch (e) {
    console.error('[Updater] Check failed:', e)
    throw e
  }
}

/**
 * 下載並安裝更新
 * @param update - 從 checkForUpdate 取得的 Update 物件
 * @param onProgress - 下載進度回呼
 */
export async function downloadAndInstall(
  update: Update,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  let downloaded = 0
  let total: number | undefined

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        total = event.data.contentLength ?? undefined
        break
      case 'Progress':
        downloaded += event.data.chunkLength
        if (onProgress) {
          onProgress({
            downloaded,
            total,
            percent: total ? Math.round((downloaded / total) * 100) : 0,
          })
        }
        break
      case 'Finished':
        if (onProgress) {
          onProgress({
            downloaded,
            total,
            percent: 100,
          })
        }
        break
    }
  })
}

/**
 * 重新啟動應用
 */
export async function relaunchApp(): Promise<void> {
  await relaunch()
}
