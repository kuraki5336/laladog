<script setup lang="ts">
const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/40" @click="emit('close')" />

      <!-- Dialog -->
      <div class="relative z-10 w-[380px] rounded-lg border border-border bg-bg-card shadow-xl">
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
          <!-- Heart Icon -->
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 dark:bg-pink-900/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
            </svg>
          </div>

          <!-- Title -->
          <h2 class="mb-2 text-center text-lg font-bold text-text-primary">贊助作者</h2>

          <!-- Description -->
          <p class="mb-5 text-center text-sm leading-relaxed text-text-secondary">
            如果這個工具對你有幫助，歡迎請作者喝杯咖啡！<br />
            你的支持是持續開發的最大動力。
          </p>

          <!-- QR Code -->
          <div class="mx-auto mb-3 w-52 overflow-hidden rounded-xl border border-border bg-white p-3 shadow-sm">
            <img
              src="@/assets/images/jkopay-qr.png"
              alt="街口支付 QR Code"
              class="h-auto w-full"
            />
          </div>

          <p class="mb-4 text-center text-[11px] text-text-muted">
            請使用街口支付掃描上方 QR Code
          </p>

          <!-- Footer -->
          <p class="text-center text-[10px] text-text-muted">
            感謝每一位贊助者的支持 :)
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
