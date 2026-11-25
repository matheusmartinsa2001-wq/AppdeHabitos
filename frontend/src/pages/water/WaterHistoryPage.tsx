import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useUrlParam } from '@/hooks/useUrlParam'
import * as waterService from '@/services/waterService'
import type { WaterDayStatus, WaterHistory, WaterHistoryDay } from '@/types/water'
import { formatDayLong, formatMl, formatMonthYear, shiftMonth } from '@/utils/format'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const CELL_STYLE: Record<WaterDayStatus, string> = {
  met: 'bg-success text-primary-foreground',
  missed: 'bg-destructive text-primary-foreground',
  today: 'bg-muted text-foreground ring-2 ring-primary',
  none: 'text-muted-foreground',
}

const STATUS_LABEL: Record<WaterDayStatus, string> = {
  met: 'meta batida',
  missed: 'meta não batida',
  today: 'hoje, em andamento',
  none: 'sem avaliação',
}

/** Acompanhamento macro: calendário do mês (verde/vermelho), sequência e percentual. */
export function WaterHistoryPage() {
  // Mês na URL (?mes=2026-10): o "voltar" do navegador funciona. Vazio = mês atual.
  const [month, setMonth] = useUrlParam('mes', '')
  const [history, setHistory] = useState<WaterHistory | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [selected, setSelected] = useState<WaterHistoryDay | null>(null)

  const load = useCallback(
    () =>
      waterService
        .getWaterHistory(month || undefined)
        .then((data) => {
          setHistory(data)
          setLoadFailed(false)
          setSelected(null)
        })
        .catch((error: unknown) => {
          console.error(error)
          setLoadFailed(true)
        }),
    [month],
  )

  useEffect(() => {
    void load()
  }, [load])

  const goTo = (delta: number) => {
    if (!history) return
    setMonth(shiftMonth(history.month, delta))
  }

  // Domingo primeiro, como no calendário do iPhone.
  const leadingBlanks = history ? new Date(`${history.days[0].day}T00:00:00Z`).getUTCDay() : 0

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-4 px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <header className="flex items-center gap-2">
        <Link to="/" className="flex min-h-11 items-center px-1 text-2xl text-primary" aria-label="Voltar ao início">
          ‹
        </Link>
        <h1 className="text-xl font-bold">Água · Histórico</h1>
      </header>

      {!history && !loadFailed && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {loadFailed && (
        <section className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-destructive">Não foi possível carregar o histórico.</p>
          <Button onClick={() => void load()}>Tentar novamente</Button>
        </section>
      )}

      {history && (
        <>
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Sequência atual</p>
              <p className="text-2xl font-bold">
                {history.currentStreak} {history.currentStreak === 1 ? 'dia' : 'dias'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Meta batida no mês</p>
              <p className="text-2xl font-bold">{history.percent === null ? '—' : `${history.percent}%`}</p>
              <p className="text-xs text-muted-foreground">
                {history.metDays} de {history.evaluatedDays} {history.evaluatedDays === 1 ? 'dia' : 'dias'}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                className="px-3"
                aria-label="Mês anterior"
                disabled={!history.canGoBack}
                onClick={() => goTo(-1)}
              >
                ‹
              </Button>
              <h2 className="font-semibold first-letter:uppercase">{formatMonthYear(history.month)}</h2>
              <Button
                variant="ghost"
                className="px-3"
                aria-label="Próximo mês"
                disabled={!history.canGoForward}
                onClick={() => goTo(1)}
              >
                ›
              </Button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground" aria-hidden>
              {WEEKDAYS.map((weekday, index) => (
                <span key={index}>{weekday}</span>
              ))}
            </div>
            <ul className="mt-1 grid grid-cols-7 gap-1" aria-label={`Dias de ${formatMonthYear(history.month)}`}>
              {Array.from({ length: leadingBlanks }, (_, index) => (
                <li key={`blank-${index}`} aria-hidden />
              ))}
              {history.days.map((day) => {
                const dayNumber = Number(day.day.slice(8))
                return (
                  <li key={day.day}>
                    <button
                      type="button"
                      onClick={() => setSelected(day)}
                      aria-label={`${dayNumber}: ${STATUS_LABEL[day.status]}`}
                      aria-pressed={selected?.day === day.day}
                      className={`flex aspect-square w-full items-center justify-center rounded-md text-sm font-medium ${CELL_STYLE[day.status]} ${selected?.day === day.day ? 'outline-2 outline-offset-1 outline-foreground' : ''}`}
                    >
                      {dayNumber}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-3 rounded-sm bg-success" /> batida
              </span>
              <span className="flex items-center gap-1">
                <span className="size-3 rounded-sm bg-destructive" /> não batida
              </span>
              <span className="flex items-center gap-1">
                <span className="size-3 rounded-sm bg-muted ring-1 ring-primary" /> hoje
              </span>
            </div>
          </section>

          {selected && (
            <section className="rounded-lg border border-border bg-card p-4 text-sm" aria-live="polite">
              <p className="font-semibold first-letter:uppercase">{formatDayLong(selected.day)}</p>
              {selected.goalMl === null ? (
                <p className="mt-1 text-muted-foreground">Sem meta neste dia.</p>
              ) : (
                <p className="mt-1">
                  {formatMl(selected.totalMl)} de {formatMl(selected.goalMl)} · {STATUS_LABEL[selected.status]}
                </p>
              )}
            </section>
          )}

          {history.firstDay === null && (
            <p className="text-sm text-muted-foreground">
              O calendário começa no dia em que você salvar a primeira meta.{' '}
              <Link to="/agua/configuracao" className="text-primary underline">
                Definir meta
              </Link>
            </p>
          )}
        </>
      )}
    </main>
  )
}
