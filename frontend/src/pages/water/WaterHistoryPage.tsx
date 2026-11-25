import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useUrlParam } from '@/hooks/useUrlParam'
import * as waterService from '@/services/waterService'
import type { WaterDayStatus, WaterHistory, WaterHistoryDay } from '@/types/water'
import { brasiliaToday } from '@/utils/clock'
import { formatDayLong, formatMl, formatMonthYear, shiftMonth } from '@/utils/format'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/** Fundo, cor do nível (altura = quanto da meta foi bebido) e cor do número, por situação. */
const CELL: Record<WaterDayStatus, { bg: string; fill: string; ink: string }> = {
  met: { bg: 'bg-met', fill: 'bg-met-fill', ink: 'text-met-ink' },
  missed: { bg: 'bg-missed', fill: 'bg-missed-fill', ink: 'text-destructive-ink' },
  today: { bg: 'bg-today', fill: 'bg-today-fill', ink: 'text-foreground' },
  none: { bg: 'bg-transparent', fill: 'bg-transparent', ink: 'text-muted-foreground' },
}

const STATUS_LABEL: Record<WaterDayStatus, string> = {
  met: 'meta batida',
  missed: 'meta não batida',
  today: 'hoje, em andamento',
  none: 'sem avaliação',
}

const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const monthOnly = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })

function pill(day: WaterHistoryDay): { text: string; className: string } {
  switch (day.status) {
    case 'met':
      return { text: 'Meta batida', className: 'bg-met text-met-ink' }
    case 'missed':
      return {
        text: `Faltaram ${formatMl(Math.max(0, (day.goalMl ?? 0) - day.totalMl))}`,
        className: 'bg-missed text-destructive-ink',
      }
    case 'today':
      return { text: 'Hoje · em andamento', className: 'bg-today text-foreground' }
    default:
      return { text: 'Sem meta neste dia', className: 'bg-today text-ink-2' }
  }
}

/** Histórico (design "Módulo Água"): sequência, % do mês, calendário com o nível de cada dia. */
export function WaterHistoryPage() {
  const navigate = useNavigate()
  // Mês na URL (?mes=2026-10): o "voltar" do navegador funciona. Vazio = mês atual.
  const [month, setMonth] = useUrlParam('mes', '')
  const [history, setHistory] = useState<WaterHistory | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  /** Se a meta de hoje já foi batida (a sequência "conta hoje"). */
  const [todayMet, setTodayMet] = useState(false)

  const load = useCallback(
    () =>
      waterService
        .getWaterHistory(month || undefined)
        .then((data) => {
          setHistory(data)
          setLoadFailed(false)
          const today = data.days.find((day) => day.status === 'today')
          setSelectedDay(today?.day ?? null)
          if (today) setTodayMet(today.goalMl !== null && today.totalMl >= today.goalMl)
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

  const todayKey = brasiliaToday()
  const leadingBlanks = history ? new Date(`${history.days[0].day}T00:00:00Z`).getUTCDay() : 0
  const selected = history?.days.find((day) => day.day === selectedDay) ?? null

  return (
    <div className="flex flex-col gap-[18px] px-6">
      <header className="flex flex-col gap-0.5 px-1 pt-1">
        <span className="text-[15px] font-bold text-muted-foreground">
          {history?.firstDay ? `Desde ${dayMonth.format(new Date(`${history.firstDay}T00:00:00Z`))}` : 'Água'}
        </span>
        <h1 className="text-[34px] leading-10 font-black tracking-[-0.6px]">Histórico</h1>
      </header>

      {!history && !loadFailed && <p className="px-1 text-[15px] font-bold text-muted-foreground">Carregando…</p>}
      {loadFailed && (
        <section className="flex flex-col items-start gap-3 rounded-3xl bg-card p-6">
          <p className="text-[15px] font-bold text-destructive">Não foi possível carregar o histórico.</p>
          <Button onClick={() => void load()}>Tentar novamente</Button>
        </section>
      )}

      {history && history.firstDay === null && (
        <section className="flex flex-col items-start gap-3.5 rounded-3xl bg-card p-6">
          <p className="text-[17px] leading-relaxed font-bold">
            O calendário começa no dia em que você salvar a primeira meta.
          </p>
          <button
            type="button"
            onClick={() => navigate('/agua/configuracao')}
            className="h-12 rounded-2xl bg-primary px-5 text-base font-extrabold text-primary-foreground"
          >
            Definir meta
          </button>
        </section>
      )}

      {history && history.firstDay !== null && (
        <>
          <section className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 rounded-3xl bg-card px-[18px] pt-[18px] pb-4">
              <span className="text-sm font-extrabold text-ink-2">Sequência</span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[56px] leading-none font-extrabold tracking-[-2px] tabular-nums">
                  {history.currentStreak}
                </span>
                <span className="text-lg font-extrabold">{history.currentStreak === 1 ? 'dia' : 'dias'}</span>
              </span>
              <span className="text-[13px] font-bold text-muted-foreground">{todayMet ? 'contando hoje' : 'até ontem'}</span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-3xl bg-card px-[18px] pt-[18px] pb-4">
              <span className="text-sm font-extrabold text-ink-2">
                Em {monthOnly.format(new Date(`${history.month}-01T00:00:00Z`))}
              </span>
              <span className="text-[56px] leading-none font-extrabold tracking-[-2px] tabular-nums">
                {history.percent === null ? '—' : `${history.percent}%`}
              </span>
              <span className="text-[13px] font-bold text-muted-foreground">
                {history.evaluatedDays
                  ? `${history.metDays} de ${history.evaluatedDays} ${history.evaluatedDays === 1 ? 'dia' : 'dias'}`
                  : 'nenhum dia fechado'}
              </span>
            </div>
          </section>

          <section className="flex flex-col gap-2.5 rounded-3xl bg-card px-3.5 pt-3.5 pb-4">
            <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center">
              <button
                type="button"
                aria-label="Mês anterior"
                disabled={!history.canGoBack}
                onClick={() => setMonth(shiftMonth(history.month, -1))}
                className="flex size-11 items-center justify-center rounded-[14px] bg-muted disabled:opacity-35"
              >
                <span className="size-[9px] translate-x-0.5 rotate-45 border-b-[2.5px] border-l-[2.5px] border-foreground" />
              </button>
              <h2 className="text-center text-[17px] font-black first-letter:uppercase">{formatMonthYear(history.month)}</h2>
              <button
                type="button"
                aria-label="Próximo mês"
                disabled={!history.canGoForward}
                onClick={() => setMonth(shiftMonth(history.month, 1))}
                className="flex size-11 items-center justify-center rounded-[14px] bg-muted disabled:opacity-35"
              >
                <span className="size-[9px] -translate-x-0.5 rotate-45 border-t-[2.5px] border-r-[2.5px] border-foreground" />
              </button>
            </div>
            <div aria-hidden className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((weekday, index) => (
                <span key={index} className="text-center text-xs font-extrabold text-muted-foreground">
                  {weekday}
                </span>
              ))}
            </div>
            <ul className="grid grid-cols-7 gap-1" aria-label={`Dias de ${formatMonthYear(history.month)}`}>
              {Array.from({ length: leadingBlanks }, (_, index) => (
                <li key={`blank-${index}`} aria-hidden />
              ))}
              {history.days.map((day) => {
                const style = CELL[day.status]
                const fill =
                  day.status === 'none' || !day.goalMl ? 0 : Math.min(100, Math.round((day.totalMl / day.goalMl) * 100))
                const dayNumber = Number(day.day.slice(8))
                const isSelected = selectedDay === day.day
                const future = day.day > todayKey
                return (
                  <li key={day.day}>
                    <button
                      type="button"
                      disabled={future}
                      onClick={() => setSelectedDay(day.day)}
                      aria-label={`${dayNumber}: ${STATUS_LABEL[day.status]}`}
                      aria-pressed={isSelected}
                      className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl ${style.bg} ${day.status === 'today' ? 'shadow-[inset_0_0_0_2px_var(--primary)]' : ''}`}
                      style={{ outline: `2.5px solid ${isSelected ? 'var(--foreground)' : 'transparent'}`, outlineOffset: 2 }}
                    >
                      <span
                        aria-hidden
                        className={`absolute inset-x-0 bottom-0 ${style.fill}`}
                        style={{ height: `${fill}%`, transition: 'height .7s cubic-bezier(.2,1,.3,1)' }}
                      />
                      <span className={`relative text-[15px] font-extrabold tabular-nums ${style.ink}`}>{dayNumber}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="flex flex-wrap gap-3.5 px-0.5 pt-1 text-[13px] font-bold text-ink-2">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded bg-met-fill" /> batida
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded bg-missed-fill" /> não batida
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded bg-today shadow-[inset_0_0_0_2px_var(--primary)]" /> hoje
              </span>
            </div>
            <span className="px-0.5 text-[13px] leading-snug font-bold text-muted-foreground">
              A altura mostra quanto da meta do dia foi bebido.
            </span>
          </section>

          <section className="flex flex-col gap-2 rounded-3xl bg-card p-[18px]" aria-live="polite">
            {selected ? (
              <>
                <div className="flex items-center justify-between gap-2.5">
                  <span className="text-[15px] font-extrabold text-ink-2 first-letter:uppercase">{formatDayLong(selected.day)}</span>
                  <span className={`flex-none rounded-full px-2.5 py-[5px] text-[13px] font-black ${pill(selected).className}`}>
                    {pill(selected).text}
                  </span>
                </div>
                {selected.goalMl !== null && (
                  <span className="flex items-baseline gap-2">
                    <span className="text-[34px] font-extrabold tracking-[-1px] tabular-nums">{formatMl(selected.totalMl)}</span>
                    <span className="text-base font-bold text-ink-2">de {formatMl(selected.goalMl)}</span>
                  </span>
                )}
              </>
            ) : (
              <span className="text-[15px] font-bold text-muted-foreground">Toque num dia para ver o total e a meta.</span>
            )}
          </section>
        </>
      )}
    </div>
  )
}
