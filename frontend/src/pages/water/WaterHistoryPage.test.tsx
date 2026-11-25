import { screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as waterService from '@/services/waterService'
import { renderWithProviders } from '@/test/render'
import type { WaterHistory, WaterHistoryDay } from '@/types/water'
import { WaterHistoryPage } from './WaterHistoryPage'

vi.mock('@/services/waterService', () => ({ getWaterHistory: vi.fn() }))
const service = vi.mocked(waterService)

function november(overrides: Partial<WaterHistory> = {}): WaterHistory {
  const days: WaterHistoryDay[] = Array.from({ length: 30 }, (_, index) => {
    const n = index + 1
    const day = `2026-11-${String(n).padStart(2, '0')}`
    if (n < 20 || n > 25) return { day, status: 'none', goalMl: null, totalMl: 0 }
    if (n === 25) return { day, status: 'today', goalMl: 3000, totalMl: 1200 }
    const met = n !== 21
    return { day, status: met ? 'met' : 'missed', goalMl: 3000, totalMl: met ? 3100 : 1500 }
  })
  return {
    month: '2026-11',
    days,
    metDays: 4,
    evaluatedDays: 5,
    percent: 80,
    currentStreak: 3,
    firstDay: '2026-11-20',
    canGoBack: true,
    canGoForward: false,
    ...overrides,
  }
}

describe('WaterHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('mostra a sequência, o percentual do mês e os dias coloridos', async () => {
    service.getWaterHistory.mockResolvedValue(november())
    renderWithProviders(<WaterHistoryPage />, { route: '/agua/historico' })

    expect(await screen.findByText('3 dias')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('4 de 5 dias')).toBeInTheDocument()
    expect(screen.getByText(/novembro de 2026/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20: meta batida' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '21: meta não batida' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '25: hoje, em andamento' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10: sem avaliação' })).toBeInTheDocument()
  })

  it('1 de novembro de 2026 é domingo: sem dias em branco antes', async () => {
    service.getWaterHistory.mockResolvedValue(november())
    renderWithProviders(<WaterHistoryPage />, { route: '/agua/historico' })
    const list = await screen.findByRole('list', { name: /Dias de novembro de 2026/i })
    expect(list.firstElementChild).toHaveTextContent('1')
  })

  it('tocar num dia mostra quanto bebeu e a meta dele', async () => {
    service.getWaterHistory.mockResolvedValue(november())
    const { user } = renderWithProviders(<WaterHistoryPage />, { route: '/agua/historico' })
    await user.click(await screen.findByRole('button', { name: '21: meta não batida' }))
    expect(screen.getByText('1.500 mL de 3.000 mL · meta não batida')).toBeInTheDocument()
  })

  it('navega para o mês anterior pela URL; não avança além do mês atual', async () => {
    service.getWaterHistory.mockResolvedValue(november())
    const { user, router } = renderWithProviders(<WaterHistoryPage />, {
      route: '/agua/historico',
      routes: [{ path: '/agua/historico', element: <WaterHistoryPage /> }],
    })
    expect(await screen.findByRole('button', { name: 'Próximo mês' })).toBeDisabled()

    service.getWaterHistory.mockResolvedValue(november({ month: '2026-10', canGoBack: false, canGoForward: true }))
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() => expect(router.state.location.search).toBe('?mes=2026-10'))
    await waitFor(() => expect(service.getWaterHistory).toHaveBeenLastCalledWith('2026-10'))
  })

  it('sem meta: explica quando o calendário começa', async () => {
    service.getWaterHistory.mockResolvedValue(
      november({
        firstDay: null,
        percent: null,
        metDays: 0,
        evaluatedDays: 0,
        currentStreak: 0,
        days: november().days.map((day) => ({ ...day, status: 'none', goalMl: null })),
      }),
    )
    renderWithProviders(<WaterHistoryPage />, { route: '/agua/historico' })
    expect(await screen.findByText(/começa no dia em que você salvar a primeira meta/)).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('falha ao carregar mostra "Tentar novamente"', async () => {
    service.getWaterHistory
      .mockImplementationOnce(() => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK')))
      .mockResolvedValueOnce(november())
    const { user } = renderWithProviders(<WaterHistoryPage />, { route: '/agua/historico' })
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('3 dias')).toBeInTheDocument()
  })
})
