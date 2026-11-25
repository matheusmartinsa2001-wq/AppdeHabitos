import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as push from '@/lib/push'
import * as pushService from '@/services/pushService'
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

describe('NotificationsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lib.getPushSupport.mockReturnValue('supported')
    lib.getPermission.mockReturnValue('default')
    lib.getCurrentSubscription.mockResolvedValue(null)
    api.getPushStatus.mockResolvedValue({ enabled: true, publicKey: 'chave' })
  })

  it('iPhone fora do app instalado: explica como instalar', async () => {
    lib.getPushSupport.mockReturnValue('ios-needs-install')
    render(<NotificationsCard />)
    expect(await screen.findByText(/Adicionar à Tela de Início/)).toBeInTheDocument()
    expect(api.getPushStatus).not.toHaveBeenCalled()
  })

  it('ativar: pede permissão, inscreve o aparelho e salva no servidor', async () => {
    lib.subscribeToPush.mockResolvedValue(SUBSCRIPTION)
    api.savePushSubscription.mockResolvedValue(undefined)
    render(<NotificationsCard />)
    await userEvent.click(await screen.findByRole('button', { name: 'Ativar notificações' }))
    expect(lib.subscribeToPush).toHaveBeenCalledWith('chave')
    await waitFor(() => expect(api.savePushSubscription).toHaveBeenCalledWith(SUBSCRIPTION))
    expect(await screen.findByText('✓ Ativadas neste aparelho')).toBeInTheDocument()
  })

  it('permissão negada: mostra onde liberar e não salva nada', async () => {
    lib.subscribeToPush.mockResolvedValue(null)
    render(<NotificationsCard />)
    await userEvent.click(await screen.findByRole('button', { name: 'Ativar notificações' }))
    expect(await screen.findByText(/Ajustes → Notificações → Hábitos/)).toBeInTheDocument()
    expect(api.savePushSubscription).not.toHaveBeenCalled()
  })

  it('já ativadas: envia teste e permite desativar', async () => {
    lib.getCurrentSubscription.mockResolvedValue({} as PushSubscription)
    api.sendTestPush.mockResolvedValue({ sent: 1 })
    lib.unsubscribeFromPush.mockResolvedValue('https://push.example/abc')
    api.removePushSubscription.mockResolvedValue(undefined)
    render(<NotificationsCard />)

    await userEvent.click(await screen.findByRole('button', { name: 'Enviar teste' }))
    expect(await screen.findByText(/Notificação de teste enviada/)).toBeInTheDocument()

    lib.getCurrentSubscription.mockResolvedValue(null)
    await userEvent.click(screen.getByRole('button', { name: 'Desativar' }))
    await waitFor(() => expect(api.removePushSubscription).toHaveBeenCalledWith('https://push.example/abc'))
    expect(await screen.findByRole('button', { name: 'Ativar notificações' })).toBeInTheDocument()
  })

  it('servidor sem as chaves: avisa', async () => {
    api.getPushStatus.mockResolvedValue({ enabled: false, publicKey: null })
    render(<NotificationsCard />)
    expect(await screen.findByText('As notificações ainda não estão configuradas no servidor.')).toBeInTheDocument()
  })
})
