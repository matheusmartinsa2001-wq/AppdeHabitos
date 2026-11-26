import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/contexts/AuthContext'
import { renderWithProviders } from '@/test/render'
import { ModulePickerPage } from './ModulePickerPage'

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const logout = vi.fn()

function setup() {
  vi.mocked(useAuth).mockReturnValue({
    status: 'authenticated',
    sessionExpired: false,
    login: vi.fn(),
    logout,
    retry: vi.fn(),
  })
  return renderWithProviders(<></>, {
    route: '/',
    routes: [
      { path: '/', element: <ModulePickerPage /> },
      { path: '/agua', element: <p>módulo água</p> },
    ],
  })
}

describe('ModulePickerPage', () => {
  beforeEach(() => {
    logout.mockReset()
    logout.mockResolvedValue(undefined)
  })

  it('mostra só os módulos Água e Tarefas', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Módulos' })).toBeInTheDocument()
    expect(screen.getByText('Água')).toBeInTheDocument()
    expect(screen.getByText('Tarefas')).toBeInTheDocument()
  })

  it('tocar em Água abre o módulo Água', async () => {
    const { user, router } = setup()
    await user.click(screen.getByRole('link', { name: /Água/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/agua'))
  })

  it('Tarefas aparece como "Em breve" e não abre nada', () => {
    setup()
    expect(screen.getByText('Em breve')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Tarefas/ })).not.toBeInTheDocument()
  })

  it('"Sair deste aparelho" encerra a sessão', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Sair deste aparelho' }))
    expect(logout).toHaveBeenCalledOnce()
  })
})
