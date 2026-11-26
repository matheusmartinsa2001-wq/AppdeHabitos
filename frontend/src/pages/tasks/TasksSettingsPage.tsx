import { useAuth } from '@/contexts/AuthContext'

/** Ajustes de Tarefas. Por enquanto só "Sair"; as notificações chegam com os lembretes (Etapa 15). */
export function TasksSettingsPage() {
  const { logout } = useAuth()

  return (
    <div className="flex flex-col gap-[18px] px-6">
      <header className="flex flex-col gap-0.5 px-1 pt-1">
        <span className="text-[15px] font-bold text-muted-foreground">Tarefas</span>
        <h1 className="text-[34px] leading-10 font-black tracking-[-0.6px]">Ajustes</h1>
      </header>
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
