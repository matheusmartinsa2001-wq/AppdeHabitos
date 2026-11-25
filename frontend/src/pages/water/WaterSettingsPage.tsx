import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScreenMessage } from '@/components/layout/ScreenMessage'
import { Button } from '@/components/ui/button'
import * as waterService from '@/services/waterService'
import type { ReminderInput, WaterSettings } from '@/types/water'
import { GoalForm } from './GoalForm'
import { NotificationsCard } from './NotificationsCard'
import { ReminderForm } from './ReminderForm'
import { ReminderItem } from './ReminderItem'
import { RemindersSummary } from './RemindersSummary'

/** Água · Configuração: meta diária e lembretes (docs/regras-negocio.md → Módulo Água). */
export function WaterSettingsPage() {
  const [settings, setSettings] = useState<WaterSettings | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(() => {
    waterService
      .getWaterSettings()
      .then((data) => {
        setSettings(data)
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

  const retry = () => {
    setLoadFailed(false)
    load()
  }

  // Depois de cada mudança, busca de novo: a soma e o aviso vêm do servidor.
  const refresh = async () => {
    setSettings(await waterService.getWaterSettings())
  }

  const saveGoal = async (goalMl: number) => {
    setSettings(await waterService.setWaterGoal(goalMl))
  }

  const addReminder = async (input: ReminderInput) => {
    await waterService.createWaterReminder(input)
    await refresh()
  }

  const updateReminder = async (id: string, input: ReminderInput) => {
    await waterService.updateWaterReminder(id, input)
    await refresh()
  }

  const deleteReminder = async (id: string) => {
    await waterService.deleteWaterReminder(id)
    await refresh()
  }

  if (!settings) {
    return loadFailed ? (
      <ScreenMessage>
        <p className="text-destructive">Não foi possível carregar a configuração.</p>
        <Button onClick={retry}>Tentar novamente</Button>
      </ScreenMessage>
    ) : (
      <ScreenMessage>Carregando…</ScreenMessage>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-4 px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <header className="flex items-center gap-2">
        <Link to="/" className="flex min-h-11 items-center px-1 text-2xl text-primary" aria-label="Voltar ao início">
          ‹
        </Link>
        <h1 className="text-xl font-bold">Água · Configuração</h1>
      </header>

      <GoalForm goalMl={settings.goalMl} onSave={saveGoal} />

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Lembretes</h2>
          <span className="text-xs text-muted-foreground">iguais todos os dias</span>
        </div>
        {settings.reminders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum lembrete ainda.</p>
        ) : (
          <ul className="mt-1">
            {settings.reminders.map((reminder) => (
              <ReminderItem
                key={reminder.id}
                reminder={reminder}
                onUpdate={updateReminder}
                onDelete={deleteReminder}
              />
            ))}
          </ul>
        )}
        <div className="mt-3 border-t border-border pt-3">
          <h3 className="mb-2 text-sm font-medium">Novo lembrete</h3>
          <ReminderForm idPrefix="new" submitLabel="+ Adicionar" onSubmit={addReminder} />
        </div>
      </section>

      <RemindersSummary settings={settings} />

      <NotificationsCard />
    </main>
  )
}
