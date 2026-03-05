<script setup lang="ts">
import { ref } from 'vue'
import { useEnvironmentStore } from '@/stores/environmentStore'
import { parsePostmanEnvironment } from '@/utils/postmanImporter'

const store = useEnvironmentStore()
const showModal = ref(false)
const newEnvName = ref('')
const editingEnvId = ref<string | null>(null)
const newVarKey = ref('')
const newVarValue = ref('')
const envFileInput = ref<HTMLInputElement | null>(null)
const importError = ref<string | null>(null)
const importSuccess = ref<string | null>(null)

async function addEnvironment() {
  if (!newEnvName.value.trim()) return
  await store.addEnvironment(newEnvName.value.trim())
  newEnvName.value = ''
}

async function addVariable() {
  if (!editingEnvId.value || !newVarKey.value.trim()) return
  await store.addVariable(editingEnvId.value, newVarKey.value.trim(), newVarValue.value)
  newVarKey.value = ''
  newVarValue.value = ''
}

function triggerImportEnv() {
  envFileInput.value?.click()
}

async function handleImportEnv(e: Event) {
  importError.value = null
  importSuccess.value = null
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const json = JSON.parse(text)
    const envs = parsePostmanEnvironment(json)
    for (const env of envs) {
      await store.importEnvironment(env.name, env.variables)
    }
    importSuccess.value = `Imported ${envs.length} environment(s): ${envs.map(e => e.name).join(', ')}`
    setTimeout(() => { importSuccess.value = null }, 4000)
  } catch (err: any) {
    importError.value = err.message || 'Failed to import environment'
  }

  if (envFileInput.value) envFileInput.value.value = ''
}
</script>

<template>
  <!-- Hidden file input -->
  <input
    ref="envFileInput"
    type="file"
    accept=".json"
    class="hidden"
    @change="handleImportEnv"
  />

  <!-- Trigger Button -->
  <button
    class="rounded-button border border-border px-2 py-1 text-xs text-text-muted hover:bg-bg-hover hover:text-text-primary"
    @click="showModal = true"
  >
    Manage Environments
  </button>

  <!-- Modal -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
      <div class="w-[600px] max-h-[80vh] overflow-y-auto rounded-card bg-bg-card p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-base font-bold text-text-primary">Environments</h2>
          <button class="text-text-muted hover:text-text-primary" @click="showModal = false">✕</button>
        </div>

        <!-- Add Environment -->
        <div class="mb-4 flex gap-2">
          <input
            v-model="newEnvName"
            class="flex-1 rounded-button border border-border px-3 py-2 text-xs outline-none focus:border-border-focus"
            placeholder="New environment name"
            @keyup.enter="addEnvironment"
          />
          <button
            class="rounded-button bg-secondary px-4 py-2 text-xs text-white hover:bg-secondary-60"
            @click="addEnvironment"
          >
            Add
          </button>
          <button
            class="flex items-center gap-1 rounded-button border border-border px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover"
            title="Import Postman Environment JSON"
            @click="triggerImportEnv"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            Import
          </button>
        </div>

        <!-- Import Messages -->
        <div v-if="importError" class="mb-3 rounded-sm bg-danger-light px-3 py-2 text-xs text-danger">
          {{ importError }}
        </div>
        <div v-if="importSuccess" class="mb-3 rounded-sm bg-success-light px-3 py-2 text-xs text-success">
          {{ importSuccess }}
        </div>

        <!-- Environment List -->
        <div
          v-for="env in store.environments"
          :key="env.id"
          class="mb-3 rounded-card border border-border p-3"
        >
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-text-primary">{{ env.name }}</span>
              <span
                v-if="store.activeEnvironment?.id === env.id"
                class="rounded-tag bg-success-light px-2 py-0.5 text-[10px] font-medium text-success"
              >
                Active
              </span>
            </div>
            <div class="flex gap-2">
              <button
                v-if="store.activeEnvironment?.id !== env.id"
                class="text-xs text-secondary hover:underline"
                @click="store.setActive(env.id)"
              >
                Set Active
              </button>
              <button
                class="text-xs text-danger hover:underline"
                @click="store.deleteEnvironment(env.id)"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Variables -->
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-border-light text-left">
                <th class="py-1 font-medium text-text-muted">Key</th>
                <th class="py-1 font-medium text-text-muted">Value</th>
                <th class="w-8" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in env.variables" :key="v.id" class="border-b border-border-light">
                <td class="py-1">
                  <input
                    :value="v.key"
                    class="w-full bg-transparent outline-none"
                    @change="store.updateVariable(v.id, ($event.target as HTMLInputElement).value, v.value, v.enabled)"
                  />
                </td>
                <td class="py-1">
                  <input
                    :value="v.value"
                    class="w-full bg-transparent font-mono outline-none"
                    @change="store.updateVariable(v.id, v.key, ($event.target as HTMLInputElement).value, v.enabled)"
                  />
                </td>
                <td class="py-1">
                  <input type="checkbox" :checked="v.enabled" class="accent-secondary"
                    @change="store.updateVariable(v.id, v.key, v.value, ($event.target as HTMLInputElement).checked)"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Add Variable -->
          <div class="mt-2 flex gap-2">
            <input
              v-model="newVarKey"
              class="flex-1 rounded-sm border border-border px-2 py-1 text-xs outline-none focus:border-border-focus"
              placeholder="Key"
              @focus="editingEnvId = env.id"
            />
            <input
              v-model="newVarValue"
              class="flex-1 rounded-sm border border-border px-2 py-1 text-xs outline-none focus:border-border-focus"
              placeholder="Value"
              @focus="editingEnvId = env.id"
            />
            <button
              class="rounded-sm bg-secondary px-2 py-1 text-xs text-white hover:bg-secondary-60"
              @click="editingEnvId = env.id; addVariable()"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
