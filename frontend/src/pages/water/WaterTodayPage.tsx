import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenMessage } from '@/components/layout/ScreenMessage'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useTweenedNumber } from '@/hooks/useTweenedNumber'
import * as waterService from '@/services/waterService'
import type { WaterToday } from '@/types/water'
import { brasiliaMinuteOfDay, minuteToTime, prefersReducedMotion, relativeTime, timeToMinute } from '@/utils/clock'
import { extractErrorMessage } from '@/utils/errors'
import { formatDayLong, formatMl } from '@/utils/format'
import { buildTimeline, nextReminder } from './todayModel'
import { type Pour, WaterTank } from './WaterTank'
import { INTAKE_MAX_ML, INTAKE_MIN_ML, QUICK_AMOUNTS_ML } from './waterRules'

const integer = new Intl.NumberFormat('pt-BR')

/**
 * Água · Hoje (tela inicial), no design "Módulo Água": tanque com o total, "Tomei" do lembrete
 * da vez, registro livre e a linha "Seu dia". Só o dia de hoje (docs/regras-negocio.md).
 */
export function WaterTodayPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [today, setToday] = useState<WaterToday | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [nowMinute, setNowMinute] = useState(() => brasiliaMinuteOfDay())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherValue, setOtherValue] = useState('')
  const [otherError, setOtherError] = useState<string | null>(null)
  const [pours, setPours] = useState<Pour[]>([])
  const [burstKey, setBurstKey] = useState(0)
  const pourSeq = useRef(0)
  const calm = prefersReducedMotion()

  const load = useCallback(
    () =>
      waterService
        .getWaterToday()
        .then((data) => {
          setToday(data)
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
  }, [load])

  // Relógio da tela ("agora", "em 25 min") e recarga ao voltar para o app.
  useEffect(() => {
    const tick = setInterval(() => setNowMinute(brasiliaMinuteOfDay()), 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setNowMinute(brasiliaMinuteOfDay())
        void load()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const undo = async (intakeId: string) => {
    try {
      setToday(await waterService.deleteWaterIntake(intakeId))
      setExpandedId(null)
      showToast('Registro desfeito')
    } catch (error) {
      showToast(extractErrorMessage(error))
    }
  }

  /** Registra (lembrete ou livre), mostra o "+X mL" subindo e o aviso com Desfazer. */
  const register = async (amountMl: number, reminder?: { id: string; time: string }): Promise<boolean> => {
    if (busy || !today) return false
    setBusy(true)
    const before = today.totalMl
    try {
      const updated = reminder
        ? await waterService.confirmWaterReminder(reminder.id)
        : await waterService.addWaterIntake(amountMl)
      setToday(updated)
      setExpandedId(null)
      const intakeId = reminder
        ? updated.reminders.find((r) => r.id === reminder.id)?.intakeId
        : updated.intakes[0]?.id
      const crossed = updated.goalMl !== null && before < updated.goalMl && updated.totalMl >= updated.goalMl
      if (crossed) setBurstKey((key) => key + 1)
      pourSeq.current += 1
      const pourId = `pour-${pourSeq.current}`
      setPours((list) => [...list.slice(-2), { id: pourId, text: `+${formatMl(amountMl)}` }])
      setTimeout(() => setPours((list) => list.filter((pour) => pour.id !== pourId)), 2200)
      const text = crossed
        ? `Meta batida! +${formatMl(amountMl)}`
        : `+${formatMl(amountMl)}${reminder ? ` · lembrete das ${reminder.time}` : ' registrados'}`
      showToast(text, intakeId ? { onUndo: () => void undo(intakeId) } : undefined)
      return true
    } catch (error) {
      showToast(extractErrorMessage(error))
      return false
    } finally {
      setBusy(false)
    }
  }

  const addOther = async () => {
    const value = Number(otherValue)
    const error = !otherValue
      ? 'Digite a quantidade em mL'
      : value < INTAKE_MIN_ML
        ? `Use no mínimo ${formatMl(INTAKE_MIN_ML)}`
        : value > INTAKE_MAX_ML
          ? `Use no máximo ${formatMl(INTAKE_MAX_ML)}`
          : null
    if (error) {
      setOtherError(error)
      return
    }
    if (await register(value)) {
      setOtherValue('')
      setOtherOpen(false)
      setOtherError(null)
    }
  }

  if (!today) {
    return loadFailed ? (
      <ScreenMessage>
        <p className="text-destructive">Não foi possível carregar o dia de hoje.</p>
        <Button onClick={() => void load()}>Tentar novamente</Button>
      </ScreenMessage>
    ) : (
      <ScreenMessage>Carregando…</ScreenMessage>
    )
  }

  const next = nextReminder(today.reminders, nowMinute)
  const nowTime = minuteToTime(nowMinute)
  const timeline = buildTimeline(today, nowMinute, nowTime)
  const confirmed = today.reminders.filter((r) => r.intakeId).length
  const remindersTotal = today.reminders.reduce((sum, r) => sum + r.amountMl, 0)
  const shortfall = today.remindersShortfallMl ?? 0
  const nextIsDue = next ? timeToMinute(next.time) <= nowMinute : false
  const nextIsLate = next ? timeToMinute(next.time) < nowMinute : false
  const goAjustes = () => navigate('/agua/configuracao')

  return (
    <div className="flex flex-col gap-[18px] px-6">
      <header className="flex flex-col gap-0.5 px-1 pt-1">
        <span className="text-[15px] font-bold text-muted-foreground first-letter:uppercase">{formatDayLong(today.day)}</span>
        <h1 className="text-[34px] leading-10 font-black tracking-[-0.6px]">Hoje</h1>
      </header>

      <TankCard today={today} calm={calm} pours={pours} burstKey={burstKey} onDefineGoal={goAjustes} />

      {next && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <span className="text-[15px] font-extrabold text-ink-2">
              {nextIsDue ? `Lembrete das ${next.time}` : 'Próximo lembrete'}
            </span>
            <span className={`text-[15px] font-bold ${nextIsLate ? 'text-warning-strong' : 'text-muted-foreground'}`}>
              {relativeTime(next.time, nowMinute)}
            </span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void register(next.amountMl, next)}
            aria-label={`Tomei ${next.time} · ${formatMl(next.amountMl)}`}
            className="flex h-16 items-center justify-between rounded-[22px] bg-primary px-[22px] text-primary-foreground shadow-[0_8px_20px_rgba(14,116,144,.22)] transition-transform duration-150 active:scale-[.98] disabled:opacity-70"
          >
            <span className="text-xl font-black">Tomei</span>
            <span className="text-[17px] font-bold tabular-nums">
              {next.time} · {formatMl(next.amountMl)}
            </span>
          </button>
        </section>
      )}
      {!next && today.reminders.length > 0 && (
        <div className="flex min-h-16 items-center gap-3 rounded-[22px] bg-card px-5">
          <span className="flex size-7 flex-none items-center justify-center rounded-full bg-primary text-[15px] font-black text-primary-foreground">
            ✓
          </span>
          <span className="text-base font-extrabold">Todos os lembretes de hoje foram tomados.</span>
        </div>
      )}
      {today.reminders.length === 0 && (
        <div className="flex min-h-16 items-center justify-between gap-3 rounded-[22px] bg-card py-2.5 pr-2.5 pl-5">
          <span className="text-base font-extrabold">Nenhum lembrete ainda.</span>
          <button
            type="button"
            onClick={goAjustes}
            className="h-11 rounded-[14px] border-[1.5px] border-primary bg-card px-4 text-[15px] font-extrabold text-primary"
          >
            Criar lembretes
          </button>
        </div>
      )}

      <section className="flex flex-col gap-2.5">
        <span className="px-1 text-[15px] font-extrabold text-ink-2">Bebeu fora do lembrete?</span>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS_ML.map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={busy}
              aria-label={`Registrar ${amount} mL`}
              onClick={() => void register(amount)}
              className="h-[52px] rounded-[18px] border-[1.5px] border-border bg-card text-lg font-extrabold tabular-nums transition-transform duration-100 active:scale-95"
            >
              +{amount}
            </button>
          ))}
          <button
            type="button"
            aria-expanded={otherOpen}
            onClick={() => {
              setOtherOpen((open) => !open)
              setOtherError(null)
            }}
            className={`h-[52px] rounded-[18px] border-[1.5px] text-base font-extrabold transition-transform duration-100 active:scale-95 ${otherOpen ? 'border-primary bg-primary-soft' : 'border-border bg-card'}`}
          >
            Outro
          </button>
        </div>
        {otherOpen && (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <div className="relative min-w-0">
                <input
                  value={otherValue}
                  onChange={(e) => {
                    setOtherValue(e.target.value.replace(/\D/g, '').slice(0, 4))
                    setOtherError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void addOther()
                  }}
                  inputMode="numeric"
                  placeholder="Quantidade"
                  aria-label="Outra quantidade em mL"
                  aria-invalid={otherError ? true : undefined}
                  autoFocus
                  className={`box-border h-[52px] w-full rounded-[18px] border-[1.5px] bg-card pr-12 pl-4 text-lg font-extrabold outline-none focus:shadow-[0_0_0_3px_var(--primary-ring)] ${otherError ? 'border-destructive' : 'border-border'}`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[15px] font-extrabold text-muted-foreground">
                  mL
                </span>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void addOther()}
                className="h-[52px] rounded-[18px] bg-primary px-5 text-base font-extrabold text-primary-foreground"
              >
                Adicionar
              </button>
            </div>
            {otherError && (
              <span role="alert" className="px-1 text-sm font-bold text-destructive">
                {otherError}
              </span>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3 pt-2.5">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-[22px] font-black tracking-[-0.3px]">Seu dia</h2>
          {today.reminders.length > 0 && (
            <span className="text-[15px] font-bold text-muted-foreground">
              {confirmed} de {today.reminders.length} lembretes
            </span>
          )}
        </div>

        {shortfall > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-[18px] bg-warning-soft py-3 pr-3 pl-4">
            <span className="text-sm leading-snug font-bold text-warning">
              Seus lembretes somam {formatMl(remindersTotal)}. Só com eles, faltam {formatMl(shortfall)} para a meta.
            </span>
            <button
              type="button"
              onClick={goAjustes}
              className="h-11 flex-none rounded-xl bg-card px-3.5 text-sm font-extrabold text-warning"
            >
              Ajustar
            </button>
          </div>
        )}

        {timeline.length === 0 ? (
          <div className="rounded-3xl bg-card px-5 py-[18px] text-[15px] font-bold text-muted-foreground">
            Nada registrado ainda.
          </div>
        ) : (
          <ul className="relative flex flex-col overflow-hidden rounded-3xl bg-card py-1.5">
            <span aria-hidden className="absolute top-[30px] bottom-[30px] left-[88px] w-0.5 rounded-sm bg-line" />
            {timeline.map((row) => {
              if (row.kind === 'now') {
                return (
                  <li
                    key={row.key}
                    className="relative grid grid-cols-[52px_22px_minmax(0,1fr)] items-center gap-x-2.5 px-4 py-1"
                  >
                    <span className="text-[13px] font-black text-primary tabular-nums">{row.time}</span>
                    <span className="size-2.5 justify-self-center rounded-full bg-primary shadow-[0_0_0_4px_var(--primary-soft)]" />
                    <span className="flex items-center gap-2">
                      <span className="h-0.5 flex-1 rounded-sm bg-primary" />
                      <span className="text-[13px] font-black text-primary">agora</span>
                    </span>
                  </li>
                )
              }
              const done = row.kind === 'done'
              const expanded = done && expandedId === row.intakeId
              const isNext = row.kind === 'pending' && row.isNext
              const late = row.kind === 'pending' && row.late
              const label = `${row.time} · ${formatMl(row.amountMl)}`
              const content = (
                <>
                  <span
                    className={`text-[15px] font-extrabold tabular-nums ${done ? 'text-muted-foreground' : isNext ? 'text-primary' : 'text-foreground'}`}
                  >
                    {row.time}
                  </span>
                  <span
                    className={`box-border flex size-[22px] items-center justify-center justify-self-center rounded-full border-2 text-xs font-black text-primary-foreground ${done ? 'border-primary bg-primary' : isNext ? 'border-primary bg-card' : late ? 'border-warning-stripe bg-card' : 'border-border bg-card'}`}
                  >
                    {done ? '✓' : ''}
                  </span>
                  <span className="flex min-w-0 flex-col gap-px text-left">
                    <span className={`text-[17px] font-extrabold tabular-nums ${done ? 'text-ink-2' : 'text-foreground'}`}>
                      {formatMl(row.amountMl)}
                    </span>
                    <span className="text-[13px] font-bold text-muted-foreground">{row.sub}</span>
                  </span>
                </>
              )
              return (
                <li
                  key={row.key}
                  className={`relative flex flex-col transition-colors duration-300 ${expanded ? 'bg-background' : isNext ? 'bg-next' : ''}`}
                >
                  {done ? (
                    <button
                      type="button"
                      onClick={() => setExpandedId((id) => (id === row.intakeId ? null : row.intakeId))}
                      aria-expanded={expanded}
                      aria-label={`${label}, ${row.sub}`}
                      className="grid min-h-16 grid-cols-[52px_22px_minmax(0,1fr)_auto] items-center gap-x-2.5 py-1.5 pr-3 pl-4"
                    >
                      {content}
                      <span
                        aria-hidden
                        className="mx-2.5 size-2 border-r-[2.5px] border-b-[2.5px] border-subtle transition-transform duration-200"
                        style={{
                          transform: expanded ? 'translateY(2px) rotate(-135deg)' : 'translateY(-2px) rotate(45deg)',
                        }}
                      />
                    </button>
                  ) : (
                    <div className="grid min-h-16 grid-cols-[52px_22px_minmax(0,1fr)_auto] items-center gap-x-2.5 py-1.5 pr-3 pl-4">
                      {content}
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Tomei ${label}`}
                        onClick={() => void register(row.amountMl, { id: row.reminderId, time: row.time })}
                        className="h-11 rounded-[14px] border-[1.5px] border-primary bg-card px-4 text-[15px] font-black text-primary transition-transform duration-100 active:scale-95"
                      >
                        Tomei
                      </button>
                    </div>
                  )}
                  {expanded && (
                    <div className="flex items-center justify-between gap-3 pr-3 pb-3 pl-[100px]">
                      <span className="text-[13px] leading-snug font-bold text-muted-foreground">
                        {row.fromReminder
                          ? 'O lembrete volta a ficar pendente.'
                          : `Tira ${formatMl(row.amountMl)} do total de hoje.`}
                      </span>
                      <button
                        type="button"
                        onClick={() => void undo(row.intakeId)}
                        className="h-11 flex-none rounded-[14px] border-[1.5px] border-destructive-border bg-card px-4 text-[15px] font-extrabold text-destructive"
                      >
                        Desfazer
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

interface TankCardProps {
  today: WaterToday
  calm: boolean
  pours: Pour[]
  burstKey: number
  onDefineGoal: () => void
}

/** Tanque com o total "contando" até o valor novo. Montado só depois de carregar o dia. */
function TankCard({ today, calm, pours, burstKey, onDefineGoal }: TankCardProps) {
  const goal = today.goalMl
  const total = today.totalMl
  const shownTotal = useTweenedNumber(total, calm ? 350 : 1100)
  const level = goal ? 4 + Math.min(100, (total / goal) * 100) * 0.92 : 4
  const goAjustes = onDefineGoal

  return (
      <section className="relative h-72 overflow-hidden rounded-[32px] bg-tank" aria-label="Progresso de hoje">
        <WaterTank level={level} calm={calm} pours={pours} burstKey={burstKey} />
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-6 py-[22px]">
          <div className="flex flex-col gap-1.5">
            <p className="flex items-baseline gap-1.5" aria-live="polite">
              <span
                className="leading-[0.95] font-extrabold tracking-[-3px] tabular-nums"
                style={{ fontSize: shownTotal >= 10_000 ? 72 : 88 }}
              >
                {integer.format(shownTotal)}
              </span>
              <span className="text-[26px] font-extrabold tracking-[-0.5px]">mL</span>
            </p>
            <span className="text-[17px] font-bold text-ink-2">{goal !== null ? `de ${formatMl(goal)}` : 'Sem meta diária'}</span>
          </div>
          <div className="flex items-end justify-between gap-3">
            {goal !== null && shownTotal < goal && (
              <span className="text-[19px] font-extrabold">Faltam {formatMl(Math.max(0, goal - shownTotal))}</span>
            )}
            {goal !== null && shownTotal >= goal && (
              <span className="inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 text-[17px] font-black text-success shadow-[0_6px_18px_rgba(15,42,51,.10)]">
                ✓ Meta batida!
              </span>
            )}
            {goal === null && (
              <button
                type="button"
                onClick={goAjustes}
                className="pointer-events-auto h-11 rounded-full bg-primary px-[18px] text-base font-extrabold text-primary-foreground"
              >
                Definir meta diária
              </button>
            )}
          </div>
        </div>
      </section>
  )
}
