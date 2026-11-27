<script setup>
import { onMounted, onUnmounted } from 'vue'
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

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const { messages } = useTimeline(props.client, props.roomId)
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
    <ul class="flex flex-col gap-1 flex-1 overflow-y-auto p-4">
      <li class="flex" v-for="message in messages" :key="message.key">
        <div
          class="max-w-[min(75%,30rem)] rounded-2xl px-3 py-2 break-words whitespace-pre-wrap"
          :class="{ 'max-lg:ml-auto bg-emerald-700': message.mine, 'bg-zinc-800': !message.mine }"
        >
          <div v-if="!message.mine" class="text-xs text-zinc-400">{{ message.senderName }}</div>
          <div class="whitespace-pre-wrap">{{ message.body }}</div>
        </div>
      </li>
    </ul>
    <div class="absolute bottom-0">
      <textarea class="w-full"> </textarea>
    </div>
  </section>
</template>
