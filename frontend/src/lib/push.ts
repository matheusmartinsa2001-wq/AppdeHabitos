/**
 * Notificações no navegador (Web Push). No iPhone só funcionam com o app instalado na tela
 * de início (iOS 16.4+): no Safari comum, `PushManager` nem existe.
 */

export type PushSupport = 'supported' | 'ios-needs-install' | 'unsupported'

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function getPushSupport(): PushSupport {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (supported) return 'supported'
  return isIos() && !isStandalone() ? 'ios-needs-install' : 'unsupported'
}

export function getPermission(): NotificationPermission {
  return Notification.permission
}

/** Espera o service worker ficar pronto, mas não para sempre (ex.: modo dev sem SW). */
async function readyRegistration(timeoutMs = 10_000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Service worker não ficou pronto')), timeoutMs),
    ),
  ])
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await readyRegistration()
  return registration.pushManager.getSubscription()
}

function base64UrlToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

/**
 * Pede a permissão (precisa ser chamado direto de um toque do usuário) e inscreve o aparelho.
 * Devolve null se a permissão for negada.
 */
export async function subscribeToPush(publicKey: string): Promise<PushSubscriptionJSON | null> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null
  const registration = await readyRegistration()
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKey),
    }))
  return subscription.toJSON()
}

export async function unsubscribeFromPush(): Promise<string | null> {
  const subscription = await getCurrentSubscription()
  if (!subscription) return null
  const { endpoint } = subscription
  await subscription.unsubscribe()
  return endpoint
}
