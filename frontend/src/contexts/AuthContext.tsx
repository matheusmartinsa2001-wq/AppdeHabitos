import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onSessionExpired } from '@/services/api'
import * as authService from '@/services/authService'
import { isNetworkError } from '@/utils/errors'

/**
 * - `checking`: restaurando a sessão ao abrir o app (o servidor gratuito pode estar acordando);
 * - `offline`: não foi possível falar com o servidor — não é o mesmo que "sem sessão";
 * - `authenticated` / `anonymous`.
 */
export type AuthStatus = 'checking' | 'offline' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  /** A sessão acabou sozinha (expirou ou foi encerrada): o login mostra o aviso. */
  sessionExpired: boolean
  login: (password: string) => Promise<void>
  logout: () => Promise<void>
  retry: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(
    () =>
      onSessionExpired(() => {
        setStatus((current) => {
          if (current === 'authenticated') setSessionExpired(true)
          return 'anonymous'
        })
      }),
    [],
  )

  const restore = useCallback(() => {
    authService
      .refreshSession()
      .then(() => setStatus('authenticated'))
      .catch((error: unknown) => setStatus(isNetworkError(error) ? 'offline' : 'anonymous'))
  }, [])

  useEffect(() => {
    restore()
  }, [restore])

  const retry = useCallback(() => {
    setStatus('checking')
    restore()
  }, [restore])

  const login = useCallback(async (password: string) => {
    await authService.login(password)
    setSessionExpired(false)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setStatus('anonymous')
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, sessionExpired, login, logout, retry }),
    [status, sessionExpired, login, logout, retry],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
