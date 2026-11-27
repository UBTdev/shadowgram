import { ref, onMounted, onUnmounted } from 'vue'
import { RoomEvent, MatrixEventEvent, EventStatus } from 'matrix-js-sdk'

// Что показываем в ленте: обычные сообщения и зашифрованные (они либо ещё
// расшифровываются, либо расшифровать не вышло). Правки (m.replace) отдельными
// сообщениями не показываем: SDK сам подставляет новый текст в исходное сообщение
function isShown(ev) {
  const type = ev.getType()
  return (type === 'm.room.message' || type === 'm.room.encrypted') && !ev.isRelation('m.replace')
}

// Вид сообщения и текст для него.
// kind: text | notice | emote | file | redacted | decrypting | undecryptable
function messageBody(ev) {
  if (ev.isRedacted()) return { kind: 'redacted', body: 'Сообщение удалено' }
  if (ev.isDecryptionFailure()) return { kind: 'undecryptable', body: '🔒 Не удалось расшифровать' }
  if (ev.getType() === 'm.room.encrypted') return { kind: 'decrypting', body: '🔒 Расшифровывается…' }

  // Берём только body, простой текст. В formatted_body лежит HTML от собеседника:
  // вставлять его через v-html без очистки нельзя, это прямой путь к XSS
  const { msgtype, body } = ev.getContent()
  const text = typeof body === 'string' ? body : ''
  switch (msgtype) {
    case 'm.notice': // сообщения ботов
      return { kind: 'notice', body: text }
    case 'm.emote': // команда /me: «* Боб машет рукой»
      return { kind: 'emote', body: text }
    case 'm.image':
    case 'm.video':
    case 'm.audio':
    case 'm.file': // у файлов в body лежит имя файла
      return { kind: 'file', body: text }
    default:
      return { kind: 'text', body: text }
  }
}

// Статус твоего сообщения: sending | sent | failed.
// ev.status === null значит, что событие уже на сервере
function sendStatus(ev) {
  switch (ev.status) {
    case null:
    case EventStatus.SENT:
      return 'sent'
    case EventStatus.NOT_SENT:
    case EventStatus.CANCELLED:
      return 'failed'
    default: // ENCRYPTING, QUEUED, SENDING
      return 'sending'
  }
}

// Одно событие SDK превращаем в простой объект для шаблона
function toMessage(ev, myId) {
  const sender = ev.getSender()
  const mine = sender === myId
  return {
    // Ключ для v-for. У твоего ещё не отправленного сообщения ID временный,
    // после отправки сервер выдаёт настоящий. txnId при этом не меняется,
    // поэтому Vue не пересоздаёт пузырь. У чужих и старых сообщений txnId нет, берём ID
    key: ev.getTxnId() ?? ev.getId(),
    id: ev.getId(),
    sender,
    senderName: ev.sender?.name ?? sender,
    mine,
    ts: ev.getTs(),
    ...messageBody(ev), // kind и body
    edited: !!ev.replacingEvent(), // показать «изменено»
    status: mine ? sendStatus(ev) : null,
  }
}

// Снимок ленты: сообщения от старых к новым. Как и в useRooms, объекты SDK
// в реактивное состояние Vue не кладём, только простые копии
function snapshot(client, room) {
  const myId = client.getUserId()
  return room
    .getLiveTimeline()
    .getEvents()
    .filter(isShown)
    .map((ev) => toMessage(ev, myId))
}

// Эти события испускает сама комната, поэтому фильтровать по комнате не нужно
const ROOM_EVENTS = [
  RoomEvent.Timeline, // новое событие в ленте, в том числе твоё, ещё не отправленное
  RoomEvent.TimelineReset, // лента начата заново: после долгого оффлайна сервер прислал разрыв
  RoomEvent.LocalEchoUpdated, // твоё сообщение сменило статус: отправляется → отправлено или ошибка
  RoomEvent.Redaction, // сообщение удалили
]

// А эти события приходят от клиента сразу по всем комнатам, свои отбираем по roomId
const CLIENT_EVENTS = [
  MatrixEventEvent.Decrypted, // сообщение расшифровалось, в том числе старое, из бэкапа
  MatrixEventEvent.Replaced, // сообщение отредактировали
]

// roomId внутри компонента не меняется: при выборе другого чата
// ChatView пересоздаётся целиком (из-за :key в App.vue)
export function useTimeline(client, roomId) {
  const room = client.getRoom(roomId)
  const messages = ref(room ? snapshot(client, room) : [])
  if (!room) return { messages, markRead: () => {} } // комнаты нет, например, ты из неё вышел

  const update = () => {
    messages.value = snapshot(client, room)
  }
  const updateIfThisRoom = (ev) => {
    if (ev.getRoomId() === roomId) update()
  }

  // Отметить чат прочитанным до последнего события. Вызывать, когда пользователь
  // действительно видит конец ленты. Сервер по этой отметке сбрасывает счётчик
  // непрочитанного, а собеседник видит у своего сообщения двойную галочку
  function markRead() {
    // Ищем с конца событие, которое уже на сервере. Твоё ещё не отправленное
    // сообщение пропускаем: на него отметку поставить нельзя, SDK бросит ошибку
    const last = room
      .getLiveTimeline()
      .getEvents()
      .findLast((ev) => ev.status === null)
    // Уже прочитано (в том числе в другом клиенте) — лишний запрос не шлём.
    // SDK запоминает отметку сразу при отправке, так что повторный вызов сюда не дойдёт
    if (!last || room.hasUserReadEvent(client.getUserId(), last.getId())) return
    client.sendReadReceipt(last).catch((e) => console.error('Не удалось отметить прочитанным:', e))
  }

  onMounted(() => {
    ROOM_EVENTS.forEach((e) => room.on(e, update))
    CLIENT_EVENTS.forEach((e) => client.on(e, updateIfThisRoom))
  })
  onUnmounted(() => {
    ROOM_EVENTS.forEach((e) => room.off(e, update))
    CLIENT_EVENTS.forEach((e) => client.off(e, updateIfThisRoom))
  })

  return { messages, markRead }
}
