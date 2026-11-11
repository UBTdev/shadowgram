import { ref, onMounted, onUnmounted } from 'vue'
import {
  CryptoEvent,
  VerificationPhase,
  VerificationRequestEvent,
  VerifierEvent,
} from 'matrix-js-sdk/lib/crypto-api/index.js'

// Подтверждение этого устройства с другого своего устройства (например, Element)
// сравнением эмодзи. После подтверждения:
//  - устройство подписано твоей кросс-подписью, собеседники ему доверяют;
//  - старое устройство само пришлёт ключ бэкапа, и старая история расшифруется.
export function useVerification(client) {
  const crypto = client.getCrypto()

  // null — ещё не знаем, true/false — подтверждено ли это устройство
  const deviceVerified = ref(null)
  // idle | waiting | emoji | confirming | done | cancelled
  const state = ref('idle')
  const emojis = ref([])
  const error = ref('')

  let request = null
  let sas = null
  let verifierAttached = false

  async function refreshStatus() {
    // Если у пользователя вообще нет кросс-подписи (он ни разу не входил в Element),
    // подтверждать не с чем. Этот случай разберём позже, пока не показываем баннер
    const hasCrossSigning = await crypto.userHasCrossSigningKeys()
    if (!hasCrossSigning) {
      deviceVerified.value = true
      return
    }
    const status = await crypto.getDeviceVerificationStatus(client.getUserId(), client.getDeviceId())
    deviceVerified.value = !!status?.crossSigningVerified
  }

  function attachVerifier(verifier) {
    if (verifierAttached) return
    verifierAttached = true

    // Обе стороны вычислили одинаковые эмодзи — показываем их пользователю
    verifier.on(VerifierEvent.ShowSas, (callbacks) => {
      sas = callbacks
      emojis.value = callbacks.sas.emoji ?? []
      state.value = 'emoji'
    })

    verifier
      .verify()
      .then(async () => {
        state.value = 'done'
        await refreshStatus()
      })
      .catch((e) => {
        if (state.value === 'done') return
        state.value = 'cancelled'
        error.value = e?.message ?? ''
      })
  }

  function track(req) {
    request = req
    verifierAttached = false
    emojis.value = []
    error.value = ''
    state.value = 'waiting'

    const onChange = async () => {
      if (req.phase === VerificationPhase.Cancelled) {
        req.off(VerificationRequestEvent.Change, onChange)
        if (state.value !== 'done') state.value = 'cancelled'
        return
      }
      // Другая сторона уже начала сравнение эмодзи
      if (req.verifier) {
        attachVerifier(req.verifier)
        return
      }
      // Обе стороны готовы — начинаем сравнение эмодзи сами
      if (req.phase === VerificationPhase.Ready && !verifierAttached) {
        try {
          attachVerifier(await req.startVerification('m.sas.v1'))
        } catch (e) {
          // Если другая сторона успела начать одновременно с нами, берём её процесс
          if (req.verifier) attachVerifier(req.verifier)
          else {
            state.value = 'cancelled'
            error.value = e?.message ?? ''
          }
        }
      }
    }

    req.on(VerificationRequestEvent.Change, onChange)
    onChange()
  }

  // Мы просим подтвердить это устройство: запрос придёт во все твои другие клиенты
  async function start() {
    try {
      track(await crypto.requestOwnUserVerification())
    } catch (e) {
      state.value = 'cancelled'
      error.value = e?.message ?? ''
    }
  }

  // Подтверждение начали с другого устройства (например, в Element: «Подтвердить сессию»)
  async function onIncoming(req) {
    if (!req.isSelfVerification || state.value !== 'idle') return
    await req.accept()
    track(req)
  }

  async function confirm() {
    state.value = 'confirming'
    await sas?.confirm()
  }

  function mismatch() {
    sas?.mismatch()
    state.value = 'cancelled'
    error.value = 'Эмодзи не совпали. Возможно, кто-то вмешивается в соединение'
  }

  function close() {
    if (request && request.phase !== VerificationPhase.Done && request.phase !== VerificationPhase.Cancelled) {
      request.cancel().catch(() => {})
    }
    request = null
    sas = null
    state.value = 'idle'
  }

  const onTrustChanged = (userId) => {
    if (userId === client.getUserId()) refreshStatus()
  }

  onMounted(() => {
    refreshStatus()
    client.on(CryptoEvent.VerificationRequestReceived, onIncoming)
    client.on(CryptoEvent.UserTrustStatusChanged, onTrustChanged)
  })
  onUnmounted(() => {
    client.off(CryptoEvent.VerificationRequestReceived, onIncoming)
    client.off(CryptoEvent.UserTrustStatusChanged, onTrustChanged)
  })

  return { deviceVerified, state, emojis, error, start, confirm, mismatch, close }
}
