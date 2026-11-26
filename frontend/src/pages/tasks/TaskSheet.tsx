import { useState } from 'react'
import type { Task, TaskInput } from '@/types/tasks'
import { extractErrorMessage } from '@/utils/errors'
import { addDays, formatTaskDate, TASK_TITLE_MAX } from './taskDates'

interface TaskSheetProps {
  open: boolean
  /** Muda a cada abertura: o formulário começa limpo com os valores da tarefa. */
  sessionKey: number
  /** Tarefa sendo editada; null = nova. */
  task: Task | null
  /** Hoje em Brasília, "AAAA-MM-DD". */
  today: string
  onClose: () => void
  /** Na edição, só os campos que mudaram. */
  onSave: (input: Partial<TaskInput>) => Promise<void>
  onDelete: () => Promise<void>
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** Painel que sobe de baixo para criar ou editar uma tarefa (mesmo padrão do `ReminderSheet`). */
export function TaskSheet({ open, sessionKey, ...formProps }: TaskSheetProps) {
  return (
    <>
      <div
        aria-hidden
        onClick={formProps.onClose}
        className="fixed inset-0 z-[45] bg-foreground/35 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label={formProps.task ? 'Editar tarefa' : 'Nova tarefa'}
        className="fixed inset-x-0 bottom-0 z-[46] mx-auto flex max-w-[402px] flex-col gap-4 rounded-t-[34px] bg-card px-6 pt-2.5 shadow-[0_-12px_40px_rgba(15,42,51,.14)] transition-[transform,visibility] duration-[450ms] ease-[cubic-bezier(.2,1,.3,1)]"
        style={{
          transform: open ? 'translateY(0%)' : 'translateY(105%)',
          paddingBottom: 'calc(44px + env(safe-area-inset-bottom))',
          visibility: open ? 'visible' : 'hidden',
        }}
      >
        <span aria-hidden className="h-[5px] w-[38px] self-center rounded-[3px] bg-today-fill" />
        <SheetForm key={sessionKey} {...formProps} />
      </div>
    </>
  )
}

type SheetFormProps = Omit<TaskSheetProps, 'open' | 'sessionKey'>
type DateChoice = 'none' | 'today' | 'tomorrow' | 'other'

function initialChoice(date: string | null, today: string): DateChoice {
  if (!date) return 'none'
  if (date === today) return 'today'
  if (date === addDays(today, 1)) return 'tomorrow'
  return 'other'
}

function SheetForm({ task, today, onClose, onSave, onDelete }: SheetFormProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [choice, setChoice] = useState<DateChoice>(() => initialChoice(task?.date ?? null, today))
  const [otherDate, setOtherDate] = useState(task?.date && task.date > addDays(today, 1) ? task.date : '')
  const [time, setTime] = useState(task?.time ?? '')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  // Atrasada sendo editada: a data antiga fica até ser trocada (não se remarca para o passado).
  const keepsPastDate = task?.date != null && task.date < today && choice === 'other' && !otherDate
  const date =
    choice === 'today'
      ? today
      : choice === 'tomorrow'
        ? addDays(today, 1)
        : choice === 'other'
          ? keepsPastDate
            ? task.date
            : otherDate || null
          : null

  const pick = (next: DateChoice) => {
    setChoice(next)
    if (next === 'none') setTime('')
    setError(null)
  }

  const save = async () => {
    const trimmed = title.trim()
    const problem = !trimmed
      ? 'Digite o título da tarefa'
      : choice === 'other' && !date
        ? 'Escolha a data'
        : date && !keepsPastDate && date < today
          ? 'A data não pode ser antes de hoje'
          : time && !TIME.test(time)
            ? 'Horário inválido'
            : null
    if (problem) {
      setError(problem)
      return
    }
    const input: TaskInput = { title: trimmed, date, time: date && time ? time : null }
    // Na edição, manda só o que mudou (uma atrasada pode mudar o título sem remarcar).
    const changes: Partial<TaskInput> = task
      ? Object.fromEntries(
          (Object.keys(input) as (keyof TaskInput)[])
            .filter((key) => input[key] !== task[key])
            .map((key) => [key, input[key]]),
        )
      : input
    setBusy(true)
    try {
      await onSave(changes)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await onDelete()
    } catch (err) {
      setError(extractErrorMessage(err))
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  const field =
    'box-border h-[52px] w-full min-w-0 rounded-2xl border-[1.5px] border-border bg-background text-lg font-extrabold outline-none focus:shadow-[0_0_0_3px_var(--primary-ring)]'
  const chip = (active: boolean) =>
    `h-11 rounded-full px-1 text-[14px] font-extrabold whitespace-nowrap ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-ink-2'}`

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[22px] font-black">{task ? 'Editar tarefa' : 'Nova tarefa'}</h3>
        <button type="button" onClick={onClose} className="h-11 px-1 text-base font-extrabold text-primary">
          Cancelar
        </button>
      </div>

      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[13px] font-extrabold text-ink-2">Título</span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value.slice(0, TASK_TITLE_MAX))
            setError(null)
          }}
          maxLength={TASK_TITLE_MAX}
          placeholder="Ex.: pagar a conta de luz"
          className={`${field} px-3.5`}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-extrabold text-ink-2">Quando</span>
        <div role="group" aria-label="Quando" className="grid grid-cols-4 gap-1.5">
          <button type="button" aria-pressed={choice === 'today'} onClick={() => pick('today')} className={chip(choice === 'today')}>
            Hoje
          </button>
          <button type="button" aria-pressed={choice === 'tomorrow'} onClick={() => pick('tomorrow')} className={chip(choice === 'tomorrow')}>
            Amanhã
          </button>
          <button type="button" aria-pressed={choice === 'other'} onClick={() => pick('other')} className={chip(choice === 'other')}>
            Outra data
          </button>
          <button type="button" aria-pressed={choice === 'none'} onClick={() => pick('none')} className={chip(choice === 'none')}>
            Sem data
          </button>
        </div>
      </div>

      {choice !== 'none' && (
        <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2.5">
          {choice === 'other' ? (
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[13px] font-extrabold text-ink-2">
                Data{keepsPastDate && task.date ? ` (era ${formatTaskDate(task.date, today).toLowerCase()})` : ''}
              </span>
              <input
                type="date"
                value={otherDate}
                min={today}
                onChange={(e) => {
                  setOtherDate(e.target.value)
                  setError(null)
                }}
                className={`${field} block appearance-none px-2.5 text-left [&::-webkit-date-and-time-value]:text-left`}
              />
            </label>
          ) : (
            <div className="flex min-w-0 flex-col justify-end pb-3.5 text-[15px] font-bold text-muted-foreground">
              Horário é opcional
            </div>
          )}
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[13px] font-extrabold text-ink-2">Horário</span>
            <input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value)
                setError(null)
              }}
              className={`${field} block appearance-none px-2.5 text-left [&::-webkit-date-and-time-value]:text-left`}
            />
          </label>
        </div>
      )}
      {choice !== 'none' && time && (
        <button type="button" onClick={() => setTime('')} className="-mt-2 h-9 self-end text-sm font-extrabold text-primary">
          Tirar horário
        </button>
      )}
      <span className="text-[13px] font-bold text-muted-foreground">
        {choice === 'none' ? 'Sem data, a tarefa fica em Hoje até você concluir.' : 'Com horário, ela fica destacada em Hoje quando a hora passar.'}
      </span>

      {error && (
        <span role="alert" className="text-sm font-extrabold text-destructive">
          {error}
        </span>
      )}
      {!confirmDelete ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="h-14 rounded-[18px] bg-primary text-[17px] font-black text-primary-foreground disabled:opacity-70"
          >
            {busy ? 'Salvando…' : task ? 'Salvar tarefa' : 'Criar tarefa'}
          </button>
          {task && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="h-12 text-base font-extrabold text-destructive">
              Excluir tarefa
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-[18px] bg-destructive-soft p-4">
          <span className="text-base font-black text-destructive-ink">Excluir “{task?.title}”?</span>
          <span className="text-sm leading-snug font-bold text-destructive-ink">
            Se ela já foi concluída, a conclusão continua no histórico.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="h-[50px] flex-1 rounded-[14px] bg-destructive text-base font-black text-primary-foreground"
            >
              Excluir
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="h-[50px] flex-1 rounded-[14px] bg-card text-base font-extrabold"
            >
              Manter
            </button>
          </div>
        </div>
      )}
    </>
  )
}
