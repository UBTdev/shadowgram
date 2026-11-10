<script setup>
import { ref } from 'vue'

// ref — реактивная переменная: изменишь её, и Vue сам перерисует всё, где она используется
const count = ref(0)
</script>

<template>
  <main class="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col items-center justify-center gap-4">
    <h1 class="text-4xl font-bold text-emerald-400">Shadowgram</h1>
    <button class="rounded-lg bg-emerald-600 px-4 py-2 hover:bg-emerald-500" @click="count++">
      Нажато: {{ count }}
    </button>
  </main>
</template>