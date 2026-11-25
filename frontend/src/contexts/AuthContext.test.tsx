import { act, render, screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authService from '@/services/authService'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('@/services/authService', () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}))

let expireSession: () => void = () => {}
vi.mock('@/services/api', () => ({
  onSessionExpired: (listener: () => void) => {
    expireSession = listener
    return () => {}
  },
}))

function Probe() {
  const { status, sessionExpired } = useAuth()
  return (
    <p>
      {status}
      {sessionExpired ? ' expirada' : ''}
    </p>
  )
}

const unauthorized = new AxiosError('401', 'ERR', undefined, undefined, {
  status: 401,
  data: {},
  statusText: '',
  headers: {},
  config: { headers: new AxiosHeaders() },
})

describe('AuthContext (restauração da sessão ao abrir o app)', () => {
  beforeEach(() => {
    vi.mocked(authService.refreshSession).mockReset()
  })

  it('cookie válido: entra direto', async () => {
    vi.mocked(authService.refreshSession).mockResolvedValue(undefined)
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByText('checking')).toBeInTheDocument()
    expect(await screen.findByText('authenticated')).toBeInTheDocument()
  })

  it('sessão recusada pelo servidor: fica sem sessão', async () => {
    vi.mocked(authService.refreshSession).mockImplementation(() => Promise.reject(unauthorized))
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(await screen.findByText('anonymous')).toBeInTheDocument()
  })

  it('servidor fora do ar: fica "offline", não "sem sessão"', async () => {
    vi.mocked(authService.refreshSession).mockImplementation(() => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK')))
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(await screen.findByText('offline')).toBeInTheDocument()
  })

  it('sessão que acaba durante o uso volta ao login com o aviso', async () => {
    vi.mocked(authService.refreshSession).mockResolvedValue(undefined)
    render(<AuthProvider><Probe /></AuthProvider>)
    await screen.findByText('authenticated')
    act(() => expireSession())
    await waitFor(() => expect(screen.getByText('anonymous expirada')).toBeInTheDocument())
  })
})
