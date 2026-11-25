import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'

/**
 * Renderiza dentro de um roteador em memória do mesmo tipo do app (data router).
 * Passe `routes` para testar navegação; senão, `ui` responde em qualquer rota.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', routes }: { route?: string; routes?: RouteObject[] } = {},
) {
  const user = userEvent.setup()
  const router = createMemoryRouter(routes ?? [{ path: '*', element: ui }], { initialEntries: [route] })
  const result = render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  )
  return { user, router, ...result }
}
