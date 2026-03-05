<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{
  (e: 'openAbout'): void
  (e: 'openSponsor'): void
  (e: 'checkUpdate'): void
}>()

const showMenu = ref(false)
const appVersion = ref('')

onMounted(async () => {
  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    appVersion.value = await getVersion()
  } catch {
    appVersion.value = '0.3.0'
  }
})

function openAbout() {
  showMenu.value = false
  emit('openAbout')
}

function openSponsor() {
  showMenu.value = false
  emit('openSponsor')
}

function checkUpdate() {
  showMenu.value = false
  emit('checkUpdate')
}
</script>

<template>
  <div class="relative">
    <!-- Hamburger Button -->
    <button
      class="flex h-8 w-8 items-center justify-center rounded-button text-text-muted hover:bg-bg-hover hover:text-text-primary"
      title="Menu"
      @click="showMenu = !showMenu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <Teleport to="body">
      <!-- Backdrop -->
      <div
        v-if="showMenu"
        class="fixed inset-0 z-40"
        @click="showMenu = false"
      />
    </Teleport>

    <div
      v-if="showMenu"
      class="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-bg-card py-1 shadow-lg"
    >
      <!-- Version Badge -->
      <div class="px-3 py-1.5">
        <span class="rounded-full bg-secondary-10 px-2 py-0.5 text-[10px] font-medium text-secondary">
          v{{ appVersion }}
        </span>
      </div>

      <div class="my-1 border-t border-border" />

      <!-- Check for Updates -->
      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
        @click="checkUpdate"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
        </svg>
        檢查更新
      </button>

      <!-- About Us -->
      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
        @click="openAbout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        關於我們
      </button>

      <!-- Sponsor -->
      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
        @click="openSponsor"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
        </svg>
        贊助作者
      </button>
    </div>
  </div>
</template>
