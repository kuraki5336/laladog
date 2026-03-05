<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { changelog } from '@/constants/changelog'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const appVersion = ref('')

const isTauri = !!(window as any).__TAURI_INTERNALS__

onMounted(async () => {
  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    appVersion.value = await getVersion()
  } catch {
    appVersion.value = '0.3.0'
  }
})

async function openLink(url: string) {
  try {
    if (isTauri) {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
    } else {
      window.open(url, '_blank')
    }
  } catch {
    window.open(url, '_blank')
  }
}

const socialLinks = [
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/zi.yan.395',
    icon: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
    viewBox: '0 0 24 24',
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/kuraki5336/',
    icon: 'M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2m-.2 2A3.6 3.6 0 004 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5M12 7a5 5 0 110 10 5 5 0 010-10m0 2a3 3 0 100 6 3 3 0 000-6z',
    viewBox: '0 0 24 24',
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com/@%E8%90%8C%E8%99%8E%E7%B8%BD%E7%8D%A8%E8%A1%8C',
    icon: 'M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z',
    viewBox: '0 0 24 24',
  },
]
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="emit('close')" />

      <!-- Dialog -->
      <div class="relative z-10 w-[480px] max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-bg-card shadow-xl">
        <!-- Close Button -->
        <button
          class="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-bg-hover hover:text-text-primary"
          @click="emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>

        <div class="p-6">
          <!-- Header: Logo + Title + Version -->
          <div class="mb-6 flex flex-col items-center gap-2">
            <img src="@/assets/logo/favicon-192.png" alt="LalaDog" class="h-12 w-12" />
            <h2 class="text-xl font-bold text-primary">LalaDog</h2>
            <span class="rounded-full bg-secondary-10 px-2.5 py-0.5 text-[11px] font-medium text-secondary">
              v{{ appVersion }}
            </span>
            <p class="text-xs text-text-muted">API Client for Teams</p>
          </div>

          <!-- Company Info -->
          <div class="mb-4 rounded-lg border border-border p-4">
            <h3 class="mb-1 text-sm font-semibold text-text-primary">靈境資訊 (0Realm)</h3>
            <p class="mb-3 text-xs leading-relaxed text-text-secondary">
              專注於客製軟體開發與 AI 落地顧問服務，協助企業建構能持續進化的數位核心。
            </p>

            <!-- Contact -->
            <div class="space-y-1.5">
              <div class="flex items-center gap-2 text-xs text-text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>kuraki5336@gmail.com</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                </svg>
                <span>Taichung, Taiwan</span>
              </div>
            </div>

            <!-- Social Links -->
            <div class="mt-3 flex gap-2">
              <button
                v-for="link in socialLinks"
                :key="link.name"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-bg-hover text-text-secondary transition-colors hover:bg-secondary-10 hover:text-secondary"
                :title="link.name"
                @click="openLink(link.url)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" :viewBox="link.viewBox" fill="currentColor">
                  <path :d="link.icon" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Changelog -->
          <div class="rounded-lg border border-border p-4">
            <h3 class="mb-3 text-sm font-semibold text-text-primary">版本紀錄</h3>
            <div class="space-y-3">
              <div v-for="entry in changelog" :key="entry.version" class="border-l-2 border-secondary/30 pl-3">
                <div class="mb-1 flex items-center gap-2">
                  <span class="rounded-full bg-secondary-10 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
                    {{ entry.version }}
                  </span>
                  <span class="text-[10px] text-text-muted">{{ entry.date }}</span>
                </div>
                <ul class="space-y-0.5">
                  <li
                    v-for="(change, i) in entry.changes"
                    :key="i"
                    class="text-[11px] leading-relaxed text-text-secondary before:mr-1.5 before:text-text-muted before:content-['•']"
                  >
                    {{ change }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Copyright -->
          <p class="mt-4 text-center text-[10px] text-text-muted">
            Copyright 2025 靈境資訊. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
