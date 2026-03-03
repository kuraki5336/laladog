import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)

  function init() {
    const saved = localStorage.getItem('laladog_theme')
    if (saved === 'dark') {
      isDark.value = true
    } else if (saved === null) {
      // 跟隨系統
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem('laladog_theme', isDark.value ? 'dark' : 'light')
    applyTheme()
  }

  function applyTheme() {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  watch(isDark, applyTheme)

  return { isDark, init, toggle }
})
