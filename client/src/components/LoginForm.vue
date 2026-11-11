<script setup>
import { ref } from 'vue'
import { login } from '../matrix'

const emit = defineEmits(['logged-in'])

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const session = await login(username.value.trim(), password.value)
    emit('logged-in', session)
  } catch (e) {
    // M_FORBIDDEN — так сервер отвечает на неверный логин или пароль
    error.value = e.errcode === 'M_FORBIDDEN' ? 'Неверный логин или пароль' : `Ошибка входа: ${e.message}`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="w-full max-w-sm space-y-4 rounded-2xl bg-zinc-800 p-8 shadow-xl" @submit.prevent="submit">
    <h1 class="text-center text-2xl font-bold text-emerald-400">Shadowgram</h1>

    <input
      v-model="username"
      autocomplete="username"
      placeholder="Логин"
      class="w-full rounded-lg bg-zinc-700 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
    />
    <input
      v-model="password"
      type="password"
      autocomplete="current-password"
      placeholder="Пароль"
      class="w-full rounded-lg bg-zinc-700 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
    />

    <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

    <button
      :disabled="loading || !username || !password"
      class="w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
    >
      {{ loading ? 'Входим…' : 'Войти' }}
    </button>
  </form>
</template>
