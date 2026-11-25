import { screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/contexts/AuthContext'
import { renderWithProviders } from '@/test/render'
import { LoginPage } from './LoginPage'

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const login = vi.fn()

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    status: 'anonymous',
    sessionExpired: false,
    login,
    logout: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  })
}

function apiError(status: number, message: string) {
  return new AxiosError('erro', 'ERR', undefined, undefined, {
    status,
    data: { message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

describe('LoginPage (só senha)', () => {
  beforeEach(() => {
    login.mockReset()
    mockAuth()
  })

  it('senha vazia não vai ao servidor e mostra o aviso', async () => {
    const { user } = renderWithProviders(<LoginPage />, { route: '/login' })
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Digite a senha')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('envia a senha digitada, sem tirar espaços', async () => {
    login.mockResolvedValue(undefined)
    const { user } = renderWithProviders(<LoginPage />, { route: '/login' })
    await user.type(screen.getByLabelText('Senha'), ' minha senha ')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(login).toHaveBeenCalledWith(' minha senha '))
  })

  it('senha errada mostra a mensagem do servidor', async () => {
    login.mockRejectedValue(apiError(401, 'Senha incorreta'))
    const { user } = renderWithProviders(<LoginPage />, { route: '/login' })
    await user.type(screen.getByLabelText('Senha'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta')
  })

  it('muitas tentativas mostra a espera de um minuto', async () => {
    login.mockRejectedValue(apiError(429, 'ThrottlerException: Too Many Requests'))
    const { user } = renderWithProviders(<LoginPage />, { route: '/login' })
    await user.type(screen.getByLabelText('Senha'), 'qualquer')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas. Espere um minuto e tente de novo.')
  })

  it('avisa quando a sessão terminou sozinha', () => {
    mockAuth({ sessionExpired: true })
    renderWithProviders(<LoginPage />, { route: '/login' })
    expect(screen.getByRole('status')).toHaveTextContent('Sua sessão terminou. Entre de novo.')
  })

  it('já conectado vai direto para o início', async () => {
    mockAuth({ status: 'authenticated' })
    const { router } = renderWithProviders(<LoginPage />, {
      route: '/login',
      routes: [
        { path: '/login', element: <LoginPage /> },
        { path: '/', element: <p>início</p> },
      ],
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
