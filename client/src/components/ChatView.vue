<script setup>
import { ref, watch, useTemplateRef, onMounted, onUnmounted } from 'vue'
import { useTimeline } from '../composables/useTimeline'

const props = defineProps({
  roomId: { type: String, required: true },
  client: { type: Object, required: true },
})
const emit = defineEmits(['close'])

const room = props.client.getRoom(props.roomId)

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('focus', readIfVisible)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('focus', readIfVisible)
})

const { messages, markRead } = useTimeline(props.client, props.roomId)

const text = ref('')
// scrollToBottom (start)
const list = useTemplateRef('list')
const atBottom = ref(true)

function onScroll() {
  const el = list.value
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight // сколько пикселей до низа
  atBottom.value = distance < 40
}

function scrollToBottom() {
  list.value.scrollTop = list.value.scrollHeight
}

function jumpToBottom() {
  list.value.scrollTo({ top: list.value.scrollHeight, behavior: 'smooth' })
}

// sender
function send() {
  const body = text.value.trim() // как username.value.trim() в LoginForm
  if (!body) return // пустое или одни пробелы не отправляем

  atBottom.value = true
  text.value = '' // поле очищаем сразу, сообщение уже видно в ленте
  props.client.sendTextMessage(props.roomId, body).catch((e) => console.error('Не отправлено:', e))
}

onMounted(scrollToBottom) // открыли чат
watch(
  messages,
  () => {
    if (atBottom.value) scrollToBottom()
  },

  { flush: 'post' },
)

// mark on read
function readIfVisible() {
  if (atBottom.value && document.hasFocus()) markRead()
}

onMounted(readIfVisible) // открыли чат
watch([messages, atBottom], readIfVisible) // новое сообщение или докрутил вниз
</script>

<template>
  <section class="flex h-screen min-w-0 flex-1 flex-col">
    <header class="border-b border-zinc-800 px-4 py-3 flex items-center justify-between select-none">
      <span class="truncate font-medium">{{ room?.name }}</span>
      <button
        type="button"
        class="shrink-0 text-zinc-400 hover:text-zinc-100"
        aria-label="Закрыть чат"
        title="Закрыть чат"
        @click="emit('close')"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          class="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </header>
    <ul ref="list" @scroll="onScroll" class="flex flex-col gap-1 flex-1 overflow-y-auto p-4 bg-mist-900">
      <li class="flex" v-for="message in messages" :key="message.key">
        <div
          class="max-w-[min(75%,30rem)] rounded-2xl px-3 py-2 break-words whitespace-pre-wrap"
          :class="{ 'max-lg:ml-auto bg-emerald-700': message.mine, 'bg-zinc-800': !message.mine }"
        >
          <div v-if="!message.mine" class="text-xs text-zinc-400">{{ message.senderName }}</div>
          <div class="whitespace-pre-wrap">{{ message.body }} {{ message.time }}</div>
        </div>
      </li>
    </ul>

    <button
      v-if="!atBottom"
      type="button"
      class="absolute right-8 bottom-16 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 shadow-lg hover:bg-zinc-700"
      aria-label="Вниз к новым сообщениям"
      @click="jumpToBottom"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-5 w-5"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <footer class="border-t border-zinc-800 px-4 py-3 flex justify-between">
      <form class="flex justify-between w-full" @submit.prevent="send">
        <textarea
          @keydown.enter.exact.prevent="send"
          v-model="text"
          rows="1"
          placeholder="Сообщение..."
          class="max-h-[35vh] flex-1 resize-none overflow-y-auto [field-sizing:content] focus:outline-none"
        />
        <button type="submit" :disabled="!text.trim()" class="shrink-0 disabled:opacity-50 cursor-pointer">
          Отправить
        </button>
      </form>
    </footer>
  </section>
</template>
