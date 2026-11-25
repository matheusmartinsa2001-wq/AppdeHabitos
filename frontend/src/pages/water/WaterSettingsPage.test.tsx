import { screen, waitFor, within } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

const service = vi.mocked(waterService)

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

describe('WaterSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('sem meta: o campo já vem com a sugestão de 4.000 mL, mas nada é salvo sozinho', async () => {
    service.getWaterSettings.mockResolvedValue(EMPTY)
    renderWithProviders(<WaterSettingsPage />)
    expect(await screen.findByLabelText('Meta diária em mL')).toHaveValue('4000')
    expect(screen.getByText('Você ainda não tem uma meta. Confira o valor e salve.')).toBeInTheDocument()
    expect(screen.getByText('Salve a meta diária para comparar com os lembretes.')).toBeInTheDocument()
    expect(service.setWaterGoal).not.toHaveBeenCalled()
  })

  it('salva a meta e mostra a confirmação', async () => {
    service.getWaterSettings.mockResolvedValue(EMPTY)
    service.setWaterGoal.mockResolvedValue({ ...EMPTY, goalMl: 4000, remindersShortfallMl: 4000 })
    const { user } = renderWithProviders(<WaterSettingsPage />)
    await user.click(await screen.findByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(service.setWaterGoal).toHaveBeenCalledWith(4000))
    expect(await screen.findByText('Meta salva.')).toBeInTheDocument()
  })

  it('meta fora dos limites não vai ao servidor', async () => {
    service.getWaterSettings.mockResolvedValue(EMPTY)
    const { user } = renderWithProviders(<WaterSettingsPage />)
    const input = await screen.findByLabelText('Meta diária em mL')
    await user.clear(input)
    await user.type(input, '200')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Use no mínimo 500 mL')).toBeInTheDocument()
    expect(service.setWaterGoal).not.toHaveBeenCalled()
  })

  it('lembretes abaixo da meta: mostra a soma e o aviso de quanto falta', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    renderWithProviders(<WaterSettingsPage />)
    expect(await screen.findByText('08:00')).toBeInTheDocument()
    expect(screen.getByText('10:30')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Seguindo só os lembretes, você não bate a meta: faltam 500 mL.',
    )
  })

  it('lembretes que chegam à meta: sem aviso', async () => {
    service.getWaterSettings.mockResolvedValue({ ...WITH_REMINDERS, remindersShortfallMl: 0 })
    renderWithProviders(<WaterSettingsPage />)
    expect(await screen.findByText('Seguindo os lembretes, você bate a meta.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('adiciona um lembrete e recarrega a soma', async () => {
    service.getWaterSettings.mockResolvedValueOnce(WITH_REMINDERS).mockResolvedValueOnce({
      ...WITH_REMINDERS,
      reminders: [...WITH_REMINDERS.reminders, { id: 'r3', time: '15:00', amountMl: 500 }],
      remindersTotalMl: 3000,
      remindersShortfallMl: 0,
    })
    service.createWaterReminder.mockResolvedValue({ id: 'r3', time: '15:00', amountMl: 500 })
    const { user } = renderWithProviders(<WaterSettingsPage />)

    await user.type(await screen.findByLabelText('Horário'), '15:00')
    await user.type(screen.getByLabelText('Quantidade em mL'), '500')
    await user.click(screen.getByRole('button', { name: '+ Adicionar' }))

    await waitFor(() => expect(service.createWaterReminder).toHaveBeenCalledWith({ time: '15:00', amountMl: 500 }))
    expect(await screen.findByText('15:00')).toBeInTheDocument()
    expect(screen.getByText('Seguindo os lembretes, você bate a meta.')).toBeInTheDocument()
  })

  it('horário repetido mostra a mensagem do servidor', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    service.createWaterReminder.mockImplementation(() => Promise.reject(conflict('Já existe um lembrete às 08:00')))
    const { user } = renderWithProviders(<WaterSettingsPage />)

    await user.type(await screen.findByLabelText('Horário'), '08:00')
    await user.type(screen.getByLabelText('Quantidade em mL'), '300')
    await user.click(screen.getByRole('button', { name: '+ Adicionar' }))

    expect(await screen.findByText('Já existe um lembrete às 08:00')).toBeInTheDocument()
  })

  it('lembrete sem horário ou com mL fora dos limites não vai ao servidor', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    const { user } = renderWithProviders(<WaterSettingsPage />)
    await user.type(await screen.findByLabelText('Quantidade em mL'), '3000')
    await user.click(screen.getByRole('button', { name: '+ Adicionar' }))
    expect(await screen.findByText('Escolha o horário')).toBeInTheDocument()
    expect(screen.getByText('Use no máximo 2.000 mL')).toBeInTheDocument()
    expect(service.createWaterReminder).not.toHaveBeenCalled()
  })

  it('edita os mL de um lembrete', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    service.updateWaterReminder.mockResolvedValue({ id: 'r1', time: '08:00', amountMl: 700 })
    const { user } = renderWithProviders(<WaterSettingsPage />)

    await user.click(await screen.findByRole('button', { name: 'Editar 08:00 · 1.000 mL' }))
    const amount = screen.getByDisplayValue('1000')
    await user.clear(amount)
    await user.type(amount, '700')
    await user.click(screen.getAllByRole('button', { name: 'Salvar' }).at(-1)!)

    await waitFor(() => expect(service.updateWaterReminder).toHaveBeenCalledWith('r1', { time: '08:00', amountMl: 700 }))
  })

  it('excluir pede confirmação antes', async () => {
    service.getWaterSettings.mockResolvedValue(WITH_REMINDERS)
    service.deleteWaterReminder.mockResolvedValue(undefined)
    const { user } = renderWithProviders(<WaterSettingsPage />)

    await user.click(await screen.findByRole('button', { name: 'Excluir 10:30 · 1.500 mL' }))
    expect(service.deleteWaterReminder).not.toHaveBeenCalled()
    const row = screen.getByText('Excluir?').closest('li')!
    await user.click(within(row).getByRole('button', { name: 'Sim' }))
    await waitFor(() => expect(service.deleteWaterReminder).toHaveBeenCalledWith('r2'))
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
