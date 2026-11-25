import type { ReactNode } from 'react'

/** Tela cheia com uma mensagem centralizada (carregando, sem conexão...). */
export function ScreenMessage({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground"
      aria-live="polite"
    >
      {children}
    </div>
  )
}
