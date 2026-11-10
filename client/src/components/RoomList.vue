<script setup>
import { useRooms } from "../composables/useRooms";
import DeviceVerification from "./DeviceVerification.vue";

const props = defineProps({
  client: { type: Object, required: true },
});
const emit = defineEmits(["logout"]);

const rooms = useRooms(props.client);

// Сегодня — время, раньше — дата, как в Telegram
function formatTime(ts) {
  if (!ts || ts < 0) return "";
  const date = new Date(ts);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// Первая буква названия для аватарки-заглушки
function initial(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}
</script>

<template>
  <aside class="flex h-screen w-full max-w-sm flex-col border-r border-zinc-800">
    <header class="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
      <span class="truncate font-semibold">{{ client.getUserId() }}</span>
      <button class="text-sm text-zinc-400 hover:text-zinc-100" @click="emit('logout')">
        Выйти
      </button>
    </header>

    <DeviceVerification :client="client" />

    <ul class="flex-1 overflow-y-auto">
      <li
        v-for="room in rooms"
        :key="room.id"
        class="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-zinc-800"
      >
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-lg font-semibold"
        >
          {{ initial(room.name) }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-2">
            <span class="truncate font-medium" :class="{ 'text-emerald-400' : room.unread > 0}">{{ room.name }}</span>
            <span class="shrink-0 text-xs text-zinc-500">{{ formatTime(room.ts) }}</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span
              class="truncate text-sm"
              :class="{ 
              'font-bold text-white': room.unread > 0,
              'text-zinc-400': !room.unread > 0  
              }"
              >{{ room.preview }}</span
            >
            <span
              v-if="room.unread"
              class="shrink-0 rounded-full bg-emerald-600 px-2 text-xs font-semibold"
            >
              {{ room.unread }}
            </span>

            <span v-if="room.status">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-4 w-4"
                aria-hidden="true"
              >
                <path 
                
                d="m3 12 4 4L17 6" />
                <path 
                v-if="room.status === 'read'"
                d="m9 12 4 4L21 8"
                />
              </svg>
            </span>
          </div>
        </div>
      </li>

      <li v-if="!rooms.length" class="p-6 text-center text-zinc-500">Чатов пока нет</li>
    </ul>
  </aside>
</template>
