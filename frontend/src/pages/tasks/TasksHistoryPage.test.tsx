import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as tasksService from '@/services/tasksService'
import { renderWithProviders } from '@/test/render'
import type { TaskHistoryDay, TasksHistory } from '@/types/tasks'
import { TasksHistoryPage } from './TasksHistoryPage'

vi.mock('@/services/tasksService', () => ({ getTasksHistory: vi.fn() }))
const service = vi.mocked(tasksService)

function november(overrides: Partial<TasksHistory> = {}): TasksHistory {
  const days: TaskHistoryDay[] = Array.from({ length: 30 }, (_, index) => {
    const n = index + 1
    const day = `2026-11-${String(n).padStart(2, '0')}`
    if (n < 23 || n > 26) return { day, status: 'none', completed: 0, planned: [] }
    if (n === 26)
      return { day, status: 'today', completed: 1, planned: [{ id: 'r', title: 'Academia', done: true }] }
    if (n === 24) return { day, status: 'empty', completed: 0, planned: [] }
    if (n === 25)
      return {
        day,
        status: 'missed',
        completed: 1,
        planned: [
          { id: 'r', title: 'Academia', done: true },
          { id: 'a', title: 'Banco', done: false },
        ],
      }
    return { day, status: 'met', completed: 2, planned: [{ id: 'r', title: 'Academia', done: true }] }
  })
  return {
    month: '2026-11',
    days,
    metDays: 1,
    evaluatedDays: 2,
    percent: 50,
    currentStreak: 1,
    firstDay: '2026-11-23',
    canGoBack: false,
    canGoForward: false,
    ...overrides,
  }
}

describe('TasksHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-26T16:00:00Z'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sequência, % do mês e o dia de hoje selecionado', async () => {
    service.getTasksHistory.mockResolvedValue(november())
    renderWithProviders(<TasksHistoryPage />, { route: '/tarefas/historico' })

    expect(await screen.findByText('50%')).toBeInTheDocument()
    expect(screen.getByText('1 de 2 dias')).toBeInTheDocument()
    expect(screen.getByText('contando hoje')).toBeInTheDocument()
    expect(screen.getByText('Hoje · em andamento')).toBeInTheDocument()
  })

  it('tocar num dia mostra o que era dele, feito ou não', async () => {
    service.getTasksHistory.mockResolvedValue(november())
    const { user } = renderWithProviders(<TasksHistoryPage />, { route: '/tarefas/historico' })

    await user.click(await screen.findByRole('button', { name: '25: faltou tarefa, 1 tarefa concluída' }))
    expect(screen.getByText('Faltou 1')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Tarefas do dia' })
    expect(within(list).getByText(/Banco/)).toHaveTextContent('Banco (não feita)')
    expect(within(list).getByText(/Academia/)).toHaveTextContent('Academia (feita)')

    await user.click(screen.getByRole('button', { name: '24: sem tarefa no dia' }))
    expect(screen.getByText('Nada para o dia')).toBeInTheDocument()
  })

  it('sem tarefas ainda: explica quando o calendário começa', async () => {
    service.getTasksHistory.mockResolvedValue(november({ firstDay: null }))
    renderWithProviders(<TasksHistoryPage />, { route: '/tarefas/historico' })
    expect(await screen.findByText(/primeira tarefa/)).toBeInTheDocument()
  })

  it('falha ao carregar mostra "Tentar novamente"', async () => {
    service.getTasksHistory.mockRejectedValue(new Error('rede'))
    renderWithProviders(<TasksHistoryPage />, { route: '/tarefas/historico' })
    expect(await screen.findByText('Não foi possível carregar o histórico.')).toBeInTheDocument()
  })
})
