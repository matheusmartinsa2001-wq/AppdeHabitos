import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { AppShell } from './AppShell'
import { WATER_TABS } from './moduleTabs'

function setup(route: string) {
  return renderWithProviders(<></>, {
    route,
    routes: [
      { path: '/', element: <p>escolha de módulo</p> },
      {
        element: <AppShell tabs={WATER_TABS} />,
        children: [
          { path: '/agua', element: <p>água hoje</p> },
          { path: '/agua/historico', element: <p>água histórico</p> },
        ],
      },
    ],
  })
}

describe('AppShell', () => {
  it('mostra as abas do módulo e marca a ativa', () => {
    setup('/agua/historico')
    expect(screen.getByRole('link', { name: 'Hoje' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Histórico' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Ajustes' })).toBeInTheDocument()
  })

  it('"‹ Módulos" volta para a escolha de módulo', async () => {
    const { user, router } = setup('/agua')
    await user.click(screen.getByRole('link', { name: /Módulos/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.getByText('escolha de módulo')).toBeInTheDocument()
  })
})
