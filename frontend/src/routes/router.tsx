import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { WaterHistoryPage } from '@/pages/water/WaterHistoryPage'
import { WaterSettingsPage } from '@/pages/water/WaterSettingsPage'
import { WaterTodayPage } from '@/pages/water/WaterTodayPage'
import { ProtectedRoute } from './ProtectedRoute'

export const routes = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        // Barra inferior Hoje · Histórico · Ajustes em todas as telas logadas.
        element: <AppShell />,
        children: [
          { path: '/', element: <WaterTodayPage /> },
          { path: '/agua/historico', element: <WaterHistoryPage /> },
          { path: '/agua/configuracao', element: <WaterSettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(routes)
