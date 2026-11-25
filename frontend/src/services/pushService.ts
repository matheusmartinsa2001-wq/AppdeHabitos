import { api } from './api'

export interface PushStatus {
  /** false = servidor sem chaves VAPID */
  enabled: boolean
  publicKey: string | null
}

export async function getPushStatus(): Promise<PushStatus> {
  const { data } = await api.get<PushStatus>('/push/status')
  return data
}

export async function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  await api.post('/push/subscriptions', { endpoint: subscription.endpoint, keys: subscription.keys })
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await api.delete('/push/subscriptions', { data: { endpoint } })
}

export async function sendTestPush(): Promise<{ sent: number }> {
  const { data } = await api.post<{ sent: number }>('/push/test')
  return data
}
