import { useState } from 'react'
import type { ReminderInput, WaterReminder } from '@/types/water'
import { extractErrorMessage } from '@/utils/errors'
import { formatMl } from '@/utils/format'
import { REMINDER_MAX_ML, REMINDER_MIN_ML } from './waterRules'

interface ReminderSheetProps {
  open: boolean
  /** Muda a cada abertura: o formulário começa limpo com os valores do lembrete. */
  sessionKey: number
  /** Lembrete sendo editado; null = novo. */
  reminder: WaterReminder | null
  /** Horários já usados por outros lembretes (não pode repetir). */
  takenTimes: string[]
  onClose: () => void
  onSave: (input: ReminderInput) => Promise<void>
  onDelete: () => Promise<void>
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** Painel que sobe de baixo para criar ou editar um lembrete (design "Módulo Água"). */
export function ReminderSheet({ open, sessionKey, ...formProps }: ReminderSheetProps) {
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
        aria-label={formProps.reminder ? 'Editar lembrete' : 'Novo lembrete'}
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

type SheetFormProps = Omit<ReminderSheetProps, 'open' | 'sessionKey'>

function SheetForm({ reminder, takenTimes, onClose, onSave, onDelete }: SheetFormProps) {
  const [time, setTime] = useState(reminder?.time ?? '')
  const [amount, setAmount] = useState(reminder ? String(reminder.amountMl) : '')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const value = Number(amount)
    const problem = !TIME.test(time)
      ? 'Escolha o horário'
      : !amount
        ? 'Digite a quantidade em mL'
        : value < REMINDER_MIN_ML
          ? `Use no mínimo ${formatMl(REMINDER_MIN_ML)}`
          : value > REMINDER_MAX_ML
            ? `Use no máximo ${formatMl(REMINDER_MAX_ML)}`
            : takenTimes.includes(time)
              ? `Já existe um lembrete às ${time}.`
              : null
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    try {
      await onSave({ time, amountMl: value })
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

  return (
    <>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[22px] font-black">{reminder ? 'Editar lembrete' : 'Novo lembrete'}</h3>
          <button type="button" onClick={onClose} className="h-11 px-1 text-base font-extrabold text-primary">
            Cancelar
          </button>
        </div>
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2.5">
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
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[13px] font-extrabold text-ink-2">Quantidade</span>
            <span className="relative block">
              <input
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/\D/g, '').slice(0, 4))
                  setError(null)
                }}
                inputMode="numeric"
                aria-label="Quantidade em mL"
                placeholder="500"
                className={`${field} pr-12 pl-3.5`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[15px] font-extrabold text-muted-foreground">
                mL
              </span>
            </span>
          </label>
        </div>
        <span className="text-[13px] font-bold text-muted-foreground">Vale para todos os dias. De 50 a 2.000 mL.</span>
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
              {busy ? 'Salvando…' : 'Salvar lembrete'}
            </button>
            {reminder && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="h-12 text-base font-extrabold text-destructive"
              >
                Excluir lembrete
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2.5 rounded-[18px] bg-destructive-soft p-4">
            <span className="text-base font-black text-destructive-ink">Excluir o lembrete das {reminder?.time}?</span>
            <span className="text-sm leading-snug font-bold text-destructive-ink">
              Os registros já feitos continuam no histórico.
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
