import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as push from '@/lib/push'
import * as pushService from '@/services/pushService'
import { renderWithProviders } from '@/test/render'
import { NotificationsCard } from './NotificationsCard'

vi.mock('@/lib/push', () => ({
  getPushSupport: vi.fn(),
  getPermission: vi.fn(),
  getCurrentSubscription: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
}))
vi.mock('@/services/pushService', () => ({
  getPushStatus: vi.fn(),
  savePushSubscription: vi.fn(),
  removePushSubscription: vi.fn(),
  sendTestPush: vi.fn(),
}))

const lib = vi.mocked(push)
const api = vi.mocked(pushService)
const SUBSCRIPTION = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } }

describe('NotificationsCard (chave)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lib.getPushSupport.mockReturnValue('supported')
    lib.getPermission.mockReturnValue('default')
    lib.getCurrentSubscription.mockResolvedValue(null)
    api.getPushStatus.mockResolvedValue({ enabled: true, publicKey: 'chave' })
  })

  it('iPhone fora do app instalado: explica como instalar e não pergunta ao servidor', async () => {
    lib.getPushSupport.mockReturnValue('ios-needs-install')
    renderWithProviders(<NotificationsCard />)
    expect(await screen.findByText(/Adicionar à Tela de Início/)).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-disabled', 'true')
    expect(api.getPushStatus).not.toHaveBeenCalled()
  })

  it('ligar a chave: pede permissão, inscreve o aparelho e salva no servidor', async () => {
    lib.subscribeToPush.mockResolvedValue(SUBSCRIPTION)
    api.savePushSubscription.mockResolvedValue(undefined)
    const { user } = renderWithProviders(<NotificationsCard />)
    expect(await screen.findByText('Desativadas neste aparelho')).toBeInTheDocument()
    await user.click(screen.getByRole('switch'))
    expect(lib.subscribeToPush).toHaveBeenCalledWith('chave')
    await waitFor(() => expect(api.savePushSubscription).toHaveBeenCalledWith(SUBSCRIPTION))
    expect(await screen.findByText('Ativadas neste aparelho')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('permissão negada: mostra onde liberar e não salva nada', async () => {
    lib.subscribeToPush.mockResolvedValue(null)
    const { user } = renderWithProviders(<NotificationsCard />)
    await screen.findByText('Desativadas neste aparelho')
    await user.click(screen.getByRole('switch'))
    expect(await screen.findByText(/Ajustes → Notificações → Hábitos/)).toBeInTheDocument()
    expect(api.savePushSubscription).not.toHaveBeenCalled()
  })

  it('ligada: "Enviar teste" e desligar a chave', async () => {
    lib.getCurrentSubscription.mockResolvedValue({} as PushSubscription)
    api.sendTestPush.mockResolvedValue({ sent: 1 })
    lib.unsubscribeFromPush.mockResolvedValue('https://push.example/abc')
    api.removePushSubscription.mockResolvedValue(undefined)
    const { user } = renderWithProviders(<NotificationsCard />)

    await user.click(await screen.findByRole('button', { name: 'Enviar teste' }))
    expect(await screen.findByText('Teste enviado: deve chegar em segundos')).toBeInTheDocument()

    lib.getCurrentSubscription.mockResolvedValue(null)
    await user.click(screen.getByRole('switch'))
    await waitFor(() => expect(api.removePushSubscription).toHaveBeenCalledWith('https://push.example/abc'))
    expect(await screen.findByText('Desativadas neste aparelho')).toBeInTheDocument()
  })

  it('servidor sem as chaves: avisa', async () => {
    api.getPushStatus.mockResolvedValue({ enabled: false, publicKey: null })
    renderWithProviders(<NotificationsCard />)
    expect(await screen.findByText('Ainda não configuradas no servidor')).toBeInTheDocument()
  })
})
