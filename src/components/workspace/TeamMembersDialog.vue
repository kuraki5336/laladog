<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useTeamStore } from '@/stores/teamStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useAuthStore } from '@/stores/authStore'
import { useCollectionStore } from '@/stores/collectionStore'
import { useEnvironmentStore } from '@/stores/environmentStore'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const teamStore = useTeamStore()
const wsStore = useWorkspaceStore()
const authStore = useAuthStore()
const collectionStore = useCollectionStore()
const envStore = useEnvironmentStore()

const inviteEmail = ref('')
const inviteRole = ref('viewer')
const inviteLoading = ref(false)
const inviteMsg = ref<string | null>(null)
const shareLoading = ref(false)
const shareError = ref<string | null>(null)
const members = ref<any[]>([])
const loadingMembers = ref(false)

const activeWs = computed(() => wsStore.activeWorkspace)
const teamId = computed(() => activeWs.value?.teamId)
const isAdmin = computed(() => {
  if (!teamId.value) return true // 尚未建立 team，當前用戶就是建立者
  // 優先從 teams store 判斷
  const team = teamStore.teams.find(t => t.id === teamId.value)
  if (team?.role) return team.role === 'admin'
  // fallback: 從已載入的 members 判斷
  const me = members.value.find(m => m.email?.toLowerCase() === authStore.user?.email?.toLowerCase())
  return me?.role === 'admin'
})

const roleBadge: Record<string, string> = {
  admin: 'bg-blue-500/15 text-blue-600',
  editor: 'bg-green-500/15 text-green-600',
  viewer: 'bg-gray-500/15 text-gray-500',
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    inviteMsg.value = null
    inviteEmail.value = ''
    if (teamId.value) {
      await Promise.all([teamStore.loadTeams(), loadMembers()])
    } else {
      members.value = []
    }
  }
})

async function loadMembers() {
  if (!teamId.value) return
  loadingMembers.value = true
  members.value = await teamStore.loadMembers(teamId.value)
  loadingMembers.value = false
}

async function handleShareWorkspace() {
  if (!activeWs.value || !authStore.isLoggedIn) return
  shareLoading.value = true
  shareError.value = null
  const team = await teamStore.createTeam(activeWs.value.name)
  if (team) {
    await wsStore.linkTeam(activeWs.value.id, team.id)
    // 分享後立即將本地資料推送到雲端，成功後刪除本地副本（雲端為唯一來源）
    await collectionStore.pushToCloud()
    await collectionStore.clearLocalCollections(activeWs.value.id)
    await envStore.pushLocalToCloud(team.id)
    await envStore.clearLocalEnvironments(activeWs.value.id)
    inviteMsg.value = 'Workspace shared & synced! Now invite members.'
  } else {
    shareError.value = teamStore.error || 'Failed to share workspace'
  }
  shareLoading.value = false
}

async function handleInvite() {
  const email = inviteEmail.value.trim()
  if (!email || !teamId.value) return
  inviteLoading.value = true
  inviteMsg.value = null
  const ok = await teamStore.inviteMember(teamId.value, email, inviteRole.value)
  if (ok) {
    inviteMsg.value = `Invited ${email}`
    inviteEmail.value = ''
    await loadMembers()
  } else {
    inviteMsg.value = teamStore.error || 'Invite failed'
  }
  inviteLoading.value = false
}

async function handleRemove(userId: string) {
  if (!teamId.value) return
  inviteMsg.value = null
  const ok = await teamStore.removeMember(teamId.value, userId)
  if (ok) {
    inviteMsg.value = 'Member removed'
  } else {
    inviteMsg.value = teamStore.error || 'Failed to remove'
  }
  await loadMembers()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/40" @click="emit('close')" />

      <!-- Dialog -->
      <div class="relative z-10 w-96 rounded-lg border border-border bg-bg-card p-5 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-text-primary">
            Team Members
          </h3>
          <button
            class="text-text-muted hover:text-text-primary"
            @click="emit('close')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <!-- 未登入提示 -->
        <div v-if="!authStore.isLoggedIn" class="rounded-md bg-yellow-500/10 p-3 text-xs text-yellow-600">
          Please login first to use team features.
        </div>

        <!-- 未分享 workspace -->
        <div v-else-if="!teamId" class="space-y-3">
          <p class="text-xs text-text-muted">
            This workspace is local only. Share it to invite team members.
          </p>
          <button
            class="w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="shareLoading"
            @click="handleShareWorkspace"
          >
            {{ shareLoading ? 'Sharing...' : 'Share Workspace' }}
          </button>
          <p v-if="shareError" class="text-xs text-red-500">{{ shareError }}</p>
          <p v-if="inviteMsg" class="text-xs text-green-600">{{ inviteMsg }}</p>
        </div>

        <!-- 已分享：成員列表 + 邀請 -->
        <div v-else class="space-y-4">
          <!-- 成員列表 -->
          <div>
            <p class="mb-2 text-xs font-medium text-text-secondary">Members</p>
            <div v-if="loadingMembers" class="text-xs text-text-muted">Loading...</div>
            <div v-else-if="members.length === 0" class="text-xs text-text-muted">
              Only you. Invite someone below!
            </div>
            <ul v-else class="space-y-1">
              <li
                v-for="m in members"
                :key="m.user_id"
                class="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-bg-hover"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    :class="roleBadge[m.role] || 'bg-gray-500/15 text-gray-500'"
                  >
                    {{ m.role }}
                  </span>
                  <span :class="m.status === 'pending' ? 'text-text-muted italic' : 'text-text-primary'">{{ m.name || m.email }}</span>
                  <span v-if="m.status === 'pending'" class="rounded bg-yellow-500/15 px-1.5 py-0.5 text-[10px] text-yellow-600">pending</span>
                </div>
                <button
                  v-if="isAdmin && m.email?.toLowerCase() !== authStore.user?.email?.toLowerCase()"
                  class="text-red-400 hover:text-red-600"
                  :title="m.status === 'pending' ? 'Cancel invitation' : 'Remove member'"
                  @click="handleRemove(m.user_id)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              </li>
            </ul>
          </div>

          <!-- 操作反饋訊息 -->
          <p v-if="inviteMsg" class="text-xs" :class="teamStore.error ? 'text-red-500' : 'text-green-600'">
            {{ inviteMsg }}
          </p>

          <!-- 邀請表單（僅 admin 可見） -->
          <div v-if="isAdmin">
            <p class="mb-2 text-xs font-medium text-text-secondary">Invite member</p>
            <div class="flex gap-2">
              <input
                v-model="inviteEmail"
                type="email"
                class="h-8 flex-1 rounded-md border border-border bg-transparent px-2 text-xs outline-none focus:border-border-focus"
                placeholder="Email address"
                @keyup.enter="handleInvite"
              />
              <select
                v-model="inviteRole"
                class="h-8 rounded-md border border-border bg-transparent px-2 text-xs"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              class="mt-2 w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              :disabled="inviteLoading || !inviteEmail.trim()"
              @click="handleInvite"
            >
              {{ inviteLoading ? 'Inviting...' : 'Invite' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
