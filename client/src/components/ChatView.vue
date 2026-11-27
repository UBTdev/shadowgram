<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  roomId: { type: String, required: true },
  client: { type: Object, required: true },
})
const emit = defineEmits(['close'])

const room = props.client.getRoom(props.roomId)

function onKeydown(event) {
  if(event.key === "Escape") emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section class="flex-1 min-w-0">
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
  </section>
</template>
