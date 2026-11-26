import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as tasksService from '@/services/tasksService'
import { renderWithProviders } from '@/test/render'
import type { Task, TaskLists } from '@/types/tasks'
import { TasksPage } from './TasksPage'

vi.mock('@/services/tasksService', () => ({
  getTaskLists: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  completeTask: vi.fn(),
  undoCompleteTask: vi.fn(),
}))
const service = vi.mocked(tasksService)

const TODAY = '2026-11-26'
const task = (overrides: Partial<Task>): Task => ({
  id: 'id',
  title: 'Tarefa',
  date: null,
  time: null,
  done: false,
  ...overrides,
})

function lists(overrides: Partial<TaskLists> = {}): TaskLists {
  return {
    day: TODAY,
    today: [
      task({ id: 'a', title: 'Reunião', date: TODAY, time: '10:00' }),
      task({ id: 'b', title: 'Comprar pão', date: TODAY, time: '18:00' }),
      task({ id: 'c', title: 'Ler um livro' }),
    ],
    upcoming: [task({ id: 'd', title: 'Dentista', date: '2026-11-27', time: '09:00' })],
    overdue: [task({ id: 'e', title: 'Pagar a luz', date: '2026-11-20' })],
    ...overrides,
  }
}

describe('TasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    // 26/11 14:00 em Brasília.
    vi.setSystemTime(new Date('2026-11-26T17:00:00Z'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra Hoje com contagem nas abas e destaca a tarefa com horário vencido', async () => {
    service.getTaskLists.mockResolvedValue(lists())
    renderWithProviders(<TasksPage />, { route: '/tarefas' })

    const panel = await screen.findByRole('tabpanel', { name: 'Hoje' })
    expect(within(panel).getByText('Reunião')).toBeInTheDocument()
    expect(within(panel).getByText('10:00 · passou do horário')).toBeInTheDocument()
    expect(within(panel).getByText('18:00')).toBeInTheDocument()
    const hoje = screen.getByRole('tab', { name: /^Hoje/ })
    expect(hoje).toHaveAttribute('aria-selected', 'true')
    expect(hoje).toHaveTextContent('Hoje3')
    expect(screen.getByRole('tab', { name: /^Atrasadas/ })).toHaveTextContent('Atrasadas1')
  })

  it('troca de aba e mostra a data relativa', async () => {
    service.getTaskLists.mockResolvedValue(lists())
    const { user } = renderWithProviders(<TasksPage />, { route: '/tarefas' })

    await user.click(await screen.findByRole('tab', { name: /Próximas/ }))
    expect(screen.getByText('Amanhã · 09:00')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Atrasadas/ }))
    expect(screen.getByText('Pagar a luz')).toBeInTheDocument()
  })

  it('concluir mostra o aviso com Desfazer', async () => {
    service.getTaskLists.mockResolvedValue(lists())
    const done = lists()
    done.today = [done.today[1], done.today[2], { ...done.today[0], done: true }]
    service.completeTask.mockResolvedValue(done)
    service.undoCompleteTask.mockResolvedValue(lists())
    const { user } = renderWithProviders(<TasksPage />, { route: '/tarefas' })

    await user.click(await screen.findByRole('checkbox', { name: 'Concluir: Reunião' }))
    expect(service.completeTask).toHaveBeenCalledWith('a')
    expect(await screen.findByText('Tarefa concluída')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Desfazer: Reunião' })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('button', { name: 'Desfazer' }))
    await waitFor(() => expect(service.undoCompleteTask).toHaveBeenCalledWith('a'))
  })

  it('cria uma tarefa para amanhã com horário', async () => {
    service.getTaskLists.mockResolvedValue(lists())
    service.createTask.mockResolvedValue(lists())
    const { user } = renderWithProviders(<TasksPage />, { route: '/tarefas' })

    await user.click(await screen.findByRole('button', { name: /Nova tarefa/ }))
    const dialog = screen.getByRole('dialog', { name: 'Nova tarefa' })
    await user.type(within(dialog).getByPlaceholderText(/pagar a conta/), '  Mercado ')
    await user.click(within(dialog).getByRole('button', { name: 'Amanhã' }))
    await user.type(within(dialog).getByLabelText('Horário'), '08:30')
    await user.click(within(dialog).getByRole('button', { name: 'Criar tarefa' }))

    expect(service.createTask).toHaveBeenCalledWith({ title: 'Mercado', date: '2026-11-27', time: '08:30' })
    expect(await screen.findByText('Tarefa criada')).toBeInTheDocument()
  })

  it('título vazio não é enviado', async () => {
    service.getTaskLists.mockResolvedValue(lists())
    const { user } = renderWithProviders(<TasksPage />, { route: '/tarefas' })

    await user.click(await screen.findByRole('button', { name: /Nova tarefa/ }))
    const dialog = screen.getByRole('dialog', { name: 'Nova tarefa' })
    await user.click(within(dialog).getByRole('button', { name: 'Criar tarefa' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Digite o título da tarefa')
    expect(service.createTask).not.toHaveBeenCalled()
  })

  it('editar o título de uma atrasada não manda a data antiga', async () => {
    service.getTaskLists.mockResolvedValue(lists())
    service.updateTask.mockResolvedValue(lists())
    const { user } = renderWithProviders(<TasksPage />, { route: '/tarefas?lista=atrasadas' })

    await user.click(await screen.findByText('Pagar a luz'))
    const dialog = screen.getByRole('dialog', { name: 'Editar tarefa' })
    const title = within(dialog).getByDisplayValue('Pagar a luz')
    await user.clear(title)
    await user.type(title, 'Pagar a conta de luz')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar tarefa' }))

    expect(service.updateTask).toHaveBeenCalledWith('e', { title: 'Pagar a conta de luz' })
  })

  it('excluir pede confirmação', async () => {
    service.getTaskLists.mockResolvedValue(lists())
    service.deleteTask.mockResolvedValue(lists())
    const { user } = renderWithProviders(<TasksPage />, { route: '/tarefas' })

    await user.click(await screen.findByText('Ler um livro'))
    const dialog = screen.getByRole('dialog', { name: 'Editar tarefa' })
    await user.click(within(dialog).getByRole('button', { name: 'Excluir tarefa' }))
    expect(service.deleteTask).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))
    expect(service.deleteTask).toHaveBeenCalledWith('c')
  })

  it('lista vazia e falha ao carregar são diferentes', async () => {
    service.getTaskLists.mockRejectedValueOnce(new Error('rede'))
    const { user } = renderWithProviders(<TasksPage />, { route: '/tarefas' })
    expect(await screen.findByText('Não foi possível carregar as tarefas.')).toBeInTheDocument()

    service.getTaskLists.mockResolvedValue(lists({ today: [] }))
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText(/Nada para hoje/)).toBeInTheDocument()
  })
})
