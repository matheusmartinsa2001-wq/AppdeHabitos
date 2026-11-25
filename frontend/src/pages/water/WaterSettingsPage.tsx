import { useCallback, useEffect, useState } from 'react'
import { ScreenMessage } from '@/components/layout/ScreenMessage'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import * as waterService from '@/services/waterService'
import type { ReminderInput, WaterReminder, WaterSettings } from '@/types/water'
import { formatMl } from '@/utils/format'
import { GoalCard } from './GoalCard'
import { NotificationsCard } from './NotificationsCard'
import { ReminderSheet } from './ReminderSheet'

/** Ajustes (design "Módulo Água"): meta diária, lembretes, notificações e sair. */
export function WaterSettingsPage() {
  const { logout } = useAuth()
  const { showToast } = useToast()
  const [settings, setSettings] = useState<WaterSettings | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [sheet, setSheet] = useState<{ open: boolean; reminder: WaterReminder | null; key: number }>({
    open: false,
    reminder: null,
    key: 0,
  })

  const load = useCallback(
    () =>
      waterService
        .getWaterSettings()
        .then((data) => {
          setSettings(data)
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

  const refresh = async () => setSettings(await waterService.getWaterSettings())

  const openSheet = (reminder: WaterReminder | null) =>
    setSheet((current) => ({ open: true, reminder, key: current.key + 1 }))
  const closeSheet = () => setSheet((current) => ({ ...current, open: false }))

  const saveReminder = async (input: ReminderInput) => {
    if (sheet.reminder) await waterService.updateWaterReminder(sheet.reminder.id, input)
    else await waterService.createWaterReminder(input)
    await refresh()
    closeSheet()
    showToast(`Lembrete das ${input.time} salvo`)
  }

  const deleteReminder = async () => {
    if (!sheet.reminder) return
    const { id, time } = sheet.reminder
    await waterService.deleteWaterReminder(id)
    await refresh()
    closeSheet()
    showToast(`Lembrete das ${time} excluído`)
  }

  if (!settings) {
    return loadFailed ? (
      <ScreenMessage>
        <p className="text-destructive">Não foi possível carregar os ajustes.</p>
        <Button onClick={() => void load()}>Tentar novamente</Button>
      </ScreenMessage>
    ) : (
      <ScreenMessage>Carregando…</ScreenMessage>
    )
  }

  const { goalMl, reminders, remindersTotalMl } = settings
  const shortfall = settings.remindersShortfallMl ?? 0

  return (
    <div className="flex flex-col gap-[26px] px-6">
      <header className="flex flex-col gap-0.5 px-1 pt-1">
        <span className="text-[15px] font-bold text-muted-foreground">Água</span>
        <h1 className="text-[34px] leading-10 font-black tracking-[-0.6px]">Ajustes</h1>
      </header>

      <GoalCard
        key={goalMl ?? 'sem-meta'}
        goalMl={goalMl}
        onSave={async (value) => setSettings(await waterService.setWaterGoal(value))}
      />

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-xl font-black">Lembretes</h2>
          <span className="text-sm font-bold text-muted-foreground">iguais todos os dias</span>
        </div>
        <div className="flex flex-col rounded-3xl bg-card px-[18px] pt-[18px] pb-2.5">
          <div className="flex flex-col gap-2.5 pb-3.5" aria-live="polite">
            {goalMl === null ? (
              <span className="text-sm leading-snug font-bold text-muted-foreground">
                Salve a meta diária para comparar com os lembretes.
              </span>
            ) : (
              <>
                <span className="text-[15px] font-bold text-ink-2">
                  Somam <b className="font-black text-foreground">{formatMl(remindersTotalMl)}</b> de {formatMl(goalMl)}
                </span>
                <div aria-hidden className="flex h-3 gap-[3px]">
                  {reminders.map((reminder) => (
                    <span key={reminder.id} className="rounded bg-wave-accent" style={{ flex: reminder.amountMl }} />
                  ))}
                  {shortfall > 0 && (
                    <span
                      className="rounded"
                      style={{
                        flex: shortfall,
                        background:
                          'repeating-linear-gradient(135deg, var(--warning-stripe) 0 4px, var(--warning-soft) 4px 8px)',
                      }}
                    />
                  )}
                </div>
                <span className={`text-sm leading-snug font-extrabold ${shortfall > 0 ? 'text-warning-strong' : 'text-success'}`}>
                  {shortfall > 0
                    ? `Só com os lembretes, faltam ${formatMl(shortfall)} para a meta.`
                    : 'Seguindo os lembretes, você bate a meta.'}
                </span>
              </>
            )}
          </div>
          <ul>
            {reminders.map((reminder) => (
              <li key={reminder.id}>
                <button
                  type="button"
                  onClick={() => openSheet(reminder)}
                  aria-label={`Editar ${reminder.time} · ${formatMl(reminder.amountMl)}`}
                  className="flex min-h-[58px] w-full items-center justify-between gap-3 border-t border-line"
                >
                  <span className="text-[22px] font-extrabold tracking-[-0.4px] tabular-nums">{reminder.time}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-base font-bold text-ink-2 tabular-nums">{formatMl(reminder.amountMl)}</span>
                    <span aria-hidden className="mr-1.5 size-2 rotate-45 border-t-[2.5px] border-r-[2.5px] border-subtle" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {reminders.length === 0 && (
            <span className="border-t border-line py-4 text-[15px] font-bold text-muted-foreground">Nenhum lembrete ainda.</span>
          )}
          <button
            type="button"
            onClick={() => openSheet(null)}
            className="mt-2 mb-1.5 h-[52px] rounded-2xl border-[1.5px] border-primary bg-card text-base font-extrabold text-primary"
          >
            + Adicionar lembrete
          </button>
        </div>
      </section>

      <NotificationsCard />

      <section className="flex flex-col rounded-3xl bg-card px-[18px] py-1">
        <button
          type="button"
          onClick={() => void logout().catch((error: unknown) => console.error(error))}
          className="h-14 p-0 text-left text-[17px] font-extrabold text-destructive"
        >
          Sair deste aparelho
        </button>
      </section>

      <ReminderSheet
        open={sheet.open}
        sessionKey={sheet.key}
        reminder={sheet.reminder}
        takenTimes={reminders.filter((r) => r.id !== sheet.reminder?.id).map((r) => r.time)}
        onClose={closeSheet}
        onSave={saveReminder}
        onDelete={deleteReminder}
      />
    </div>
  )
}
