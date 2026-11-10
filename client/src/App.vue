<script setup>
import { ref, shallowRef, onMounted } from 'vue'
import { loadSession, clearSession, startClient, logout } from './matrix'
import LoginForm from './components/LoginForm.vue'
import RoomList from './components/RoomList.vue'

// shallowRef, а не ref: иначе Vue обернёт весь клиент SDK в реактивные прокси,
// это медленно и ломает внутреннюю логику SDK
const client = shallowRef(null)
const status = ref('loading') // loading | login | ready
const error = ref('')

async function start(session) {
  status.value = 'loading'
  error.value = ''
  try {
    client.value = await startClient(session)
    status.value = 'ready'
  } catch (e) {
    // Токен больше не действует (например, сессию завершили из Element) — забываем её
    if (e.errcode === 'M_UNKNOWN_TOKEN') clearSession()
    error.value = `Не удалось подключиться: ${e.message}`
    status.value = 'login'
  }
}

async function onLogout() {
  await logout(client.value)
  client.value = null
  status.value = 'login'
}

// При открытии страницы пробуем продолжить сохранённую сессию
onMounted(() => {
  const session = loadSession()
  if (session) start(session)
  else status.value = 'login'
})
</script>

<template>
  <main class="min-h-screen bg-zinc-900 text-zinc-100">
    <div v-if="status === 'loading'" class="flex min-h-screen items-center justify-center text-zinc-400">
      Загрузка…
    </div>

    <div v-else-if="status === 'login'" class="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <LoginForm @logged-in="start" />
      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
    </div>

    <RoomList v-else :client="client" @logout="onLogout" />
  </main>
</template>
