import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScreenMessage } from '@/components/layout/ScreenMessage'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import * as waterService from '@/services/waterService'
import type { WaterToday } from '@/types/water'
import { extractErrorMessage } from '@/utils/errors'
import { formatDayLong, formatMl } from '@/utils/format'
import { FreeIntakeForm } from './FreeIntakeForm'
import { WaterProgress } from './WaterProgress'

/**
 * Água do dia (tela inicial): quanto já bebeu, quanto falta, "tomei" nos lembretes,
 * registro livre e desfazer. Só o dia de hoje (docs/regras-negocio.md → Módulo Água).
 */
export function WaterTodayPage() {
  const { logout } = useAuth()
  const [today, setToday] = useState<WaterToday | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  /** Uma ação por vez: a chave diz qual botão mostra o "carregando". */
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const load = useCallback(() => {
    waterService
      .getWaterToday()
      .then((data) => {
        setToday(data)
        setLoadFailed(false)
      })
      .catch((error: unknown) => {
        console.error(error)
        setLoadFailed(true)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Ao voltar para o app (ex.: depois da meia-noite ou de outro aparelho), busca de novo.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const run = async (key: string, action: () => Promise<WaterToday>): Promise<boolean> => {
    setBusyKey(key)
    setActionError(null)
    try {
      setToday(await action())
      return true
    } catch (error) {
      setActionError(extractErrorMessage(error))
      return false
    } finally {
      setBusyKey(null)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error(error)
    }
  }

  if (!today) {
    return loadFailed ? (
      <ScreenMessage>
        <p className="text-destructive">Não foi possível carregar o dia de hoje.</p>
        <Button
          onClick={() => {
            setLoadFailed(false)
            load()
          }}
        >
          Tentar novamente
        </Button>
      </ScreenMessage>
    ) : (
      <ScreenMessage>Carregando…</ScreenMessage>
    )
  }

  const shortfall = today.remindersShortfallMl ?? 0

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-4 px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Água · Hoje</h1>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{formatDayLong(today.day)}</p>
        </div>
        <div className="flex gap-1">
          <Link
            to="/agua/configuracao"
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium"
          >
            Configurar
          </Link>
          <Button variant="ghost" onClick={handleLogout} loading={loggingOut}>
            Sair
          </Button>
        </div>
      </header>

      {actionError && (
        <p role="alert" className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <WaterProgress today={today} />

      <Link
        to="/agua/historico"
        className="flex min-h-11 items-center justify-between rounded-lg border border-border bg-card px-4 text-sm font-medium"
      >
        <span>📅 Histórico: calendário, sequência e %</span>
        <span aria-hidden className="text-muted-foreground">
          ›
        </span>
      </Link>

      {shortfall > 0 && (
        <p className="rounded-md border border-warning px-3 py-2 text-sm text-warning">
          ⚠ Seus lembretes somam menos que a meta: seguindo só eles, faltam {formatMl(shortfall)}.
        </p>
      )}

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Lembretes de hoje</h2>
          {today.reminders.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {today.reminders.filter((r) => r.intakeId).length} de {today.reminders.length}
            </span>
          )}
        </div>
        {today.reminders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum lembrete. <Link to="/agua/configuracao" className="text-primary underline">Cadastrar</Link>
          </p>
        ) : (
          <ul className="mt-1">
            {today.reminders.map((reminder) => {
              const label = `${reminder.time} · ${formatMl(reminder.amountMl)}`
              return (
                <li
                  key={reminder.id}
                  className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-b-0"
                >
                  <span className={reminder.intakeId ? 'text-muted-foreground line-through' : ''}>
                    <strong>{reminder.time}</strong> · {formatMl(reminder.amountMl)}
                  </span>
                  {reminder.intakeId ? (
                    <Button
                      variant="ghost"
                      className="px-3"
                      aria-label={`Desfazer ${label}`}
                      loading={busyKey === `undo-${reminder.intakeId}`}
                      disabled={busyKey !== null}
                      onClick={() =>
                        void run(`undo-${reminder.intakeId}`, () =>
                          waterService.deleteWaterIntake(reminder.intakeId as string),
                        )
                      }
                    >
                      <span className="text-success">✓</span> Desfazer
                    </Button>
                  ) : (
                    <Button
                      aria-label={`Tomei ${label}`}
                      loading={busyKey === `confirm-${reminder.id}`}
                      disabled={busyKey !== null}
                      onClick={() =>
                        void run(`confirm-${reminder.id}`, () => waterService.confirmWaterReminder(reminder.id))
                      }
                    >
                      Tomei
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <FreeIntakeForm
        busyKey={busyKey}
        onAdd={(amountMl, key) => run(key, () => waterService.addWaterIntake(amountMl))}
      />

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-semibold">Registros de hoje</h2>
        {today.intakes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nada registrado ainda.</p>
        ) : (
          <ul className="mt-1">
            {today.intakes.map((intake) => {
              const origin = intake.reminderTime ? `lembrete das ${intake.reminderTime}` : 'registro livre'
              return (
                <li
                  key={intake.id}
                  className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-b-0"
                >
                  <span>
                    <span className="text-muted-foreground">{intake.time}</span> · <strong>{formatMl(intake.amountMl)}</strong>
                    <span className="block text-xs text-muted-foreground">{origin}</span>
                  </span>
                  <Button
                    variant="ghost"
                    className="px-3"
                    aria-label={`Desfazer registro das ${intake.time} de ${formatMl(intake.amountMl)}`}
                    loading={busyKey === `undo-${intake.id}`}
                    disabled={busyKey !== null}
                    onClick={() => void run(`undo-${intake.id}`, () => waterService.deleteWaterIntake(intake.id))}
                  >
                    Desfazer
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
