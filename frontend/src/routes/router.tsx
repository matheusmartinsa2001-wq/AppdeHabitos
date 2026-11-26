import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { TASKS_TABS, WATER_TABS } from '@/components/layout/moduleTabs'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ModulePickerPage } from '@/pages/home/ModulePickerPage'
import { TasksHistoryPage } from '@/pages/tasks/TasksHistoryPage'
import { TasksPage } from '@/pages/tasks/TasksPage'
import { TasksSettingsPage } from '@/pages/tasks/TasksSettingsPage'
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
      {
        // Módulo Tarefas: barra inferior Tarefas · Histórico · Ajustes.
        element: <AppShell tabs={TASKS_TABS} />,
        children: [
          { path: '/tarefas', element: <TasksPage /> },
          { path: '/tarefas/historico', element: <TasksHistoryPage /> },
          { path: '/tarefas/ajustes', element: <TasksSettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(routes)
