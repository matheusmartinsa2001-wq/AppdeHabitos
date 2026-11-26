import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { WATER_TABS } from '@/components/layout/moduleTabs'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ModulePickerPage } from '@/pages/home/ModulePickerPage'
import { WaterHistoryPage } from '@/pages/water/WaterHistoryPage'
import { WaterSettingsPage } from '@/pages/water/WaterSettingsPage'
import { WaterTodayPage } from '@/pages/water/WaterTodayPage'
import { ProtectedRoute } from './ProtectedRoute'

export const routes = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      // Tela inicial: só a escolha do módulo (Água, Tarefas).
      { path: '/', element: <ModulePickerPage /> },
      {
        // Módulo Água: barra inferior Hoje · Histórico · Ajustes.
        element: <AppShell tabs={WATER_TABS} />,
        children: [
          { path: '/agua', element: <WaterTodayPage /> },
          { path: '/agua/historico', element: <WaterHistoryPage /> },
          { path: '/agua/configuracao', element: <WaterSettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(routes)
