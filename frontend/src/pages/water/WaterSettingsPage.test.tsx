import { screen, waitFor, within } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/contexts/AuthContext'
import * as waterService from '@/services/waterService'
import { renderWithProviders } from '@/test/render'
import type { WaterSettings } from '@/types/water'
import { WaterSettingsPage } from './WaterSettingsPage'

vi.mock('@/services/waterService', () => ({
  getWaterSettings: vi.fn(),
  setWaterGoal: vi.fn(),
  createWaterReminder: vi.fn(),
  updateWaterReminder: vi.fn(),
  deleteWaterReminder: vi.fn(),
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
// O card de notificações tem testes próprios.
vi.mock('./NotificationsCard', () => ({ NotificationsCard: () => <p>notificações</p> }))

const service = vi.mocked(waterService)
const logout = vi.fn()

const EMPTY: WaterSettings = {
  goalMl: null,
  goalEffectiveFrom: null,
  reminders: [],
  remindersTotalMl: 0,
  remindersShortfallMl: null,
}

const WITH_REMINDERS: WaterSettings = {
  goalMl: 3000,
  goalEffectiveFrom: '2026-11-25',
  reminders: [
    { id: 'r1', time: '08:00', amountMl: 1000 },
    { id: 'r2', time: '10:30', amountMl: 1500 },
  ],
  remindersTotalMl: 2500,
  remindersShortfallMl: 500,
}

function conflict(message: string) {
  return new AxiosError('409', 'ERR', undefined, undefined, {
    status: 409,
    data: { message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

describe('WaterSettingsPage (Ajustes)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      sessionExpired: false,
      login: vi.fn(),
      logout,
      retry: vi.fn(),
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('sem meta: sugestão de 4.000 mL, "Salvar meta" visível e nada salvo sozinho', async () => {
    service.getWaterSettings.mockResolvedValue(EMPTY)
    renderWithProviders(<WaterSettingsPage />)
    expect(await screen.findByLabelText('Meta diária em mL')).toHaveValue('4.000')
    expect(screen.getByText('Sugestão inicial. Nada é gravado até você salvar.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar meta' })).toBeInTheDocument()
    expect(service.setWaterGoal).not.toHaveBeenCalled()
  })

  it('com meta: − / + de 250 mL; "Salvar meta" só aparece quando muda; Cancelar volta', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    service.setWaterGoal.mockResolvedValue({ ...WITH_REMINDERS, goalMl: 3250 })
    const { user } = renderWithProviders(<WaterSettingsPage />)
    expect(await screen.findByLabelText('Meta diária em mL')).toHaveValue('3.000')
    expect(screen.queryByRole('button', { name: 'Salvar meta' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Aumentar 250 mL' }))
    expect(screen.getByLabelText('Meta diária em mL')).toHaveValue('3.250')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByLabelText('Meta diária em mL')).toHaveValue('3.000')

    await user.click(screen.getByRole('button', { name: 'Aumentar 250 mL' }))
    await user.click(screen.getByRole('button', { name: 'Salvar meta' }))
    await waitFor(() => expect(service.setWaterGoal).toHaveBeenCalledWith(3250))
  })

  it('meta fora dos limites não vai ao servidor', async () => {
    service.getWaterSettings.mockResolvedValue(EMPTY)
    const { user } = renderWithProviders(<WaterSettingsPage />)
    const input = await screen.findByLabelText('Meta diária em mL')
    await user.clear(input)
    await user.type(input, '200')
    await user.click(screen.getByRole('button', { name: 'Salvar meta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Use no mínimo 500 mL')
    expect(service.setWaterGoal).not.toHaveBeenCalled()
  })

  it('soma dos lembretes × meta com o aviso de quanto falta', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    renderWithProviders(<WaterSettingsPage />)
    expect(await screen.findByText('Só com os lembretes, faltam 500 mL para a meta.')).toBeInTheDocument()
  })

  it('lembretes que chegam à meta', async () => {
    service.getWaterSettings.mockResolvedValue({ ...WITH_REMINDERS, remindersShortfallMl: 0 })
    renderWithProviders(<WaterSettingsPage />)
    expect(await screen.findByText('Seguindo os lembretes, você bate a meta.')).toBeInTheDocument()
  })

  it('"+ Adicionar lembrete" abre o painel; salva e recarrega', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    service.createWaterReminder.mockResolvedValue({ id: 'r3', time: '15:00', amountMl: 500 })
    const { user } = renderWithProviders(<WaterSettingsPage />)
    await user.click(await screen.findByRole('button', { name: '+ Adicionar lembrete' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo lembrete' })
    await user.type(within(dialog).getByLabelText('Horário'), '15:00')
    await user.type(within(dialog).getByLabelText('Quantidade em mL'), '500')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar lembrete' }))
    await waitFor(() => expect(service.createWaterReminder).toHaveBeenCalledWith({ time: '15:00', amountMl: 500 }))
    expect(await screen.findByText('Lembrete das 15:00 salvo')).toBeInTheDocument()
  })

  it('painel recusa horário repetido e mL fora dos limites antes de ir ao servidor', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    const { user } = renderWithProviders(<WaterSettingsPage />)
    await user.click(await screen.findByRole('button', { name: '+ Adicionar lembrete' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo lembrete' })
    await user.click(within(dialog).getByRole('button', { name: 'Salvar lembrete' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Escolha o horário')

    await user.type(within(dialog).getByLabelText('Horário'), '08:00')
    await user.type(within(dialog).getByLabelText('Quantidade em mL'), '3000')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar lembrete' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Use no máximo 2.000 mL')

    await user.clear(within(dialog).getByLabelText('Quantidade em mL'))
    await user.type(within(dialog).getByLabelText('Quantidade em mL'), '300')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar lembrete' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Já existe um lembrete às 08:00.')
    expect(service.createWaterReminder).not.toHaveBeenCalled()
  })

  it('erro do servidor aparece no painel', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    service.createWaterReminder.mockImplementation(() => Promise.reject(conflict('Já existe um lembrete às 09:00')))
    const { user } = renderWithProviders(<WaterSettingsPage />)
    await user.click(await screen.findByRole('button', { name: '+ Adicionar lembrete' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo lembrete' })
    await user.type(within(dialog).getByLabelText('Horário'), '09:00')
    await user.type(within(dialog).getByLabelText('Quantidade em mL'), '300')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar lembrete' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Já existe um lembrete às 09:00')
  })

  it('tocar num lembrete abre a edição; excluir pede confirmação', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    service.updateWaterReminder.mockResolvedValue({ id: 'r1', time: '08:00', amountMl: 700 })
    service.deleteWaterReminder.mockResolvedValue(undefined)
    const { user } = renderWithProviders(<WaterSettingsPage />)

    await user.click(await screen.findByRole('button', { name: 'Editar 08:00 · 1.000 mL' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar lembrete' })
    const amount = within(dialog).getByLabelText('Quantidade em mL')
    expect(amount).toHaveValue('1000')
    await user.clear(amount)
    await user.type(amount, '700')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar lembrete' }))
    await waitFor(() => expect(service.updateWaterReminder).toHaveBeenCalledWith('r1', { time: '08:00', amountMl: 700 }))

    await user.click(screen.getByRole('button', { name: 'Editar 10:30 · 1.500 mL' }))
    const editDialog = screen.getByRole('dialog', { name: 'Editar lembrete' })
    await user.click(within(editDialog).getByRole('button', { name: 'Excluir lembrete' }))
    expect(service.deleteWaterReminder).not.toHaveBeenCalled()
    expect(within(editDialog).getByText('Excluir o lembrete das 10:30?')).toBeInTheDocument()
    await user.click(within(editDialog).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(service.deleteWaterReminder).toHaveBeenCalledWith('r2'))
    expect(await screen.findByText('Lembrete das 10:30 excluído')).toBeInTheDocument()
  })

  it('"Sair deste aparelho" encerra a sessão', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    logout.mockResolvedValue(undefined)
    const { user } = renderWithProviders(<WaterSettingsPage />)
    await user.click(await screen.findByRole('button', { name: 'Sair deste aparelho' }))
    expect(logout).toHaveBeenCalled()
  })

  it('falha ao carregar mostra "Tentar novamente"', async () => {
    service.getWaterSettings
      .mockImplementationOnce(() => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK')))
      .mockResolvedValueOnce(EMPTY)
    const { user } = renderWithProviders(<WaterSettingsPage />)
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByLabelText('Meta diária em mL')).toBeInTheDocument()
  })
})
