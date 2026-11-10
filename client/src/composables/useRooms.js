import { ref, onMounted, onUnmounted } from 'vue'
import { ClientEvent, RoomEvent, MatrixEventEvent, NotificationCountType } from 'matrix-js-sdk'

// Текст последнего сообщения для превью в списке чатов
function lastMessagePreview(room) {
  const events = room.getLiveTimeline().getEvents()
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    // Нет ключа для расшифровки: устройство не подтверждено или ключ ещё не пришёл
    if (ev.isDecryptionFailure()) return '🔒 Не удалось расшифровать'
    // Расшифрованное сообщение SDK отдаёт как обычное m.room.message
    if (ev.getType() === 'm.room.message') return ev.getContent().body ?? ''
    // Ещё расшифровывается
    if (ev.getType() === 'm.room.encrypted') return '🔒 …'
  }
  return ''
}

// Снимок комнат простыми объектами. Сами объекты SDK в реактивное состояние
// Vue не кладём: они большие и меняются сами по себе
function snapshot(client) {
  return client
    .getRooms()
    .filter((room) => room.getMyMembership() === 'join')
    .map((room) => ({
      id: room.roomId,
      name: room.name,
      preview: lastMessagePreview(room),
      ts: room.getLastActiveTimestamp(),
      unread: room.getUnreadNotificationCount(NotificationCountType.Total),
    }))
    .sort((a, b) => b.ts - a.ts)
}

// События, после которых список нужно пересобрать
const CLIENT_EVENTS = [
  ClientEvent.Sync, // каждая синхронизация, заодно обновляет счётчики непрочитанного
  ClientEvent.Room, // появилась новая комната
  ClientEvent.DeleteRoom, // комната удалена из клиента
  RoomEvent.Timeline, // новое сообщение, в том числе твоё собственное
  RoomEvent.Name, // комнату переименовали
  RoomEvent.MyMembership, // тебя пригласили, ты вошёл или вышел
  RoomEvent.Receipt, // кто-то прочитал сообщения
  MatrixEventEvent.Decrypted, // сообщение расшифровалось (в том числе старое, из бэкапа)
]

export function useRooms(client) {
  const rooms = ref(snapshot(client))
  const update = () => {
    rooms.value = snapshot(client)
  }

  onMounted(() => CLIENT_EVENTS.forEach((e) => client.on(e, update)))
  onUnmounted(() => CLIENT_EVENTS.forEach((e) => client.off(e, update)))

  return rooms
}
