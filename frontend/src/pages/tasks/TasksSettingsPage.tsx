import { useAuth } from '@/contexts/AuthContext'
import { NotificationsCard } from '@/pages/water/NotificationsCard'

/**
 * Ajustes de Tarefas: notificações (a mesma inscrição do aparelho vale para Água e Tarefas)
 * e "Sair".
 */
export function TasksSettingsPage() {
  const { logout } = useAuth()

  return (
    <div className="flex flex-col gap-[18px] px-6">
      <header className="flex flex-col gap-0.5 px-1 pt-1">
        <span className="text-[15px] font-bold text-muted-foreground">Tarefas</span>
        <h1 className="text-[34px] leading-10 font-black tracking-[-0.6px]">Ajustes</h1>
      </header>
      <p className="px-1 text-[15px] leading-snug font-bold text-muted-foreground">
        Tarefas com horário avisam no horário delas. As notificações valem para Água e Tarefas neste aparelho.
      </p>
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
    </div>
  )
}
