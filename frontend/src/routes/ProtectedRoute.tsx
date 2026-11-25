import { Navigate, Outlet } from 'react-router-dom'
import { ScreenMessage } from '@/components/layout/ScreenMessage'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

/** Só deixa entrar com sessão. Enquanto confere, não pisca a tela de login. */
export function ProtectedRoute() {
  const { status, retry } = useAuth()

  if (status === 'checking') {
    // O servidor gratuito pode estar "dormindo": a primeira resposta demora.
    return <ScreenMessage>Conectando… (pode levar alguns segundos)</ScreenMessage>
  }

  if (status === 'offline') {
    return (
      <ScreenMessage>
        <p className="text-destructive">Não foi possível conectar ao servidor.</p>
        <Button onClick={retry}>Tentar novamente</Button>
      </ScreenMessage>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
