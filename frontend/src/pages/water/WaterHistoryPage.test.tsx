import { screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as waterService from '@/services/waterService'
import { renderWithProviders } from '@/test/render'
import type { WaterHistory, WaterHistoryDay } from '@/types/water'
import { WaterHistoryPage } from './WaterHistoryPage'

vi.mock('@/services/waterService', () => ({ getWaterHistory: vi.fn() }))
const service = vi.mocked(waterService)

function november(overrides: Partial<WaterHistory> = {}, todayTotal = 1200): WaterHistory {
  const days: WaterHistoryDay[] = Array.from({ length: 30 }, (_, index) => {
    const n = index + 1
    const day = `2026-11-${String(n).padStart(2, '0')}`
    if (n < 20 || n > 25) return { day, status: 'none', goalMl: null, totalMl: 0 }
    if (n === 25) return { day, status: 'today', goalMl: 3000, totalMl: todayTotal }
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

describe('WaterHistoryPage (design "Módulo Água")', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-25T16:00:00Z'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sequência e % do mês em números grandes; a sequência diz se já conta hoje', async () => {
    service.getWaterHistory.mockResolvedValue(november())
    renderWithProviders(<WaterHistoryPage />, { route: '/agua/historico' })
    expect(await screen.findByText('Desde 20 de novembro')).toBeInTheDocument()
    expect(screen.getByText('Sequência').parentElement).toHaveTextContent('Sequência3diasaté ontem')
    expect(screen.getByText('até ontem')).toBeInTheDocument()
    expect(screen.getByText('Em novembro')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('4 de 5 dias')).toBeInTheDocument()
  })

  it('meta de hoje já batida: "contando hoje"', async () => {
    service.getWaterHistory.mockResolvedValue(november({ currentStreak: 4 }, 3200))
    renderWithProviders(<WaterHistoryPage />, { route: '/agua/historico' })
    expect(await screen.findByText('contando hoje')).toBeInTheDocument()
  })

  it('cada dia com a situação; dias futuros não abrem', async () => {
    service.getWaterHistory.mockResolvedValue(november())
    renderWithProviders(<WaterHistoryPage />, { route: '/agua/historico' })
    expect(await screen.findByRole('button', { name: '20: meta batida' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '21: meta não batida' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '25: hoje, em andamento' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '28: sem avaliação' })).toBeDisabled()
  })

  it('abre com hoje selecionado; tocar num dia mostra o total, a meta e quanto faltou', async () => {
    service.getWaterHistory.mockResolvedValue(november())
    const { user } = renderWithProviders(<WaterHistoryPage />, { route: '/agua/historico' })
    expect(await screen.findByText('Hoje · em andamento')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '21: meta não batida' }))
    expect(screen.getByText(/sábado, 21 de novembro/i)).toBeInTheDocument()
    expect(screen.getByText('Faltaram 1.500 mL')).toBeInTheDocument()
    expect(screen.getByText('1.500 mL')).toBeInTheDocument()
    expect(screen.getByText('de 3.000 mL')).toBeInTheDocument()
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
    expect(await screen.findByText('O calendário começa no dia em que você salvar a primeira meta.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Definir meta' })).toBeInTheDocument()
  })

  it('falha ao carregar mostra "Tentar novamente"', async () => {
    service.getWaterHistory
      .mockImplementationOnce(() => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK')))
      .mockResolvedValueOnce(november())
    const { user } = renderWithProviders(<WaterHistoryPage />, { route: '/agua/historico' })
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('80%')).toBeInTheDocument()
  })
})
