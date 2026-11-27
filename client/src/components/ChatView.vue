<script setup>


const props = defineProps({
  roomId: { type: String, required: true },
  client: { type: Object, required: true },
})

const room = props.client.getRoom(props.roomId);
</script>

<template>
  <section class="flex-1 min-w-0">
    <header class="border-b border-zinc-800 px-4 py-3">
      {{ room?.name }}
    </header>
  </section>
</template>
