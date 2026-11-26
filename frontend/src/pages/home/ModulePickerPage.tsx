import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

type AppModule = {
  name: string
  description: string
  icon: ReactNode
  /** Sem endereço = módulo ainda em construção. */
  to?: string
}

/** Módulos do app, na ordem da tela. Um módulo novo entra como mais um item. */
const MODULES: AppModule[] = [
  {
    name: 'Água',
    description: 'Meta do dia, lembretes e histórico',
    to: '/agua',
    icon: (
      <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden>
        <path d="M12 2.7c-.3 0-.6.1-.8.4C9.4 5.4 5 11 5 14.7a7 7 0 0 0 14 0c0-3.7-4.4-9.3-6.2-11.6a1 1 0 0 0-.8-.4Z" />
      </svg>
    ),
  },
  {
    name: 'Tarefas',
    description: 'Lista do dia, recorrentes e lembretes',
    icon: (
      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    ),
  },
]

/** Tela inicial depois do login: só a escolha do módulo. */
export function ModulePickerPage() {
  const { logout } = useAuth()

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex max-w-[402px] flex-col gap-[18px] px-6 pt-[max(env(safe-area-inset-top),16px)] pb-[calc(32px+env(safe-area-inset-bottom))]">
        <header className="flex flex-col gap-0.5 px-1 pt-12">
          <span className="text-[15px] font-bold text-muted-foreground">Seus hábitos</span>
          <h1 className="text-[34px] leading-10 font-black tracking-[-0.6px]">Módulos</h1>
        </header>

        <nav aria-label="Módulos" className="flex flex-col gap-3">
          {MODULES.map((module) => {
            const content = (
              <>
                <span className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
                  {module.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[20px] font-black tracking-[-0.3px]">{module.name}</span>
                  <span className="text-[15px] font-semibold text-muted-foreground">{module.description}</span>
                </span>
                {module.to ? (
                  <span aria-hidden className="text-[28px] leading-none text-subtle">›</span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[13px] font-extrabold text-muted-foreground">
                    Em breve
                  </span>
                )}
              </>
            )
            const className = 'flex min-h-[88px] items-center gap-4 rounded-3xl bg-card px-[18px] py-4'
            return module.to ? (
              <Link
                key={module.name}
                to={module.to}
                className={`${className} transition-transform duration-150 active:scale-[.98]`}
              >
                {content}
              </Link>
            ) : (
              <div key={module.name} aria-disabled="true" className={`${className} opacity-70`}>
                {content}
              </div>
            )
          })}
        </nav>

        <section className="mt-6 flex flex-col rounded-3xl bg-card px-[18px] py-1">
          <button
            type="button"
            onClick={() => void logout().catch((error: unknown) => console.error(error))}
            className="h-14 p-0 text-left text-[17px] font-extrabold text-destructive"
          >
            Sair deste aparelho
          </button>
        </section>
      </div>
    </div>
  )
}
