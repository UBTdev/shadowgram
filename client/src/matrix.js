import { createClient, ClientEvent, SyncState } from 'matrix-js-sdk'

// Адрес Synapse. На проде его задаст переменная окружения VITE_HOMESERVER_URL
export const HOMESERVER_URL = import.meta.env.VITE_HOMESERVER_URL ?? 'http://localhost:8008'

const SESSION_KEY = 'shadowgram.session'

// Вход по логину и паролю. Сервер возвращает токен доступа и ID устройства,
// сохраняем их, чтобы после перезагрузки страницы не входить заново
export async function login(username, password) {
  const tempClient = createClient({ baseUrl: HOMESERVER_URL })
  const res = await tempClient.loginRequest({
    type: 'm.login.password',
    identifier: { type: 'm.id.user', user: username },
    password,
    initial_device_display_name: 'Shadowgram Web',
  })
  const session = {
    baseUrl: HOMESERVER_URL,
    userId: res.user_id,
    accessToken: res.access_token,
    deviceId: res.device_id,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY)
  return raw ? JSON.parse(raw) : null
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

// Создаёт клиент из сессии, включает шифрование и запускает синхронизацию.
// Возвращает клиент, когда пришла первая синхронизация и список комнат готов
export async function startClient(session) {
  const client = createClient({
    ...session,
    // Подтверждать устройства будем сравнением эмодзи (SAS)
    verificationMethods: ['m.sas.v1'],
  })

  // Включаем E2EE. Ключи этого устройства хранятся в IndexedDB браузера
  // и никогда не уходят на сервер в открытом виде
  await client.initRustCrypto()

  // Подписываемся заранее, чтобы не пропустить событие
  const firstSync = new Promise((resolve, reject) => {
    const onSync = (state, _prev, data) => {
      if (state === SyncState.Prepared) {
        client.off(ClientEvent.Sync, onSync)
        resolve()
      } else if (state === SyncState.Error) {
        client.off(ClientEvent.Sync, onSync)
        client.stopClient()
        reject(data?.error ?? new Error('Ошибка синхронизации'))
      }
    }
    client.on(ClientEvent.Sync, onSync)
  })

  await client.startClient({ initialSyncLimit: 20 })
  await firstSync
  return client
}

// Выход: сервер удаляет токен и устройство, мы — сессию и ключи шифрования из браузера
export async function logout(client) {
  try {
    await client.logout(true)
  } finally {
    clearSession()
    await client.clearStores()
  }
}
