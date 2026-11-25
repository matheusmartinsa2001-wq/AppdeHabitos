import { screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

const service = vi.mocked(waterService)

// 25/11/2026 13:35 em Brasília.
const NOW = new Date('2026-11-25T16:35:00Z')

const BASE: WaterToday = {
  day: '2026-11-25',
  goalMl: 4000,
  totalMl: 1800,
  remainingMl: 2200,
  goalReached: false,
  remindersShortfallMl: 500,
  reminders: [
    { id: 'r8', time: '08:00', amountMl: 500, intakeId: 'i8' },
    { id: 'r14', time: '14:00', amountMl: 500, intakeId: null },
    { id: 'r16', time: '16:00', amountMl: 500, intakeId: null },
  ],
  intakes: [
    { id: 'i11', time: '11:10', amountMl: 300, source: 'MANUAL', reminderTime: null },
    { id: 'i8', time: '08:04', amountMl: 500, source: 'REMINDER', reminderTime: '08:00' },
  ],
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

describe('WaterTodayPage (design "Módulo Água")', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra a data, o total, a meta e quanto falta', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    renderWithProviders(<WaterTodayPage />)
    expect(await screen.findByText('Faltam 2.200 mL')).toBeInTheDocument()
    expect(screen.getByText(/quarta-feira, 25 de novembro/i)).toBeInTheDocument()
    expect(screen.getByText('1.800')).toBeInTheDocument()
    expect(screen.getByText('de 4.000 mL')).toBeInTheDocument()
  })

  it('"Tomei" do lembrete da vez em destaque, com quanto falta para ele', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    renderWithProviders(<WaterTodayPage />)
    expect(await screen.findByText('Próximo lembrete')).toBeInTheDocument()
    expect(screen.getByText('em 25 min')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Tomei 14:00 · 500 mL' })).toHaveLength(2)
  })

  it('tocar em Tomei registra o lembrete e mostra o aviso com Desfazer', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    service.confirmWaterReminder.mockResolvedValue({
      ...BASE,
      totalMl: 2300,
      remainingMl: 1700,
      reminders: [BASE.reminders[0], { ...BASE.reminders[1], intakeId: 'i14' }, BASE.reminders[2]],
      intakes: [{ id: 'i14', time: '13:35', amountMl: 500, source: 'REMINDER', reminderTime: '14:00' }, ...BASE.intakes],
    })
    service.deleteWaterIntake.mockResolvedValue(BASE)
    const { user } = renderWithProviders(<WaterTodayPage />)

    await user.click((await screen.findAllByRole('button', { name: 'Tomei 14:00 · 500 mL' }))[0])
    expect(service.confirmWaterReminder).toHaveBeenCalledWith('r14')
    expect(await screen.findByText('+500 mL · lembrete das 14:00')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Desfazer' }))
    await waitFor(() => expect(service.deleteWaterIntake).toHaveBeenCalledWith('i14'))
    expect(await screen.findByText('Registro desfeito')).toBeInTheDocument()
  })

  it('botão rápido +300 registra 300 mL', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    service.addWaterIntake.mockResolvedValue({
      ...BASE,
      totalMl: 2100,
      intakes: [{ id: 'i13', time: '13:35', amountMl: 300, source: 'MANUAL', reminderTime: null }, ...BASE.intakes],
    })
    const { user } = renderWithProviders(<WaterTodayPage />)
    await user.click(await screen.findByRole('button', { name: 'Registrar 300 mL' }))
    expect(service.addWaterIntake).toHaveBeenCalledWith(300)
    expect(await screen.findByText('+300 mL registrados')).toBeInTheDocument()
  })

  it('"Outro" abre o campo; valor fora dos limites não vai ao servidor', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    service.addWaterIntake.mockResolvedValue(BASE)
    const { user } = renderWithProviders(<WaterTodayPage />)
    await user.click(await screen.findByRole('button', { name: 'Outro' }))
    const input = screen.getByLabelText('Outra quantidade em mL')
    await user.type(input, '20')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Use no mínimo 50 mL')
    expect(service.addWaterIntake).not.toHaveBeenCalled()

    await user.clear(input)
    await user.type(input, '250{Enter}')
    await waitFor(() => expect(service.addWaterIntake).toHaveBeenCalledWith(250))
  })

  it('"Seu dia": lembretes e registros numa linha só; tocar num registro mostra Desfazer', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    service.deleteWaterIntake.mockResolvedValue({ ...BASE, totalMl: 1500, intakes: [BASE.intakes[1]] })
    const { user } = renderWithProviders(<WaterTodayPage />)
    expect(await screen.findByText('1 de 3 lembretes')).toBeInTheDocument()
    expect(screen.getByText('Lembrete · tomado às 08:04')).toBeInTheDocument()
    expect(screen.getByText('agora')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '11:10 · 300 mL, Registro livre' }))
    expect(screen.getByText('Tira 300 mL do total de hoje.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desfazer' }))
    await waitFor(() => expect(service.deleteWaterIntake).toHaveBeenCalledWith('i11'))
  })

  it('lembretes abaixo da meta: aviso discreto com "Ajustar"', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    renderWithProviders(<WaterTodayPage />)
    expect(
      await screen.findByText('Seus lembretes somam 1.500 mL. Só com eles, faltam 500 mL para a meta.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajustar' })).toBeInTheDocument()
  })

  it('meta batida', async () => {
    service.getWaterToday.mockResolvedValue({ ...BASE, totalMl: 4100, remainingMl: 0, goalReached: true })
    renderWithProviders(<WaterTodayPage />)
    expect(await screen.findByText('✓ Meta batida!')).toBeInTheDocument()
  })

  it('todos os lembretes tomados', async () => {
    service.getWaterToday.mockResolvedValue({
      ...BASE,
      reminders: BASE.reminders.map((r, i) => ({ ...r, intakeId: `x${i}` })),
    })
    renderWithProviders(<WaterTodayPage />)
    expect(await screen.findByText('Todos os lembretes de hoje foram tomados.')).toBeInTheDocument()
  })

  it('primeiro uso: sem meta e sem lembretes', async () => {
    service.getWaterToday.mockResolvedValue({
      ...BASE,
      goalMl: null,
      totalMl: 0,
      remainingMl: null,
      goalReached: null,
      remindersShortfallMl: null,
      reminders: [],
      intakes: [],
    })
    renderWithProviders(<WaterTodayPage />)
    expect(await screen.findByRole('button', { name: 'Definir meta diária' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar lembretes' })).toBeInTheDocument()
    expect(screen.getByText('Nada registrado ainda.')).toBeInTheDocument()
  })

  it('erro do servidor numa ação aparece no aviso', async () => {
    service.getWaterToday.mockResolvedValue(BASE)
    service.confirmWaterReminder.mockImplementation(() =>
      Promise.reject(apiError(409, 'O lembrete das 14:00 já foi marcado hoje')),
    )
    const { user } = renderWithProviders(<WaterTodayPage />)
    await user.click((await screen.findAllByRole('button', { name: 'Tomei 14:00 · 500 mL' }))[0])
    expect(await screen.findByText('O lembrete das 14:00 já foi marcado hoje')).toBeInTheDocument()
  })

  it('falha ao carregar mostra "Tentar novamente"', async () => {
    service.getWaterToday
      .mockImplementationOnce(() => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK')))
      .mockResolvedValueOnce(BASE)
    const { user } = renderWithProviders(<WaterTodayPage />)
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Faltam 2.200 mL')).toBeInTheDocument()
  })
})
