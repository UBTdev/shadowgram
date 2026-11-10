import { ref, onMounted, onUnmounted } from 'vue'
import { ClientEvent, RoomEvent, MatrixEventEvent, NotificationCountType } from 'matrix-js-sdk'




// 1. Находит последнее сообщение в комнате. Возвращает само событие, не текст
function lastMessageEvent(room) {
  const events = room.getLiveTimeline().getEvents()
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    if (ev.getType() === 'm.room.message' || ev.getType() === 'm.room.encrypted') return ev
  }
  return null // сообщений в комнате нет
}

// 2. Делает из события текст для превью (твой код, только без цикла)
function lastMessagePreview(client, room, ev) {
  if (!ev) return ''
  // Нет ключа для расшифровки: устройство не подтверждено или ключ ещё не пришёл
  if (ev.isDecryptionFailure()) return '🔒 Не удалось расшифровать'
  // Ещё расшифровывается
  if (ev.getType() === 'm.room.encrypted') return '🔒 …'

  const body = ev.getContent().body ?? ''
  if (ev.getSender() === client.getUserId()) return 'You: ' + body
  const name = room.getMember(ev.getSender())?.name ?? ev.getSender()
  return name + ': ' + body
}


// 3. Статус твоего последнего сообщения: null (не твоё) | 'sent' | 'read'
function messageStatus(client, room, ev) {
  const myId = client.getUserId()
  if (!ev || ev.getSender() !== myId) return null

  // Все участники, кроме тебя
  const others = room.getJoinedMembers().filter((member) => member.userId !== myId)
  // Прочитал ли хоть один из них
  const someoneRead = others.some((member) => room.hasUserReadEvent(member.userId, ev.getId()))
  return someoneRead ? 'read' : 'sent'
}

// Снимок комнат простыми объектами. Сами объекты SDK в реактивное состояние
// Vue не кладём: они большие и меняются сами по себе
function snapshot(client) {
  return client
    .getRooms()
    .filter((room) => room.getMyMembership() === 'join')
    .map((room) => {
      const ev = lastMessageEvent(room) // ищем ОДИН раз
      return {
        id: room.roomId,
        name: room.name,
        preview: lastMessagePreview(client, room, ev),
        ts: room.getLastActiveTimestamp(),
        unread: room.getUnreadNotificationCount(NotificationCountType.Total),
        status: messageStatus(client, room, ev),
      }
    })
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


