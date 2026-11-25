import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth, type AuthStatus } from '@/contexts/AuthContext'
import { renderWithProviders } from '@/test/render'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const retry = vi.fn()

function setup(status: AuthStatus) {
  vi.mocked(useAuth).mockReturnValue({
    status,
    sessionExpired: false,
    login: vi.fn(),
    logout: vi.fn(),
    retry,
  })
  return renderWithProviders(<></>, {
    route: '/',
    routes: [
      { path: '/login', element: <p>tela de login</p> },
      { element: <ProtectedRoute />, children: [{ path: '/', element: <p>área protegida</p> }] },
    ],
  })
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    retry.mockReset()
  })

  it('com sessão, mostra a página', () => {
    setup('authenticated')
    expect(screen.getByText('área protegida')).toBeInTheDocument()
  })

  it('sem sessão, vai para o login', async () => {
    const { router } = setup('anonymous')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('enquanto confere a sessão, avisa que pode demorar (e não pisca o login)', () => {
    const { router } = setup('checking')
    expect(screen.getByText(/Conectando/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('sem conexão com o servidor, não manda para o login: oferece tentar de novo', async () => {
    const { user, router } = setup('offline')
    expect(screen.getByText('Não foi possível conectar ao servidor.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(retry).toHaveBeenCalled()
  })
})
