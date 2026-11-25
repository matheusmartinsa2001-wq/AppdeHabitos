import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/contexts/AuthContext'
import { getHealth } from '@/services/healthService'
import { renderWithProviders } from '@/test/render'
import { HomePage } from './HomePage'

vi.mock('@/services/healthService', () => ({ getHealth: vi.fn() }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mockedGetHealth = vi.mocked(getHealth)
const logout = vi.fn()

describe('HomePage (tela provisória)', () => {
  beforeEach(() => {
    mockedGetHealth.mockReset()
    logout.mockReset()
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      sessionExpired: false,
      login: vi.fn(),
      logout,
      retry: vi.fn(),
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('mostra que servidor e banco estão no ar', async () => {
    mockedGetHealth.mockResolvedValue({ status: 'ok', database: 'ok' })
    renderWithProviders(<HomePage />)
    expect(await screen.findByText('Servidor e banco no ar.')).toBeInTheDocument()
  })

  it('falha de conexão mostra erro com "Tentar novamente", que tenta de novo', async () => {
    mockedGetHealth.mockRejectedValueOnce(new Error('Network Error'))
    mockedGetHealth.mockResolvedValueOnce({ status: 'ok', database: 'ok' })
    const { user } = renderWithProviders(<HomePage />)
    expect(await screen.findByText('Não foi possível conectar ao servidor.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Servidor e banco no ar.')).toBeInTheDocument()
    expect(mockedGetHealth).toHaveBeenCalledTimes(2)
  })

  it('"Sair" encerra a sessão', async () => {
    mockedGetHealth.mockResolvedValue({ status: 'ok', database: 'ok' })
    logout.mockResolvedValue(undefined)
    const { user } = renderWithProviders(<HomePage />)
    await user.click(screen.getByRole('button', { name: 'Sair' }))
    expect(logout).toHaveBeenCalled()
  })
})
