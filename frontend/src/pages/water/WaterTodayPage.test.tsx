import { screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/contexts/AuthContext'
import * as waterService from '@/services/waterService'
import { renderWithProviders } from '@/test/render'
import type { WaterToday } from '@/types/water'
import { WaterTodayPage } from './WaterTodayPage'

vi.mock('@/services/waterService', () => ({
  getWaterToday: vi.fn(),
  confirmWaterReminder: vi.fn(),
  addWaterIntake: vi.fn(),
  deleteWaterIntake: vi.fn(),
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const service = vi.mocked(waterService)
const logout = vi.fn()

const BASE: WaterToday = {
  day: '2026-11-25',
  goalMl: 3000,
  totalMl: 1000,
  remainingMl: 2000,
  goalReached: false,
  remindersShortfallMl: 0,
  reminders: [
    { id: 'r1', time: '08:00', amountMl: 1000, intakeId: 'i1' },
    { id: 'r2', time: '10:30', amountMl: 1500, intakeId: null },
  ],
  intakes: [{ id: 'i1', time: '08:05', amountMl: 1000, source: 'REMINDER', reminderTime: '08:00' }],
}

function apiError(status: number, message: string) {
  return new AxiosError(String(status), 'ERR', undefined, undefined, {
    status,
    data: { message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

describe('WaterTodayPage', () => {
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

  it('mostra o total, a meta, quanto falta e a data de hoje', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    renderWithProviders(<WaterTodayPage />)
    expect(await screen.findByText('Faltam 2.000 mL')).toBeInTheDocument()
    expect(screen.getByText(/quarta-feira, 25 de novembro/i)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
    expect(screen.getByText('1 de 2')).toBeInTheDocument()
  })

  it('"Tomei" confirma o lembrete e atualiza a tela', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    service.confirmWaterReminder.mockResolvedValue({
      ...BASE,
      totalMl: 2500,
      remainingMl: 500,
      reminders: [BASE.reminders[0], { ...BASE.reminders[1], intakeId: 'i2' }],
    })
    const { user } = renderWithProviders(<WaterTodayPage />)
    await user.click(await screen.findByRole('button', { name: 'Tomei 10:30 · 1.500 mL' }))
    expect(service.confirmWaterReminder).toHaveBeenCalledWith('r2')
    expect(await screen.findByText('Faltam 500 mL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desfazer 10:30 · 1.500 mL' })).toBeInTheDocument()
  })

  it('botão rápido +300 registra 300 mL', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    service.addWaterIntake.mockResolvedValue({ ...BASE, totalMl: 1300, remainingMl: 1700 })
    const { user } = renderWithProviders(<WaterTodayPage />)
    await user.click(await screen.findByRole('button', { name: '+300' }))
    expect(service.addWaterIntake).toHaveBeenCalledWith(300)
    expect(await screen.findByText('Faltam 1.700 mL')).toBeInTheDocument()
  })

  it('"Outro valor" registra o que foi digitado e limpa o campo', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    service.addWaterIntake.mockResolvedValue({ ...BASE, totalMl: 1250, remainingMl: 1750 })
    const { user } = renderWithProviders(<WaterTodayPage />)
    const input = await screen.findByLabelText('Outro valor')
    await user.type(input, '250')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    await waitFor(() => expect(service.addWaterIntake).toHaveBeenCalledWith(250))
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('"Outro valor" fora dos limites não vai ao servidor', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    const { user } = renderWithProviders(<WaterTodayPage />)
    await user.type(await screen.findByLabelText('Outro valor'), '20')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(await screen.findByText('Use no mínimo 50 mL')).toBeInTheDocument()
    expect(service.addWaterIntake).not.toHaveBeenCalled()
  })

  it('desfaz um registro de hoje', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    service.deleteWaterIntake.mockResolvedValue({ ...BASE, totalMl: 0, remainingMl: 3000, intakes: [] })
    const { user } = renderWithProviders(<WaterTodayPage />)
    await user.click(await screen.findByRole('button', { name: 'Desfazer registro das 08:05 de 1.000 mL' }))
    expect(service.deleteWaterIntake).toHaveBeenCalledWith('i1')
    expect(await screen.findByText('Nada registrado ainda.')).toBeInTheDocument()
  })

  it('meta batida', async () => {
    service.getWaterToday.mockResolvedValue({ ...BASE, totalMl: 3200, remainingMl: 0, goalReached: true })
    renderWithProviders(<WaterTodayPage />)
    expect(await screen.findByText('Meta batida! 🎉')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('sem meta: convida a definir', async () => {
    service.getWaterToday.mockResolvedValue({
      ...BASE,
      goalMl: null,
      remainingMl: null,
      goalReached: null,
      remindersShortfallMl: null,
    })
    renderWithProviders(<WaterTodayPage />)
    expect(await screen.findByRole('link', { name: 'Definir meta' })).toHaveAttribute('href', '/agua/configuracao')
  })

  it('lembretes abaixo da meta: mostra o aviso também aqui', async () => {
    service.getWaterToday.mockResolvedValue({ ...BASE, remindersShortfallMl: 500 })
    renderWithProviders(<WaterTodayPage />)
    expect(
      await screen.findByText('⚠ Seus lembretes somam menos que a meta: seguindo só eles, faltam 500 mL.'),
    ).toBeInTheDocument()
  })

  it('erro do servidor numa ação aparece na tela', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    service.confirmWaterReminder.mockImplementation(() =>
      Promise.reject(apiError(409, 'O lembrete das 10:30 já foi marcado hoje')),
    )
    const { user } = renderWithProviders(<WaterTodayPage />)
    await user.click(await screen.findByRole('button', { name: 'Tomei 10:30 · 1.500 mL' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('O lembrete das 10:30 já foi marcado hoje')
  })

  it('falha ao carregar mostra "Tentar novamente"', async () => {
    service.getWaterToday
      .mockImplementationOnce(() => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK')))
      .mockResolvedValueOnce(BASE)
    const { user } = renderWithProviders(<WaterTodayPage />)
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Faltam 2.000 mL')).toBeInTheDocument()
  })

  it('"Sair" encerra a sessão', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    logout.mockResolvedValue(undefined)
    const { user } = renderWithProviders(<WaterTodayPage />)
    await user.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(logout).toHaveBeenCalled()
  })
})
