<script setup>
import { useVerification } from '../composables/useVerification'

const props = defineProps({
  client: { type: Object, required: true },
})

const { deviceVerified, state, emojis, error, start, confirm, mismatch, close } = useVerification(props.client)
</script>

<template>
  <!-- Баннер: устройство не подтверждено -->
  <div v-if="deviceVerified === false && state === 'idle'" class="border-b border-amber-900 bg-amber-950/60 px-4 py-3 text-sm">
    <p class="text-amber-200">Это устройство не подтверждено. Старые сообщения не расшифруются.</p>
    <button class="mt-2 font-medium text-amber-400 hover:text-amber-300" @click="start">
      Подтвердить с другого устройства
    </button>
  </div>

  <!-- Окно подтверждения -->
  <div v-if="state !== 'idle'" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div class="w-full max-w-md space-y-5 rounded-2xl bg-zinc-800 p-6 text-center shadow-xl">
      <template v-if="state === 'waiting'">
        <h2 class="text-lg font-semibold">Подтверждение устройства</h2>
        <p class="text-zinc-400">Открой Element (или другой свой клиент) и прими запрос на подтверждение.</p>
        <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400"></div>
        <button class="text-zinc-400 hover:text-zinc-100" @click="close">Отмена</button>
      </template>

      <template v-else-if="state === 'emoji'">
        <h2 class="text-lg font-semibold">Сравни эмодзи</h2>
        <p class="text-zinc-400">На другом устройстве должны быть те же эмодзи в том же порядке.</p>
        <div class="grid grid-cols-4 gap-3">
          <div v-for="([emoji, name], i) in emojis" :key="i" class="flex flex-col items-center gap-1">
            <span class="text-4xl">{{ emoji }}</span>
            <span class="text-xs text-zinc-400">{{ name }}</span>
          </div>
        </div>
        <div class="flex gap-3">
          <button class="flex-1 rounded-lg bg-zinc-700 py-2 hover:bg-zinc-600" @click="mismatch">Не совпадают</button>
          <button class="flex-1 rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500" @click="confirm">
            Совпадают
          </button>
        </div>
      </template>

      <template v-else-if="state === 'confirming'">
        <h2 class="text-lg font-semibold">Почти готово</h2>
        <p class="text-zinc-400">Подтверди совпадение эмодзи на другом устройстве.</p>
        <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400"></div>
      </template>

      <template v-else-if="state === 'done'">
        <h2 class="text-lg font-semibold text-emerald-400">Устройство подтверждено ✅</h2>
        <p class="text-zinc-400">Старые сообщения расшифруются сами в течение нескольких секунд.</p>
        <button class="w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500" @click="close">Готово</button>
      </template>

      <template v-else-if="state === 'cancelled'">
        <h2 class="text-lg font-semibold">Подтверждение отменено</h2>
        <p v-if="error" class="text-sm text-zinc-400">{{ error }}</p>
        <button class="w-full rounded-lg bg-zinc-700 py-2 hover:bg-zinc-600" @click="close">Закрыть</button>
      </template>
    </div>
  </div>
</template>
