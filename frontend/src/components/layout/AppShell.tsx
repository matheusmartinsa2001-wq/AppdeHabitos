import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import type { ShellTab } from './moduleTabs'

/**
 * Casca de um módulo: "‹ Módulos" no topo, conteúdo e a barra inferior flutuante do
 * módulo, com o destaque deslizando para a aba ativa (design "Módulo Água").
 * A primeira aba só fica ativa no endereço exato dela.
 */
export function AppShell({ tabs }: { tabs: readonly ShellTab[] }) {
  const { pathname } = useLocation()
  // Trocar de aba começa a tela do topo.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const home = tabs[0].to
  const active = Math.max(
    0,
    tabs.findIndex((tab) => (tab.to === home ? pathname === home : pathname.startsWith(tab.to))),
  )

  return (
    <div className="min-h-svh bg-background">
      {/* Esmaece o conteúdo que passa por baixo da barra de status do iPhone. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[5] bg-[linear-gradient(var(--background)_60%,rgba(246,250,251,0))]"
        style={{ height: 'calc(env(safe-area-inset-top) + 12px)' }}
      />
      <div className="mx-auto max-w-[402px] pt-[max(env(safe-area-inset-top),16px)] pb-[calc(128px+env(safe-area-inset-bottom))]">
        <Link
          to="/"
          className="mx-6 mb-1 inline-flex h-11 items-center gap-1 rounded-full px-1 text-[15px] font-extrabold text-primary"
        >
          <span aria-hidden className="text-[22px] leading-none">‹</span> Módulos
        </Link>
        <Outlet />
      </div>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-6 z-30 mx-auto grid h-[62px] max-w-[354px] grid-cols-3 rounded-full bg-white/95 p-1.5 shadow-[0_10px_30px_rgba(15,42,51,.12),0_0_0_1px_rgba(15,42,51,.05)] backdrop-blur-[16px]"
        style={{ bottom: 'calc(30px + env(safe-area-inset-bottom) * 0.5)' }}
      >
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc((100%-12px)/3)] rounded-full bg-primary-soft transition-transform duration-[450ms] ease-[cubic-bezier(.3,1.25,.45,1)]"
          style={{ transform: `translateX(${active * 100}%)` }}
        />
        {tabs.map((tab, index) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === home}
            className={`relative flex items-center justify-center text-[15px] font-extrabold ${index === active ? 'text-primary-strong' : 'text-muted-foreground'}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
