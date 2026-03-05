<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import Sidebar from './Sidebar.vue'
import MainPanel from './MainPanel.vue'
import StatusBar from './StatusBar.vue'
import HamburgerMenu from './HamburgerMenu.vue'
import AboutDialog from './AboutDialog.vue'
import SponsorDialog from './SponsorDialog.vue'
import UpdateDialog from './UpdateDialog.vue'
import EnvSelector from '@/components/environment/EnvSelector.vue'
import EnvEditor from '@/components/environment/EnvEditor.vue'
import WorkspaceSelector from '@/components/workspace/WorkspaceSelector.vue'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useTeamStore } from '@/stores/teamStore'
import { useCollectionStore } from '@/stores/collectionStore'
import { useSyncStore } from '@/stores/syncStore'
import { checkForUpdate, type UpdateInfo } from '@/utils/updater'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const wsStore = useWorkspaceStore()
const teamStore = useTeamStore()
const collectionStore = useCollectionStore()
const syncStore = useSyncStore()
const showAboutDialog = ref(false)
const showSponsorDialog = ref(false)
const showUpdateDialog = ref(false)
// 使用 shallowRef 避免 Vue Proxy 包裹 Update 物件
// （Update class 使用 ES6 private fields，Proxy 無法存取）
const updateInfo = shallowRef<UpdateInfo | null>(null)

onMounted(async () => {
  themeStore.init()
  authStore.init()
  await wsStore.loadAll()
  await collectionStore.loadAll()

  // 已登入 → 同步團隊 collections + 建立 WebSocket
  if (authStore.isLoggedIn) {
    await syncTeamCollections()
  }

  // 啟動時靜默檢查更新（有新版才彈窗）
  silentCheckUpdate()
})

onUnmounted(() => {
  syncStore.disconnect()
})

// 監聽登入狀態 → 登入後同步團隊
watch(
  () => authStore.isLoggedIn,
  async (loggedIn) => {
    if (loggedIn) {
      await syncTeamCollections()
    } else {
      syncStore.disconnect()
    }
  },
)

// 監聽 activeWorkspace 切換 → 斷舊連新
watch(
  () => wsStore.activeWorkspace?.teamId,
  (newTeamId, oldTeamId) => {
    if (newTeamId === oldTeamId) return
    if (newTeamId && authStore.isLoggedIn) {
      syncStore.connect(newTeamId)
    } else {
      syncStore.disconnect()
    }
  },
)

/** 同步所有團隊的 shared collections 到本地 + 建立 WebSocket */
async function syncTeamCollections() {
  try {
    await teamStore.loadTeams()
    if (teamStore.teams.length === 0) return

    // 確保每個 team 在本地都有 workspace
    const mapping = await wsStore.ensureTeamWorkspaces(teamStore.teams)

    // 對每個 team workspace 拉取雲端 collections
    for (const [teamId, wsId] of mapping) {
      await collectionStore.pullFromCloud(teamId, wsId)
    }

    // 建立 WebSocket 連線（對當前 active workspace 的 team）
    const activeTeamId = wsStore.activeWorkspace?.teamId
    if (activeTeamId) {
      syncStore.connect(activeTeamId)
    }
  } catch (e) {
    console.error('[AppLayout] Team sync failed:', e)
  }
}

/** 靜默檢查更新（啟動時用，只在有更新時彈窗） */
async function silentCheckUpdate() {
  try {
    const info = await checkForUpdate()
    if (info.available) {
      updateInfo.value = info
      showUpdateDialog.value = true
    }
  } catch {
    // 靜默模式不顯示錯誤
  }
}

/** 手動檢查更新（漢堡選單觸發，無論有無更新都給回饋） */
async function manualCheckUpdate() {
  try {
    const info = await checkForUpdate()
    updateInfo.value = info
    showUpdateDialog.value = true
  } catch (e) {
    // 手動檢查失敗時，顯示錯誤訊息
    updateInfo.value = {
      available: false,
      error: e instanceof Error ? e.message : String(e),
    }
    showUpdateDialog.value = true
  }
}
</script>

<template>
  <div class="flex h-screen flex-col bg-bg-page">
    <!-- Top Bar -->
    <header class="flex h-12 shrink-0 items-center justify-between border-b border-border bg-bg-card px-4">
      <div class="flex items-center gap-2">
        <HamburgerMenu
          @open-about="showAboutDialog = true"
          @open-sponsor="showSponsorDialog = true"
          @check-update="manualCheckUpdate"
        />
        <img src="@/assets/logo/favicon-192.png" alt="LalaDog" class="h-6 w-6" />
        <span class="text-lg font-bold text-primary">LalaDog</span>
        <span class="mx-1 text-border">|</span>
        <WorkspaceSelector />
      </div>
      <div class="flex items-center gap-3">
        <EnvEditor />
        <EnvSelector />

        <!-- Dark Mode Toggle -->
        <button
          class="flex h-8 w-8 items-center justify-center rounded-button text-text-muted hover:bg-bg-hover hover:text-text-primary"
          :title="themeStore.isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          @click="themeStore.toggle"
        >
          <svg v-if="themeStore.isDark" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        </button>

        <!-- User / Login -->
        <div v-if="authStore.isLoggedIn" class="flex items-center gap-2">
          <img
            v-if="authStore.user?.picture"
            :src="authStore.user.picture"
            :alt="authStore.user.name"
            class="h-7 w-7 rounded-full border border-border"
          />
          <span class="text-xs text-text-secondary">{{ authStore.user?.name }}</span>
          <button
            class="text-xs text-text-muted hover:text-danger"
            @click="authStore.logout"
          >
            Logout
          </button>
        </div>
        <div v-else class="flex items-center gap-2">
          <span v-if="authStore.loginError" class="max-w-48 truncate text-xs text-danger" :title="authStore.loginError">
            {{ authStore.loginError }}
          </span>
          <button
            class="flex h-8 items-center gap-1.5 rounded-button bg-primary px-3 text-xs font-medium text-text-inverse hover:opacity-90"
            :disabled="authStore.isLoading"
            @click="authStore.loginWithGoogle"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {{ authStore.isLoading ? 'Logging in...' : 'Login' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <MainPanel />
    </div>

    <!-- Status Bar -->
    <StatusBar />

    <!-- Dialogs -->
    <AboutDialog v-if="showAboutDialog" @close="showAboutDialog = false" />
    <SponsorDialog v-if="showSponsorDialog" @close="showSponsorDialog = false" />
    <UpdateDialog
      v-if="showUpdateDialog && updateInfo"
      :version="updateInfo.available ? (updateInfo.version ?? '') : ''"
      :body="updateInfo.body"
      :date="updateInfo.date"
      :update="updateInfo.update"
      :no-update="!updateInfo.available"
      :error="updateInfo.error"
      @close="showUpdateDialog = false"
    />
  </div>
</template>
