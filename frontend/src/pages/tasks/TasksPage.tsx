import { useCallback, useEffect, useState } from 'react'
import { ScreenMessage } from '@/components/layout/ScreenMessage'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useUrlParam } from '@/hooks/useUrlParam'
import * as tasksService from '@/services/tasksService'
import type { Task, TaskInput, TaskLists } from '@/types/tasks'
import { brasiliaMinuteOfDay, timeToMinute } from '@/utils/clock'
import { extractErrorMessage } from '@/utils/errors'
import { formatDayLong } from '@/utils/format'
import { formatTaskDate } from './taskDates'
import { TaskSheet } from './TaskSheet'

type ListKey = 'hoje' | 'proximas' | 'atrasadas'

const LISTS: { key: ListKey; label: string; field: keyof Omit<TaskLists, 'day'>; empty: string }[] = [
  { key: 'hoje', label: 'Hoje', field: 'today', empty: 'Nada para hoje. Toque em “Nova tarefa” para criar.' },
  { key: 'proximas', label: 'Próximas', field: 'upcoming', empty: 'Nenhuma tarefa com data futura.' },
  { key: 'atrasadas', label: 'Atrasadas', field: 'overdue', empty: 'Nenhuma tarefa atrasada.' },
]

/** Tela principal do módulo Tarefas: abas Hoje, Próximas e Atrasadas, criar, editar e concluir. */
export function TasksPage() {
  const { showToast } = useToast()
  const [lists, setLists] = useState<TaskLists | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [tab, setTab] = useUrlParam('lista', 'hoje')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [nowMinute, setNowMinute] = useState(() => brasiliaMinuteOfDay())
  const [sheet, setSheet] = useState<{ open: boolean; task: Task | null; key: number }>({
    open: false,
    task: null,
    key: 0,
  })

  const load = useCallback(
    () =>
      tasksService
        .getTaskLists()
        .then((data) => {
          setLists(data)
          setLoadFailed(false)
        })
        .catch((error: unknown) => {
          console.error(error)
          setLoadFailed(true)
        }),
    [],
  )

  useEffect(() => {
    void load()
    // Ao voltar para o app (ex.: no dia seguinte), recarrega as listas.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setNowMinute(brasiliaMinuteOfDay())
        void load()
      }
    }
    const timer = setInterval(() => setNowMinute(brasiliaMinuteOfDay()), 30_000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const openSheet = (task: Task | null) => setSheet((current) => ({ open: true, task, key: current.key + 1 }))
  const closeSheet = () => setSheet((current) => ({ ...current, open: false }))

  const saveTask = async (input: Partial<TaskInput>) => {
    const editing = sheet.task
    setLists(
      editing
        ? await tasksService.updateTask(editing.id, input)
        : await tasksService.createTask(input as TaskInput),
    )
    closeSheet()
    showToast(editing ? 'Tarefa salva' : 'Tarefa criada')
  }

  const deleteTask = async () => {
    if (!sheet.task) return
    setLists(await tasksService.deleteTask(sheet.task.id))
    closeSheet()
    showToast('Tarefa excluída')
  }

  const undo = (task: Task) => {
    setBusyId(task.id)
    tasksService
      .undoCompleteTask(task.id)
      .then(setLists)
      .catch((error: unknown) => showToast(extractErrorMessage(error)))
      .finally(() => setBusyId(null))
  }

  const toggle = (task: Task) => {
    if (task.done) {
      undo(task)
      return
    }
    setBusyId(task.id)
    tasksService
      .completeTask(task.id)
      .then((data) => {
        setLists(data)
        showToast('Tarefa concluída', { onUndo: () => undo(task) })
      })
      .catch((error: unknown) => showToast(extractErrorMessage(error)))
      .finally(() => setBusyId(null))
  }

  if (!lists) {
    return loadFailed ? (
      <ScreenMessage>
        <p className="text-destructive">Não foi possível carregar as tarefas.</p>
        <Button onClick={() => void load()}>Tentar novamente</Button>
      </ScreenMessage>
    ) : (
      <ScreenMessage>Carregando…</ScreenMessage>
    )
  }

  const current = LISTS.find((list) => list.key === tab) ?? LISTS[0]
  const tasks = lists[current.field]

  return (
    <div className="flex flex-col gap-[18px] px-6">
      <header className="flex flex-col gap-0.5 px-1 pt-1">
        <span className="text-[15px] font-bold text-muted-foreground first-letter:uppercase">{formatDayLong(lists.day)}</span>
        <h1 className="text-[34px] leading-10 font-black tracking-[-0.6px]">Tarefas</h1>
      </header>

      <div role="tablist" aria-label="Listas" className="grid grid-cols-3 gap-1 rounded-full bg-card p-1.5">
        {LISTS.map((list) => {
          const count = lists[list.field].filter((t) => !t.done).length
          const active = list.key === current.key
          const alert = list.key === 'atrasadas' && count > 0
          return (
            <button
              key={list.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(list.key)}
              className={`flex h-11 items-center justify-center gap-1.5 rounded-full text-[15px] font-extrabold ${active ? 'bg-primary-soft text-primary-strong' : 'text-muted-foreground'}`}
            >
              {list.label}
              {count > 0 && (
                <span
                  className={`min-w-5 rounded-full px-1.5 text-[12px] leading-5 font-black ${alert ? 'bg-destructive text-primary-foreground' : 'bg-muted text-ink-2'}`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => openSheet(null)}
        className="flex h-14 items-center justify-center gap-2 rounded-[20px] bg-primary text-[17px] font-black text-primary-foreground shadow-[0_8px_20px_rgba(14,116,144,.22)] transition-transform duration-150 active:scale-[.98]"
      >
        <span aria-hidden className="text-[22px] leading-none">+</span> Nova tarefa
      </button>

      {tasks.length === 0 ? (
        <p className="rounded-3xl bg-card px-5 py-6 text-center text-[15px] font-bold text-muted-foreground">{current.empty}</p>
      ) : (
        <ul role="tabpanel" aria-label={current.label} className="flex flex-col rounded-3xl bg-card px-2">
          {tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              today={lists.day}
              nowMinute={nowMinute}
              showDate={current.key !== 'hoje'}
              divider={index > 0}
              busy={busyId === task.id}
              onToggle={() => toggle(task)}
              onOpen={() => openSheet(task)}
            />
          ))}
        </ul>
      )}

      <TaskSheet
        open={sheet.open}
        sessionKey={sheet.key}
        task={sheet.task}
        today={lists.day}
        onClose={closeSheet}
        onSave={saveTask}
        onDelete={deleteTask}
      />
    </div>
  )
}

interface TaskRowProps {
  task: Task
  today: string
  nowMinute: number
  showDate: boolean
  divider: boolean
  busy: boolean
  onToggle: () => void
  onOpen: () => void
}

function TaskRow({ task, today, nowMinute, showDate, divider, busy, onToggle, onOpen }: TaskRowProps) {
  // Em Hoje, a tarefa de hoje com horário vencido fica destacada (só vira atrasada amanhã).
  const late = !task.done && task.date === today && task.time !== null && timeToMinute(task.time) < nowMinute
  const meta = [showDate && task.date ? formatTaskDate(task.date, today) : null, task.time].filter(Boolean).join(' · ')

  return (
    <li className={`flex min-h-16 items-center gap-1 ${divider ? 'border-t border-line' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `Desfazer: ${task.title}` : `Concluir: ${task.title}`}
        disabled={busy}
        onClick={onToggle}
        className="flex size-12 flex-none items-center justify-center disabled:opacity-60"
      >
        <span
          className={`flex size-7 items-center justify-center rounded-full border-2 text-[15px] font-black transition-colors ${task.done ? 'border-primary bg-primary text-primary-foreground' : late ? 'border-warning-strong' : 'border-subtle'}`}
        >
          {task.done ? '✓' : ''}
        </span>
      </button>
      <button type="button" onClick={onOpen} className="flex min-h-16 min-w-0 flex-1 flex-col justify-center py-2 pr-3 text-left">
        <span
          className={`text-[17px] leading-snug font-extrabold break-words ${task.done ? 'text-subtle line-through' : 'text-foreground'}`}
        >
          {task.title}
        </span>
        {meta && (
          <span className={`text-[14px] font-bold ${late ? 'text-warning-strong' : 'text-muted-foreground'}`}>
            {meta}
            {late ? ' · passou do horário' : ''}
          </span>
        )}
      </button>
    </li>
  )
}
