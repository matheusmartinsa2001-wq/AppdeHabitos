import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { getHealth } from '@/services/healthService'

type ApiState = 'loading' | 'ok' | 'error'

/**
 * Tela provisória (Etapas 4 e 5): confirma que o PWA abre, que o login funciona e que a
 * API responde. A tela de Água entra nas Etapas 7+.
 */
export function HomePage() {
  const { logout } = useAuth()
  const [apiState, setApiState] = useState<ApiState>('loading')
  const [loggingOut, setLoggingOut] = useState(false)

  const load = useCallback(() => {
    getHealth()
      .then(() => setApiState('ok'))
      .catch((error: unknown) => {
        console.error(error)
        setApiState('error')
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const retry = () => {
    setApiState('loading')
    load()
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      // O app sai da sessão mesmo se o servidor não respondeu (o AuthContext já volta ao login).
      console.error(error)
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">App de Hábitos</h1>
          <p className="text-sm text-muted-foreground">Você está conectado.</p>
        </div>
        <Button variant="outline" onClick={handleLogout} loading={loggingOut}>
          Sair
        </Button>
      </header>

      <section className="rounded-lg border border-border bg-card p-4" aria-live="polite">
        <h2 className="font-semibold">Conexão com o servidor</h2>
        {apiState === 'loading' && <p className="mt-1 text-sm text-muted-foreground">Conectando…</p>}
        {apiState === 'ok' && <p className="mt-1 text-sm text-success">Servidor e banco no ar.</p>}
        {apiState === 'error' && (
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-sm text-destructive">Não foi possível conectar ao servidor.</p>
            <Button onClick={retry}>Tentar novamente</Button>
          </div>
        )}
      </section>
    </main>
  )
}
