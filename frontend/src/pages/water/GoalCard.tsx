import { useEffect, useRef, useState } from 'react'
import { extractErrorMessage } from '@/utils/errors'
import { formatMl } from '@/utils/format'
import { GOAL_MAX_ML, GOAL_MIN_ML, stepGoal, SUGGESTED_GOAL_ML } from './waterRules'

const integer = new Intl.NumberFormat('pt-BR')

interface GoalCardProps {
  goalMl: number | null
  onSave: (goalMl: number) => Promise<void>
}

/** Meta diária com − / + de 250 mL; "Salvar meta" só aparece quando o valor muda. */
export function GoalCard({ goalMl, onSave }: GoalCardProps) {
  const [draft, setDraft] = useState(String(goalMl ?? SUGGESTED_GOAL_ML))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(savedTimer.current), [])

  const dirty = goalMl === null || Number(draft) !== goalMl

  const update = (value: string) => {
    setDraft(value.replace(/\D/g, '').slice(0, 5))
    setError(null)
    setSaved(false)
  }

  const save = async () => {
    const value = Number(draft)
    const problem = !draft
      ? 'Digite a quantidade em mL'
      : value < GOAL_MIN_ML
        ? `Use no mínimo ${formatMl(GOAL_MIN_ML)}`
        : value > GOAL_MAX_ML
          ? `Use no máximo ${formatMl(GOAL_MAX_ML)}`
          : null
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    try {
      await onSave(value)
      setDraft(String(value))
      setSaved(true)
      clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(false), 2600)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const stepButton =
    'flex size-[52px] items-center justify-center rounded-full border-[1.5px] border-border bg-background text-[28px] leading-none font-bold transition-transform duration-100 active:scale-[.92]'

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="px-1 text-xl font-black">Meta diária</h2>
      <div className="flex flex-col gap-3.5 rounded-3xl bg-card p-[18px]">
        <div className="grid grid-cols-[52px_minmax(0,1fr)_52px] items-center gap-2">
          <button
            type="button"
            aria-label="Diminuir 250 mL"
            className={stepButton}
            onClick={() => update(String(stepGoal(Number(draft) || goalMl || SUGGESTED_GOAL_ML, -1)))}
          >
            −
          </button>
          <div className="flex min-w-0 items-baseline justify-center gap-1">
            <input
              value={draft ? integer.format(Number(draft)) : ''}
              onChange={(e) => update(e.target.value)}
              inputMode="numeric"
              aria-label="Meta diária em mL"
              aria-invalid={error ? true : undefined}
              className="w-[150px] min-w-0 border-0 bg-transparent p-0 text-right text-[46px] font-extrabold tracking-[-1.5px] tabular-nums outline-none"
            />
            <span className="text-xl font-extrabold">mL</span>
          </div>
          <button
            type="button"
            aria-label="Aumentar 250 mL"
            className={stepButton}
            onClick={() => update(String(stepGoal(Number(draft) || goalMl || SUGGESTED_GOAL_ML, 1)))}
          >
            +
          </button>
        </div>
        {error && (
          <span role="alert" className="text-center text-sm font-bold text-destructive">
            {error}
          </span>
        )}
        <span className="text-center text-[13px] leading-snug font-bold text-muted-foreground">
          {goalMl === null
            ? 'Sugestão inicial. Nada é gravado até você salvar.'
            : 'A nova meta já vale para hoje. Dias anteriores mantêm a meta deles.'}
        </span>
        {dirty && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              aria-busy={saving || undefined}
              onClick={() => void save()}
              className="h-[52px] flex-1 rounded-2xl bg-primary text-base font-extrabold text-primary-foreground disabled:opacity-70"
            >
              {saving ? 'Salvando…' : 'Salvar meta'}
            </button>
            {goalMl !== null && (
              <button
                type="button"
                onClick={() => {
                  setDraft(String(goalMl))
                  setError(null)
                }}
                className="h-[52px] rounded-2xl bg-muted px-[18px] text-base font-extrabold"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
        {saved && !dirty && (
          <span role="status" className="text-center text-[15px] font-extrabold text-success">
            ✓ Meta salva
          </span>
        )}
      </div>
    </section>
  )
}
